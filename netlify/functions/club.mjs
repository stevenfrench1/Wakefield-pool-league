import {getDatabase} from '@netlify/database';
import {createNetlifyHandler} from '../../lib/netlify-api.mjs';
let handle;
export default async(request,context)=>{
 try{
  if(!handle){
   const env=Object.fromEntries(['ADMIN_EMAIL','ADMIN_PASSWORD_HASH','SESSION_SECRET','MIGRATION_TOKEN','MIGRATION_SOURCE_URL'].map(key=>[key,Netlify.env.get(key)]));
   handle=createNetlifyHandler({pool:getDatabase().pool,env});
  }
  return await handle(request,context);
 }catch{return Response.json({error:'The shared club database is not ready. Please contact Mr French.'},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
};
export const config={path:'/api/*'};
