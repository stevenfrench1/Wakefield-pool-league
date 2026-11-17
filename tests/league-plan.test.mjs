import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,leaguePlan,act} from '../lib/domain.mjs';
test('every remaining league opponent is available without a suggested order, including saved rounds',()=>{
 const s=initialState(true),id=s.divisions[0].players[0];s.league.forEach((m,i)=>{m.status='open';m.round=100-i;delete m.score;});
 const original=JSON.stringify(s),plan=leaguePlan(s,id);
 assert.equal(JSON.stringify(s),original);assert.equal(plan.remaining.length,s.divisions[0].players.length-1);
 assert(plan.remaining.every(m=>[m.a,m.b].includes(id)));assert(!('next' in plan));
 const chosen=plan.remaining.at(-1);
 act(s,'submit',{id:chosen.id,score:[1,0]},{role:'player',id});
 assert.equal(leaguePlan(s,id).remaining.length,plan.remaining.length-1);
 assert.equal(leaguePlan(s,id).pending[0].id,chosen.id);
 act(s,'approve',{id:s.submissions[0].id},{role:'admin',name:'Mr French'});
 assert.equal(chosen.status,'complete');assert.equal(leaguePlan(s,id).played,1);
 assert.throws(()=>act(s,'submit',{id:chosen.id,score:[1,0]},{role:'player',id}),/no longer available/);
});
test('pending results cannot be resubmitted and returned results become available again',()=>{
 const s=initialState(true),id=s.divisions[0].players[0];s.league.forEach(m=>{m.status='open';delete m.score;});const chosen=leaguePlan(s,id).remaining[0];assert(chosen);
 act(s,'submit',{id:chosen.id,score:[1,0]},{role:'player',id});
 const pending=leaguePlan(s,id);assert.equal(pending.pending[0].id,chosen.id);assert(!pending.remaining.some(m=>m.id===chosen.id));
 assert.throws(()=>act(s,'submit',{id:chosen.id,score:[1,0]},{role:'player',id}),/already/);
 act(s,'reject',{id:s.submissions[0].id},{role:'admin',name:'Mr French'});
 assert(leaguePlan(s,id).remaining.some(m=>m.id===chosen.id));
});
test('the plan preserves division membership and distinguishes completed, pending and absent players',()=>{
 const s=initialState(true),id=s.divisions[2].players[0];assert.equal(leaguePlan(s,id).division.id,s.divisions[2].id);
 assert.equal(leaguePlan(s,'not-a-player').total,0);assert.equal(leaguePlan(s,'').total,0);
 for(const m of s.league.filter(m=>[m.a,m.b].includes(id)))m.status='complete';
 const done=leaguePlan(s,id);assert.equal(done.remaining.length,0);assert.equal(done.played,done.total);assert.equal(done.pending.length,0);
});
