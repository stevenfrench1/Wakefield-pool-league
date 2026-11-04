import assert from 'node:assert/strict';
const target=await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[],requests=[];
ws.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);if(d.error)p.reject(Error(d.error.message));else p.resolve(d.result);}else if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);else if(d.method==='Network.requestWillBeSent')requests.push(d.params.request.url);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error(`Timed out: ${expression}`);}
try{
 await send('Runtime.enable');await send('Network.enable');await send('Page.enable');
 await send('Network.setBlockedURLs',{urls:['*/api/*','https://*']});
 await send('Page.navigate',{url:'http://127.0.0.1:5174/demo.html'});await until(`document.querySelector('.hero')`);
 await evaluate(`document.querySelector('[data-action="demoAdmin"]').click();location.hash='league'`);await until(`document.querySelector('.fixtures')`);
 await evaluate(`document.querySelector('[data-score]').click();document.querySelector('#score-form').requestSubmit()`);await until(`!document.querySelector('.modal')`);
 await evaluate(`location.hash='approvals'`);await until(`document.querySelector('[data-approve]')`);await evaluate(`document.querySelector('[data-approve]').click()`);await until(`!document.querySelector('[data-approve]')`);
 await evaluate(`location.hash='cup'`);await until(`document.querySelectorAll('.tie').length===63`);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await evaluate(`location.hash='overview'`);await until(`document.querySelector('.hero')`);
 assert(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`));assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(url=>/^https?:/.test(url)&&url!=='http://127.0.0.1:5174/demo.html'),[]);
 console.log('Portable demo passed on a static server with API requests blocked: league, admin result submission and approval, cup, mobile layout; zero external requests or JavaScript exceptions.');
 await evaluate(`localStorage.removeItem('wakefield-demo-v1')`).catch(()=>{});
}finally{ws.close();}
