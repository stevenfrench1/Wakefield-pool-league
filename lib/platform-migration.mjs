import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {sealBackup,openBackup,backupSummary} from './backups.mjs';

const FORMAT='wakefield-platform-transfer-v1';
export function migrationAuthorized(header,secret){
 if(typeof secret!=='string'||secret.length<32||typeof header!=='string')return false;
 const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(header);
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
function signature(data,secret){return createHmac('sha256',secret).update(JSON.stringify(data)).digest('base64url');}
export async function exportPlatform(env){
 const current=await env.DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();
 if(!current)throw Error('There is no club to transfer.');
 const backups=await env.DB.prepare('SELECT id, revision, created_at, reason, data FROM club_backups ORDER BY revision DESC, created_at DESC, id DESC LIMIT 50').all();
 const state=JSON.parse(current.data);
 // Decrypt and re-encrypt inside the source server. The original signing key
 // and private PIN hashes never appear in the exported plaintext.
 const data={format:FORMAT,createdAt:new Date().toISOString(),writesFrozen:env.MIGRATION_FROZEN==='true',revision:current.revision,summary:backupSummary(state),state:sealBackup(state,current.revision,env.MIGRATION_TOKEN),backups:backups.results.map(b=>({...b,data:sealBackup(openBackup(JSON.parse(b.data),env.SESSION_SECRET),b.revision,env.MIGRATION_TOKEN)}))};
 return {data,signature:signature(data,env.MIGRATION_TOKEN)};
}
export function verifyTransfer(envelope,secret){
 if(!envelope?.data||envelope.data.format!==FORMAT||!Number.isSafeInteger(envelope.data.revision)||envelope.data.revision<0||!Array.isArray(envelope.data.backups)||envelope.data.backups.length>50)throw Error('Invalid transfer package.');
 const expected=signature(envelope.data,secret),actual=envelope.signature;
 if(typeof actual!=='string'||expected.length!==actual.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))throw Error('Transfer authentication failed.');
 if(envelope.data.writesFrozen!==true)throw Error('Source writes must be paused before the final transfer.');
 if(envelope.data.state.revision!==envelope.data.revision)throw Error('Transfer revision mismatch.');
 return envelope.data;
}
export async function importPlatform(pool,envelope,secret,sessionSecret){
 const data=verifyTransfer(envelope,secret),state=openBackup(data.state,secret);
 if(data.backups.some(b=>typeof b.id!=='string'||!Number.isSafeInteger(b.revision)||b.revision<0||b.revision>data.revision||typeof b.reason!=='string'||typeof b.created_at!=='string'||b.data?.revision!==b.revision)||new Set(data.backups.map(b=>b.id)).size!==data.backups.length)throw Error('Invalid recovery snapshots in transfer.');
 const snapshots=data.backups.map(b=>({...b,data:sealBackup(openBackup(b.data,secret),b.revision,sessionSecret)}));
 // A new session generation prevents any source sessions being accepted at
 // the destination; each pupil signs in again with the same existing PIN.
 state.sessionVersion=randomBytes(16).toString('hex');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('wakefield-platform-transfer'))");
  const marker=await client.query("SELECT value FROM club_platform WHERE key = 'migration'");
  if(marker.rows.length){await client.query('COMMIT');return {...JSON.parse(marker.rows[0].value),alreadyImported:true};}
  const existing=await client.query('SELECT id FROM club_state WHERE id = 1');
  if(existing.rows.length)throw Error('The destination already contains a club. It has not been overwritten.');
  await client.query('INSERT INTO club_state (id, revision, data) VALUES (1, $1, $2)',[data.revision+1,JSON.stringify(state)]);
  for(const b of snapshots)await client.query('INSERT INTO club_backups (id, revision, created_at, reason, data) VALUES ($1,$2,$3,$4,$5)',[b.id,b.revision,b.created_at,b.reason,JSON.stringify(b.data)]);
  const summary={revision:data.revision+1,sourceRevision:data.revision,summary:backupSummary(state),recoverySnapshots:snapshots.length,importedAt:new Date().toISOString()};
  await client.query('INSERT INTO club_platform (key, value) VALUES ($1, $2)',['migration',JSON.stringify(summary)]);
  await client.query('COMMIT');return summary;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
