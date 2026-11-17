import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,act,competitionStandings,breakthroughAlerts} from '../lib/domain.mjs';
import {validateBackupState,sealBackup,openBackup} from '../lib/backups.mjs';
import {createHandler} from '../lib/sites-api.mjs';
import {database} from './sqlite-d1.mjs';
const admin={role:'admin',name:'Mr French'},pupil=id=>({role:'player',id});
function setup(mode='singles',n=8){
 const s=initialState();s.players=Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,rating:0}));
 const c=s.competitions.find(c=>c.format==='league'&&c.mode===mode);
 for(const p of s.players.slice(0,4))act(s,'enterCompetition',{id:c.id},pupil(p.id));
 act(s,'drawCompetition',{id:c.id},admin);return {s,c};
}
function request(s,c,id){act(s,'requestLeagueEntry',{id:c.id},pupil(id));return c.entryRequests.find(r=>r.playerId===id);}
function review(s,c,r,decision='approve',extra={}){act(s,'reviewLeagueEntryRequest',{id:c.id,requestId:r.id,playerId:r.playerId,decision,...extra},admin);}
function unchanged(s,fn,pattern){const before=structuredClone(s);assert.throws(fn,pattern);assert.deepEqual(s,before);}

test('late singles entry needs approval and adds each new opponent once, preserving approved and pending results',()=>{
 const {s,c}=setup();act(s,'recordResult',{id:c.fixtures[0].id,score:[1,0]},admin);
 act(s,'submit',{id:c.fixtures[1].id,score:[0,1]},pupil(c.fixtures[1].a));
 const before=structuredClone(c),subs=structuredClone(s.submissions),roster=structuredClone(s.players),others=structuredClone(s.competitions.slice(1));
 const r=request(s,c,'p4');assert.deepEqual(c.entries,before.entries);assert.deepEqual(c.fixtures,before.fixtures);
 review(s,c,r);assert(c.entries.includes('p4'));assert.equal(c.entryRequests.length,0);
 assert.deepEqual(c.fixtures.slice(0,6),before.fixtures);assert.deepEqual(c.teams.slice(0,4),before.teams);assert.deepEqual(s.submissions,subs);assert.deepEqual(s.players,roster);assert.deepEqual(s.competitions.slice(1),others);
 assert.equal(c.fixtures.length,10);assert.equal(new Set(c.fixtures.map(m=>[m.a,m.b].sort().join(':'))).size,10);
 assert.equal(competitionStandings(s,c).find(r=>r.id==='p4').points,0);assert(c.fixtures.slice(6).every(m=>m.bestOf===c.bestOf&&!('round' in m)));
 assert(breakthroughAlerts(s,pupil('p4')).some(e=>e.title==='Entry confirmed'));
 unchanged(s,()=>review(s,c,r),/already been reviewed/);
 act(s,'addLeaguePlayers',{id:c.id,playerIds:['p5']},admin);assert.equal(c.fixtures.length,15);
 for(const t of c.teams)assert.equal(c.fixtures.filter(m=>[m.a,m.b].includes(t.id)).length,5);
});

test('request ownership, duplicate prevention, cancel and decline keep league membership unchanged',()=>{
 const {s,c}=setup(),r=request(s,c,'p4'),before=structuredClone(c.entries);
 unchanged(s,()=>request(s,c,'p4'),/already awaiting/);
 unchanged(s,()=>request(s,c,'p0'),/already entered/);
 unchanged(s,()=>act(s,'requestLeagueEntry',{id:c.id,playerId:'p5'},pupil('p4')),/yourself/);
 unchanged(s,()=>act(s,'cancelLeagueEntryRequest',{id:c.id,playerId:'p4'},pupil('p5')),/yourself/);
 for(const action of ['reviewLeagueEntryRequest','addLeaguePlayers'])unchanged(s,()=>act(s,action,{id:c.id,requestId:r.id,playerId:'p4',playerIds:['p4'],decision:'approve'},pupil('p4')),/Administrator/);
 unchanged(s,()=>request(s,c,'missing'),/registered/);
 unchanged(s,()=>act(s,'requestLeagueEntry',{id:c.id},admin),/registered/);
 review(s,c,r,'decline');assert.deepEqual(c.entries,before);assert(breakthroughAlerts(s,pupil('p4')).some(e=>e.title==='League entry request declined'));
 request(s,c,'p4');act(s,'cancelLeagueEntryRequest',{id:c.id},pupil('p4'));assert.equal(c.entryRequests.length,0);assert.deepEqual(c.entries,before);
 for(const ids of [[],['p4','p4'],['p4','missing'],['p0'],['p4','p5']])unchanged(s,()=>act(s,'addLeaguePlayers',{id:c.id,playerIds:ids},admin));
 for(const action of ['requestLeagueEntry','addLeaguePlayers'])unchanged(s,()=>act(s,action,{id:'singles-knockout',playerIds:['p4']},action==='requestLeagueEntry'?pupil('p4'):admin),/leagues only/);
});

