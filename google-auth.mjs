import { randomBytes, createHash } from 'node:crypto';

// Local pilot only: sessions expire after one hour and are lost on restart.
// Tokens never leave the server. No database permissions are granted here.
export function createGoogleAuth({ url, key, origin = 'http://127.0.0.1:4173', request = fetch } = {}) {
  const ready = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url || '') && /^sb_publishable_/.test(key || '');
  const flows = new Map(), sessions = new Map();
  const nonce = () => randomBytes(32).toString('base64url');
  const cookie = (name, value, age) => `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`;
  const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')));
  const api = async (path, options = {}) => {
    const res = await request(`${url}/auth/v1/${path}`, { ...options, signal: AbortSignal.timeout(10000),
      headers: { apikey: key, 'Content-Type': 'application/json', ...options.headers } });
    if (!res.ok) throw new Error('AUTH_FAILED');
    return res.status === 204 ? null : res.json();
  };
  return async (req, res, pathname) => {
    if (!pathname.startsWith('/auth/')) return false;
    const now = Date.now();
    for (const map of [flows, sessions]) for (const [id, item] of map) if (item.until < now) map.delete(id);
    const jar = cookies(req);
    const json = (status, body) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    const redirect = location => res.writeHead(303, { Location: location }).end();
    if (pathname === '/auth/status' && req.method === 'GET') {
      const session = sessions.get(jar.sb_session);
      if (!session) { json(200, { ready, signedIn: false }); return true; }
      try { await api('user', { headers: { Authorization: `Bearer ${session.token}` } }); json(200, { ready, signedIn: true }); }
      catch { sessions.delete(jar.sb_session); json(200, { ready, signedIn: false }); }
      return true;
    }
    if (pathname === '/auth/callback' && req.method === 'GET') {
      const flow = flows.get(jar.sb_flow); flows.delete(jar.sb_flow);
      res.setHeader('Set-Cookie', cookie('sb_flow', '', 0));
      const params = new URL(req.url, origin).searchParams;
      if (!ready || !flow || !params.get('code') || params.has('error')) { redirect('/?auth=failed'); return true; }
      try {
        const result = await api('token?grant_type=pkce', { method: 'POST', body: JSON.stringify({auth_code:params.get('code'),code_verifier:flow.verifier}) });
        const user = await api('user', { headers: { Authorization: `Bearer ${result.access_token}` } });
        if (!user?.id) throw new Error('AUTH_FAILED');
        sessions.delete(jar.sb_session);
        const id = nonce();
        const seconds = Math.max(1, Math.min(3600, Number(result.expires_in) || 3600));
        sessions.set(id, { token: result.access_token, until: now + seconds * 1000 });
        res.setHeader('Set-Cookie', [cookie('sb_flow', '', 0), cookie('sb_session', id, seconds)]);
        redirect('/?auth=success');
      } catch { redirect('/?auth=failed'); }
      return true;
    }
    if (req.method !== 'POST') { json(405, {error:'METHOD_NOT_ALLOWED'}); return true; }
    if (req.headers.origin !== origin) { json(403, {error:'INVALID_ORIGIN'}); return true; }
    if (pathname === '/auth/logout') {
      const session = sessions.get(jar.sb_session); sessions.delete(jar.sb_session);
      res.setHeader('Set-Cookie', cookie('sb_session', '', 0));
      if (session) await api('logout?scope=local', {method:'POST',headers:{Authorization:`Bearer ${session.token}`}}).catch(() => {});
      json(200, {signedIn:false}); return true;
    }
    if (pathname !== '/auth/google') { json(404, {}); return true; }
    if (!ready) { json(503, {error:'NOT_CONFIGURED'}); return true; }
    if (flows.size >= 100) { json(429, {error:'TRY_LATER'}); return true; }
    flows.delete(jar.sb_flow);
    const id = nonce(), verifier = nonce();
    flows.set(id, {verifier, until:now + 300000});
    const target = new URL(`${url}/auth/v1/authorize`);
    target.search = new URLSearchParams({provider:'google',redirect_to:`${origin}/auth/callback`,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'s256'}).toString();
    res.setHeader('Set-Cookie', cookie('sb_flow', id, 300));
    json(200, {url:target.href}); return true;
  };
}
