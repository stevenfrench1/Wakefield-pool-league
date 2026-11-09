import {getDatabase} from '@netlify/database';
import {createNetlifyHandler} from '../../lib/netlify-api.mjs';
let handle;
export default async(request,context)=>{
 try{
  if(!handle){
   // Separate the migrated app's settings from the older deployment's keys.
   // Deployment can prepare these new values without changing the old app.
   const env=Object.fromEntries(['ADMIN_EMAIL','ADMIN_PASSWORD_HASH','SESSION_SECRET','MIGRATION_TOKEN','MIGRATION_SOURCE_URL','OWNER_SETUP_TOKEN_HASH'].map(key=>[key,Netlify.env.get('WAKEFIELD_'+key)]));
   handle=createNetlifyHandler({pool:getDatabase().pool,env});
  }
  return await handle(request,context);
 }catch{return Response.json({error:'The shared club database is not ready. Please contact Mr French.'},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
};
export const config={path:'/api/*'};
