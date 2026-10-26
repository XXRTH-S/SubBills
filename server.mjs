import { createGoogleAuth } from './google-auth.mjs';
import { loadEnvFile } from 'node:process';
try { loadEnvFile(); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const auth = createGoogleAuth({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY});
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files=Object.freeze({'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css','/pastel.css':'pastel.css','/domain.js':'domain.js','/validation.js':'validation.js','/assets/fonts/Nunito.ttf':'assets/fonts/Nunito.ttf','/assets/fonts/Mali-Regular.ttf':'assets/fonts/Mali-Regular.ttf','/assets/fonts/Mali-Medium.ttf':'assets/fonts/Mali-Medium.ttf','/assets/fonts/Mali-SemiBold.ttf':'assets/fonts/Mali-SemiBold.ttf','/assets/fonts/Mali-Bold.ttf':'assets/fonts/Mali-Bold.ttf'});
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',ttf:'font/ttf'};
const headers={
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
 'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'
};
http.createServer(async(req,res)=>{
 for(const [key,value]of Object.entries(headers))res.setHeader(key,value);
 if(!['127.0.0.1:4173','localhost:4173'].includes(req.headers.host)){res.writeHead(403).end();return;}
 try { if(await auth(req,res,new URL(req.url,'http://localhost').pathname)) return; } catch { res.writeHead(500).end(); return; }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!Object.hasOwn(files,pathname)){res.writeHead(404).end();return;}
  const file=files[pathname],body=await readFile(new URL(file,import.meta.url));
  res.writeHead(200,{'Content-Type':types[file.split('.').pop()]});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(500).end();}
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173'));
