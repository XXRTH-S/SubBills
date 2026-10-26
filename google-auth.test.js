import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleAuth} from './google-auth.mjs';
const origin='http://127.0.0.1:4173';
async function call(auth,path,method='GET',headers={}){
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(s,h={}){this.status=s;Object.assign(this.headers,h);return this;},end(body){this.body=body;}};
 await auth({url:path,method,headers},res,path.split('?')[0]);return res;
}
test('unconfigured auth fails closed; start requires same-origin POST',async()=>{
 const auth=createGoogleAuth();
 assert.equal((await call(auth,'/auth/google')).status,405);
 assert.equal((await call(auth,'/auth/google','POST')).status,403);
 assert.equal((await call(auth,'/auth/google','POST',{origin})).status,503);
});
test('PKCE requires matching cookie, verifies user, keeps tokens server-side and consumes flow',async()=>{
 const requests=[];
 const auth=createGoogleAuth({url:'https://example.supabase.co',key:'sb_publishable_test',request:async(url,options)=>{
  requests.push({url,options});return {ok:true,status:200,json:async()=>url.includes('/token')?{access_token:'private-token',expires_in:3600}:{id:'user-1'}};
 }});
 const start=await call(auth,'/auth/google','POST',{origin});
 const target=new URL(JSON.parse(start.body).url);
 assert.equal(target.searchParams.get('provider'),'google');
 assert.equal(target.searchParams.get('code_challenge_method'),'s256');
 const flowCookie=start.headers['Set-Cookie'].split(';')[0];
 assert.match(start.headers['Set-Cookie'],/HttpOnly; SameSite=Lax/);
 assert.equal((await call(auth,'/auth/callback?code=test')).headers.Location,'/?auth=failed');
 const callback=await call(auth,'/auth/callback?code=test','GET',{cookie:flowCookie});
 assert.equal(callback.headers.Location,'/?auth=success');
 assert(!JSON.stringify(callback).includes('private-token'));
 const sessionCookie=callback.headers['Set-Cookie'][1].split(';')[0];
 assert.equal(JSON.parse((await call(auth,'/auth/status','GET',{cookie:sessionCookie})).body).signedIn,true);
 assert.equal((await call(auth,'/auth/callback?code=test','GET',{cookie:flowCookie})).headers.Location,'/?auth=failed');
 await call(auth,'/auth/logout','POST',{origin,cookie:sessionCookie});
 assert.equal(JSON.parse((await call(auth,'/auth/status','GET',{cookie:sessionCookie})).body).signedIn,false);
 assert(requests.some(r=>r.url.endsWith('/user')));
});
