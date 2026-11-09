// Run the actual frontend rendering and event handlers in a small DOM adapter.
// These checks cover route/state wiring; they do not claim browser layout coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as domain from '../lib/domain.mjs';
const source=(await readFile('public/app.js','utf8')).replace(/^import .*;\n/,'').replace(/boot\(\);\s*$/,'');
function ui(){
 const elements=new Map(),listeners={};const element=()=>({innerHTML:'',textContent:'',classList:{add(){},remove(){}},focus(){},select(){},contains(){return false;}});
 for(const id of ['#app','#modal-root','#toast'])elements.set(id,element());
 const location={hash:'',href:'https://club.example/',protocol:'https:'};
 const document={activeElement:null,title:'',body:element(),querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn)};
 const context=vm.createContext({...domain,document,location,window:{addEventListener(){},scrollTo(){},setTimeout(){return 1;}},setTimeout(){},clearTimeout(){},localStorage:{setItem(){},getItem(){return null;}},structuredClone,navigator:{clipboard:{async writeText(v){context.sharedLink=v;}}},console});
 vm.runInContext(source,context);
 return {context,elements,location,run:code=>vm.runInContext(code,context),async submit(form){for(const fn of listeners.submit||[])await fn({target:form,preventDefault(){}});},async click(dataset){const button={dataset};for(const fn of listeners.click||[])await fn({target:{closest:selector=>selector==='button'?button:null}});}};
}
test('joining links preselect an individual competition, show all four choices and never enter anyone before confirmation',()=>{
 const app=ui();app.location.hash='#join/pairs-knockout';app.run('state=initialState();route();render();');
 const html=app.elements.get('#app').innerHTML;
 for(const title of ['Singles league','Doubles league','Singles cup','Doubles cup'])assert(html.includes(title));
 assert.match(html,/Sign in to continue/);assert.match(html,/value="pairs-knockout" data-join-pick checked/);assert.match(html,/Partners are drawn randomly/);
 assert.equal(app.run('state.competitions.every(c=>c.entries.length===0)'),true);
 app.location.hash='#join/missing';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/does not match a competition/);assert.equal(app.run('joinSelection.size'),0);
 app.location.hash='#join/singles-knockout';app.run('state.competitions[1].status="closed";route();render();');assert.match(app.elements.get('#app').innerHTML,/value="singles-knockout" data-join-pick  disabled/);assert.equal(app.run('joinSelection.size'),0);
});
test('joining selection survives pupil login, waits for confirmation and shows only successful entries on the receipt',async()=>{
 const app=ui();app.location.hash='#join';app.run('state=initialState();route();joinSelection=new Set(["full-league","pairs-knockout"]);render();');
 app.context.FormData=class{constructor(){return new Map([['id',app.run('state.players[0].id')],['pin','1234']]);}};
 const login={dataset:{role:'player'},getAttribute:()=> 'login-form',querySelector:()=>({disabled:false})};
 await app.submit(login);assert.equal(app.run('joinSelection.size'),2);assert.equal(app.run('state.competitions.every(c=>c.entries.length===0)'),true);
 assert.match(app.elements.get('#app').innerHTML,/Confirm entries/);await app.run('submitJoiningEntries()');
 assert.deepEqual(app.run('state.competitions.map(c=>c.entries.length)').join(','),'1,0,0,1');assert.match(app.elements.get('#app').innerHTML,/Your entries are confirmed/);assert.match(app.elements.get('#app').innerHTML,/Your partner will be drawn/);
 await app.click({action:'editJoining'});assert.match(app.elements.get('#app').innerHTML,/Your existing entries/);assert.match(app.elements.get('#app').innerHTML,/value="full-league" data-join-pick checked disabled/);
});
test('sharing offers general and competition joining links without leaking URL credentials or granting a sign-in',async()=>{
 const app=ui();app.location.href='https://club.example/?secret=private#join';app.run('state=initialState();route();joiningLinks("pairs-league");');
 const html=app.elements.get('#modal-root').innerHTML;assert.match(html,/https:\/\/club.example\/#join\/pairs-league/);assert(!html.includes('secret=private'));assert.match(html,/https:\/\/wa.me\//);assert.match(html,/mailto:/);assert.match(html,/Copy link/);
 await app.click({copyJoining:'pairs-league'});assert.equal(app.context.sharedLink,'https://club.example/#join/pairs-league');
 await app.click({action:'share'});assert.match(app.elements.get('#modal-root').innerHTML,/value="https:\/\/club.example\/#join"/);
 app.context.navigator.clipboard.writeText=async()=>{throw Error('denied');};let selected=false;app.elements.set('#joining-link',{focus(){},select(){selected=true;}});await app.click({copyJoining:''});assert.equal(selected,true);
 assert.equal(app.run('user'),null);assert.equal(app.run('state.competitions.every(c=>c.entries.length===0)'),true);
});
test('a stale joining save keeps selections, does not show confirmation, and refreshes closed entry status',async()=>{
 const app=ui();app.location.hash='#join';app.run('state=initialState();demo=false;user={role:"player",id:state.players[0].id,name:state.players[0].name};revision=1;route();joinSelection=new Set(["full-league","pairs-league"]);render();');
 const updated=app.run('structuredClone(state)'),user=app.run('user');updated.competitions[2].status='closed';
 app.context.fetch=async(path)=>({ok:path!=='/api/action',status:path==='/api/action'?409:200,async json(){return path==='/api/action'?{error:'The club changed.'}:{state:updated,user,revision:2};}});
 await app.run('submitJoiningEntries()');assert.equal(app.run('joinReceipt'),null);assert.equal(app.run('joinSelection.size'),2);assert.equal(app.run('state.competitions.every(c=>c.entries.length===0)'),true);assert(!app.elements.get('#app').innerHTML.includes('Your entries are confirmed'));assert.match(app.elements.get('#app').innerHTML,/value="pairs-league" data-join-pick  disabled/);
});
test('entry landing page and direct links render; sign-in intent, entry state and share links stay attached to the selected competition',async()=>{
 const app=ui();app.run('state=initialState();state.players.push({id:"extra",name:"Player C",rating:0});route();render();');let html=app.elements.get('#app').innerHTML;assert.match(html,/Welcome to the Wakefield Pool Championship/);for(const title of ['Full league','Singles knockout','Pairs league','Pairs knockout'])assert(html.includes(title));
 app.location.hash='#competition/pairs-knockout';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/data-enter="pairs-knockout"/);
 await app.click({enter:'pairs-knockout'});assert.match(app.elements.get('#modal-root').innerHTML,/Player sign in/);assert.equal(app.run('intendedCompetition'),'pairs-knockout');
 app.run('user={role:"player",id:state.players[0].id,name:state.players[0].name};');await app.click({enter:'pairs-knockout'});assert.equal(app.run('state.competitions[3].entries.length'),1);assert.match(app.elements.get('#app').innerHTML,/One more player needed/);assert.match(app.elements.get('#app').innerHTML,/data-leave="pairs-knockout"/);
 await app.click({shareCompetition:'pairs-knockout'});assert.equal(app.context.sharedLink,'https://club.example/#competition/pairs-knockout');
});
test('every competition view and pair scoring modal renders; closed odd draws explain how to add a reserve',async()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};for(const c of state.competitions){for(const p of state.players.slice(0,8))act(state,"enterCompetition",{id:c.id,playerId:p.id},user);act(state,"drawCompetition",{id:c.id},user);}');
 for(const id of ['full-league','singles-knockout','pairs-league','pairs-knockout'])for(const view of ['fixtures','standings','bracket','pairs']){
  app.location.hash='#competition/'+id;app.run('route();');app.run('competitionView='+JSON.stringify(view)+';render();');assert(!app.elements.get('#app').innerHTML.includes('undefined'));assert(!app.elements.get('#app').innerHTML.includes('NaN'));
 }
 app.run('const c=state.competitions[2],m=c.fixtures[0],t=c.teams.find(t=>t.id===m.a);user={role:"player",id:t.members[1],name:name(t.members[1])};record(m.id);');assert.match(app.elements.get('#modal-root').innerHTML,/ &amp; /);assert.match(app.elements.get('#modal-root').innerHTML,/Mr French will approve/);
 app.run('user={role:"admin",name:"Mr French"};act(state,"createCompetition",{name:"Odd pair cup",mode:"pairs",format:"knockout"},user);const odd=state.competitions.at(-1);for(const p of state.players.slice(0,5))act(state,"enterCompetition",{id:odd.id,playerId:p.id},user);confirmDraw(odd.id);');assert.match(app.elements.get('#modal-root').innerHTML,/One more player needed/);assert.match(app.elements.get('#modal-root').innerHTML,/data-confirm-draw="[^"]+" disabled/);
 for(const page of ['#league','#cup','#players','#settings','#approvals','#overview']){app.location.hash=page;app.run('route();render();');assert(!app.elements.get('#app').innerHTML.includes('undefined'));}
});

