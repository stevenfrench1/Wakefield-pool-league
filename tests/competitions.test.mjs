import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,act,ensureCompetitions,competitionMatches,competitionStandings,isMatchParticipant,sideName,allMatches} from '../lib/domain.mjs';
const admin={role:'admin',name:'Mr French'};
function setup(n=8){const s=initialState();s.players=Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,rating:0}));return s;}
function enterAll(s,id){for(const p of s.players)act(s,'enterCompetition',{id},{role:'player',id:p.id});}
function approveAll(s,c){for(const m of competitionMatches(c))if(m.status==='open'){act(s,'submit',{id:m.id,score:[Math.ceil(m.bestOf/2),0]},admin);act(s,'approve',{id:s.submissions.at(-1).id},admin);}}
test('one pupil can join several open competitions atomically without affecting the roster, partners or other entries',()=>{
 const s=setup(),p={role:'player',id:'p0'},ids=s.competitions.map(c=>c.id),roster=structuredClone(s.players);
 s.players[0].pinHash='private-test-hash';roster[0].pinHash='private-test-hash';
 act(s,'enterCompetitions',{ids:[...ids,ids[0]]},p);
 for(const c of s.competitions){assert.deepEqual(c.entries,['p0']);assert.equal(c.teams.length,0);assert.equal(c.fixtures.length,0);assert.equal(c.status,'open');}
 assert.deepEqual(s.players,roster);assert.equal(s.activity[0].text,'Competition entries added');
 act(s,'enterCompetitions',{ids},p);for(const c of s.competitions)assert.deepEqual(c.entries,['p0']);
 act(s,'leaveCompetition',{id:ids[0]},p);assert.equal(s.competitions[0].entries.length,0);assert.deepEqual(s.competitions[1].entries,['p0']);
});
test('batch joining rejects closed/drawn/missing competitions and impersonation before adding any entry',()=>{
 const p={role:'player',id:'p0'};
 for(const status of ['closed','drawn']){
  const s=setup();s.competitions[1].status=status;const before=structuredClone(s);
  assert.throws(()=>act(s,'enterCompetitions',{ids:['full-league','singles-knockout']},p),/closed/);assert.deepEqual(s,before);
 }
 const s=setup(),before=structuredClone(s);
 for(const payload of [{ids:[]},{ids:['full-league','missing']},{ids:[null]},{ids:Array(33).fill('full-league')},{ids:['full-league'],playerId:'p1'}]){
  assert.throws(()=>act(s,'enterCompetitions',payload,p));assert.deepEqual(s,before);
 }
 for(const user of [null,admin,{role:'player',id:'missing'}]){assert.throws(()=>act(s,'enterCompetitions',{ids:['full-league']},user));assert.deepEqual(s,before);}
});
test('42 full-league entrants get exactly 861 unique pairings and 41 opponents each',()=>{
 const s=setup(42);enterAll(s,'full-league');act(s,'drawCompetition',{id:'full-league'},admin);const c=s.competitions[0];assert.equal(c.fixtures.length,861);assert.equal(new Set(c.fixtures.map(m=>[m.a,m.b].sort().join(':'))).size,861);
 for(const p of s.players)assert.equal(c.fixtures.filter(m=>isMatchParticipant(s,m,p.id)).length,41);
 const rounds=new Set(c.fixtures.map(m=>m.round));assert.equal(rounds.size,41);
 for(const r of rounds){const ids=c.fixtures.filter(m=>m.round===r).flatMap(m=>[m.a,m.b]);assert.equal(new Set(ids).size,42);}
});
test('entry requires a registered identity, rejects duplicates and impersonation, and allows withdrawal only before closing',()=>{
 const s=setup();const p={role:'player',id:'p0'},id='full-league';
 assert.throws(()=>act(s,'enterCompetition',{id},null),/Sign in/);assert.throws(()=>act(s,'enterCompetition',{id},{role:'player',id:'missing'}),/registered/);
 assert.throws(()=>act(s,'enterCompetition',{id,playerId:'p1'},p),/yourself/);act(s,'enterCompetition',{id},p);assert.throws(()=>act(s,'enterCompetition',{id},p),/already/);act(s,'leaveCompetition',{id},p);assert.equal(s.competitions[0].entries.length,0);
 act(s,'enterCompetition',{id},p);act(s,'closeEntries',{id},admin);assert.throws(()=>act(s,'enterCompetition',{id},{role:'player',id:'p1'}),/closed/);assert.throws(()=>act(s,'leaveCompetition',{id},p),/closed/);
 act(s,'enterCompetition',{id,playerId:'p1'},admin);act(s,'reopenEntries',{id},admin);act(s,'enterCompetition',{id},{role:'player',id:'p2'});act(s,'drawCompetition',{id},admin);
 for(const a of ['enterCompetition','leaveCompetition','reopenEntries','drawCompetition'])assert.throws(()=>act(s,a,{id,playerId:'p3'},admin),/closed|fixed/);
});
test('pairs draw blocks odd counts without mutation; admin can add a reserve while closed; separate entry lists remain independent',()=>{
 const s=setup(9);const a=s.competitions[2],b=s.competitions[3];for(const p of s.players.slice(0,7))act(s,'enterCompetition',{id:a.id},{role:'player',id:p.id});
 act(s,'closeEntries',{id:a.id},admin);const before=structuredClone(a);assert.throws(()=>act(s,'drawCompetition',{id:a.id},admin),/One more player/);assert.deepEqual(a,before);
 act(s,'enterCompetition',{id:a.id,playerId:'p7'},admin);act(s,'drawCompetition',{id:a.id},admin);
 assert.equal(a.teams.length,4);assert.equal(a.fixtures.length,6);assert.deepEqual(a.teams.flatMap(t=>t.members).sort(),s.players.slice(0,8).map(p=>p.id).sort());assert.equal(new Set(a.teams.flatMap(t=>t.members)).size,8);assert(a.teams.every(t=>t.members.length===2));assert.equal(b.entries.length,0);
 for(const p of s.players.slice(1))act(s,'enterCompetition',{id:b.id},{role:'player',id:p.id});act(s,'drawCompetition',{id:b.id},admin);assert.equal(b.teams.length,4);assert(b.teams.every(t=>!a.teams.some(x=>x.id===t.id)));assert.deepEqual(b.teams.flatMap(t=>t.members).sort(),s.players.slice(1).map(p=>p.id).sort());
});
test('either pair member can submit, outsiders cannot; approval is mandatory and updates pair standings only once',()=>{
 const s=setup();enterAll(s,'pairs-league');act(s,'drawCompetition',{id:'pairs-league'},admin);const c=s.competitions[2],m=c.fixtures[0],team=c.teams.find(t=>t.id===m.a),other=s.players.find(p=>!isMatchParticipant(s,m,p.id));s.settings.approval=false;
 assert.throws(()=>act(s,'submit',{id:m.id,score:[1,0]},{role:'player',id:other.id}),/own matches/);
 for(const id of team.members){act(s,'submit',{id:m.id,score:[1,0]},{role:'player',id});assert.equal(m.status,'open');assert.equal(competitionStandings(s,c)[0].points,0);act(s,'reject',{id:s.submissions[0].id},admin);}
 act(s,'submit',{id:m.id,score:[1,0]},{role:'player',id:team.members[1]});assert.throws(()=>act(s,'submit',{id:m.id,score:[1,0]},{role:'player',id:team.members[0]}),/already/);act(s,'approve',{id:s.submissions[0].id},admin);assert.equal(competitionStandings(s,c)[0].id,team.id);assert.equal(competitionStandings(s,c)[0].points,3);assert.match(sideName(s,team.id),/ & /);assert.throws(()=>act(s,'submit',{id:m.id,score:[1,0]},admin),/no longer/);
});
test('singles and pairs knockouts handle all draw sizes with byes, progression and correct final lengths',()=>{
 for(const mode of ['singles','pairs'])for(let sides=2;sides<=32;sides++){
  const s=setup(mode==='pairs'?sides*2:sides),c=s.competitions.find(c=>c.mode===mode&&c.format==='knockout');act(s,'editCompetition',{id:c.id,bestOf:3,finalBestOf:5},admin);enterAll(s,c.id);act(s,'drawCompetition',{id:c.id},admin);const teamSnapshot=structuredClone(c.teams);
  for(const round of c.rounds)for(const m of round)if(m.status==='open'){act(s,'submit',{id:m.id,score:[Math.ceil(m.bestOf/2),0]},admin);act(s,'approve',{id:s.submissions[0].id},admin);}
  assert(c.rounds.at(-1)[0].winner);assert.equal(c.rounds.at(-1)[0].bestOf,5);assert.equal(competitionMatches(c).filter(m=>m.status==='complete').length,sides-1);assert.deepEqual(c.teams,teamSnapshot);
 }
});
test('consolation cups preserve pairs and include actual first-round losers, never byes',()=>{
 const s=setup(10);const c=s.competitions[3];act(s,'editCompetition',{id:c.id,consolation:true},admin);enterAll(s,c.id);act(s,'drawCompetition',{id:c.id},admin);
 for(const m of c.rounds[0])if(m.status==='open'){act(s,'submit',{id:m.id,score:[1,0]},admin);act(s,'approve',{id:s.submissions[0].id},admin);}
 // Five pairs have only one played first-round tie, so a single loser cannot form a plate.
 assert.equal(c.plate,undefined);assert(c.plateCreated);
 const t=setup(16),cup=t.competitions[3];act(t,'editCompetition',{id:cup.id,consolation:true},admin);enterAll(t,cup.id);act(t,'drawCompetition',{id:cup.id},admin);
 for(const m of cup.rounds[0]){act(t,'submit',{id:m.id,score:[1,0]},admin);act(t,'approve',{id:t.submissions[0].id},admin);}
 assert(cup.plate);assert.deepEqual(cup.plate.rounds[0].flatMap(m=>[m.a,m.b]).filter(Boolean).sort(),cup.rounds[0].map(m=>m.b).sort());
 for(const round of cup.plate.rounds)for(const m of round)if(m.status==='open'){act(t,'submit',{id:m.id,score:[1,0]},admin);act(t,'approve',{id:t.submissions[0].id},admin);}assert(cup.plate.rounds.at(-1)[0].winner);
});
test('per-competition settings are validated and fixed at draw; legacy state is preserved by additive defaults',()=>{
 const s=initialState(true);delete s.competitions;const before=structuredClone(s);ensureCompetitions(s);assert.deepEqual({...s,competitions:undefined},{...before,competitions:undefined});
 const c=s.competitions[0];assert.throws(()=>act(s,'editCompetition',{id:c.id,bestOf:2},admin),/odd/);assert.throws(()=>act(s,'drawCompetition',{id:c.id},{role:'player',id:s.players[0].id}),/Administrator/);act(s,'editCompetition',{id:c.id,bestOf:7,winPoints:5,rules:'House rules'},admin);enterAll(s,c.id);act(s,'drawCompetition',{id:c.id},admin);assert(c.fixtures.every(m=>m.bestOf===7));act(s,'settings',{frames:1,winPoints:1},admin);assert.equal(c.bestOf,7);assert.equal(c.winPoints,5);assert.equal(c.rules,'House rules');assert.deepEqual(s.league,before.league);assert.deepEqual(s.cups,before.cups);assert.equal(allMatches(s).length,before.league.length+before.cups.flatMap(c=>c.rounds.flat()).length+861);
});

