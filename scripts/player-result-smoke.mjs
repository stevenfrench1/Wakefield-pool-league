// Browser regression check. Run against the rebuilt sample-only demo, never the live club.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/player-result-smoke.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {initialState,act,isMatchParticipant,sideMembers} from '../lib/domain.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.WPC_DEMO_URL||'http://127.0.0.1:5174/index.html';
assert(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Use a local sample demo only.');
const evidence=new URL('../evidence/player-result-flow-2026-11-17/',import.meta.url).pathname;
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=initialState(true),pupil=state.players[1];pupil.name='Alex Morgan';
for(const c of state.competitions){if(c.id==='pairs-league')c.bestOf=5;for(const p of state.players.slice(0,12))act(state,'enterCompetition',{id:c.id},{role:'player',id:p.id});act(state,'drawCompetition',{id:c.id},{role:'admin'});}
// Put this pupil on saved side B to catch reversed-score bugs, in singles and pairs.
for(const id of ['full-league','pairs-league']){const c=state.competitions.find(c=>c.id===id);for(const m of c.fixtures.filter(m=>isMatchParticipant(state,m,pupil.id)))if(sideMembers(state,m.a).includes(pupil.id))[m.a,m.b]=[m.b,m.a];}
const readState=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wakefield-demo-v1')));
async function login(){if(!await page.locator('#login-form').count())await page.locator('.account').click();await page.locator('#login-form [name=id]').selectOption(pupil.id);await page.locator('[name=pin]').fill('1234');await page.locator('#login-form [type=submit]').click();await page.locator('.player-result-panel').waitFor();}
async function load(s){await page.evaluate(s=>localStorage.setItem('wakefield-demo-v1',JSON.stringify(s)),s);await page.reload();await login();}
async function shot(name){await page.locator('#toast').evaluate(el=>el.classList.remove('show'));await page.screenshot({path:evidence+name+'.png',animations:'disabled'});}
try{
 await page.goto(url);await load(state);await page.locator('#result-competition').selectOption('full-league');
 const rows=page.locator('.player-result-panel .result-opponent');assert.equal(await rows.count(),11);
 const names=await rows.locator('strong').allTextContents();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
 assert(!(await page.locator('.player-result-panel').innerText()).includes('Your next match'));
 await page.locator('#result-opponent-search').fill('nobody here');assert.equal(await rows.filter({visible:true}).count(),0);assert(await page.locator('.result-no-search').isVisible());
 await page.locator('#result-opponent-search').fill(names.at(-1).toLowerCase());assert.equal(await rows.filter({visible:true}).count(),1);
 const selected=await rows.filter({visible:true}).getAttribute('data-score');await rows.filter({visible:true}).click();
 let form=page.locator('#score-form');assert(await form.isVisible());assert.equal(await form.locator('[name=winner]').first().getAttribute('value'),'b');assert.equal(await form.locator('[name=winner]:checked').count(),0);assert(!await form.locator('[type=submit]').isEnabled());
 await page.locator('.result-change-opponent').click();assert.equal(await page.locator('.modal #dialog-result-competition').inputValue(),'full-league');assert.equal(await page.locator('.modal #dialog-result-opponent-search').inputValue(),names.at(-1).toLowerCase());await page.locator('.modal .result-opponent:visible').click();
 await form.locator('[name=winner]').first().check();assert(await form.locator('[data-score-preview]').innerText().then(s=>s.includes('Alex Morgan won')));assert(await form.locator('[type=submit]').isEnabled());
 // Focus stays in the dialog, including when optional highlights are collapsed.
 await page.locator('.modal [data-action=close]').focus();await page.keyboard.press('Shift+Tab');assert(await form.locator('[type=submit]').evaluate(el=>el===document.activeElement));await page.keyboard.press('Tab');assert(await page.locator('.modal [data-action=close]').evaluate(el=>el===document.activeElement));
 await page.setViewportSize({width:390,height:844});await shot('score-mobile');await form.locator('[type=submit]').click();
 await page.getByRole('heading',{name:'Result submitted',exact:true}).waitFor();assert(await page.locator('.result-receipt').innerText().then(s=>s.includes('Awaiting Mr French')));await shot('receipt-mobile');
 let saved=await readState();assert.deepEqual(saved.submissions.find(s=>s.match===selected).score,[0,1]);assert.equal(saved.competitions.find(c=>c.id==='full-league').fixtures.find(m=>m.id===selected).status,'open');
 await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('.player-result-panel [data-score="'+selected+'"]').count(),0);await page.locator('.result-pending summary').click();assert(await page.locator('.result-pending').innerText().then(s=>s.includes(names.at(-1))));
 // Returning a result makes the same fixed fixture available again.
 act(saved,'reject',{id:saved.submissions.find(s=>s.match===selected).id},{role:'admin'});await load(saved);await page.locator('#result-competition').selectOption('full-league');assert.equal(await page.locator('[data-score="'+selected+'"]').count(),1);
 await page.locator('#result-competition').selectOption('pairs-league');assert((await page.locator('.result-player-identity').innerText()).includes('Your fixed pair'));assert.equal(await rows.count(),5);
 const pairId=await rows.first().getAttribute('data-score');await rows.first().click();form=page.locator('#score-form');assert.equal(await form.locator('.score-entry select').first().getAttribute('name'),'b');
 await form.locator('[name=a]').selectOption('1');await form.locator('[name=b]').selectOption('1');assert(!await form.locator('[type=submit]').isEnabled());
 await form.locator('[name=a]').selectOption('3');await form.locator('[name=b]').selectOption('3');assert(!await form.locator('[type=submit]').isEnabled());
 await form.locator('[name=a]').selectOption('2');assert(await form.locator('[type=submit]').isEnabled());await shot('pairs-score-mobile');await form.locator('[type=submit]').click();await page.getByRole('heading',{name:'Result submitted',exact:true}).waitFor();saved=await readState();assert.deepEqual(saved.submissions.find(s=>s.match===pairId).score,[2,3]);assert.equal(saved.matchHighlights?.length||0,0);
 await page.getByRole('button',{name:'Done',exact:true}).click();await page.locator('#result-competition').selectOption('full-league');
 // All rows remain available equally; ensure the chosen route works at narrow widths.
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:width===1440?1100:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Home overflow at '+width);assert(await rows.first().evaluate(el=>el.getBoundingClientRect().height>=44));await page.locator('.player-result-shortcut').click();assert(await page.locator('.modal .player-result-picker').isVisible());assert(await page.evaluate(()=>document.querySelector('.modal').scrollWidth<=document.querySelector('.modal').clientWidth),'Modal overflow at '+width);await page.keyboard.press('Escape');}
 await page.setViewportSize({width:1440,height:1100});await shot('home-desktop');await page.setViewportSize({width:390,height:844});await shot('home-mobile');
 await rows.first().click();await page.locator('.modal-backdrop').click({position:{x:2,y:2}});assert.equal(await page.locator('.modal').count(),0);
 // Deep links select their own event and use the same picker.
 await page.evaluate(()=>location.hash='competition/pairs-league');await page.locator('.player-result-picker[data-result-scope="pairs-league"]').waitFor();assert.equal(await page.locator('#result-competition').count(),0);assert(await page.locator('.result-player-identity').innerText().then(s=>s.includes('Alex Morgan')));
 assert.deepEqual(errors,[]);
 const report={passed:true,viewports:[320,390,768,1440],checks:['alphabetical own opponents','search and empty search','change opponent retains context','single-frame side-B scoring','no default winner','keyboard focus loop','pending receipt and duplicate exclusion','returned-result retry','fixed pairs side-B scoring','unfinished and tied scores blocked','optional highlights','home and scoped competition entry','Escape and outside click','no horizontal overflow','no browser errors'],sampleDataOnly:true};await writeFile(evidence+'browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
