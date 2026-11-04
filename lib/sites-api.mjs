import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { initialState, act } from './domain.mjs';
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
function clean(s) {const copy=structuredClone(s);copy.players.forEach(p=>delete p.pinHash);return copy;}
async function readState() {
 let row=await env.DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();
 if(!row){await env.DB.prepare('INSERT OR IGNORE INTO club_state (id, revision, data) VALUES (1, 0, ?)').bind(JSON.stringify(initialState())).run();row=await env.DB.prepare('SELECT data, revision FROM club_state WHERE id = 1').first();}
 return {...row,data:JSON.parse(row.data)};
}
async function attempt(key) {
 const now=Math.floor(Date.now()/1000);
 const row=await env.DB.prepare(`INSERT INTO club_attempts (key, started, attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN started <= ? THEN 1 ELSE attempts + 1 END, started = CASE WHEN started <= ? THEN excluded.started ELSE started END RETURNING attempts`).bind(key,now,now-900,now-900).first();
 await env.DB.prepare('DELETE FROM club_attempts WHERE started < ?').bind(now-86400).run();return row.attempts<=8;
}
async function administrator(event) {
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
  if(route==='config')return reply(200,{configured,adminAuth:'chatgpt'});
  if(!configured)return reply(503,{error:'The shared club database is not ready. Please contact Mr French.'});
  if(event.httpMethod!=='GET'&&event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  if(event.httpMethod==='POST') {
    if(event.headers.origin) {try{if(new URL(event.headers.origin).host!==event.headers.host)return reply(403,{error:'Invalid request origin.'});}catch{return reply(403,{error:'Invalid request origin.'});}}
    if(!(event.headers['content-type']||'').includes('application/json'))return reply(415,{error:'JSON required.'});
  }
  try {
    if((event.body?.length||0)>1000000)return reply(413,{error:'Request too large.'});
    const body=event.body?JSON.parse(event.body):{},user=(await administrator(event))||session(event);
    if(route==='logout')return reply(200,{ok:true},{'Set-Cookie':cookie('',event,true)});
    if(route==='state' && event.httpMethod==='GET'){const row=await readState();return reply(200,{state:clean(row.data),user,revision:row.revision});}
    if(route==='login' && event.httpMethod==='POST') {
      const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'local';
      const ipKey=createHash('sha256').update(ip).digest('hex');
      if(!await attempt(`login:${ipKey}`))return reply(429,{error:'Too many sign-in attempts. Please wait 15 minutes.'});
      let identity;
      if(body.role==='admin') {if(user?.role!=='admin')return reply(401,{error:'Mr French must sign in with his ChatGPT account.'});identity={role:'admin',name:'Mr French'};}
      else {const row=await readState();const p=row.data.players.find(p=>p.id===body.id);if(!p||!validPin(String(body.pin||'').slice(0,16),p.pinHash))return reply(401,{error:'Incorrect player PIN. Ask Mr French if you need a reset.'});identity={role:'player',id:p.id,name:p.name};}
      return reply(200,{user:identity},{'Set-Cookie':cookie(token(identity),event)});
    }
    if(route==='action' && event.httpMethod==='POST') {
      if(!user)return reply(401,{error:'Please sign in again.'});
      const row=await readState();if(body.revision!==row.revision)return reply(409,{error:'The club has been updated. Refresh and try again.'});
      const s=row.data;let pins;
      if(body.action==='pins') {
        if(user.role!=='admin')return reply(403,{error:'Administrator access required.'});
        const selected=body.payload?.id?s.players.filter(p=>p.id===body.payload.id):s.players;
        pins=selected.map(p=>{const pin=String(randomInt(100000,1000000));p.pinHash=hashPin(pin);return {name:p.name,pin};});
      }else act(s,body.action,body.payload||{},user);
      const updated=await env.DB.prepare('UPDATE club_state SET data = ?, revision = revision + 1 WHERE id = 1 AND revision = ? RETURNING revision').bind(JSON.stringify(s),row.revision).first();
      if(!updated)return reply(409,{error:'Another result arrived first. Refresh and try again.'});
      return reply(200,{state:clean(s),revision:row.revision+1,pins});
    }
    return reply(404,{error:'Not found.'});
  }catch(error){return reply(400,{error:error.message==='Unexpected end of JSON input'?'Invalid request.':error.message});}
};
}
