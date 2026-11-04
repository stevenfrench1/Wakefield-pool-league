import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const target=await fetch('http://127.0.0.1:9222/json/new?http://localhost:5173',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let counter=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const data=JSON.parse(e.data);if(data.id){const pair=pending.get(data.id);pending.delete(data.id);if(data.error)pair.reject(Error(data.error.message));else pair.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);else if(data.method==='Log.entryAdded'&&data.params.entry.level==='error')errors.push(data.params.entry.text);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error(`Timed out: ${expression}`);}
const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
try {
 await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:5173'});await until(`document.querySelector('.hero')`);
 await evaluate(`localStorage.removeItem('wakefield-demo-v1');location.reload()`);await until(`document.querySelector('.hero')`);
 assert.equal(await evaluate(`document.querySelectorAll('.stat').length`),4);
 await click('[data-action="demoAdmin"]');await click('a[href="#league"]');await until(`document.querySelector('.fixtures')`);
 assert.equal(await evaluate(`document.querySelectorAll('.division-tabs button').length`),4);
 await click('[data-score]');await until(`document.querySelector('#score-form')`);
 await evaluate(`document.querySelector('#score-form').requestSubmit()`);await until(`!document.querySelector('.modal')`);
 await click('a[href="#approvals"]');await until(`document.querySelector('[data-approve]')`);
 await click('[data-approve]');await until(`!document.querySelector('[data-approve]')`);
 await click('a[href="#cup"]');await until(`document.querySelector('.bracket')`);assert.equal(await evaluate(`document.querySelectorAll('.tie').length`),63);
 await click('a[href="#players"]');await until(`document.querySelectorAll('.player-card').length===42`);
 await click('[data-edit-player]');await until(`document.querySelector('#player-form')`);await click('[data-action="close"]');
 await click('a[href="#settings"]');await until(`document.querySelector('#settings-form')`);
 await evaluate(`document.querySelector('[name="season"]').value='Browser-tested season';document.querySelector('#settings-form').requestSubmit()`);await until(`document.querySelector('[name="season"]').value==='Browser-tested season' && document.querySelector('#toast').textContent==='Saved successfully.'`);
 await click('[data-action="logout"]');await until(`document.querySelector('.hero')`);
 await click('[data-action="login"]');await until(`document.querySelector('#login-form')`);
 await evaluate(`document.querySelector('[name="pin"]').value='1234';document.querySelector('#login-form').requestSubmit()`);await until(`!document.querySelector('.modal')`);
 await click('[data-action="record"]');await until(`document.querySelector('#choose-match')`);await evaluate(`document.querySelector('#choose-match').requestSubmit()`);await until(`document.querySelector('#score-form')`);await evaluate(`document.querySelector('#score-form').requestSubmit()`);await until(`!document.querySelector('.modal')`);
 await evaluate(`location.hash='overview'`);await until(`document.querySelector('.hero')`);
 const desktop=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile('/tmp/wakefield-desktop.png',Buffer.from(desktop.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const page of ['overview','league','cup','players']) {await evaluate(`location.hash='${page}'`);await until(`document.querySelector('.topbar strong').textContent===${JSON.stringify({overview:'Club overview',league:'The league',cup:'Tournament room',players:'Our players'}[page])}`);assert(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`),`Mobile page overflows: ${page}`);}
 await evaluate(`location.hash='overview'`);await until(`document.querySelector('.hero')`);const mobile=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile('/tmp/wakefield-mobile.png',Buffer.from(mobile.data,'base64'));
 assert.deepEqual(errors,[]);console.log('Browser smoke passed: desktop dashboard, fixtures, result submission/approval, cup, players, settings, player login/submission, four mobile layouts; no browser errors.');
 // Restore a clean demo for the next visitor.
 await evaluate(`localStorage.removeItem('wakefield-demo-v1');location.reload()`);
} finally {ws.close();}
