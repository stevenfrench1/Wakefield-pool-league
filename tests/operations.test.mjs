import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,act,allMatches,competitionMatches,competitionStandings,findMatch} from '../lib/domain.mjs';
import {createHandler} from '../lib/sites-api.mjs';
import {sealBackup,openBackup} from '../lib/backups.mjs';
import {database} from './sqlite-d1.mjs';
const admin={role:'admin',name:'Mr French'};
function club(n=8){const s=initialState();s.players=Array.from({length:n},(_,i)=>({id:'p'+i,name:'Test Player '+i,rating:0}));return s;}
function draw(s,id){act(s,'enterAllPlayers',{id},admin);act(s,'drawCompetition',{id},admin);return s.competitions.find(c=>c.id===id);}
function approve(s,m,score=[Math.ceil(m.bestOf/2),0]){act(s,'submit',{id:m.id,score},admin);act(s,'approve',{id:s.submissions.at(-1).id},admin);}
function finish(s,c){for(const round of c.rounds)for(const m of round)if(m.status==='open')approve(s,m);}
async function apiClub(n=9){
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'};
 const owner={'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':env.ADMIN_EMAIL};let handler=createHandler(env);
 async function call(route,body,headers={}){const r=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json','x-nf-client-connection-ip':'one-school-network',...headers},body:body?JSON.stringify(body):undefined});return {status:r.statusCode,headers:r.headers,data:JSON.parse(r.body)};}
 async function action(action,payload={},headers=owner,revision){revision??=DB.sql.prepare('SELECT revision FROM club_state WHERE id=1').get().revision;return call('action',{action,payload,revision},headers);}
 await call('state');if(n>2)assert.equal((await action('addPlayers',{names:Array.from({length:n-2},(_,i)=>'Synthetic '+i).join('\n')})).status,200);
 return {DB,env,owner,call,action,restart(){handler=createHandler(env);}};
}
test('correcting a league score or reopening it recalculates standings and requires admin and a reason',()=>{
 const s=club(4),c=draw(s,'full-league'),m=c.fixtures[0];approve(s,m);const winner=m.a;
 assert.throws(()=>act(s,'correctResult',{id:m.id,score:[0,1],reason:'Agreed correction'},{role:'player',id:winner}),/Administrator/);
 assert.throws(()=>act(s,'correctResult',{id:m.id,score:[0,1],reason:''},admin),/reason/);
 act(s,'correctResult',{id:m.id,score:[0,1],reason:'Both players confirmed the winner'},admin);assert.equal(competitionStandings(s,c).find(x=>x.id===winner).points,0);assert.equal(m.winner,m.b);assert.deepEqual(s.auditLog[0].before.score,[1,0]);
 act(s,'correctResult',{id:m.id,score:null,reason:'Replay agreed'},admin);assert.equal(m.status,'open');assert(competitionStandings(s,c).every(x=>x.points===0));
});
test('knockout corrections preserve fixed draws, reset dependent results, update plates, and retain unrelated results',()=>{
 for(const mode of ['singles','pairs']){
  const s=club(mode==='pairs'?16:8),c=s.competitions.find(c=>c.mode===mode&&c.format==='knockout');act(s,'editCompetition',{id:c.id,consolation:true},admin);draw(s,c.id);finish(s,c);finish(s,c.plate);
  const ids=competitionMatches(c).map(m=>m.id),teams=structuredClone(c.teams),root=c.rounds[0][0],unrelated=structuredClone(c.rounds[1][1]);
  act(s,'correctResult',{id:root.id,score:[0,1],reason:'Winner confirmed by both sides'},admin);
  assert.equal(root.winner,root.b);assert.equal(c.rounds[1][0].status,'open');assert.equal(c.rounds[2][0].status,'waiting');assert.deepEqual(c.rounds[1][1],unrelated);assert.deepEqual(c.teams,teams);assert.deepEqual(competitionMatches(c).map(m=>m.id),ids);
  const losers=c.rounds[0].map(m=>m.winner===m.a?m.b:m.a).sort();assert.deepEqual(c.plate.rounds[0].flatMap(m=>[m.a,m.b]).filter(Boolean).sort(),losers);assert(s.auditLog[0].affectedMatches.length>=4);
  act(s,'correctResult',{id:root.id,score:null,reason:'Opening match needs replay'},admin);assert(c.plate.rounds[0].some(m=>m.sources.a===root.id&&m.a===null||m.sources.b===root.id&&m.b===null));assert(c.plate.rounds[0].some(m=>m.status==='waiting'));
  approve(s,root,[0,1]);assert(!c.plate.rounds[0].some(m=>m.status==='waiting'));assert.deepEqual(competitionMatches(c).map(m=>m.id),ids);
 }
});
test('score-only corrections retain subsequent winners; invalidated pending scores are removed',()=>{
 const s=club(8),c=s.competitions[1];act(s,'editCompetition',{id:c.id,bestOf:3,finalBestOf:3},admin);draw(s,c.id);finish(s,c);const m=c.rounds[0][0],later=structuredClone(c.rounds.slice(1));
 act(s,'correctResult',{id:m.id,score:[2,1],reason:'Frame count corrected'},admin);assert.deepEqual(c.rounds.slice(1),later);
 act(s,'correctResult',{id:c.rounds[1][0].id,score:null,reason:'Replay semi-final'},admin);act(s,'submit',{id:c.rounds[1][0].id,score:[2,0]},admin);assert.equal(s.submissions.length,1);
 act(s,'correctResult',{id:m.id,score:[0,2],reason:'Opening winner corrected'},admin);assert.equal(s.submissions.length,0);
});
test('legacy cups and their plates support corrections without changing saved IDs',()=>{
 const s=club(8);act(s,'cup',{name:'Legacy cup'},admin);const cup=s.cups[0];finish(s,cup);const plate=s.cups.find(c=>c.consolation);finish(s,plate);const ids=allMatches(s).map(m=>m.id),m=cup.rounds[0][0];
 act(s,'correctResult',{id:m.id,score:[0,1],reason:'Legacy correction'},admin);assert.equal(cup.rounds[1][0].status,'open');assert.deepEqual(allMatches(s).map(m=>m.id),ids);assert(plate.rounds[0].some(x=>[x.a,x.b].includes(m.a)));
});
test('post-draw withdrawal preserves entrants and partners, keeps completed scores, removes pending results and awards walkovers',()=>{
 const s=club(8),c=draw(s,'pairs-league'),team=c.teams[0],done=c.fixtures.find(m=>[m.a,m.b].includes(team.id));approve(s,done);const result=structuredClone(done),pending=c.fixtures.find(m=>m.status==='open'&&[m.a,m.b].includes(team.id));act(s,'submit',{id:pending.id,score:[1,0]},admin);const teams=structuredClone(c.teams),entries=[...c.entries];
 assert.throws(()=>act(s,'withdrawPlayer',{competitionId:c.id,playerId:team.members[0],reason:'Left school'},{role:'player',id:team.members[0]}),/Administrator/);
 act(s,'withdrawPlayer',{competitionId:c.id,playerId:team.members[0],reason:'Left school'},admin);
 assert.deepEqual(done,result);assert.equal(s.submissions.length,0);assert.deepEqual(c.entries,entries);assert.deepEqual(c.teams.map(({withdrawn,...t})=>t),teams);assert(team.withdrawn);assert(c.fixtures.filter(m=>[m.a,m.b].includes(team.id)).every(m=>m.status==='complete'));assert(c.fixtures.some(m=>m.walkover));assert(!c.fixtures.filter(m=>m.walkover).some(m=>m.winner===team.id));assert(s.competitions.filter(x=>x!==c).every(x=>!x.withdrawals));
});
test('withdrawals advance knockout brackets, preserve byes, and do not put walkover losers into a plate',()=>{
 for(const n of [3,4,5,8]){
  const s=club(n),c=s.competitions[1];act(s,'editCompetition',{id:c.id,consolation:true},admin);draw(s,c.id);const m=c.rounds[0].find(m=>m.status==='open'),id=c.teams.find(t=>t.id===m.a).members[0];
  act(s,'withdrawPlayer',{competitionId:c.id,playerId:id,reason:'Unable to continue'},admin);assert.equal(m.status,'complete');assert(m.walkover);assert.equal(m.winner,m.b);finish(s,c);assert(c.rounds.at(-1)[0].winner);if(c.plate)assert(!c.plate.rounds[0].some(x=>[x.a,x.b].includes(m.a)));
 }
});
test('shared school Wi-Fi permits 42 correct pupil logins; failed guesses remain limited per pupil',async()=>{
 const c=await apiClub(42);try{
  const pins=await c.action('pins');for(let i=0;i<42;i++){const p=pins.data.state.players[i],login=await c.call('login',{id:p.id,pin:pins.data.pins[i].pin});assert.equal(login.status,200,`Player ${i+1} should sign in`);}
  const [p,q]=pins.data.state.players;
  for(let i=0;i<8;i++)assert.equal((await c.call('login',{id:p.id,pin:'wrong'})).status,401);
  const blocked=await c.call('login',{id:p.id,pin:pins.data.pins[0].pin});assert.equal(blocked.status,429);assert.equal(blocked.headers['Retry-After'],'900');assert.equal((await c.call('login',{id:q.id,pin:pins.data.pins[1].pin})).status,200);
  const reset=await c.action('pins',{id:p.id});assert.equal((await c.call('login',{id:p.id,pin:reset.data.pins[0].pin})).status,200);
 }finally{c.DB.sql.close();}
});
test('encrypted backups round-trip full club records, reject tampering and wrong passphrases, and survive server secret rotation',()=>{
 const s=club(8);draw(s,'pairs-knockout');finish(s,s.competitions[3]);const phrase='a separate test passphrase';const backup=sealBackup(s,7,phrase,'portable');assert(!JSON.stringify(backup).includes('Test Player'));assert.deepEqual(openBackup(backup,phrase,'portable'),s);
 assert.throws(()=>openBackup(backup,'wrong passphrase','portable'),/could not be opened/);assert.throws(()=>openBackup({...backup,revision:8},phrase,'portable'),/could not be opened/);
 assert.throws(()=>openBackup({...backup,data:'x'+backup.data.slice(1)},phrase,'portable'),/could not be opened/);
 const invalid={...s,players:[{...s.players[0],id:'" onclick="bad'}]};assert.throws(()=>openBackup(sealBackup(invalid,7,phrase,'portable'),phrase,'portable'),/could not be opened/);
});
test('recovery is owner-only, previews counts, rejects stale restores, saves a safety snapshot, revokes pupil sessions and can undo itself',async()=>{
 const c=await apiClub(4);try{
  const pins=await c.action('pins'),p=pins.data.state.players[0],login=await c.call('login',{id:p.id,pin:pins.data.pins[0].pin}),cookie=login.headers['Set-Cookie'].split(';')[0];
  for(const route of ['backup','restore-preview','restore'])assert.equal((await c.call(route,{passphrase:'test-backup-passphrase',confirmation:'RESTORE'},{cookie})).status,403);
  assert.equal((await c.call('backups',undefined,{cookie})).status,403);
  const exported=await c.call('backup',{passphrase:'test-backup-passphrase'},c.owner);assert.equal(exported.status,200);const input={backup:exported.data.backup,passphrase:'test-backup-passphrase'};
  const originalRevision=(await c.call('revision')).data.revision;await c.action('settings',{season:'Changed season'});
  const preview=await c.call('restore-preview',input,c.owner);assert.equal(preview.data.summary.players,4);assert.equal(preview.data.summary.playersWithPins,4);
  await c.action('settings',{season:'Newer season'});assert.equal((await c.call('restore',{...input,confirmation:'RESTORE',revision:preview.data.revision},c.owner)).status,409);
  const fresh=await c.call('restore-preview',input,c.owner),restored=await c.call('restore',{...input,confirmation:'RESTORE',revision:fresh.data.revision},c.owner);assert.equal(restored.status,200);assert(restored.data.revision>originalRevision);assert.equal(restored.data.state.settings.season,'The inaugural season');
  assert.equal((await c.call('state',undefined,{cookie})).data.user,null);assert(!JSON.stringify((await c.call('state')).data).includes('auditLog'));
  const saved=await c.call('backups',undefined,c.owner);assert.equal(saved.data.backups[0].reason,'Before restore');assert(!JSON.stringify(saved.data).includes('pinHash'));
  const undoInput={backupId:saved.data.backups[0].id},undoPreview=await c.call('restore-preview',undoInput,c.owner),undo=await c.call('restore',{...undoInput,revision:undoPreview.data.revision,confirmation:'RESTORE'},c.owner);assert.equal(undo.status,200);assert.equal(undo.data.state.settings.season,'Newer season');
  c.env.SESSION_SECRET='rotated-test-secret-at-least-32-characters';c.restart();const portablePreview=await c.call('restore-preview',input,c.owner);assert.equal(portablePreview.status,200);
 }finally{c.DB.sql.close();}
});
test('snapshot retention is bounded and concurrent writers save exactly one recoverable previous revision',async()=>{
 const c=await apiClub(2);try{
  const results=await Promise.all([c.action('settings',{season:'One'},c.owner,0),c.action('settings',{season:'Two'},c.owner,0)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(c.DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,1);
  const snapshot=(await c.call('backups',undefined,c.owner)).data.backups[0];assert.equal((await c.call('restore-preview',{backupId:snapshot.id},c.owner)).status,200);
  for(let i=0;i<55;i++)assert.equal((await c.action('settings',{season:'Season '+i})).status,200);
  assert.equal(c.DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,50);
  const rows=c.DB.sql.prepare('SELECT data FROM club_backups').all();assert(rows.every(r=>!r.data.includes('pinHash')));
 }finally{c.DB.sql.close();}
});

test('a database failure rolls back both the state change and its recovery snapshot',async()=>{
 const c=await apiClub(2);try{
  const originalBatch=c.DB.batch.bind(c.DB);c.DB.batch=statements=>originalBatch([statements[0],{async run(){throw Error('Injected database failure');}},...statements.slice(2)]);
  assert.equal((await c.action('settings',{season:'Should not persist'})).status,400);const state=await c.call('state');assert.equal(state.data.revision,0);assert.equal(state.data.state.settings.season,'The inaugural season');assert.equal(c.DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,0);
 }finally{c.DB.sql.close();}
});
test('legacy plate feeders resume after replaying a corrected opening match',()=>{
 const s=club(8);act(s,'cup',{name:'Legacy replay'},admin);const c=s.cups[0];finish(s,c);const plate=s.cups.find(c=>c.consolation),m=c.rounds[0][0];
 act(s,'correctResult',{id:m.id,score:null,reason:'Agreed replay'},admin);assert(plate.rounds[0].some(x=>x.status==='waiting'));approve(s,m,[0,1]);assert(plate.rounds[0].every(x=>['open','bye','complete'].includes(x.status)));assert(plate.rounds[0].some(x=>[x.a,x.b].includes(m.a)));
});
