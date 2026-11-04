import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../lib/sites-api.mjs';
const built=await readFile('dist/server/index.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(built).toString('base64'));
const env={DB:{},ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-secret-at-least-32-characters'};
test('Sites serves its own assets and fails closed without live configuration',async()=>{
 const setup=await worker.fetch(new Request('https://club.example/'),{});assert.equal(setup.status,200);assert.match(await setup.text(),/shared club database is not ready/);
 const config=await worker.fetch(new Request('https://club.example/api/config'),{});assert.equal(config.status,503);
 const home=await worker.fetch(new Request('https://club.example/'),env);assert.equal(home.status,200);assert.match(await home.text(),/app.js/);assert.match(home.headers.get('Content-Security-Policy'),/script-src 'self'/);
 const app=await worker.fetch(new Request('https://club.example/app.js'),env);assert.equal(app.status,200);assert.match(await app.text(),/Welcome to the Wakefield Pool Championship/);
 assert.equal((await worker.fetch(new Request('https://club.example/unknown'),env)).status,404);
 assert.equal((await worker.fetch(new Request('https://club.example/style.css',{method:'HEAD'}),env)).body,null);
});
test('Sites rejects cross-origin writes, oversized streams, and forged Netlify IP headers',async()=>{
 const cross=await worker.fetch(new Request('https://club.example/api/login',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:'{}'}),env);assert.equal(cross.status,403);
 const large=await worker.fetch(new Request('https://club.example/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(1000001)}),env);assert.equal(large.status,413);
 const {database}=await import('./sqlite-d1.mjs');const DB=await database();
 try{for(const ip of ['forged-one','forged-two']){const res=await worker.fetch(new Request('https://club.example/api/login',{method:'POST',headers:{'Content-Type':'application/json','x-nf-client-connection-ip':ip,'client-ip':ip},body:JSON.stringify({role:'player',id:'missing',pin:'000000'})}),{...env,DB});assert.equal(res.status,401);}const rows=DB.sql.prepare('SELECT attempts FROM club_attempts').all();assert.equal(rows.length,1);assert.equal(rows[0].attempts,2);}finally{DB.sql.close();}
});
