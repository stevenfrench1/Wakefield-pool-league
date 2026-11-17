import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../lib/sites-api.mjs';
import {database} from './sqlite-d1.mjs';
import {SCHOOL_POOL_RULES} from '../lib/domain.mjs';
import {openBackup} from '../lib/backups.mjs';

test('complete school rules persist across devices and recovery snapshots; oversized rules are rejected without saving',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'};
 const headers={host:'club.example','content-type':'application/json','oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const request=async(action,payload,revision)=>{
  const response=await createHandler(env)({path:'/api/action',httpMethod:'POST',headers,body:JSON.stringify({action,payload,revision})});
  return {...response,data:JSON.parse(response.body)};
 };
 try{
  const initial=await createHandler(env)({path:'/api/state',httpMethod:'GET',headers});
  assert.equal(JSON.parse(initial.body).state.settings.rules,SCHOOL_POOL_RULES);
  assert(SCHOOL_POOL_RULES.length>300);
  const rules=SCHOOL_POOL_RULES+'\n\n'+'Additional house rules. '.repeat(70);
  const fullRules=rules.padEnd(2000,'.').slice(0,2000);
  const saved=await request('settings',{rules:fullRules},0);assert.equal(saved.statusCode,200);
  const reloaded=JSON.parse((await createHandler(env)({path:'/api/state',httpMethod:'GET',headers})).body);
  assert.equal(reloaded.state.settings.rules,fullRules);assert.equal(reloaded.revision,1);
  const later=await request('settings',{season:'Updated season'},1);assert.equal(later.statusCode,200);
  const snapshot=DB.sql.prepare('SELECT data FROM club_backups WHERE revision=1').get();
  assert.equal(openBackup(JSON.parse(snapshot.data),env.SESSION_SECRET).settings.rules,fullRules);
  const before=DB.sql.prepare('SELECT data,revision FROM club_state').get();
  for(const invalidRules of [fullRules+'.',null,42]){
   const rejected=await request('settings',{rules:invalidRules},2);assert.equal(rejected.statusCode,400);assert.match(rejected.data.error,/2,000/);
   assert.deepEqual(DB.sql.prepare('SELECT data,revision FROM club_state').get(),before);
  }
  assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,2);
 }finally{DB.sql.close();}
});

test('signed-out sign-up queues an account privately and owner approval leaves entry choices to the signed-in pupil',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const call=async(route,body,extra={})=>{
  const response=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',...extra},body:body&&JSON.stringify(body)});
  return {...response,data:JSON.parse(response.body)};
 };
 const signup={firstName:'Synthetic',initial:'t',pin:'704291'};
 const review=(id,decision,revision,headers=owner)=>call('action',{action:'reviewSignup',payload:{id,decision},revision},headers);
 try{
  const initial=await call('state',undefined,owner);
  const pins=await call('action',{action:'pins',revision:initial.data.revision},owner);
  const first=pins.data.state.players[0];
  const firstLogin=await call('login',{id:first.id,pin:pins.data.pins[0].pin});
  const player={cookie:firstLogin.headers['Set-Cookie'].split(';')[0]};
  assert.equal((await call('signup',signup,player)).statusCode,403);
  assert.equal((await call('signup',{...signup,ids:['pairs-league']})).statusCode,400);
  assert.equal((await call('signup',signup,{origin:'https://elsewhere.test'})).statusCode,403);
  const racing=await Promise.all([call('signup',signup),call('signup',signup)]);
  assert.deepEqual(racing.map(r=>r.statusCode).sort(),[200,201]);
  for(const response of racing){assert.deepEqual(response.data,{pending:true,name:'Synthetic T.'});assert(!response.headers['Set-Cookie']);}
  assert.equal((await call('signup',{...signup,pin:'804291'})).statusCode,409);
  const anonymous=await call('state'),pupil=await call('state',undefined,player);
  for(const response of [anonymous,pupil]){
   assert(!response.body.includes('Synthetic T.'));assert(!('signupRequests' in response.data.state));
   assert(response.data.state.competitions.every(c=>c.entries.length===0));
  }
  assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,1);
  const admin=await call('state',undefined,owner),[request]=admin.data.state.signupRequests;
  assert.equal(admin.data.state.signupRequests.length,1);
  assert.deepEqual(request.ids,[]);
  assert(!admin.body.includes('pinHash'));assert(!admin.body.includes(signup.pin));
  assert.equal((await review(request.id,'approve',admin.data.revision,{})).statusCode,401);
  assert.equal((await review(request.id,'approve',admin.data.revision,player)).statusCode,403);
  const closed=await call('action',{action:'closeEntries',payload:{id:'pairs-league'},revision:admin.data.revision},owner);
  assert.equal((await review(request.id,'approve',admin.data.revision)).statusCode,409);
  const approved=await review(request.id,'approve',closed.data.revision);
  assert.equal(approved.statusCode,200);assert.deepEqual(approved.data.state.signupRequests,[]);
  const added=approved.data.state.players.find(p=>p.name===request.name);
  assert(approved.data.state.competitions.every(c=>!c.entries.includes(added.id)));
  const login=await call('login',{id:added.id,pin:signup.pin});assert.equal(login.statusCode,200);
  assert.equal((await call('signup',{...signup,initial:'T'})).statusCode,409);
  assert.equal((await call('signup',{...signup,firstName:'Declined'})).statusCode,201);
  const beforeDecline=await call('state',undefined,owner);
  const declined=await review(beforeDecline.data.state.signupRequests[0].id,'decline',beforeDecline.data.revision);
  assert.equal(declined.statusCode,200);assert.deepEqual(declined.data.state.signupRequests,[]);
  assert(!declined.data.state.players.some(p=>p.name==='Declined T.'));
 }finally{DB.sql.close();}
});

