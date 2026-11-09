import {createCipheriv,createDecipheriv,createHash as backupHash,randomBytes as backupRandom,scryptSync as backupScrypt} from 'node:crypto';
import {allMatches,ensureCompetitions,validateScore,APP_NAME} from './domain.mjs';
const BACKUP_FORMAT='wakefield-pool-backup';
function backupHeader(value){return {format:value.format,version:value.version,kind:value.kind,createdAt:value.createdAt,revision:value.revision};}
export function sealBackup(state,revision,secret,kind='snapshot'){
 const text=JSON.stringify(state);if(Buffer.byteLength(text)>1000000)throw Error('Club data exceeds the supported backup size. Contact the administrator.');
 const salt=backupRandom(16),iv=backupRandom(12),key=kind==='portable'?backupScrypt(secret,salt,32):backupHash('sha256').update(secret).digest();
 const envelope={format:BACKUP_FORMAT,version:1,kind,createdAt:new Date().toISOString(),revision};
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(JSON.stringify(backupHeader(envelope))));
 const data=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);
 return {...envelope,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
}
export function openBackup(envelope,secret,kind='snapshot'){
 try{
  if(!envelope||envelope.format!==BACKUP_FORMAT||envelope.version!==1||envelope.kind!==kind||!Number.isSafeInteger(envelope.revision)||typeof envelope.data!=='string'||envelope.data.length>1400000)throw Error();
  const salt=Buffer.from(envelope.salt,'base64'),iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64');
  if(salt.length!==16||iv.length!==12||tag.length!==16)throw Error();
  const key=kind==='portable'?backupScrypt(secret,salt,32):backupHash('sha256').update(secret).digest();
  const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(JSON.stringify(backupHeader(envelope))));cipher.setAuthTag(tag);
  const data=Buffer.concat([cipher.update(Buffer.from(envelope.data,'base64')),cipher.final()]);
  return validateBackupState(JSON.parse(data.toString('utf8')));
 }catch{throw Error('This backup could not be opened. Check the file and passphrase. Server snapshots also require the original server session secret.');}
}
export function validateBackupPassphrase(value){if(typeof value!=='string'||value.length<12||value.length>256)throw Error('Use a backup passphrase of 12–256 characters. Keep it separately from the file.');return value;}
export function backupSummary(s){return {players:s.players.length,playersWithPins:s.players.filter(p=>!!p.pinHash).length,competitions:s.competitions.length,matches:allMatches(s).length,approvedResults:allMatches(s).filter(m=>m.status==='complete').length,pendingResults:s.submissions.length};}
export function validateBackupState(s){
 const fail=()=>{throw Error('Invalid backup club data.');};
 const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
 const list=(x,max)=>Array.isArray(x)&&x.length<=max;
 const text=(x,max)=>typeof x==='string'&&x.length<=max;
 if(!s||typeof s!=='object'||!list(s.players,64)||s.players.length<2||!s.settings||!list(s.league,2016)||!list(s.divisions,64)||!list(s.cups,64)||!list(s.submissions,70000)||!list(s.activity,30))fail();
 if(s.players.some(p=>!id(p.id)||!text(p.name,45)||!p.name.trim()||!Number.isFinite(p.rating)||p.rating<0||p.rating>100||(p.pinHash!==undefined&&!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(p.pinHash)))||new Set(s.players.map(p=>p.id)).size!==s.players.length||new Set(s.players.map(p=>p.name.toLowerCase())).size!==s.players.length)fail();
 const playerIds=new Set(s.players.map(p=>p.id)),sideIds=new Set(playerIds);
 const settings=s.settings;
 if(!text(settings.season,300)||!text(settings.rules,2000)||![1,3,5,7,9].includes(settings.frames)||![1,3,5,7,9].includes(settings.finalFrames)||!Number.isInteger(settings.winPoints)||settings.winPoints<1||settings.winPoints>10||!Number.isInteger(settings.divisionSize)||settings.divisionSize<3||settings.divisionSize>20||typeof settings.approval!=='boolean'||typeof settings.consolation!=='boolean')fail();
 const rounds=c=>{if(!id(c.id)||!text(c.name,70)||!list(c.rounds,6)||!c.rounds.length)fail();let expected=c.rounds[0].length;if(![1,2,4,8,16,32].includes(expected))fail();for(const round of c.rounds){if(!list(round,32)||round.length!==expected)fail();expected/=2;}if(c.rounds.at(-1).length!==1)fail();};
 ensureCompetitions(s);
 if(!list(s.competitions,32))fail();
 for(const c of s.competitions){
  if(!id(c.id)||!text(c.name,70)||!['open','closed','drawn'].includes(c.status)||!['singles','pairs'].includes(c.mode)||!['league','knockout'].includes(c.format)||!list(c.entries,64)||c.entries.some(x=>!playerIds.has(x))||new Set(c.entries).size!==c.entries.length||!list(c.teams,64)||!list(c.fixtures,2016)||!list(c.rounds,6)||!text(c.rules,2000)||!Number.isInteger(c.winPoints)||c.winPoints<1||c.winPoints>100||![c.bestOf,c.finalBestOf].every(n=>Number.isInteger(n)&&n>0&&n<=99&&n%2===1))fail();
  const members=[];for(const t of c.teams){if(!id(t.id)||!list(t.members,2)||t.members.length!==(c.mode==='pairs'?2:1)||t.members.some(x=>!c.entries.includes(x)))fail();sideIds.add(t.id);members.push(...t.members);}
  if(new Set(members).size!==members.length||(c.status==='drawn'&&members.length!==c.entries.length))fail();
  if(c.rounds.length)rounds(c);if(c.plate)rounds(c.plate);
 }
 for(const c of s.cups)rounds(c);
 for(const d of s.divisions)if(!id(d.id)||!text(d.name,100)||!list(d.players,64)||d.players.some(x=>!playerIds.has(x)))fail();
 const matches=allMatches(s);if(new Set(matches.map(m=>m.id)).size!==matches.length)fail();
 for(const m of matches){
  if(!id(m.id)||!['waiting','open','complete','bye','void'].includes(m.status)||!Number.isInteger(m.bestOf)||m.bestOf<1||m.bestOf>99||m.bestOf%2!==1||[m.a,m.b].some(x=>x!==null&&x!==undefined&&!sideIds.has(x))||(m.a&&m.a===m.b))fail();
  if(m.status==='open'&&(!m.a||!m.b))fail();
  if(m.status==='complete'){if(!m.a||!m.b||m.winner!==(m.score?.[0]>m.score?.[1]?m.a:m.b))fail();validateScore({...m,status:'open'},m.score);}
  if(m.status==='bye'&&(!m.winner||![m.a,m.b].includes(m.winner)))fail();
 }
 if(s.submissions.some(sub=>!id(sub.id)||!matches.some(m=>m.id===sub.match&&m.status==='open')||!list(sub.score,2)))fail();
 for(const sub of s.submissions)validateScore(matches.find(m=>m.id===sub.match),sub.score);
 if(s.history!==undefined&&!list(s.history,100))fail();if(s.auditLog!==undefined&&!list(s.auditLog,500))fail();
 s.settings.name=APP_NAME;return s;
}
