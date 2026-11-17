import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,playerMatchRecord,act} from '../lib/domain.mjs';

const admin={role:'admin',name:'Mr French'};
function sample(){
 const s=initialState();
 s.players=Array.from({length:5},(_,i)=>({id:'record-'+i,name:['Alex Morgan','Ben Taylor','Sam Carter','Noah Lewis','Josh Reed'][i],rating:0}));
 const [a,b,c,d,e]=s.players.map(p=>p.id);
 const match=(id,x,y,score,resultAt,extra={})=>({id,a:x,b:y,status:'complete',score,bestOf:3,resultAt,...extra});
 s.divisions=[{id:'record-division',name:'Earlier division',players:[a,b,c,d,e]}];
 s.league=[match('league-result',a,b,[1,0],'2026-11-16T12:00:00Z',{division:'record-division'}),
  match('pending-result',a,c,null,undefined,{status:'open'}),
  match('walkover-result',a,d,[1,0],'2026-11-17T12:00:00Z',{walkover:{playerId:d}}),
  match('void-result',a,e,null,undefined,{status:'void'}),
  match('tied-invalid-result',a,e,[0,0],'2026-11-17T12:00:00Z'),
  match('unrelated-result',b,e,[1,0],'2026-11-17T12:00:00Z')];
 s.submissions=[{id:'pending-submission',match:'pending-result',score:[1,0],by:a}];
 s.competitions=[{id:'record-pairs',name:'Pairs league',mode:'pairs',teams:[{id:'pair-bc',members:[b,c]},{id:'pair-ad',members:[a,d]}],
  fixtures:[match('pairs-result','pair-bc','pair-ad',[2,1],'2026-11-15T12:00:00Z')],rounds:[]},
  {id:'record-knockout',name:'Singles cup',mode:'singles',teams:[],fixtures:[],
   rounds:[[match('cup-result',e,a,[0,1],'2026-11-14T12:00:00Z')],[match('bye-result',a,null,null,undefined,{status:'bye'})]],
   plate:{name:'Consolation cup',rounds:[[match('plate-result',a,c,[1,0],'2026-11-13T12:00:00Z')]]}}];
 s.cups=[{id:'earlier-cup',name:'Earlier cup',rounds:[[match('undated-result',b,a,[1,0],undefined)]]}];
 s.history=[{season:'Earlier season',divisions:s.divisions,league:[match('archive-result',a,e,[1,0],'2025-11-12T12:00:00Z'),structuredClone(s.league[0])]}];
 return s;
}

test('player record combines approved singles, pairs, cups, plates and archives without mutating or double counting',()=>{
 const s=sample(),before=JSON.stringify(s),record=playerMatchRecord(s,'record-0');
 assert.equal(JSON.stringify(s),before);
 assert.deepEqual(record.results.map(r=>r.matchId),['league-result','pairs-result','cup-result','plate-result','archive-result','undated-result']);
 assert.equal(record.results.filter(r=>r.outcome==='W').length,4);
 assert.equal(record.results.filter(r=>r.outcome==='L').length,2);
 const pair=record.results.find(r=>r.matchId==='pairs-result');
 assert.deepEqual(pair.opponentIds,['record-1','record-2']);assert.deepEqual(pair.partnerIds,['record-3']);
 assert.deepEqual(pair.score,[1,2]);assert.equal(pair.outcome,'L');assert.equal(pair.mode,'pairs');
 assert.equal(record.results.find(r=>r.matchId==='cup-result').detail,'Semi-final');
 assert.match(record.results.find(r=>r.matchId==='plate-result').detail,/Consolation cup · Final/);
 assert.equal(record.results.at(-1).resultAt,null);
 assert.deepEqual(record.pending,[{matchId:'pending-result',competitionId:'legacy:league'}]);
 assert.deepEqual(record.walkovers.map(r=>r.matchId),['walkover-result']);
 assert(record.competitions.some(c=>c.id==='history:0'));
});

test('competition filters isolate the chosen record and keep pending results and walkovers separate',()=>{
 const s=sample(),pairs=playerMatchRecord(s,'record-0','record-pairs');
 assert.equal(pairs.results.length,1);assert.equal(pairs.results[0].matchId,'pairs-result');
 assert.equal(pairs.walkovers.length,0);assert.equal(pairs.pending.length,0);
 const league=playerMatchRecord(s,'record-0','legacy:league');
 assert.equal(league.results.length,1);assert.equal(league.pending.length,1);assert.equal(league.walkovers.length,1);
 assert.equal(playerMatchRecord(s,'record-0','missing').results.length,0);
 assert.deepEqual(playerMatchRecord(s,'missing'),{competitions:[],results:[],walkovers:[],pending:[]});
});

test('record outcomes immediately reflect an approved correction or reopening without stale results',()=>{
 const s=initialState(),[a,b]=s.players;
 s.league=[{id:'record-correction',a:a.id,b:b.id,status:'open',bestOf:1}];
 act(s,'recordResult',{id:'record-correction',score:[1,0]},admin);
 assert.equal(playerMatchRecord(s,a.id).results[0].outcome,'W');
 assert.equal(playerMatchRecord(s,b.id).results[0].outcome,'L');
 act(s,'correctResult',{id:'record-correction',score:[0,1],reason:'Synthetic correction'},admin);
 assert.equal(playerMatchRecord(s,a.id).results[0].outcome,'L');
 assert.deepEqual(playerMatchRecord(s,b.id).results[0].score,[1,0]);
 act(s,'correctResult',{id:'record-correction',score:null,reason:'Synthetic reopening'},admin);
 assert.equal(playerMatchRecord(s,a.id).results.length,0);
});