test('an earlier sign-up keeps its requested entries and a marked test account can be removed',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const call=async(route,body,extra={})=>{
  const response=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',...extra},body:body&&JSON.stringify(body)});
  return {...response,data:JSON.parse(response.body)};
 };
 const action=(action,payload,revision,headers=owner)=>call('action',{action,payload,revision},headers);
 try{
  await call('state',undefined,owner);
  const signup={firstName:'Rehearsal',initial:'X',pin:'704291'};
  assert.equal((await call('signup',signup)).statusCode,201);
  const legacyIds=['full-league','singles-knockout'];
  const saved=JSON.parse(DB.sql.prepare('SELECT data FROM club_state WHERE id = 1').get().data);
  saved.signupRequests[0].ids=legacyIds;
  DB.sql.prepare('UPDATE club_state SET data = ? WHERE id = 1').run(JSON.stringify(saved));
  const pending=await call('state',undefined,owner);
  const approved=await action('reviewSignup',{id:pending.data.state.signupRequests[0].id,decision:'approve',testAccount:true},pending.data.revision);
  assert.equal(approved.statusCode,200);
  const testPlayer=approved.data.state.players.find(p=>p.testAccount);
  assert.equal(testPlayer.name,'Rehearsal X.');
  assert(!('testAccount' in (await call('state')).data.state.players.find(p=>p.id===testPlayer.id)));
  const login=await call('login',{id:testPlayer.id,pin:signup.pin});
  assert.equal(login.statusCode,200);
  const pupil={cookie:login.headers['Set-Cookie'].split(';')[0]};
  const testEntryIds=(await call('state',undefined,pupil)).data.state.competitions.filter(c=>c.entries.includes(testPlayer.id)).map(c=>c.id);
  assert.deepEqual(testEntryIds,legacyIds);
  assert.equal((await action('removeTestAccount',{id:testPlayer.id},approved.data.revision,pupil)).statusCode,400);
  for(const [draw,payload] of [['drawCompetition',{id:'full-league'}],['league',{}],['cup',{}]]){
   const refused=await action(draw,payload,approved.data.revision);
   assert.match(refused.data.error,/Remove the test account before making the draw/);
  }
  const existing=approved.data.state.players.find(p=>p.id!==testPlayer.id);
  assert.match((await action('removeTestAccount',{id:existing.id},approved.data.revision)).data.error,/Choose a marked test account/);
  const closed=await action('closeEntries',{id:'full-league'},approved.data.revision);
  assert.equal((await action('removeTestAccount',{id:testPlayer.id},approved.data.revision)).statusCode,409);
  const removed=await action('removeTestAccount',{id:testPlayer.id},closed.data.revision);
  assert.equal(removed.statusCode,200);
  assert.deepEqual(removed.data.state.players,closed.data.state.players.filter(p=>p.id!==testPlayer.id));
  assert.deepEqual(removed.data.state.competitions,closed.data.state.competitions.map(c=>({...c,entries:c.entries.filter(id=>id!==testPlayer.id)})));
  assert.equal((await call('state',undefined,pupil)).data.user,null);
  assert.equal((await call('login',{id:testPlayer.id,pin:signup.pin})).statusCode,401);
  const snapshot=await call('backups',undefined,owner);
  assert.equal(snapshot.data.backups[0].reason,'removeTestAccount');
  assert.equal((await call('restore-preview',{backupId:snapshot.data.backups[0].id},owner)).data.summary.players,3);
 }finally{DB.sql.close();}
});

