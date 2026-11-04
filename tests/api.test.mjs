import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/api.mjs';
import { initialState } from '../lib/domain.mjs';

test('live API contract: private PINs, signed sessions, role enforcement, revision conflicts, and throttling',async()=>{
 const vars=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_PASSWORD','SESSION_SECRET'];const previous=Object.fromEntries(vars.map(k=>[k,process.env[k]]));const realFetch=global.fetch;
 Object.assign(process.env,{SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-key-not-a-credential',ADMIN_PASSWORD:'test-password-only',SESSION_SECRET:'test-session-secret-at-least-32-characters'});
 let row={id:1,revision:0,data:initialState()},attempts=0;
 global.fetch=async(url,options={})=>{
   const u=new URL(url);let result;
   if(u.pathname.endsWith('/rpc/club_check_attempt'))result=++attempts<=8;
   else if(options.method==='PATCH') {const rev=+u.searchParams.get('revision').slice(3);result=rev===row.revision?[row={...row,...JSON.parse(options.body)}]:[];}
   else result=[row];
   return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const request=async(route,body,cookie='',extra={})=>{
   const response=await handler({path:`/api/${route}`,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',cookie,...extra},body:body?JSON.stringify(body):undefined});
   return {...response,data:JSON.parse(response.body)};
 };
 try{
   const publicState=await request('state');assert.equal(publicState.statusCode,200);assert.equal(publicState.data.user,null);
   assert.equal((await request('action',{action:'league',revision:0})).statusCode,401);
   assert.equal((await request('login',{role:'admin',password:'wrong'})).statusCode,401);
   const admin=await request('login',{role:'admin',password:'test-password-only'});assert.equal(admin.statusCode,200);const adminCookie=admin.headers['Set-Cookie'].split(';')[0];assert(admin.headers['Set-Cookie'].includes('HttpOnly'));assert(admin.headers['Set-Cookie'].includes('Secure'));
   assert.equal((await request('state',undefined,adminCookie)).data.user.role,'admin');
   assert.equal((await request('action',{action:'league',revision:0},adminCookie,{origin:'https://evil.example'})).statusCode,403);
   const pins=await request('action',{action:'pins',revision:0},adminCookie);assert.equal(pins.statusCode,200);assert.equal(pins.data.pins.length,2);assert.equal(pins.data.pins[0].pin.length,6);assert(!JSON.stringify(pins.data.state).includes('pinHash'));assert(row.data.players[0].pinHash);
   const login=await request('login',{role:'player',id:row.data.players[0].id,pin:pins.data.pins[0].pin});assert.equal(login.statusCode,200);const playerCookie=login.headers['Set-Cookie'].split(';')[0];
   assert.equal((await request('action',{action:'pins',revision:1},playerCookie)).statusCode,403);
   const league=await request('action',{action:'league',revision:1},adminCookie);assert.equal(league.statusCode,200);
   assert.equal((await request('action',{action:'cup',revision:1},adminCookie)).statusCode,409);
   const m=league.data.state.league[0];const sub=await request('action',{action:'submit',payload:{id:m.id,score:[1,0]},revision:2},playerCookie);assert.equal(sub.statusCode,200);assert.equal(sub.data.state.submissions.length,1);
   const reject=await request('action',{action:'approve',payload:{id:sub.data.state.submissions[0].id},revision:3},playerCookie);assert.equal(reject.statusCode,400);
   const approved=await request('action',{action:'approve',payload:{id:sub.data.state.submissions[0].id},revision:3},adminCookie);assert.equal(approved.statusCode,200);assert.equal(approved.data.state.league[0].status,'complete');
   assert.equal((await request('state',undefined,adminCookie+'tampered')).data.user,null);
   const logout=await request('logout',{},adminCookie);assert(logout.headers['Set-Cookie'].includes('Max-Age=0'));
   for(let i=0;i<6;i++)await request('login',{role:'admin',password:'wrong'});assert.equal((await request('login',{role:'admin',password:'test-password-only'})).statusCode,429);
 }finally{global.fetch=realFetch;for(const k of vars){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});
