import {chromium} from '/Users/steve/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {initialState,act} from '../../lib/domain.mjs';
const out=resolve('evidence/signed-out-home-2026-11-17');
const club=initialState();club.players=[{id:'alex',name:'Alex M.',hasAccount:true},{id:'sam',name:'Sam T.',hasAccount:true},{id:'jamie',name:'Jamie K.',hasAccount:true}];
let user=null,revision=1,delay=0,failState=false,empty=false;
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const file=resolve(path.startsWith('/lib/')?'.':'public','.'+(path==='/'?'/index.html':path));const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[extname(file)]||'text/plain');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/Users/steve/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.setDefaultTimeout(8000);
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/**',async route=>{const endpoint=new URL(route.request().url()).pathname.split('/').at(-1),data=route.request().postDataJSON();let status=200,body;
 if(endpoint==='config')body={configured:true,adminAuth:'password'};
 else if(endpoint==='state'){if(delay)await new Promise(r=>setTimeout(r,delay));status=failState?503:200;body=failState?{error:'Unavailable'}:{state:{...club,players:empty?[]:club.players},user,revision};}
 else if(endpoint==='revision')body={revision,user};
 else if(endpoint==='login'){if(data.role==='player'&&data.pin!=='123456'||data.role==='admin'&&data.password!=='synthetic-password'){status=401;body={error:'The name or PIN is incorrect.'};}else{user=data.role==='admin'?{role:'admin',name:'Mr French'}:{role:'player',id:data.id,name:club.players.find(p=>p.id===data.id).name};body={user};}}
 else if(endpoint==='logout'){user=null;body={ok:true};}
 else if(endpoint==='signup')body={pending:true,name:'Taylor Z.'};
 else if(endpoint==='action'){act(club,data.action,data.payload,user);body={state:club,revision:++revision};}
 else throw Error('Unexpected mock API '+endpoint);
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
});
const visible=selector=>page.locator(selector).waitFor({state:'visible'});
const hidden=async()=>assert.equal(await page.locator('.sidebar,.topbar,.mobile-nav,[data-profile],.competition-card').count(),0);
const capture=async name=>page.screenshot({path:out+'/'+name+'.png',fullPage:true});
try{
 delay=700;await page.goto(base);await visible('.loading');await hidden();await capture('loading');await visible('.welcome-shell');delay=0;
 await hidden();assert.equal(await page.locator('h1').innerText(),'Welcome to the\nWakefield Pool Championship');
 console.log('Checking layouts');
 const layouts=[];
 for(const [width,height] of [[1440,900],[390,844],[320,740]]){
  await page.setViewportSize({width,height});await capture('welcome-'+width);
  const targets=await page.locator('.welcome-brand,.welcome-access button,.welcome-access input,.welcome-access select').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({height:el.getBoundingClientRect().height,name:el.tagName})));assert(targets.every(t=>t.height>=44),'Touch target below 44px at '+width);
  assert.equal(await page.locator('.welcome-pin-help').evaluate(el=>getComputedStyle(el).color),'rgb(98, 98, 98)');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
  layouts.push({width,height,formVisible:await page.locator('#login-form').isVisible()});
 }
 await page.setViewportSize({width:1440,height:900});
 console.log('Checking keyboard and authentication');
 await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').innerText(),'Skip to sign in');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');
 await page.getByRole('combobox',{name:/Your name/}).focus();const outline=await page.getByRole('combobox',{name:/Your name/}).evaluate(el=>getComputedStyle(el).outlineWidth);assert.equal(outline,'3px');await capture('keyboard-focus');
 await page.getByRole('combobox',{name:/Your name/}).selectOption('alex');await page.getByLabel('Your player PIN').fill('000000');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('The name or PIN is incorrect.').waitFor();await hidden();await capture('login-error');
 // Keeping a filled form when a newer revision is found after tab focus.
 revision++;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(120);assert.equal(await page.getByLabel('Your player PIN').inputValue(),'000000');
 await page.getByRole('button',{name:'Forgotten your PIN?'}).click();await visible('.modal');await page.mouse.click(10,10);assert.equal(await page.locator('.modal').count(),0);
 console.log('Checking account requests');
 await page.getByRole('button',{name:'Request an account'}).click();await visible('#signup-form');await page.setViewportSize({width:390,height:844});await page.getByLabel('Your name on the roster').selectOption('new');await page.getByLabel('First name',{exact:true}).fill('Taylor');await page.getByLabel('Surname initial').fill('Z');await page.getByLabel('Choose a six-digit PIN').fill('123456');await page.getByLabel('Confirm your PIN').fill('123457');await page.getByRole('button',{name:'Send sign-up request'}).click();await page.getByText('The PINs do not match.').waitFor();await capture('signup-error');
 await page.getByLabel('Confirm your PIN').fill('123456');await page.getByRole('button',{name:'Send sign-up request'}).click();await page.getByRole('heading',{name:'Sign-up request sent'}).waitFor();await hidden();await capture('signup-success');
 await page.getByRole('button',{name:'Back to sign in'}).click();await visible('#login-form');
 await page.getByRole('button',{name:'Request an account'}).click();await page.locator('.welcome-brand').click();await visible('#login-form');
 console.log('Checking routes and sessions');
 // All direct routes remain gated, and the original destination survives sign-in.
 for(const hash of ['league','cup','players','rules','settings','approvals','overview','alerts','breakthroughs','competition/full-league','join/pairs-knockout']){await page.goto(base+'/#'+hash);await visible('.welcome-shell');await hidden();}
 await page.getByRole('combobox',{name:/Your name/}).selectOption('alex');await page.getByLabel('Your player PIN').fill('123456');await page.getByRole('button',{name:'Sign in',exact:true}).click();await visible('#joining-form');assert.equal(await page.locator('[value="pairs-knockout"][data-join-pick]').isChecked(),true);await capture('signed-in-deep-link');
 await page.locator('.mobile-account').click();await visible('.modal');user=null;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await visible('.welcome-shell');await hidden();assert.equal(await page.locator('.modal').count(),0);
 await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'Mr French',exact:true}).click();await page.getByLabel('Administrator password').fill('synthetic-password');await capture('admin-sign-in');await page.getByRole('button',{name:'Sign in',exact:true}).click();await visible('.sidebar');await page.locator('.sidebar .account').click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await visible('.welcome-shell');await hidden();assert.equal(await page.locator('.modal').count(),0);
 // Restored sessions skip the welcome screen.
 user={role:'player',id:'alex',name:'Alex M.'};await page.goto(base);await visible('.sidebar');assert.equal(await page.locator('.welcome-shell').count(),0);
 user=null;empty=true;await page.goto(base);await visible('.welcome-shell');await page.getByText('No players are listed yet.',{exact:false}).waitFor();await capture('empty-roster');empty=false;
 failState=true;await page.goto(base);await page.getByRole('button',{name:'Try again'}).waitFor();await hidden();await capture('connection-error');failState=false;await page.getByRole('button',{name:'Try again'}).click();await visible('.welcome-shell');
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:740});await page.getByRole('button',{name:'Request an account'}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 await writeFile(out+'/browser-results.json',JSON.stringify({status:'pass',data:'Synthetic state and local mock API only',layouts,checks:['loading and connection recovery','all routes gated','keyboard skip link and focus','wrong PIN','filled form retained during sync','forgotten PIN outside click','signup mismatch and success','logo returns to sign-in','joining link restored','session expiry clears dialog','admin sign-in','logout','existing session restoration','empty roster','320px signup and reduced motion'],consoleErrors:errors},null,2)+'\n');
 console.log('Browser checks passed on desktop, mobile and narrow mobile. Synthetic data only.');
}finally{await browser.close();server.close();}