test('one Add all players click updates the entry count and keeps Manage entries open',async()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};route();render();manageEntries("full-league");');
 assert.match(app.elements.get('#modal-root').innerHTML,/data-add-all-players="full-league"/);assert.match(app.elements.get('#modal-root').innerHTML,/0 entered/);
 await app.click({addAllPlayers:'full-league'});
 assert.equal(app.run('state.competitions[0].entries.length'),42);assert.match(app.elements.get('#modal-root').innerHTML,/42 entered/);assert.match(app.elements.get('#modal-root').innerHTML,/All 42 registered players are entered/);assert.match(app.elements.get('#modal-root').innerHTML,/data-add-all-players="full-league" disabled/);
 assert.equal(app.run('state.competitions[0].status'),'open');assert.equal(app.run('state.competitions[0].fixtures.length'),0);
});

test('Shift-click selects and deselects ranges while individual checkbox clicks work independently',()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};route();render();manageEntries("full-league");');
 assert.match(app.elements.get('#modal-root').innerHTML,/entry-selection-form/);assert.match(app.elements.get('#modal-root').innerHTML,/Hold Shift/);
 const boxes=Array.from({length:6},()=>({checked:false}));app.elements.set('#entry-player-list',{querySelectorAll:()=>boxes});const count={textContent:''},button={disabled:true};app.elements.set('#entry-selection-count',count);app.elements.set('#add-selected-players',button);app.context.boxes=boxes;
 boxes[1].checked=true;app.run('selectEntryPlayers(boxes[1],false)');boxes[4].checked=true;app.run('selectEntryPlayers(boxes[4],true)');assert.deepEqual(boxes.map(b=>b.checked),[false,true,true,true,true,false]);assert.equal(count.textContent,'4 players selected');assert.equal(button.disabled,false);
 boxes[4].checked=false;app.run('selectEntryPlayers(boxes[4],false)');boxes[2].checked=false;app.run('selectEntryPlayers(boxes[2],true)');assert.deepEqual(boxes.map(b=>b.checked),[false,true,false,false,false,false]);assert.equal(count.textContent,'1 player selected');
 boxes[1].checked=false;app.run('selectEntryPlayers(boxes[1],false)');assert.equal(count.textContent,'0 players selected');assert.equal(button.disabled,true);
});

