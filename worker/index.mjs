import { createHandler } from '../lib/sites-api.mjs';
import { assets } from './assets.mjs';
const security = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
function configured(env){return !!(env.DB&&env.ADMIN_EMAIL&&env.SESSION_SECRET?.length>=32);}
function response(body,status=200,headers={}){return new Response(body,{status,headers:{...security,...headers}});}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(env.MIGRATION_REDIRECT_URL&&!url.pathname.startsWith('/api/')){
  const target=new URL(env.MIGRATION_REDIRECT_URL);
  if(target.origin==='https://wakefield-pool-championship.netlify.app')return response(null,302,{'Location':target.origin+url.pathname+url.search,'Cache-Control':'no-store'});
 }
 if(url.pathname.startsWith('/api/')){
  // Missing live configuration is an error, never an automatic sample club.
  if(!configured(env))return response(JSON.stringify({error:'The shared club is not configured yet. Please contact Mr French.'}),503,{'Content-Type':'application/json','Cache-Control':'no-store'});
  const bodyLimit=['/api/restore','/api/restore-preview'].includes(url.pathname)?3000000:1000000;
  let body='';
  if(request.body){const reader=request.body.getReader();const chunks=[];let length=0;
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>bodyLimit){await reader.cancel();return response(JSON.stringify({error:'Request too large.'}),413,{'Content-Type':'application/json'});}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}body=new TextDecoder().decode(bytes);
  }
  const headers=Object.fromEntries(request.headers);headers.host=url.host;
  // Never trust client-supplied Netlify IP headers on the new host.
  delete headers['client-ip'];headers['x-nf-client-connection-ip']=request.headers.get('cf-connecting-ip')||'sites-shared-network';
  const result=await createHandler(env)({path:url.pathname,httpMethod:request.method,headers,body});
  return response(result.body,result.statusCode,result.headers);
 }
 if(!['GET','HEAD'].includes(request.method))return response('Method not allowed',405,{'Allow':'GET, HEAD'});
 if(url.pathname==='/'&&!configured(env))return response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wakefield Pool Championship · Setup required</title><link rel="stylesheet" href="/style.css"><main class="hosting-setup"><img src="/wakefield-logo.png" alt="Wakefield school crest" width="100"><h1>Welcome to the Wakefield Pool Championship</h1><p>The app is published. The shared club database is not ready yet. Please contact Mr French.</p><p>Please try again shortly.</p><p>Existing club data has not been changed. This page does not load a sample club.</p></main></html>`,200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 const asset=assets[url.pathname==='/'?'/index.html':url.pathname];
 if(!asset)return response('Not found',404);
 const body=asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
 return response(request.method==='HEAD'?null:body,200,{'Content-Type':asset.type,'Cache-Control':'no-cache'});
}};
