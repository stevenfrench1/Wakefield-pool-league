import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, createLeague, createCup, applyResult, standings, act, promote } from '../lib/domain.mjs';
const admin={role:'admin',name:'Mr French'};
test('42-player league: four balanced divisions, each pair plays exactly once',()=>{
 const s=initialState(true);assert.deepEqual(s.divisions.map(d=>d.players.length).sort(),[10,10,11,11]);assert.equal(s.league.length,200);
 for(const d of s.divisions){const matches=s.league.filter(m=>m.division===d.id);assert.equal(matches.length,d.players.length*(d.players.length-1)/2);assert.equal(new Set(matches.map(m=>[m.a,m.b].sort().join(':'))).size,matches.length);assert(matches.every(m=>m.a!==m.b));}
});
test('league standings only include completed results, sort by points and frame difference',()=>{
 const s=initialState();createLeague(s);const m=s.league[0];act(s,'submit',{id:m.id,score:[1,0]},admin);assert.equal(standings(s)[0].played,0);act(s,'approve',{id:s.submissions[0].id},admin);assert.equal(standings(s)[0].id,m.a);assert.equal(standings(s)[0].points,3);assert.equal(standings(s)[1].lost,1);
});
test('score validation, duplicate submission and participant authorization',()=>{
 const s=initialState(true),m=s.league.find(m=>m.status==='open');const user={role:'player',id:m.a};
 assert.throws(()=>act(s,'submit',{id:m.id,score:[1,1]},user),/valid/);
 assert.throws(()=>act(s,'submit',{id:m.id,score:[1,0]},{role:'player',id:'stranger'}),/own matches/);
 act(s,'submit',{id:m.id,score:[1,0]},user);assert.throws(()=>act(s,'submit',{id:m.id,score:[1,0]},user),/already/);
 assert.throws(()=>act(s,'approve',{id:s.submissions[0].id},user),/Administrator/);
 act(s,'reject',{id:s.submissions[0].id},admin);act(s,'submit',{id:m.id,score:[0,1]},user);act(s,'approve',{id:s.submissions[0].id},admin);assert.equal(m.winner,m.b);
});
test('best-of-five validates winning threshold and immediate results setting',()=>{
 const s=initialState();s.settings.frames=5;s.settings.approval=false;createLeague(s);const m=s.league[0];
 assert.throws(()=>act(s,'submit',{id:m.id,score:[2,1]},admin),/valid/);
 act(s,'submit',{id:m.id,score:[3,2]},admin);assert.equal(m.status,'complete');assert.equal(s.submissions.length,0);
});
test('every cup size 2–64 produces one champion with no player duplicated and n−1 played matches',()=>{
 for(let n=2;n<=64;n++){
  const s=initialState();s.settings.consolation=false;s.players=Array.from({length:n},(_,i)=>({id:`p${i}`,name:`Player ${i}`}));const cup=createCup(s,'Cup');
  const first=cup.rounds[0].flatMap(m=>[m.a,m.b]).filter(Boolean);assert.equal(first.length,n);assert.equal(new Set(first).size,n);
  let played=0;for(const round of cup.rounds)for(const m of round)if(m.status==='open'){applyResult(s,m.id,[1,0]);played++;}
  assert.equal(played,n-1);assert(cup.rounds.at(-1)[0].winner);
 }
});
test('consolation draw is created once, after opening round completes, and only contains losers',()=>{
 const s=initialState(true);s.cups=[];const c=createCup(s,'Cup');for(const m of c.rounds[0])if(m.status==='open')applyResult(s,m.id,[1,0]);
 assert.equal(s.cups.length,2);const plate=s.cups[1];assert(plate.consolation);const losers=c.rounds[0].filter(m=>m.status==='complete').map(m=>m.b).sort();assert.deepEqual(plate.rounds[0].flatMap(m=>[m.a,m.b]).filter(Boolean).sort(),losers);
 for(const round of plate.rounds)for(const m of round)if(m.status==='open')applyResult(s,m.id,[1,0]);assert.equal(s.cups.length,2);
});
test('new season requires completion, archives results and promotes/relegates without losing players',()=>{
 const s=initialState(true);assert.throws(()=>promote(s),/Complete/);for(const m of s.league)if(m.status==='open')applyResult(s,m.id,[1,0]);
 const old=s.divisions.map(d=>standings(s,d.id).map(r=>r.id));promote(s);assert.equal(s.history.length,1);assert.equal(s.history[0].league.length,200);assert(s.league.every(m=>m.status==='open'));assert(s.divisions[0].players.includes(old[1][0]));assert(s.divisions[1].players.includes(old[0].at(-1)));assert.equal(new Set(s.divisions.flatMap(d=>d.players)).size,42);
});
test('protected settings, invalid names, and existing competition guards',()=>{
 const s=initialState();assert.throws(()=>act(s,'settings',{frames:2},admin),/odd/);assert.throws(()=>act(s,'settings',{logo:'data:image/svg+xml;abc'},admin),/PNG/);assert.throws(()=>act(s,'addPlayers',{names:'George'},admin),/unique/);createLeague(s);assert.throws(()=>act(s,'addPlayers',{names:'Oliver'},admin),/before/);
});
