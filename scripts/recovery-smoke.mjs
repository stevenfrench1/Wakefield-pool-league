// Uses an in-memory PostgreSQL database and loopback server only. Never calls live accounts.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {scryptSync,createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createNetlifyHandler} from '../lib/netlify-api.mjs';
import {initialState,act} from '../lib/domain.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve('evidence/pin-recovery-2026-11-17');await mkdir(out,{recursive:true});
const db=new PGlite();
for(const folder of (await readdir('netlify/database/migrations')).sort())await db.exec(await readFile(`netlify/database/migrations/${folder}/migration.sql`,'utf8'));
let pending=Promise.resolve();
const query=async(sql,params)=>{const r=await db.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
const pool={async query(...args){await pending;return query(...args);},async connect(){const previous=pending;let release;pending=new Promise(r=>release=r);await previous;return {query,release};}};
const hash=pin=>{const salt='0123456789abcdef0123456789abcdef';return salt+':'+scryptSync(pin,salt,32).toString('hex');};
const password='synthetic-admin-password',oldPin='123456',otherPin='234567';
const s=initialState();s.players=Array.from({length:4},(_,i)=>({id:'recovery-'+i,name:'Sample',rating:50}));s.players.forEach((p,i)=>{p.name='Recovery Sample '+(i+1);p.pinHash=hash(i?otherPin:oldPin);});
for(const c of s.competitions){for(const p of s.players)act(s,'enterCompetition',{id:c.id},{role:'player',id:p.id});act(s,'drawCompetition',{id:c.id},{role:'admin'});}
act(s,'syncBreakthroughs',{}, {role:'admin'});
await pool.query('INSERT INTO club_state (id,revision,data) VALUES (1,1,$1)',[JSON.stringify(s)]);
const handler=createNetlifyHandler({pool,env:{ADMIN_EMAIL:'owner@example.test',ADMIN_PASSWORD_HASH:hash(password),SESSION_SECRET:'synthetic-recovery-session-key-at-least-32-characters'}});
const requests=[],errors=[];
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path.startsWith('/api/')){let body='';for await(const b of req)body+=b;const r=await handler(new Request(base+req.url,{method:req.method,headers:req.headers,...(body?{body}:{})}),{ip:'synthetic-school-network'});requests.push({path,status:r.status,action:body?JSON.parse(body).action:undefined});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 const file=resolve(path.startsWith('/lib/')?'.':process.env.WPC_STATIC_DIR||'public','.'+(path==='/'?'/index.html':path));const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[extname(file)]||'text/plain');res.end(body);
 }catch(e){errors.push(e.message);res.writeHead(500);res.end('Synthetic server error');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
const req=async(api,data,who='')=>{const r=await fetch(base+'/api/'+api,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(who?{cookie:who}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
try{
 await page.goto(base);await page.locator('[data-action=adminLogin]').click();await page.locator('[name=password]').fill(password);await page.locator('#login-form [type=submit]').click();await page.locator('.sidebar').waitFor();
 await page.locator('.sidebar a[href="#players"]').click();await page.locator('[data-action=recoverAccount]').click();await page.locator('#recover-account-form [name=id]').selectOption(s.players[0].id);await page.locator('#recover-account-form input[type=checkbox]').check();
 await page.locator('#recover-account-form [type=submit]').click();await page.getByRole('heading',{name:'Account recovered',exact:true}).waitFor();
 const pin=await page.locator('.pin-list code').innerText();assert.match(pin,/^\d{6}$/);assert.notEqual(pin,oldPin);
 await page.getByRole('button',{name:'Close dialog'}).click();await page.locator('.sidebar [data-action=account]').click();await page.locator('[data-action=logout]').click();
 await page.locator('#login-form [name=id]').selectOption(s.players[0].id);await page.locator('#login-form [name=pin]').fill(pin);await page.locator('#login-form [type=submit]').click();await page.locator('.sidebar').waitFor();
 assert.equal((await context.request.get(base+'/api/state').then(r=>r.json())).user.id,s.players[0].id);
 // A recovery during a network-wide login lockout must let the replacement work.
 const networkKey='login-network:'+createHash('sha256').update('synthetic-school-network').digest('hex');
 await pool.query('INSERT INTO club_attempts (key,started,attempts) VALUES ($1,$2,256) ON CONFLICT(key) DO UPDATE SET started=excluded.started, attempts=256',[networkKey,Math.floor(Date.now()/1000)]);
 const admin=await req('login',{role:'admin',password});assert.equal(admin.status,200);
 const current=await req('state',undefined,admin.cookie);
 const recovery=await req('action',{action:'recoverAccount',payload:{id:s.players[0].id},revision:current.data.revision},admin.cookie);assert.equal(recovery.status,200);
 const login=await req('login',{id:s.players[0].id,pin:recovery.data.pins[0].pin});
 assert.equal(login.status,200,'replacement PIN must work during the network lockout');
 assert.deepEqual(errors,[]);
 await writeFile(out+'/browser-report.json',JSON.stringify({ok:true,requests,errors},null,2));console.log('Recovery browser journey and network lockout passed.');
}catch(error){await writeFile(out+'/browser-report.json',JSON.stringify({ok:false,error:error.message,requests,errors},null,2));console.error(error.message);process.exitCode=1;}
finally{await browser.close();await new Promise(r=>server.close(r));await db.close();}