test('closed league requests can be approved before drawing; reopening and normal entry clears the old request',()=>{
 const s=initialState(),c=s.competitions[0],id=s.players[0].id;
 unchanged(s,()=>request(s,c,id),/Entries are open/);
 act(s,'closeEntries',{id:c.id},admin);const r=request(s,c,id);review(s,c,r);assert.deepEqual(c.entries,[id]);assert.equal(c.status,'closed');assert.equal(c.teams.length,0);
 const other=s.players[1].id;request(s,c,other);act(s,'reopenEntries',{id:c.id},admin);act(s,'enterCompetitions',{ids:[c.id]},pupil(other));assert.equal(c.entryRequests.length,0);
 act(s,'drawCompetition',{id:c.id},admin);assert.equal(c.fixtures.length,1);
});

test('pairs late entry approves two waiting individuals together without redrawing or changing results',()=>{
 const {s,c}=setup('pairs');act(s,'recordResult',{id:c.fixtures[0].id,score:[1,0]},admin);const before=structuredClone(c);
 const a=request(s,c,'p4');unchanged(s,()=>review(s,c,a),/another waiting player/);unchanged(s,()=>act(s,'addLeaguePlayers',{id:c.id,playerIds:['p4']},admin),/two new players/);
 request(s,c,'p5');review(s,c,a,'approve',{partnerId:'p5'});
 assert.deepEqual(c.teams.slice(0,2),before.teams);assert.deepEqual(c.fixtures.slice(0,1),before.fixtures);assert.deepEqual(c.teams.at(-1).members,['p4','p5']);assert.equal(c.entryRequests.length,0);assert.equal(c.fixtures.length,3);
 act(s,'addLeaguePlayers',{id:c.id,playerIds:['p6','p7']},admin);assert.equal(c.fixtures.length,6);assert.equal(c.teams.length,4);
 for(const id of ['p4','p5'])assert(breakthroughAlerts(s,pupil(id)).some(e=>e.title==='Entry confirmed'));
});

test('late entry honours existing withdrawals, saved match settings and encrypted backup validation',()=>{
 const {s,c}=setup();act(s,'withdrawPlayer',{competitionId:c.id,playerId:'p0',reason:'Leaving the competition'},admin);
 const old=structuredClone(c.fixtures);act(s,'settings',{frames:5,winPoints:8},admin);
 request(s,c,'p4');const pending=openBackup(sealBackup(s,7,'late-entry-secret'),'late-entry-secret');assert.equal(pending.competitions[0].entryRequests[0].playerId,'p4');
 act(s,'addLeaguePlayers',{id:c.id,playerIds:['p4']},admin);assert.deepEqual(c.fixtures.slice(0,6),old);
 const walkover=c.fixtures.find(m=>[m.a,m.b].includes('p0')&&[m.a,m.b].includes('p4'));assert.equal(walkover.winner,'p4');assert(walkover.walkover);assert.equal(walkover.bestOf,1);assert.equal(c.winPoints,3);
 assert.doesNotThrow(()=>validateBackupState(structuredClone(s)));
 const bad=structuredClone(pending);bad.competitions[0].entryRequests.push({...bad.competitions[0].entryRequests[0],id:'another'});assert.throws(()=>validateBackupState(bad),/Invalid/);
});

