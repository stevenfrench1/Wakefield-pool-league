import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from './sqlite-d1.mjs';
const built=await readFile('dist/server/index.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(built).toString('base64'));
test('built Worker: independent pupil/admin clients see submitted, approved and corrected results, then recover a snapshot',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'worker-journey-secret-at-least-32-characters'},owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'};
 async function call(route,body,headers={}){const response=await worker.fetch(new Request('https://club.example/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','Origin':'https://club.example','cf-connecting-ip':'192.0.2.1',...headers},body:body?JSON.stringify(body):undefined}),env);return {status:response.status,headers:response.headers,data:await response.json()};}
 async function action(action,payload={},headers=owner){const revision=(await call('revision')).data.revision;return call('action',{action,payload,revision},headers);}
 try{
  assert.equal((await call('health')).data.database,true);await call('state');await action('addPlayers',{names:'Synthetic A\nSynthetic B'});const pins=await action('pins'),p=pins.data.state.players[0];const login=await call('login',{id:p.id,pin:pins.data.pins[0].pin});assert.equal(login.status,200);const pupil={cookie:login.headers.get('set-cookie').split(';')[0]};
  await action('enterAllPlayers',{id:'full-league'});const drawn=await action('drawCompetition',{id:'full-league'}),m=drawn.data.state.competitions[0].fixtures.find(m=>[m.a,m.b].includes(p.id));
  assert.equal((await action('submit',{id:m.id,score:[1,0]},pupil)).status,200);const adminView=await call('state',undefined,owner);assert.equal(adminView.data.state.submissions.length,1);assert.equal(adminView.data.state.competitions[0].fixtures.find(x=>x.id===m.id).status,'open');
  const approved=await action('approve',{id:adminView.data.state.submissions[0].id});assert.equal(approved.status,200);const pupilView=await call('state',undefined,pupil);assert.equal(pupilView.data.state.competitions[0].fixtures.find(x=>x.id===m.id).status,'complete');assert.equal(pupilView.data.state.submissions.length,0);assert(!JSON.stringify(pupilView.data).includes('pinHash'));
  const corrected=await action('correctResult',{id:m.id,score:[0,1],reason:'Both sides confirmed'});assert.equal(corrected.status,200);assert.deepEqual((await call('state',undefined,pupil)).data.state.competitions[0].fixtures.find(x=>x.id===m.id).score,[0,1]);
  const saved=(await call('backups',undefined,owner)).data.backups.find(b=>b.reason==='correctResult');const preview=await call('restore-preview',{backupId:saved.id},owner);assert.equal(preview.status,200);const restored=await call('restore',{backupId:saved.id,revision:preview.data.revision,confirmation:'RESTORE'},owner);assert.equal(restored.status,200);assert.deepEqual(restored.data.state.competitions[0].fixtures.find(x=>x.id===m.id).score,[1,0]);assert.equal((await call('state',undefined,pupil)).data.user,null);
  const check=await call('health',undefined,owner);assert.equal(check.data.summary.playersWithPins,4);assert(check.data.recoverySnapshots>0);
 }finally{DB.sql.close();}
});
