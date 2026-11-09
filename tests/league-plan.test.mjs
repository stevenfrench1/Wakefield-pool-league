import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,leaguePlan} from '../lib/domain.mjs';
test('next opponent follows saved round-robin order and keeps every unplayed fixture available',()=>{
 const s=initialState(true),id=s.divisions[0].players[0];s.league.forEach(m=>{m.status='open';delete m.score;});
 const original=JSON.stringify(s);const plan=leaguePlan(s,id);assert.equal(JSON.stringify(s),original);assert.equal(plan.remaining.length,s.divisions[0].players.length-1);
 assert(plan.remaining.every(m=>[m.a,m.b].includes(id)));assert.equal(plan.next.round,Math.min(...plan.remaining.map(m=>m.round)));
 // Playing a later fixture first must not move or block the earlier suggestion.
 const later=plan.remaining.at(-1);later.status='complete';later.score=[1,0];assert.equal(leaguePlan(s,id).next.id,plan.next.id);
});
test('pending results are excluded and returned results restore their place',()=>{
 const s=initialState(true),id=s.divisions[0].players[0];const plan=leaguePlan(s,id),next=plan.next;assert(next);
 s.submissions.push({id:'pending',match:next.id,kind:'league'});const pending=leaguePlan(s,id);assert.equal(pending.pending[0].id,next.id);assert(!pending.remaining.some(m=>m.id===next.id));assert.notEqual(pending.next?.id,next.id);
 s.submissions=[];assert.equal(leaguePlan(s,id).next.id,next.id);
});
test('plan respects current division and distinguishes completed from pending and no membership',()=>{
 const s=initialState(true),id=s.divisions[2].players[0];assert.equal(leaguePlan(s,id).division.id,s.divisions[2].id);
 assert.equal(leaguePlan(s,'not-a-player').next,null);assert.equal(leaguePlan(s,'').total,0);
 for(const m of s.league.filter(m=>[m.a,m.b].includes(id)))m.status='complete';const done=leaguePlan(s,id);assert.equal(done.next,null);assert.equal(done.played,done.total);assert.equal(done.pending.length,0);
});