test('late entry requests persist privately across clients and revision races, with atomic recovery snapshots',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-late-entries-session-secret-32-characters'},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const call=async(route,body,headers={})=>{const response=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',...headers},body:body&&JSON.stringify(body)});return {...response,data:JSON.parse(response.body)};};
 const action=(action,payload,headers=owner,revision=DB.sql.prepare('SELECT revision FROM club_state WHERE id=1').get().revision)=>call('action',{action,payload,revision},headers);
 try{
  await call('state');await action('addPlayers',{names:'Late A\nLate B'});const pins=await action('pins',{}),players=pins.data.state.players;
  const sessions=[];for(let i=0;i<players.length;i++){const login=await call('login',{id:players[i].id,pin:pins.data.pins[i].pin});sessions.push({cookie:login.headers['Set-Cookie'].split(';')[0]});}
  for(const p of players.slice(0,2))assert.equal((await action('addLeaguePlayers',{id:'full-league',playerIds:[p.id]})).statusCode,200);
  await action('drawCompetition',{id:'full-league'});
  const late=players[2].id,other=players[3].id;
  const requested=await action('requestLeagueEntry',{id:'full-league'},sessions[2]);assert.equal(requested.statusCode,200);
  assert.equal(requested.data.state.competitions[0].entryRequests.length,1);
  const publicState=await call('state'),otherState=await call('state',undefined,sessions[3]);assert.deepEqual(publicState.data.state.competitions[0].entryRequests,[]);assert.deepEqual(otherState.data.state.competitions[0].entryRequests,[]);
  await action('requestLeagueEntry',{id:'full-league'},sessions[3]);
  const current=await call('state',undefined,owner),r=current.data.state.competitions[0].entryRequests.find(r=>r.playerId===late);
  const review={id:'full-league',requestId:r.id,playerId:late,decision:'approve'};
  assert.equal((await action('reviewLeagueEntryRequest',review,sessions[2])).statusCode,400);
  const oldRevision=current.data.revision;
  const raced=await Promise.all([action('reviewLeagueEntryRequest',review,owner,oldRevision),action('addLeaguePlayers',{id:'full-league',playerIds:[other]},owner,oldRevision)]);
  assert.deepEqual(raced.map(r=>r.statusCode).sort(),[200,409]);
  const snapshot=DB.sql.prepare('SELECT data FROM club_backups WHERE revision=?').get(oldRevision);assert(snapshot);
  const recovered=openBackup(JSON.parse(snapshot.data),env.SESSION_SECRET);assert.equal(recovered.competitions[0].entries.length,2);assert.equal(recovered.competitions[0].entryRequests.length,2);
  const latest=await call('state',undefined,owner),c=latest.data.state.competitions[0];assert.equal(c.entries.length,3);assert.equal(c.fixtures.length,3);assert.equal(c.entryRequests.length,1);assert(!latest.body.includes('pinHash'));
  const roster=await action('addPlayers',{names:'No account'}),rosterOnly=roster.data.state.players.at(-1).id;
  assert.equal((await action('addLeaguePlayers',{id:'full-league',playerIds:[rosterOnly]})).statusCode,400);
 }finally{DB.sql.close();}
});

test('pending requests survive a draw and prevent a format change that would strand applicants',()=>{
 const s=initialState(),c=s.competitions[0],ids=s.players.map(p=>p.id);
 for(const id of ids)act(s,'enterCompetition',{id:c.id},pupil(id));
 act(s,'addPlayers',{names:'Later Player'},admin);const late=s.players.at(-1).id;
 act(s,'closeEntries',{id:c.id},admin);const r=request(s,c,late);
 unchanged(s,()=>act(s,'editCompetition',{id:c.id,name:'Changed name',format:'knockout'},admin),/Review pending/);
 act(s,'drawCompetition',{id:c.id},admin);assert.equal(c.entryRequests[0].id,r.id);review(s,c,r);assert.equal(c.entries.length,3);assert.equal(c.fixtures.length,3);
 const other=s.competitions[2];act(s,'closeEntries',{id:other.id},admin);request(s,other,late);act(s,'cancelLeagueEntryRequest',{id:other.id},pupil(late));
 act(s,'editCompetition',{id:other.id,format:'knockout'},admin);assert.equal(other.entryRequests,undefined);assert.doesNotThrow(()=>validateBackupState(structuredClone(s)));
});
