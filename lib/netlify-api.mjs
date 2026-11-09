import {createHandler} from './sites-api.mjs';
import {postgresD1} from './postgres-d1.mjs';
import {migrationAuthorized,importPlatform} from './platform-migration.mjs';

const security={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{...security,...headers}});
async function limitedBody(request,limit){
 if(!request.body)return '';
 const reader=request.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Request too large.');}chunks.push(value);}
 return Buffer.concat(chunks).toString('utf8');
}
export function createNetlifyHandler({pool,env,fetchSource=fetch}){
 const DB=postgresD1(pool),handler=createHandler({...env,DB,AUTH_PROVIDER:'password',REQUIRE_MIGRATION:true});
 return async(request,context={})=>{
  const url=new URL(request.url),route=url.pathname.split('/').at(-1);
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405,{'Allow':'GET, POST'});
  if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32||!env.ADMIN_EMAIL||!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(env.ADMIN_PASSWORD_HASH||''))return json({error:'The club administrator and session settings are not configured.'},503);
  if(request.method==='POST'){
   const origin=request.headers.get('origin');
   if(origin){try{if(new URL(origin).origin!==url.origin)return json({error:'Invalid request origin.'},403);}catch{return json({error:'Invalid request origin.'},403);}}
   if(!(request.headers.get('content-type')||'').includes('application/json'))return json({error:'JSON required.'},415);
  }
  try{
   const body=await limitedBody(request,['restore','restore-preview'].includes(route)?3000000:1000000);
   if(route==='migration-import'){
    if(request.method!=='POST'||!migrationAuthorized(request.headers.get('authorization'),env.MIGRATION_TOKEN))return json({error:'Transfer access denied.'},403);
    const source=new URL(env.MIGRATION_SOURCE_URL);
    if(source.protocol!=='https:'||source.username||source.password||source.search||source.hash)throw Error('Invalid migration source configuration.');
    const response=await fetchSource(new URL('/api/migration-export',source),{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.MIGRATION_TOKEN},body:'{}',redirect:'error',signal:AbortSignal.timeout(45000)});
    if(!response.ok)return json({error:'The source could not export the club. Its data has not been changed.'},502);
    const text=await limitedBody(response,75000000),envelope=JSON.parse(text);
    const summary=await importPlatform(pool,envelope,env.MIGRATION_TOKEN,env.SESSION_SECRET);
    return json({ok:true,...summary});
   }
   // Missing migration data is an error, never a silently initialized sample
   // club. This check also protects the public config endpoint from demo mode.
   const ready=await pool.query('SELECT id FROM club_state WHERE id = 1');
   if(!ready.rows.length)return json({error:'The club transfer is not complete. Please contact Mr French.'},503);
   const headers=Object.fromEntries(request.headers);headers.host=url.host;
   for(const key of ['oai-authenticated-user-id','oai-authenticated-user-email','oai-authenticated-user-full-name','x-nf-client-connection-ip','client-ip'])delete headers[key];
   headers['x-nf-client-connection-ip']=context.ip||'netlify-shared-network';
   const result=await handler({path:url.pathname,httpMethod:request.method,headers,body});
   return new Response(result.body,{status:result.statusCode,headers:{...security,...result.headers}});
  }catch(error){
   if(error.message==='Request too large.')return json({error:error.message},413);
   const expected=/^(Invalid transfer|Transfer authentication|Source writes|Transfer revision|Invalid recovery|The destination already|This backup could not|Invalid migration source)/.test(error.message);
   return json({error:expected?error.message:'The club request could not complete. Please try again or contact Mr French.'},expected?400:503);
  }
 };
}
