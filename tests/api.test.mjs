import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../lib/sites-api.mjs';
import {database} from './sqlite-d1.mjs';

test('joining multiple competitions is one revision and recovery snapshot, shared across devices and rejected atomically after closing',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const request=async(route,body,cookie='',extra={})=>{const res=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',cookie,...extra},body:body?JSON.stringify(body):undefined});return {...res,data:JSON.parse(res.body)};};
 try{
  await request('state',undefined,'',owner);const pins=await request('action',{action:'pins',revision:0},'',owner),player=pins.data.state.players[0];
  const login=await request('login',{id:player.id,pin:pins.data.pins[0].pin}),cookie=login.headers['Set-Cookie'].split(';')[0];
  const payload={ids:['full-league','pairs-league','singles-knockout','pairs-knockout']};
  assert.equal((await request('action',{action:'enterCompetitions',payload,revision:1})).statusCode,401);
  const before=DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n;
  const entered=await request('action',{action:'enterCompetitions',payload,revision:1},cookie);assert.equal(entered.statusCode,200);assert.equal(entered.data.revision,2);
  assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,before+1);
  const read=await createHandler(env)({path:'/api/state',httpMethod:'GET',headers:{host:'club.example'}}),shared=JSON.parse(read.body);
  for(const c of shared.state.competitions){assert.deepEqual(c.entries,[player.id]);assert.equal(c.teams.length,0);assert.equal(c.fixtures.length,0);}
  assert(!read.body.includes('pinHash'));
  assert.equal((await request('action',{action:'enterCompetitions',payload,revision:1},cookie)).statusCode,409);
  await request('action',{action:'leaveCompetition',payload:{id:'full-league'},revision:2},cookie);
  await request('action',{action:'closeEntries',payload:{id:'pairs-league'},revision:3},'',owner);
  const closed=DB.sql.prepare('SELECT * FROM club_state').get(),backups=DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n;
  const denied=await request('action',{action:'enterCompetitions',payload:{ids:['full-league','pairs-league']},revision:4},cookie);assert.equal(denied.statusCode,400);
  assert.deepEqual(DB.sql.prepare('SELECT * FROM club_state').get(),closed);assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,backups);
 }finally{DB.sql.close();}
});

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

test('owner-configured roster import applies once, survives concurrent readers and persists after configuration removal',async()=>{
 const DB=await database();const env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'};const handler=createHandler(env);
 const event={path:'/api/state',httpMethod:'GET',headers:{host:'club.example'}};
 try{
  const start=JSON.parse((await handler(event)).body);
  const players=start.state.players.map(p=>({existingId:p.id,name:p.name})).concat(Array.from({length:40},(_,i)=>({name:`Test Player ${i+1}`})));
  env.ROSTER_IMPORT_JSON=JSON.stringify({id:'synthetic-import-test',expectedRevision:start.revision,players});
  const results=await Promise.all([handler(event),handler(event)]);
  for(const response of results){const d=JSON.parse(response.body);assert.equal(response.statusCode,200);assert.equal(d.state.players.length,42);assert.equal(d.revision,1);assert.deepEqual(d.state.appliedRosterImports,['synthetic-import-test']);}
  delete env.ROSTER_IMPORT_JSON;
  const later=JSON.parse((await createHandler(env)(event)).body);assert.equal(later.state.players.length,42);assert.equal(later.revision,1);assert.equal(later.state.players[0].id,start.state.players[0].id);
 }finally{DB.sql.close();}
});

test('shared competition entries persist across devices, reject concurrent late writes, and authenticate either pair member',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const request=async(action,payload={},cookie='',extra={},revision)=>{
  if(revision===undefined)revision=DB.sql.prepare('SELECT revision FROM club_state WHERE id=1').get()?.revision||0;
  const res=await handler({path:'/api/action',httpMethod:'POST',headers:{host:'club.example','content-type':'application/json',cookie,...extra},body:JSON.stringify({action,payload,revision})});return {...res,data:JSON.parse(res.body)};
 };
 try{
  await handler({path:'/api/state',httpMethod:'GET',headers:{host:'club.example',...owner}});
  await request('addPlayers',{names:'Player A\nPlayer B'},'',owner);const pins=await request('pins',{},'',owner);const people=pins.data.state.players;
  const cookies=[];for(let i=0;i<people.length;i++){
   const login=await handler({path:'/api/login',httpMethod:'POST',headers:{host:'club.example','content-type':'application/json'},body:JSON.stringify({id:people[i].id,pin:pins.data.pins[i].pin})});assert.equal(login.statusCode,200);cookies.push(login.headers['Set-Cookie'].split(';')[0]);
   assert.equal((await request('enterCompetition',{id:'pairs-league'},cookies[i])).statusCode,200);
  }
  const fresh=await createHandler(env)({path:'/api/state',httpMethod:'GET',headers:{host:'club.example'}});const shared=JSON.parse(fresh.body);assert.equal(shared.state.competitions[2].entries.length,4);assert(!fresh.body.includes('pinHash'));
  const rev=shared.revision;
  const raced=await Promise.all([request('closeEntries',{id:'pairs-league'},'',owner,rev),request('leaveCompetition',{id:'pairs-league'},cookies[0],{},rev)]);assert.deepEqual(raced.map(r=>r.statusCode).sort(),[200,409]);
  const current=JSON.parse((await handler({path:'/api/state',httpMethod:'GET',headers:{host:'club.example'}})).body);
  if(current.state.competitions[2].entries.length===3)await request('enterCompetition',{id:'pairs-league',playerId:people[0].id},'',owner);
  await request('closeEntries',{id:'pairs-league'},'',owner);assert.equal((await request('leaveCompetition',{id:'pairs-league'},cookies[0])).statusCode,400);
  const drawn=await request('drawCompetition',{id:'pairs-league'},'',owner);assert.equal(drawn.statusCode,200);const c=drawn.data.state.competitions[2],m=c.fixtures[0],member=c.teams.find(t=>t.id===m.a).members[1],cookie=cookies[people.findIndex(p=>p.id===member)];
  const submitted=await request('submit',{id:m.id,score:[1,0]},cookie);assert.equal(submitted.statusCode,200);assert.equal(submitted.data.state.competitions[2].fixtures[0].status,'open');
  const sub=submitted.data.state.submissions[0];assert.equal((await request('approve',{id:sub.id},cookie)).statusCode,400);const approved=await request('approve',{id:sub.id},'',owner);assert.equal(approved.statusCode,200);assert.equal(approved.data.state.competitions[2].fixtures[0].status,'complete');
  assert.equal((await request('enterCompetition',{id:'pairs-league'},cookies[0])).statusCode,400);
 }finally{DB.sql.close();}
});
