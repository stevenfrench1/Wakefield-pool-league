import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { initialState, act, addPlayerNames, ensureCompetitions, APP_NAME, uid, breakthroughPublicState, matchHighlightsForUser, administratorPlayer } from './domain.mjs';
import { prepareRosterImport } from './roster-import.mjs';
import {sealBackup,openBackup,validateBackupPassphrase,backupSummary} from './backups.mjs';
import {migrationAuthorized,exportPlatform} from './platform-migration.mjs';
export function createHandler(env) {
const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
const reply=(statusCode,data,extra={})=>({statusCode,headers:{...headers,...extra},body:JSON.stringify(data)});
function hashPin(pin,salt=randomBytes(16).toString('hex')) {return `${salt}:${scryptSync(String(pin),salt,32).toString('hex')}`;}
function validPin(pin,hash) {if(!hash)return false;const [salt,digest]=hash.split(':');return safeEqual(scryptSync(String(pin),salt,32).toString('hex'),digest);}
function safeEqual(a,b) {const x=createHash('sha256').update(String(a)).digest(),y=createHash('sha256').update(String(b)).digest();return timingSafeEqual(x,y);}
function sign(value) {return createHmac('sha256',env.SESSION_SECRET).update(value).digest('base64url');}
function token(user) {const v=Buffer.from(JSON.stringify({...user,exp:Date.now()+8*3600000})).toString('base64url');return `${v}.${sign(v)}`;}
function session(event) {
  try {const raw=(event.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('wakefield_session='))?.slice(18);if(!raw)return null;
    const [v,sig]=raw.split('.');if(!safeEqual(sign(v),sig))return null;const u=JSON.parse(Buffer.from(v,'base64url'));return u.exp>Date.now()?u:null;
  }catch{return null;}
}
function cookie(value,event,clear=false) {return `wakefield_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:28800}${event.headers.host?.startsWith('localhost:')||event.headers.host?.startsWith('127.0.0.1:')?'':'; Secure'}`;}
function clean(s,user) {
 const {signupRequests,...club}=s;
 const copy=structuredClone(club);
 copy.players.forEach(p=>{
  if(user?.role==='admin')p.hasAccount=!!p.pinHash;
  else {delete p.testAccount;delete p.hasAccount;}
  delete p.pinHash;delete p.accountVersion;
 });delete copy.sessionVersion;
 if(s.breakthroughs)copy.breakthroughs=breakthroughPublicState(s,user);
 if(s.matchHighlights)copy.matchHighlights=matchHighlightsForUser(s,user);
 for(const c of copy.competitions||[])if(c.entryRequests&&user?.role!=='admin')c.entryRequests=c.entryRequests.filter(r=>user?.role==='player'&&r.playerId===user.id);
 if(user?.role==='admin')copy.signupRequests=(signupRequests||[]).map(({id,name,ids,at,playerId})=>({id,name,ids,at,playerId}));
 else delete copy.auditLog;
 return copy;
}
function publicUser(user){if(!user)return null;const {accountVersion,...visible}=user;return visible;}
function currentUser(candidate,s){if(!candidate)return null;if((candidate.sessionVersion||'0')!==(s.sessionVersion||'0'))return null;if(candidate.role==='admin')return candidate;const p=s.players.find(p=>p.id===candidate.id);return p&&(candidate.accountVersion||'0')===(p.accountVersion||'0')?{...candidate,name:p.name}:null;}
function replacePin(player){
 let pin;do{pin=String(randomInt(100000,1000000));}while(validPin(pin,player.pinHash));
 player.pinHash=hashPin(pin);player.accountVersion=randomBytes(16).toString('hex');
 return {name:player.name,pin};
}
async function commitState(previous,next,reason){
 const id='b-'+randomBytes(16).toString('hex'),backup=sealBackup(previous.data,previous.revision,env.SESSION_SECRET);
 const data=JSON.stringify(next);if(Buffer.byteLength(data)>1000000)throw Error('Club data is too large to save safely. Download a backup and contact the administrator.');
 const result=await env.DB.batch([
  env.DB.prepare('INSERT INTO club_backups (id, revision, created_at, reason, data) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM club_state WHERE id = 1 AND revision = ?)').bind(id,previous.revision,backup.createdAt,reason,JSON.stringify(backup),previous.revision),
  env.DB.prepare('UPDATE club_state SET data = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(data,previous.revision),
  env.DB.prepare('DELETE FROM club_backups WHERE id NOT IN (SELECT id FROM club_backups ORDER BY revision DESC, created_at DESC, id DESC LIMIT 50)')
 ]);
 return Number(result[1]?.meta?.changes)===1;
}
async function recoveryState(body){
 if(body.backupId){const saved=await env.DB.prepare('SELECT data FROM club_backups WHERE id = ?').bind(String(body.backupId)).first();if(!saved)throw Error('Recovery snapshot not found. Refresh the snapshot list.');return openBackup(JSON.parse(saved.data),env.SESSION_SECRET);}
 return openBackup(body.backup,validateBackupPassphrase(body.passphrase),'portable');
}
async function readState() {
 let row=await env.DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();
 if(!row){if(env.REQUIRE_MIGRATION)throw Error('The club transfer is not complete. Please contact Mr French.');await env.DB.prepare('INSERT OR IGNORE INTO club_state (id, revision, data) VALUES (1, 0, ?)').bind(JSON.stringify(initialState())).run();row=await env.DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();}
 let current={...row,data:JSON.parse(row.data)};
 // An optional owner-configured one-time import never comes from request input.
 // Keep roster data in private runtime configuration, outside source and migrations.
 if(env.ROSTER_IMPORT_JSON&&env.MIGRATION_FROZEN!=='true'){
  try{
   const prepared=prepareRosterImport(current.data,JSON.parse(env.ROSTER_IMPORT_JSON),current.revision);
   if(prepared.applied){
    const changed=await commitState(current,prepared.state,'Before roster import');
    if(changed)current={...current,data:prepared.state,revision:current.revision+1};
    else {const latest=await env.DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();current={...latest,data:JSON.parse(latest.data)};}
   }
  }catch{console.warn('Owner-configured roster import was skipped because its configuration or club state did not match.');}
 }
 ensureCompetitions(current.data);
 current.data.settings.name=APP_NAME;
 return current;
}
async function attempt(key,limit=8) {
 const now=Math.floor(Date.now()/1000);
 const row=await env.DB.prepare(`INSERT INTO club_attempts (key, started, attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN started <= ? THEN 1 ELSE attempts + 1 END, started = CASE WHEN started <= ? THEN excluded.started ELSE started END RETURNING attempts`).bind(key,now,now-900,now-900).first();
 await env.DB.prepare('DELETE FROM club_attempts WHERE started < ?').bind(now-86400).run();return row.attempts<=limit;
}
const limited=()=>reply(429,{error:'Too many sign-in attempts for this player. Please wait 15 minutes or ask Mr French.'},{'Retry-After':'900'});
const signupNameKey=name=>name.normalize('NFC').trim().replace(/\.$/,'').toLowerCase();
const signupNameInUse=(s,name)=>s.players.some(p=>signupNameKey(p.name)===signupNameKey(name));
async function requestSignup(body,event,owner,candidate){
 const playerId=body.playerId;
 if(playerId!==undefined&&(typeof playerId!=='string'||!playerId||playerId.length>100))throw Error('Choose your name from the roster.');
 const firstName=typeof body.firstName==='string'?body.firstName.trim().normalize('NFC'):'';
 const initial=typeof body.initial==='string'?body.initial.trim().normalize('NFC'):'';
 if(!playerId&&(firstName.length>40||!/^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*)*$/u.test(firstName)||!/^\p{L}$/u.test(initial)))throw Error('Enter your first name and one surname initial.');
 if(typeof body.pin!=='string'||!/^\d{6}$/.test(body.pin))throw Error('Choose a six-digit PIN.');
 if(body.ids!==undefined&&(!Array.isArray(body.ids)||body.ids.length))throw Error('Reload the page to sign up before choosing competitions.');
 const upperInitial=initial.toUpperCase();
 const newName=`${firstName} ${/^\p{L}$/u.test(upperInitial)?upperInitial:initial}.`;
 const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'local';
 const key='signup:'+createHash('sha256').update(ip).digest('hex');
 if(!await attempt(key,64))return reply(429,{error:'Too many sign-up attempts. Please try again in 15 minutes.'},{'Retry-After':'900'});
 let request;
 for(let retry=0;retry<3;retry++){
  const row=await readState(),s=row.data;
  if(owner||currentUser(candidate,s))return reply(403,{error:'Sign-up is for pupils who need a player account.'});
  const player=playerId?s.players.find(p=>p.id===playerId):null;
  if(playerId&&!player)return reply(409,{error:'That roster name is no longer available. Reload and choose your name again.'});
  if(player?.pinHash)return reply(409,{error:'This player already has a PIN. Sign in or ask Mr French for a reset.'});
  const name=player?.name??newName;
  const pending=s.signupRequests??=[];
  const existing=pending.find(r=>(playerId&&r.playerId===playerId)||signupNameKey(r.name)===signupNameKey(name));
  if(existing&&existing.playerId===playerId&&validPin(body.pin,existing.pinHash))return reply(200,{pending:true,name:existing.name});
  if(existing)return reply(409,{error:'A sign-up is already awaiting review for this name. Ask Mr French if you need help.'});
  if(!player&&signupNameInUse(s,name))return reply(409,{error:'Choose your name from the roster or sign in if you already have a PIN.'});
  if((!player&&s.players.length>=64)||pending.length>=64)return reply(409,{error:'Sign-up is full. Please ask Mr French.'});
  request??={id:uid(),ids:[],pinHash:hashPin(body.pin),at:new Date().toISOString()};
  request.name=name;
  if(player)request.playerId=player.id;
  pending.push(request);
  const data=JSON.stringify(s);
  if(Buffer.byteLength(data)>1000000)throw Error('The club cannot accept more requests right now. Please ask Mr French.');
  // Public requests do not rotate the recovery snapshots for club operations.
  const result=await env.DB.prepare('UPDATE club_state SET data = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(data,row.revision).run();
  if(Number(result.meta?.changes)===1)return reply(201,{pending:true,name});
 }
 return reply(409,{error:'The club is busy. Please try again.'});
}
function reviewSignup(s,payload){
 const request=s.signupRequests?.find(r=>r.id===payload.id);
 if(!request)throw Error('This sign-up request has already been reviewed.');
 if(!['approve','decline'].includes(payload.decision))throw Error('Choose whether to approve or decline the request.');
 if(payload.decision==='approve'){
  let player;
  if(request.playerId){
   player=s.players.find(p=>p.id===request.playerId);
   if(!player||player.name!==request.name||player.pinHash)throw Error('This roster account changed. Decline the request and ask the pupil to sign up again or use their existing PIN.');
   if(payload.testAccount===true)throw Error('A roster player cannot be marked as a test account through sign-up.');
  }else{
   if(signupNameInUse(s,request.name))throw Error('A player already uses this name. Check the roster before reviewing the request.');
   [player]=addPlayerNames(s,[request.name]);
  }
  player.pinHash=request.pinHash;
  if(payload.testAccount===true)player.testAccount=true;
  const ids=request.ids.filter(id=>s.competitions.some(c=>c.id===id&&c.status==='open'));
  if(ids.length)act(s,'enterCompetitions',{ids},{role:'player',id:player.id});
 }
 s.signupRequests=s.signupRequests.filter(r=>r.id!==request.id);
}
async function administrator(event) {
 if(env.AUTH_PROVIDER==='password'){
  const candidate=session(event);
  if(candidate?.role!=='admin')return null;
  const row=await env.DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();
  return row?currentUser(candidate,JSON.parse(row.data)):null;
 }
 const id=event.headers['oai-authenticated-user-id'];if(!id)return null;
 // Sites dispatch verifies these headers. Bootstrap only the configured owner's
 // verified email, then bind the administrator to the durable per-Site user ID.
 let owner=await env.DB.prepare('SELECT user_id FROM club_admin_identity WHERE id = 1').first();
 if(!owner&&env.ADMIN_EMAIL&&(event.headers['oai-authenticated-user-email']||'').toLowerCase()===env.ADMIN_EMAIL.toLowerCase()){
  await env.DB.prepare('INSERT OR IGNORE INTO club_admin_identity (id, user_id) VALUES (1, ?)').bind(id).run();owner=await env.DB.prepare('SELECT user_id FROM club_admin_identity WHERE id = 1').first();
 }
 return owner?.user_id===id?{role:'admin',name:'Mr French'}:null;
}
return async function handler(event) {
  const configured=!!(env.DB&&env.ADMIN_EMAIL&&env.SESSION_SECRET?.length>=32);
  const route=event.path.split('/').filter(Boolean).at(-1);
  if(route==='config')return reply(200,{configured,adminAuth:env.AUTH_PROVIDER==='password'?'password':'chatgpt'});
  if(!configured)return reply(503,{error:'The shared club database is not ready. Please contact Mr French.'});
  if(event.httpMethod!=='GET'&&event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  if(event.httpMethod==='POST') {
    if(event.headers.origin) {try{if(new URL(event.headers.origin).host!==event.headers.host)return reply(403,{error:'Invalid request origin.'});}catch{return reply(403,{error:'Invalid request origin.'});}}
    if(!(event.headers['content-type']||'').includes('application/json'))return reply(415,{error:'JSON required.'});
  }
  try {
    const restoreRoute=['restore','restore-preview'].includes(route);
    if((event.body?.length||0)>(restoreRoute?3000000:route==='signup'?4096:1000000))return reply(413,{error:'Request too large.'});
    const body=event.body?JSON.parse(event.body):{};
    if(route==='migration-export'){
      if(!env.MIGRATION_TOKEN)return reply(404,{error:'Not found.'});
      if(event.httpMethod!=='POST'||!migrationAuthorized(body?.transferToken,env.MIGRATION_TOKEN))return reply(403,{error:'Transfer access denied.'});
      return reply(200,await exportPlatform(env));
    }
    if(env.MIGRATION_FROZEN==='true'&&event.httpMethod==='POST'&&route!=='logout')return reply(503,{error:'The club is moving to Netlify. Entries and results are temporarily paused.'},{'Retry-After':'60'});
    const owner=await administrator(event),candidate=session(event);
    if(route==='logout')return reply(200,{ok:true},{'Set-Cookie':cookie('',event,true)});
    if(route==='signup'&&event.httpMethod==='POST')return await requestSignup(body||{},event,owner,candidate);
    if(route==='health'&&event.httpMethod==='GET'){
      await env.DB.prepare('SELECT revision FROM club_state WHERE id = 1').first();
      if(!owner)return reply(200,{ok:true,database:true});
      const row=await readState(),backups=await env.DB.prepare('SELECT COUNT(*) AS count FROM club_backups').first();
      return reply(200,{ok:true,database:true,administrator:true,revision:row.revision,summary:backupSummary(row.data),recoverySnapshots:backups.count});
    }
    if(['state','revision'].includes(route)&&event.httpMethod==='GET'){
      const row=await readState(),user=owner||currentUser(candidate,row.data);
      return reply(200,{...(route==='state'?{state:clean(row.data,user)}:{}),user:publicUser(user),revision:row.revision});
    }
    if(route==='login' && event.httpMethod==='POST') {
      let identity;const row=await readState();
      if(body.role==='admin') {
        if(env.AUTH_PROVIDER==='password'){
          const ip=event.headers['x-nf-client-connection-ip']||'local',key='login-admin:'+createHash('sha256').update(ip).digest('hex');
          if(!await attempt(key))return limited();
          if(typeof body.password!=='string'||body.password.length>256||!validPin(body.password,env.ADMIN_PASSWORD_HASH))return reply(401,{error:'Incorrect administrator password.'});
          await env.DB.prepare('DELETE FROM club_attempts WHERE key = ?').bind(key).run();identity={role:'admin',name:'Mr French'};
        }else{if(!owner)return reply(401,{error:'Mr French must sign in with his ChatGPT account.'});identity=owner;}
      }
      else {
        const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'local';
        const p=row.data.players.find(p=>p.id===body.id);
        const ipKey=createHash('sha256').update(ip).digest('hex'),playerKey=createHash('sha256').update(ip+'\0'+String(body.id||'').slice(0,100)+'\0'+(p?.pinHash||'')).digest('hex');
        const networkKey='login-network:'+ipKey,key='login-player:'+playerKey;
        const network=await env.DB.prepare('SELECT attempts, started FROM club_attempts WHERE key = ?').bind(networkKey).first();
        if(network&&network.started>Math.floor(Date.now()/1000)-900&&network.attempts>=256)return limited();
        if(!await attempt(key))return limited();
        if(!p||!validPin(String(body.pin||'').slice(0,16),p.pinHash)){await attempt(networkKey,256);return reply(401,{error:'Incorrect player PIN. Ask Mr French if you need a reset.'});}
        await env.DB.prepare('DELETE FROM club_attempts WHERE key = ?').bind(key).run();
        identity={role:'player',id:p.id,name:p.name,accountVersion:p.accountVersion||'0'};
      }
      identity={...identity,sessionVersion:row.data.sessionVersion||'0'};
      return reply(200,{user:publicUser(identity)},{'Set-Cookie':cookie(token(identity),event)});
    }
    if(['backup','backups','restore-preview','restore'].includes(route)){
      if(!owner)return reply(403,{error:env.AUTH_PROVIDER==='password'?'Sign in as Mr French to manage recovery.':'Sign in with Mr French’s ChatGPT account to manage recovery.'});
      if(route==='backups'&&event.httpMethod==='GET'){
        const saved=await env.DB.prepare('SELECT id, revision, created_at, reason FROM club_backups ORDER BY revision DESC, created_at DESC, id DESC LIMIT 50').all();return reply(200,{backups:saved.results});
      }
      if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed.'});
      const row=await readState();
      if(route==='backup')return reply(200,{backup:sealBackup(row.data,row.revision,validateBackupPassphrase(body.passphrase),'portable')});
      const restored=await recoveryState(body),summary=backupSummary(restored);
      if(route==='restore-preview')return reply(200,{summary,current:backupSummary(row.data),revision:row.revision});
      if(body.confirmation!=='RESTORE')return reply(400,{error:'Type RESTORE to confirm replacing the current club.'});
      if(body.revision!==row.revision)return reply(409,{error:'The club has changed since this restore preview. Preview the backup again.'});
      restored.sessionVersion=randomBytes(16).toString('hex');
      restored.appliedRosterImports=[...new Set([...(row.data.appliedRosterImports||[]),...(restored.appliedRosterImports||[])])];
      const audits=[...(row.data.auditLog||[]),...(restored.auditLog||[])];
      restored.auditLog=[{id:randomBytes(16).toString('hex'),action:'restore',actor:'Mr French',at:new Date().toISOString(),reason:'Club restored from a verified backup',before:backupSummary(row.data),after:summary},...audits.filter((x,i)=>audits.findIndex(a=>a.id===x.id)===i)].slice(0,500);
      if(!await commitState(row,restored,'Before restore'))return reply(409,{error:'The club changed while restoring. Preview the backup again.'});
      const restoredOwner=env.AUTH_PROVIDER==='password'?{...owner,sessionVersion:restored.sessionVersion}:owner;
      return reply(200,{state:clean(restored,restoredOwner),revision:row.revision+1,user:restoredOwner},env.AUTH_PROVIDER==='password'?{'Set-Cookie':cookie(token(restoredOwner),event)}:{});
    }
    if(route==='action' && event.httpMethod==='POST') {
      const row=await readState(),user=owner||currentUser(candidate,row.data);
      if(!user)return reply(401,{error:'Please sign in again.'});
      if(body.revision!==row.revision)return reply(409,{error:'The club has been updated. Refresh and try again.'});
      const previous={...row,data:structuredClone(row.data)},s=row.data;let pins;
      if(body.action==='recoverAccount'){
        if(user.role!=='admin')return reply(403,{error:'Administrator access required.'});
        const player=typeof body.payload?.id==='string'&&s.players.find(p=>p.id===body.payload.id);
        if(!player?.pinHash)throw Error('Choose a pupil with an existing account. Approve a sign-up or issue a PIN for a roster-only player.');
        pins=[replacePin(player)];
        s.auditLog??=[];
        s.auditLog.unshift({id:uid(),action:'recoverAccount',actor:user.name||'Mr French',at:new Date().toISOString(),reason:'Replacement PIN issued after administrator identity check',playerId:player.id,playerName:player.name});
        s.auditLog=s.auditLog.slice(0,500);
      }else if(body.action==='pins') {
        if(user.role!=='admin')return reply(403,{error:'Administrator access required.'});
        const selected=body.payload?.id?s.players.filter(p=>p.id===body.payload.id):s.players;
        if(!selected.length)throw Error('Player not found.');
        pins=selected.map(replacePin);
      }else if(body.action==='reviewSignup'){
        if(user.role!=='admin')return reply(403,{error:'Administrator access required.'});
        reviewSignup(s,body.payload||{});
      }else {
        if(body.action==='addReserve'&&user.role==='admin'&&!s.players.some(p=>p.id===body.payload?.playerId&&p.pinHash))throw Error('Choose a reserve with a player account.');
        if(user.role==='admin'&&(body.action==='addLeaguePlayers'||body.action==='reviewLeagueEntryRequest'&&body.payload?.decision==='approve')){
          const ids=body.action==='addLeaguePlayers'?body.payload?.playerIds:[body.payload?.playerId,...(body.payload?.partnerId?[body.payload.partnerId]:[])];
          if(Array.isArray(ids)&&ids.some(id=>!s.players.some(p=>p.id===id&&(p.pinHash||p.id===administratorPlayer(s)?.id))))throw Error('Choose players with an existing account.');
        }
        act(s,body.action,body.payload||{},user);
      }
      if(!await commitState(previous,s,String(body.action).slice(0,70)))return reply(409,{error:'Another result arrived first. Refresh and try again.'});
      return reply(200,{state:clean(s,user),revision:row.revision+1,pins});
    }
    return reply(404,{error:'Not found.'});
  }catch(error){return reply(400,{error:error.message==='Unexpected end of JSON input'?'Invalid request.':error.message});}
};
}