test('admin bulk entry preserves entrants, is repeatable, works while closed, and cannot alter a fixed draw',()=>{
 const s=setup(42),c=s.competitions[0],player={role:'player',id:s.players[0].id};
 act(s,'enterCompetition',{id:c.id},player);const first=c.entries[0];
 assert.throws(()=>act(s,'enterAllPlayers',{id:c.id},player),/Administrator/);assert.equal(c.entries.length,1);
 act(s,'closeEntries',{id:c.id},admin);act(s,'enterAllPlayers',{id:c.id},admin);
 assert.equal(c.entries[0],first);assert.equal(c.entries.length,42);assert.equal(new Set(c.entries).size,42);assert.equal(c.status,'closed');assert.equal(c.fixtures.length,0);assert.equal(c.teams.length,0);
 const entered=[...c.entries];act(s,'enterAllPlayers',{id:c.id},admin);assert.deepEqual(c.entries,entered);
 act(s,'drawCompetition',{id:c.id},admin);const drawn=structuredClone(c);s.players.push({id:'late',name:'Late player',rating:0});assert.throws(()=>act(s,'enterAllPlayers',{id:c.id},admin),/fixed/);assert.deepEqual(c,drawn);
});

test('selected entries are admin-only, validate the entire group before adding, and preserve existing entries',()=>{
 const s=setup(8),c=s.competitions[0],player={role:'player',id:'p0'};act(s,'enterCompetition',{id:c.id},player);
 for(const ids of [[],null,'p1',['p1','missing'],['p2',null],Array(65).fill('p1')]){const before=[...c.entries];assert.throws(()=>act(s,'enterSelectedPlayers',{id:c.id,playerIds:ids},admin),/Select/);assert.deepEqual(c.entries,before);}
 assert.throws(()=>act(s,'enterSelectedPlayers',{id:c.id,playerIds:['p1']},player),/Administrator/);
 act(s,'closeEntries',{id:c.id},admin);act(s,'enterSelectedPlayers',{id:c.id,playerIds:['p0','p2','p3','p2']},admin);assert.deepEqual(c.entries,['p0','p2','p3']);assert.equal(c.status,'closed');assert.equal(c.fixtures.length,0);
 act(s,'drawCompetition',{id:c.id},admin);assert.throws(()=>act(s,'enterSelectedPlayers',{id:c.id,playerIds:['p4']},admin),/fixed/);assert.deepEqual(c.entries,['p0','p2','p3']);
});

test('every drawn competition can be renamed and have rules edited without changing its ID, draw or results',()=>{
 for(const index of [0,1,2,3]){
  const s=setup(),c=s.competitions[index];act(s,'enterAllPlayers',{id:c.id},admin);act(s,'drawCompetition',{id:c.id},admin);
  const m=competitionMatches(c).find(m=>m.status==='open');act(s,'submit',{id:m.id,score:[1,0]},admin);act(s,'approve',{id:s.submissions[0].id},admin);const before=structuredClone(c);
  assert.throws(()=>act(s,'editCompetition',{id:c.id,name:'Pupil rename'},{role:'player',id:'p0'}),/Administrator/);
  act(s,'editCompetition',{id:c.id,name:'Renamed competition',rules:'Updated school rules'},admin);
  assert.equal(c.name,'Renamed competition');assert.equal(c.rules,'Updated school rules');assert.deepEqual({...c,name:before.name,rules:before.rules},before);
  for(const payload of [{bestOf:7},{format:c.format==='league'?'knockout':'league'},{mode:c.mode==='pairs'?'singles':'pairs'},{winPoints:9},{consolation:!c.consolation}])assert.throws(()=>act(s,'editCompetition',{id:c.id,...payload},admin),/fixed/);
 }
});