test('drawn and completed events expose Edit and a name/rules form, preserving fixed draw settings',()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};act(state,"enterAllPlayers",{id:"pairs-knockout"},user);act(state,"drawCompetition",{id:"pairs-knockout"},user);route();render();');
 assert.match(app.elements.get('#app').innerHTML,/data-edit-competition="pairs-knockout"/);
 app.location.hash='#competition/pairs-knockout';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/data-edit-competition="pairs-knockout"/);
 app.run('competitionForm("pairs-knockout");');const html=app.elements.get('#modal-root').innerHTML;assert.match(html,/name="name"/);assert.match(html,/name="rules"/);assert(!html.includes('name="format"'));assert(!html.includes('name="consolation"'));
});

test('administrators can open correction and withdrawal forms; pupil views do not expose correction or recovery controls',async()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};act(state,"enterAllPlayers",{id:"pairs-league"},user);act(state,"drawCompetition",{id:"pairs-league"},user);const match=state.competitions[2].fixtures[0];act(state,"submit",{id:match.id,score:[1,0]},user);act(state,"approve",{id:state.submissions[0].id},user);selectedCompetition="pairs-league";page="competition";render();');
 assert.match(app.elements.get('#app').innerHTML,/Correct result/);assert.match(app.elements.get('#app').innerHTML,/data-withdraw-competition/);
 const id=app.run('state.competitions[2].fixtures[0].id');await app.click({correctResult:id});assert.match(app.elements.get('#modal-root').innerHTML,/correction-form/);assert.match(app.elements.get('#modal-root').innerHTML,/dependent results/);assert.match(app.elements.get('#modal-root').innerHTML,/name="reason"/);
 await app.click({withdrawCompetition:'pairs-league'});assert.match(app.elements.get('#modal-root').innerHTML,/withdrawal-form/);assert.match(app.elements.get('#modal-root').innerHTML,/withdraws the whole fixed pair/);
 app.run('page="settings";render();');assert.match(app.elements.get('#app').innerHTML,/Download encrypted backup/);assert.match(app.elements.get('#app').innerHTML,/Restore backup/);await app.click({action:'downloadBackup'});assert.match(app.elements.get('#modal-root').innerHTML,/type="password" minlength="12"/);
 app.run('user={role:"player",id:state.players[0].id,name:state.players[0].name};page="competition";render();');assert(!app.elements.get('#app').innerHTML.includes('Correct result'));assert(!app.elements.get('#app').innerHTML.includes('data-withdraw-competition'));app.run('page="settings";render();');assert(!app.elements.get('#app').innerHTML.includes('Download encrypted backup'));
});
test('automatic updates use shared revisions, defer during editing, skip hidden pages and recover from connection failures',async()=>{
 const app=ui();app.run('state=initialState();demo=false;revision=1;page="competitions";render();');const updated=app.run('structuredClone(state)');updated.settings.season='Updated on another device';
 const requests=[];app.context.fetch=async path=>{requests.push(path);return {ok:true,async json(){return path==='/api/revision'?{revision:2,user:null}:{revision:2,user:null,state:updated};}};};
 app.elements.set('#sync-status',{textContent:''});await app.run('syncClub()');assert.equal(app.run('revision'),2);assert.equal(app.run('state.settings.season'),'Updated on another device');assert.deepEqual(requests,['/api/revision','/api/state']);
 app.run('revision=1;');app.elements.get('#modal-root').innerHTML='<form>Unsubmitted score</form>';requests.length=0;await app.run('syncClub()');assert.equal(app.run('revision'),1);assert.equal(app.run('syncPending'),true);assert.match(app.elements.get('#sync-status').textContent,/Updates waiting/);assert.deepEqual(requests,['/api/revision']);
 app.elements.get('#modal-root').innerHTML='';app.elements.set('#settings-form[data-dirty="true"]',{});await app.run('syncClub()');assert.equal(app.run('revision'),1);app.elements.delete('#settings-form[data-dirty="true"]');
 app.context.document.hidden=true;requests.length=0;await app.run('syncClub()');assert.equal(requests.length,0);app.context.document.hidden=false;
 app.context.fetch=async()=>{throw Error('offline');};await app.run('syncClub()');assert.equal(app.run('syncFailed'),true);
 app.context.fetch=async path=>({ok:true,async json(){return path==='/api/revision'?{revision:2,user:null}:{revision:2,user:null,state:updated};}});await app.run('syncClub()');assert.equal(app.run('revision'),2);assert.equal(app.run('syncFailed'),false);
});
test('an automatic state fetch cannot overwrite a result saved while the request was pending',async()=>{
 const app=ui();app.run('state=initialState();demo=false;revision=1;render();');const updated=app.run('structuredClone(state)');let resolve;app.context.fetch=async()=>{await new Promise(r=>{resolve=r;});return {ok:true,async json(){return {state:updated,revision:2,user:null};}};};
 const pending=app.run('refresh(true)');app.run('revision=3;state.settings.season="Just saved";');resolve();await pending;assert.equal(app.run('revision'),3);assert.equal(app.run('state.settings.season'),'Just saved');
});
