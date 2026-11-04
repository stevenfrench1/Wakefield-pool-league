import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { initialState, act } from '../../lib/domain.mjs';
const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
const reply=(statusCode,data,extra={})=>({statusCode,headers:{...headers,...extra},body:JSON.stringify(data)});
function hashPin(pin,salt=randomBytes(16).toString('hex')) {return `${salt}:${scryptSync(String(pin),salt,32).toString('hex')}`;}
function validPin(pin,hash) {if(!hash)return false;const [salt,digest]=hash.split(':');return safeEqual(scryptSync(String(pin),salt,32).toString('hex'),digest);}
function safeEqual(a,b) {const x=createHash('sha256').update(String(a)).digest(),y=createHash('sha256').update(String(b)).digest();return timingSafeEqual(x,y);}
function sign(value) {return createHmac('sha256',process.env.SESSION_SECRET).update(value).digest('base64url');}
function token(user) {const v=Buffer.from(JSON.stringify({...user,exp:Date.now()+8*3600000})).toString('base64url');return `${v}.${sign(v)}`;}
function session(event) {
  try {const raw=(event.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('wakefield_session='))?.slice(18);if(!raw)return null;
    const [v,sig]=raw.split('.');if(!safeEqual(sign(v),sig))return null;const u=JSON.parse(Buffer.from(v,'base64url'));return u.exp>Date.now()?u:null;
  }catch{return null;}
}
function cookie(value,event,clear=false) {return `wakefield_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:28800}${event.headers.host?.startsWith('localhost:')||event.headers.host?.startsWith('127.0.0.1:')?'':'; Secure'}`;}
async function db(path,options={}) {
  const response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
  if(!response.ok){console.error('Supabase request failed:',response.status);throw Error('Database unavailable. Check the Supabase setup and server logs.');}
  const text=await response.text();return text?JSON.parse(text):null;
}
function clean(s) {const copy=structuredClone(s);copy.players.forEach(p=>delete p.pinHash);return copy;}
async function readState() {
  let rows=await db('club_state?id=eq.1&select=*');
  if(!rows.length) {
    const data=initialState();await db('club_state?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({id:1,data,revision:0})});
    rows=await db('club_state?id=eq.1&select=*');
  }return rows[0];
}
export async function handler(event) {
  const configured=!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.ADMIN_PASSWORD?.length>=12&&process.env.SESSION_SECRET?.length>=32);
  const route=event.path.split('/').filter(Boolean).at(-1);
  if(route==='config')return reply(200,{configured});
  if(!configured)return reply(503,{error:'Live mode needs Supabase and administrator credentials. Demo mode is available.'});
  if(event.httpMethod!=='GET'&&event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  if(event.httpMethod==='POST') {
    if(event.headers.origin) {try{if(new URL(event.headers.origin).host!==event.headers.host)return reply(403,{error:'Invalid request origin.'});}catch{return reply(403,{error:'Invalid request origin.'});}}
    if(!(event.headers['content-type']||'').includes('application/json'))return reply(415,{error:'JSON required.'});
  }
  try {
    if((event.body?.length||0)>1000000)return reply(413,{error:'Request too large.'});
    const body=event.body?JSON.parse(event.body):{},user=session(event);
    if(route==='logout')return reply(200,{ok:true},{'Set-Cookie':cookie('',event,true)});
    if(route==='state' && event.httpMethod==='GET'){const row=await readState();return reply(200,{state:clean(row.data),user,revision:row.revision});}
    if(route==='login' && event.httpMethod==='POST') {
      const ip=event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'local';
      const ipKey=createHash('sha256').update(ip).digest('hex');
      if(!await db('rpc/club_check_attempt',{method:'POST',body:JSON.stringify({attempt_key:`login:${ipKey}`})}))return reply(429,{error:'Too many sign-in attempts. Please wait 15 minutes.'});
      let identity;
      if(body.role==='admin') {if(!safeEqual(body.password||'',process.env.ADMIN_PASSWORD))return reply(401,{error:'Incorrect administrator password.'});identity={role:'admin',name:'Mr French'};}
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
      const updated=await db(`club_state?id=eq.1&revision=eq.${row.revision}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data:s,revision:row.revision+1})});
      if(!updated.length)return reply(409,{error:'Another result arrived first. Refresh and try again.'});
      return reply(200,{state:clean(s),revision:row.revision+1,pins});
    }
    return reply(404,{error:'Not found.'});
  }catch(error){return reply(400,{error:error.message==='Unexpected end of JSON input'?'Invalid request.':error.message});}
}