test('approval activates the same roster player and never replaces a PIN set during review',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const call=async(route,body,headers={})=>{
  const response=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',...headers},body:body&&JSON.stringify(body)});
  return {...response,data:JSON.parse(response.body)};
 };
 const action=(action,payload,revision)=>call('action',{action,payload,revision},owner);
 try{
  const {data:{state:{players:[first,second]}}}=await call('state',undefined,owner);
  const saved=JSON.parse(DB.sql.prepare('SELECT data FROM club_state WHERE id = 1').get().data);
  saved.competitions[0].entries.push(first.id);
  DB.sql.prepare('UPDATE club_state SET data = ? WHERE id = 1').run(JSON.stringify(saved));
  const pin='704291';
  assert.equal((await call('signup',{playerId:first.id,pin})).statusCode,201);
  assert.equal((await call('signup',{playerId:first.id,pin})).statusCode,200);
  assert.equal((await call('signup',{playerId:first.id,pin:'804291'})).statusCode,409);
  assert.equal((await call('login',{id:first.id,pin})).statusCode,401);
  const pending=await call('state',undefined,owner),[request]=pending.data.state.signupRequests;
  assert.equal(request.playerId,first.id);
  assert.equal((await action('reviewSignup',{id:request.id,decision:'approve',testAccount:true},pending.data.revision)).statusCode,400);
  const approved=await action('reviewSignup',{id:request.id,decision:'approve'},pending.data.revision);
  assert.equal(approved.statusCode,200);
  assert.deepEqual(approved.data.state.players,[{...first,hasAccount:true},second]);
  assert.deepEqual(approved.data.state.competitions,saved.competitions);
  assert(!approved.body.includes('pinHash'));
  assert(!('hasAccount' in (await call('state')).data.state.players[0]));
  assert.equal((await call('login',{id:first.id,pin})).statusCode,200);
  assert.equal((await call('signup',{playerId:first.id,pin})).statusCode,409);
  assert.equal((await call('signup',{playerId:second.id,pin})).statusCode,201);
  const secondPending=await call('state',undefined,owner),[secondRequest]=secondPending.data.state.signupRequests;
  const reset=await action('pins',{id:second.id},secondPending.data.revision);
  assert.equal((await action('reviewSignup',{id:secondRequest.id,decision:'approve'},reset.data.revision)).statusCode,400);
  assert.equal((await call('login',{id:second.id,pin:reset.data.pins[0].pin})).statusCode,200);
  const backup=await call('backup',{passphrase:'synthetic backup passphrase'},owner);
  assert.equal((await call('restore-preview',{backup:backup.data.backup,passphrase:'synthetic backup passphrase'},owner)).statusCode,200);
 }finally{DB.sql.close();}
});

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
  const rosterOnly=await request('addPlayers',{names:'Roster only'},'',owner);
  const cookies=[];for(let i=0;i<people.length;i++){
   const login=await handler({path:'/api/login',httpMethod:'POST',headers:{host:'club.example','content-type':'application/json'},body:JSON.stringify({id:people[i].id,pin:pins.data.pins[i].pin})});assert.equal(login.statusCode,200);cookies.push(login.headers['Set-Cookie'].split(';')[0]);
   assert.equal((await request('enterCompetition',{id:'pairs-league'},cookies[i])).statusCode,200);
   if(i===0)assert.match((await request('addReserve',{id:'pairs-league',playerId:rosterOnly.data.state.players.at(-1).id},'',owner)).data.error,/player account/);
  }
  const fresh=await createHandler(env)({path:'/api/state',httpMethod:'GET',headers:{host:'club.example'}});const shared=JSON.parse(fresh.body);assert.equal(shared.state.competitions[2].entries.length,4);assert(!fresh.body.includes('pinHash'));
  const rev=shared.revision;
  const raced=await Promise.all([request('closeEntries',{id:'pairs-league'},'',owner,rev),request('leaveCompetition',{id:'pairs-league'},cookies[0],{},rev)]);assert.deepEqual(raced.map(r=>r.statusCode).sort(),[200,409]);
  const current=JSON.parse((await handler({path:'/api/state',httpMethod:'GET',headers:{host:'club.example'}})).body);
  if(current.state.competitions[2].entries.length===3)assert.equal((await request('addReserve',{id:'pairs-league',playerId:people[0].id},'',owner)).statusCode,200);
  await request('closeEntries',{id:'pairs-league'},'',owner);assert.equal((await request('leaveCompetition',{id:'pairs-league'},cookies[0])).statusCode,400);
  const drawn=await request('drawCompetition',{id:'pairs-league'},'',owner);assert.equal(drawn.statusCode,200);const c=drawn.data.state.competitions[2],m=c.fixtures[0],member=c.teams.find(t=>t.id===m.a).members[1],cookie=cookies[people.findIndex(p=>p.id===member)];
  const submitted=await request('submit',{id:m.id,score:[1,0]},cookie);assert.equal(submitted.statusCode,200);assert.equal(submitted.data.state.competitions[2].fixtures[0].status,'open');
  const sub=submitted.data.state.submissions[0];assert.equal((await request('approve',{id:sub.id},cookie)).statusCode,400);const approved=await request('approve',{id:sub.id},'',owner);assert.equal(approved.statusCode,200);assert.equal(approved.data.state.competitions[2].fixtures[0].status,'complete');
  assert.equal((await request('enterCompetition',{id:'pairs-league'},cookies[0])).statusCode,400);
 }finally{DB.sql.close();}
});
