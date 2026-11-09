import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {scryptSync} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {database} from './sqlite-d1.mjs';
import {createHandler} from '../lib/sites-api.mjs';
import {createNetlifyHandler} from '../lib/netlify-api.mjs';
import {postgresD1} from '../lib/postgres-d1.mjs';
import {exportPlatform,importPlatform,verifyTransfer} from '../lib/platform-migration.mjs';
import {openBackup} from '../lib/backups.mjs';

const transferKey='synthetic-transfer-token-at-least-32-characters';
const targetKey='different-target-session-key-at-least-32-characters';
const salt='0123456789abcdef0123456789abcdef',password='synthetic-admin-password';
const passwordHash=salt+':'+scryptSync(password,salt,32).toString('hex');
async function postgres(){
 const db=new PGlite();
 for(const folder of (await readdir('netlify/database/migrations')).sort())await db.exec(await readFile(`netlify/database/migrations/${folder}/migration.sql`,'utf8'));
 let pending=Promise.resolve();
 const query=async(sql,params)=>{const r=await db.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
 const pool={async query(...args){await pending;return query(...args);},async connect(){const previous=pending;let release;pending=new Promise(r=>{release=r;});await previous;return {query,release};}};
 return {pool,db};
}
async function source(){
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'source-secret-not-transferred-to-target',MIGRATION_TOKEN:transferKey},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const request=async(route,body,headers={})=>{const r=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'source.example','content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return {...r,data:JSON.parse(r.body)};};
 const start=await request('state',undefined,owner);
 const pins=await request('action',{action:'pins',revision:start.data.revision},owner);
 const entry=await request('action',{action:'enterAllPlayers',payload:{id:'full-league'},revision:pins.data.revision},owner);
 const drawn=await request('action',{action:'drawCompetition',payload:{id:'full-league'},revision:entry.data.revision},owner);
 return {DB,env,request,pins,drawn,close(){DB.sql.close();}};
}
const targetEnv={ADMIN_EMAIL:'owner@example.test',ADMIN_PASSWORD_HASH:passwordHash,SESSION_SECRET:targetKey,MIGRATION_TOKEN:transferKey,MIGRATION_SOURCE_URL:'https://source.example'};

test('the transfer preserves current PINs, entries, fixed draws and recovery snapshots; replay is idempotent',async()=>{
 const s=await source(),pg=await postgres();
 try{
  s.env.MIGRATION_FROZEN='true';const envelope=await exportPlatform(s.env);
  assert(!JSON.stringify(envelope).includes(s.env.SESSION_SECRET));assert(!JSON.stringify(envelope).includes(s.pins.data.pins[0].pin));
  const summary=await importPlatform(pg.pool,envelope,transferKey,targetKey);assert.equal(summary.sourceRevision,s.drawn.data.revision);
  const row=(await pg.pool.query('SELECT * FROM club_state')).rows[0],before=JSON.parse(s.DB.sql.prepare('SELECT data FROM club_state').get().data),after=JSON.parse(row.data);
  assert.deepEqual(after.players,before.players);assert.deepEqual(after.competitions,before.competitions);assert.deepEqual(after.league,before.league);assert.deepEqual(after.submissions,before.submissions);assert.notEqual(after.sessionVersion,before.sessionVersion);
  const snapshots=(await pg.pool.query('SELECT * FROM club_backups')).rows;assert.equal(snapshots.length,s.DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n);
  for(const b of snapshots){const migrated=openBackup(JSON.parse(b.data),targetKey),old=JSON.parse(s.DB.sql.prepare('SELECT data FROM club_backups WHERE id = ?').get(b.id).data);assert.deepEqual(migrated,openBackup(old,s.env.SESSION_SECRET));}
  const replay=await importPlatform(pg.pool,envelope,transferKey,targetKey);assert.equal(replay.alreadyImported,true);assert.equal((await pg.pool.query('SELECT * FROM club_state')).rows[0].revision,row.revision);
 }finally{s.close();await pg.db.close();}
});
test('live-source, tampered and nonempty-destination transfers fail without changing either club',async()=>{
 const s=await source(),pg=await postgres();
 try{
  const live=await exportPlatform(s.env);assert.throws(()=>verifyTransfer(live,transferKey),/paused/);
  s.env.MIGRATION_FROZEN='true';const envelope=await exportPlatform(s.env),bad=structuredClone(envelope);bad.data.revision++;assert.throws(()=>verifyTransfer(bad,transferKey),/authentication/);
  await pg.pool.query('INSERT INTO club_state (id, revision, data) VALUES (1, 99, $1)',['existing-club']);
  await assert.rejects(importPlatform(pg.pool,envelope,transferKey,targetKey),/not been overwritten/);
  assert.equal((await pg.pool.query('SELECT * FROM club_state')).rows[0].data,'existing-club');assert.equal((await pg.pool.query('SELECT * FROM club_backups')).rows.length,0);
  assert.equal(s.DB.sql.prepare('SELECT revision FROM club_state').get().revision,s.drawn.data.revision);
 }finally{s.close();await pg.db.close();}
});
test('a failed import rolls back the state, snapshots and completion marker together',async()=>{
 const s=await source(),pg=await postgres();
 try{
  s.env.MIGRATION_FROZEN='true';const envelope=await exportPlatform(s.env);
  const failing={async connect(){const c=await pg.pool.connect();return {release:c.release,query(sql,params){if(sql.startsWith('INSERT INTO club_backups'))throw Error('Synthetic write failure');return c.query(sql,params);}};}};
  await assert.rejects(importPlatform(failing,envelope,transferKey,targetKey),/Synthetic/);
  for(const table of ['club_state','club_backups','club_platform'])assert.equal((await pg.pool.query('SELECT * FROM '+table)).rows.length,0);
 }finally{s.close();await pg.db.close();}
});
test('source export is token-protected; pausing entries also blocks admin writes and PIN resets',async()=>{
 const s=await source();
 try{
  s.env.MIGRATION_FROZEN='true';const revision=s.drawn.data.revision;
  assert.equal((await s.request('migration-export',{})).statusCode,403);
  const exported=await s.request('migration-export',{}, {authorization:'Bearer '+transferKey});assert.equal(exported.statusCode,200);assert.equal(exported.data.data.writesFrozen,true);
  const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':s.env.ADMIN_EMAIL};
  for(const action of ['pins','addPlayers','enterCompetition'])assert.equal((await s.request('action',{action,payload:{names:'Late player',id:'pairs-league'},revision},owner)).statusCode,503);
  assert.equal(s.DB.sql.prepare('SELECT revision FROM club_state').get().revision,revision);
 }finally{s.close();}
});
test('the Netlify API serves the transferred club, authenticates original pupil PINs and admin password, ignores spoofed owner headers',async()=>{
 const s=await source(),pg=await postgres();
 try{
  let fetches=0;s.env.MIGRATION_FROZEN='true';
  const handle=createNetlifyHandler({pool:pg.pool,env:targetEnv,fetchSource:async(url,options)=>{fetches++;assert.equal(String(url),'https://source.example/api/migration-export');assert.equal(options.headers.Authorization,'Bearer '+transferKey);return Response.json(await exportPlatform(s.env));}});
  const req=async(route,body,cookie='',extra={})=>{const r=await handle(new Request('https://target.example/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie,...extra},body:body?JSON.stringify(body):undefined}),{ip:'192.0.2.1'});return {status:r.status,headers:r.headers,data:await r.json()};};
  assert.equal((await req('config')).status,503);assert.equal((await req('migration-import',{})).status,403);assert.equal(fetches,0);
  const imported=await req('migration-import',{},'',{authorization:'Bearer '+transferKey});assert.equal(imported.status,200);
  assert.equal((await req('config')).data.adminAuth,'password');
  const spoof={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':targetEnv.ADMIN_EMAIL};assert.equal((await req('state',undefined,'',spoof)).data.user,null);
  const login=await req('login',{id:s.pins.data.state.players[0].id,pin:s.pins.data.pins[0].pin});assert.equal(login.status,200);const pupil=login.headers.get('set-cookie').split(';')[0];
  const state=await req('state',undefined,pupil);assert.equal(state.data.user.role,'player');assert(!JSON.stringify(state.data.state).includes('pinHash'));
  assert.equal((await req('login',{role:'admin',password:'wrong'},'',spoof)).status,401);
  const admin=await req('login',{role:'admin',password});assert.equal(admin.status,200);const adminCookie=admin.headers.get('set-cookie').split(';')[0];
  assert.equal((await req('health',undefined,adminCookie)).data.administrator,true);
  assert.equal((await req('backups',undefined,pupil)).status,403);assert((await req('backups',undefined,adminCookie)).data.backups.length>0);
  const entry=await req('action',{action:'enterCompetitions',payload:{ids:['pairs-league','pairs-knockout']},revision:state.data.revision},pupil);assert.equal(entry.status,200);assert.equal(entry.data.state.competitions[2].entries.length,1);
  assert.equal((await req('action',{action:'enterCompetition',payload:{id:'singles-knockout'},revision:state.data.revision},pupil)).status,409);
  const match=entry.data.state.competitions[0].fixtures[0];
  const submitted=await req('action',{action:'submit',payload:{id:match.id,score:[1,0]},revision:entry.data.revision},pupil);assert.equal(submitted.status,200);
  const approved=await req('action',{action:'approve',payload:{id:submitted.data.state.submissions[0].id},revision:submitted.data.revision},adminCookie);assert.equal(approved.status,200);assert.equal(approved.data.state.competitions[0].fixtures[0].status,'complete');
  const corrected=await req('action',{action:'correctResult',payload:{id:match.id,score:[0,1],reason:'Synthetic correction'},revision:approved.data.revision},adminCookie);assert.equal(corrected.status,200);
  const snapshots=await req('backups',undefined,adminCookie),backupId=snapshots.data.backups[0].id;
  const preview=await req('restore-preview',{backupId},adminCookie);assert.equal(preview.status,200);
  const restored=await req('restore',{backupId,revision:preview.data.revision,confirmation:'RESTORE'},adminCookie);assert.equal(restored.status,200);
  const restoredAdmin=restored.headers.get('set-cookie').split(';')[0];assert.equal((await req('health',undefined,restoredAdmin)).data.administrator,true);
  assert.equal((await req('state',undefined,pupil)).data.user,null);assert.equal((await req('state',undefined,adminCookie)).data.user,null);
  assert.equal((await req('login',{role:'admin',password},'',{origin:'https://evil.example'})).status,403);
  const invalid=createNetlifyHandler({pool:pg.pool,env:{...targetEnv,ADMIN_PASSWORD_HASH:''}});assert.equal((await invalid(new Request('https://target.example/api/config'))).status,503);
 }finally{s.close();await pg.db.close();}
});
test('PostgreSQL revision checks and recovery snapshots stay atomic for two stale writers',async()=>{
 const s=await source(),pg=await postgres();
 try{
  s.env.MIGRATION_FROZEN='true';await importPlatform(pg.pool,await exportPlatform(s.env),transferKey,targetKey);
  const DB=postgresD1(pg.pool),row=await DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();
  const save=id=>DB.batch([
   DB.prepare('INSERT INTO club_backups (id, revision, created_at, reason, data) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM club_state WHERE id = 1 AND revision = ?)').bind(id,row.revision,'now','test','encrypted',row.revision),
   DB.prepare('UPDATE club_state SET data = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(row.data,row.revision)
  ]);
  const results=await Promise.all([save('writer-a'),save('writer-b')]);assert.deepEqual(results.map(r=>r[1].meta.changes).sort(),[0,1]);
  assert.equal((await pg.pool.query("SELECT * FROM club_backups WHERE id IN ('writer-a','writer-b')")).rows.length,1);
 }finally{s.close();await pg.db.close();}
});
