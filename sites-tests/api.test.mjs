import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../lib/sites-api.mjs';
import {database} from './sqlite-d1.mjs';

test('D1 live API: owner identity, private PINs, sessions, revisions, approval and throttling',async()=>{
 const DB=await database();const env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'};const handler=createHandler(env);
 const adminHeaders={'oai-authenticated-user-id':'owner-site-id','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const request=async(route,body,cookie='',extra={})=>{const res=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',cookie,...extra},body:body?JSON.stringify(body):undefined});return {...res,data:JSON.parse(res.body)};};
 try{
  const state=await request('state');assert.equal(state.data.user,null);assert.deepEqual(state.data.state.players.map(p=>p.name),['Mr French','George']);
  const other=await request('state',undefined,'',{'oai-authenticated-user-id':'other-id','oai-authenticated-user-email':'other@example.test'});assert.equal(other.data.user,null);
  assert.equal((await request('action',{action:'league',revision:0})).statusCode,401);
  assert.equal((await request('login',{role:'admin',password:'anything'})).statusCode,401);
  const admin=await request('state',undefined,'',adminHeaders);assert.equal(admin.data.user.role,'admin');
  // After bootstrap, the durable ID is authoritative, even if the email changes.
  assert.equal((await request('state',undefined,'',{'oai-authenticated-user-id':'owner-site-id','oai-authenticated-user-email':'changed@example.test'})).data.user.role,'admin');
  assert.equal((await request('state',undefined,'',{'oai-authenticated-user-id':'other-id','oai-authenticated-user-email':env.ADMIN_EMAIL})).data.user,null);
  assert.equal((await request('action',{action:'league',revision:0},'',{...adminHeaders,origin:'https://evil.example'})).statusCode,403);
  const pins=await request('action',{action:'pins',revision:0},'',adminHeaders);assert.equal(pins.statusCode,200);assert.equal(pins.data.pins.length,2);assert(!JSON.stringify(pins.data.state).includes('pinHash'));
  const login=await request('login',{role:'player',id:pins.data.state.players[0].id,pin:pins.data.pins[0].pin});assert.equal(login.statusCode,200);const cookie=login.headers['Set-Cookie'].split(';')[0];assert.match(login.headers['Set-Cookie'],/HttpOnly.*SameSite=Strict.*Secure/);
  assert.equal((await request('action',{action:'pins',revision:1},cookie)).statusCode,403);
  const league=await request('action',{action:'league',revision:1},'',adminHeaders);assert.equal(league.statusCode,200);
  const m=league.data.state.league[0];const submission=await request('action',{action:'submit',payload:{id:m.id,score:[1,0]},revision:2},cookie);assert.equal(submission.statusCode,200);
  assert.equal((await request('action',{action:'approve',payload:{id:submission.data.state.submissions[0].id},revision:3},cookie)).statusCode,400);
  const approved=await request('action',{action:'approve',payload:{id:submission.data.state.submissions[0].id},revision:3},'',adminHeaders);assert.equal(approved.statusCode,200);assert.equal(approved.data.state.league[0].status,'complete');
  const newDevice=createHandler(env);const shared=await newDevice({path:'/api/state',httpMethod:'GET',headers:{host:'club.example'}});assert.equal(JSON.parse(shared.body).state.league[0].status,'complete');
  assert.equal((await request('action',{action:'cup',revision:3},'',adminHeaders)).statusCode,409);
  assert.equal((await request('state',undefined,cookie+'bad')).data.user,null);
  assert.match((await request('logout',{},cookie)).headers['Set-Cookie'],/Max-Age=0/);
  for(let i=0;i<8;i++)await request('login',{role:'player',id:'wrong',pin:'000000'});assert.equal((await request('login',{role:'player',id:'wrong',pin:'000000'})).statusCode,429);
 }finally{DB.sql.close();}
});
test('D1 compare-and-swap rejects simultaneous writers without losing a result',async()=>{
 const DB=await database();const env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'};
 const handler=createHandler(env);const headers={host:'club.example','content-type':'application/json','oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 try{await handler({path:'/api/state',httpMethod:'GET',headers});const action=()=>handler({path:'/api/action',httpMethod:'POST',headers,body:JSON.stringify({action:'addPlayers',revision:0,payload:{names:'Player Test'}})});
 const results=await Promise.all([action(),action()]);assert.deepEqual(results.map(x=>x.statusCode).sort(),[200,409]);const row=DB.sql.prepare('SELECT revision, data FROM club_state').get();assert.equal(row.revision,1);assert.equal(JSON.parse(row.data).players.length,3);
 }finally{DB.sql.close();}
});
