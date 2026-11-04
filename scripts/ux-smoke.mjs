import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const target=await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(Error(d.error.message)):p.resolve(d.result);}else if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error(`Timed out: ${expression}`);}
const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const navigate=async page=>{await evaluate(`location.hash='${page}'`);await until(`document.title.endsWith(${JSON.stringify({overview:'Club overview',league:'The league',cup:'Tournament room',players:'Our players',approvals:'Result approvals',settings:'Club settings'}[page])})`);};
async function screenshot(path){await evaluate(`document.querySelector('#toast').classList.remove('show')`);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(path,Buffer.from(r.data,'base64'));}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,mobile:false,deviceScaleFactor:1});await send('Page.navigate',{url:'http://localhost:5173'});await until(`document.querySelector('.hero')`);
 await evaluate(`localStorage.removeItem('wakefield-demo-v1');location.reload()`);await until(`document.querySelector('.hero')`);
 await screenshot('/tmp/wakefield-redesign-overview.png');
 // Signing in from a fixture returns the player to that exact match.
 await navigate('league');await click('[data-league-view="fixtures"]');await until(`document.querySelector('[data-score]')`);
 const selected=await evaluate(`document.querySelector('[data-score]').dataset.score`);
 await click('[data-score]');await until(`document.querySelector('#login-form')`);
 await evaluate(`const saved=JSON.parse(localStorage.getItem('wakefield-demo-v1'));const match=saved.league.find(m=>m.id===${JSON.stringify(selected)});document.querySelector('#login-form [name="id"]').value=match.a;document.querySelector('[name="pin"]').value='1234';document.querySelector('#login-form').requestSubmit()`);
 await until(`document.querySelector('#score-form')`);assert.equal(await evaluate(`document.querySelector('#score-form').dataset.match`),selected);
 // Single-frame scoring cannot accidentally submit a preselected winner.
 assert.equal(await evaluate(`document.querySelector('#score-form').checkValidity()`),false);
 await evaluate(`document.querySelector('#score-form').requestSubmit()`);assert(await evaluate(`!!document.querySelector('#score-form')`));
 await evaluate(`document.querySelector('[name="winner"][value="b"]').checked=true`);await screenshot('/tmp/wakefield-redesign-score.png');
 await evaluate(`document.querySelector('#score-form').requestSubmit()`);await until(`!document.querySelector('.modal')`);
 assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('wakefield-demo-v1')).submissions.find(s=>s.match===${JSON.stringify(selected)}).score`),[0,1]);
 await click('[data-action="demoAdmin"]');await navigate('approvals');await until(`document.querySelector('[data-reject]')`);await click('[data-reject]');await until(`!document.querySelector('[data-reject]')`);
 // Fixture filters and search actually change the results, including empty states.
 await navigate('league');await click('[data-league-view="fixtures"]');await click('[data-status="played"]');assert(await evaluate(`document.querySelectorAll('#fixture-list [data-score]').length===0`));
 await click('[data-status="available"]');await evaluate(`var input=document.querySelector('#fixture-search');input.value='no such pupil';input.dispatchEvent(new Event('input',{bubbles:true}))`);assert(await evaluate(`document.querySelector('#fixture-list').textContent.includes('No matches here')`));
 await click('[data-action="clearFilters"]');assert(await evaluate(`document.querySelectorAll('#fixture-list [data-score]').length>0`));
 await click('[data-league-view="standings"]');await screenshot('/tmp/wakefield-redesign-league.png');
 // Player search supports a real empty state and resets without a page reload.
 await navigate('players');await evaluate(`var input=document.querySelector('#player-search');input.value='George';input.dispatchEvent(new Event('input',{bubbles:true}))`);assert.equal(await evaluate(`document.querySelectorAll('.player-card:not([hidden])').length`),1);
 await evaluate(`var input=document.querySelector('#player-search');input.value='no such pupil';input.dispatchEvent(new Event('input',{bubbles:true}))`);assert(await evaluate(`!document.querySelector('#player-empty').hidden`));
 await evaluate(`var input=document.querySelector('#player-search');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}))`);assert.equal(await evaluate(`document.querySelectorAll('.player-card:not([hidden])').length`),42);
 // Every screen fits narrow mobile, tablet and desktop viewports.
 for(const width of [320,390,768,1024,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,mobile:width<761,deviceScaleFactor:1});
  for(const page of ['overview','league','cup','players','approvals','settings']){await navigate(page);assert(await evaluate(`document.documentElement.scrollWidth<=${width}`),`Horizontal page overflow: ${page} at ${width}px`);}
 }
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await navigate('overview');await screenshot('/tmp/wakefield-redesign-mobile.png');
 // The mobile management menu exposes approvals and settings and closes on navigation.
 await click('.mobile-nav [data-action="account"]');await until(`document.querySelector('.admin-menu')`);await click('.admin-menu a[href="#settings"]');await until(`document.querySelector('#settings-form') && !document.querySelector('.modal')`);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await navigate('cup');await evaluate(`const select=document.querySelector('#round-jump');select.value=String(select.options.length-1);select.dispatchEvent(new Event('change',{bubbles:true}))`);await until(`document.querySelector('.bracket').scrollLeft>0`);
 assert.deepEqual(errors,[]);console.log('UX checks passed: sign-in continuation, required winner selection, returned results, fixture/player filters, mobile management navigation, round navigation, and all six screens at five viewport widths.');
 await evaluate(`localStorage.removeItem('wakefield-demo-v1');location.hash='overview';location.reload()`);
}finally{ws.close();}
