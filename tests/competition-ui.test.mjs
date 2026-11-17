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
 return {context,elements,location,run:code=>vm.runInContext(code,context),async submit(form){for(const fn of listeners.submit||[])await fn({target:form,preventDefault(){}});},async change(target){for(const fn of listeners.change||[])await fn({target});},async click(dataset){const button={dataset};for(const fn of listeners.click||[])await fn({target:{closest:selector=>selector==='button'?button:null}});}};
}
test('player records open from names, filter opponents and competitions, and keep pending results outside totals',async()=>{
 const app=ui();
 app.run(`state=initialState();state.players=[{id:'alex',name:'Alex Morgan'},{id:'ben',name:'Ben Taylor'},{id:'sam',name:'Sam Carter'},{id:'noah',name:'Noah Lewis'}];
 state.league=[{id:'record-win',a:'alex',b:'ben',status:'complete',score:[1,0],resultAt:'2026-11-16T12:00:00Z'},
 {id:'record-loss',a:'sam',b:'alex',status:'complete',score:[1,0],resultAt:'2026-11-15T12:00:00Z'},
 {id:'record-pending',a:'alex',b:'noah',status:'open'}];
 state.submissions=[{id:'record-sub',match:'record-pending',score:[1,0]}];
 state.competitions=[{id:'record-pairs',name:'Pairs league',teams:[{id:'pair-an',members:['alex','noah']},{id:'pair-bs',members:['ben','sam']}],fixtures:[{id:'pair-result',a:'pair-an',b:'pair-bs',status:'complete',score:[2,1],resultAt:'2026-11-14T12:00:00Z'}],rounds:[]}];`);
 const before=app.run('JSON.stringify(state)'),modal=()=>app.elements.get('#modal-root').innerHTML;
 await app.click({profile:'alex'});
 assert.match(modal(),/player-record-modal/);assert.match(modal(),/Alex Morgan/);
 assert.match(modal(),/<dt>Played<\/dt><dd>3<\/dd>/);
 assert.match(modal(),/record-win[\s\S]*<dd>2<\/dd>/);assert.match(modal(),/record-loss[\s\S]*<dd>1<\/dd>/);
 assert.match(modal(),/1 result awaiting approval/);assert.match(modal(),/Not counted yet/);
 assert.match(modal(),/Partner:.*Noah Lewis/);assert.match(modal(),/2 frames to 1/);
 assert.match(modal(),/data-profile="ben"/);assert.match(modal(),/data-profile="sam"/);
 await app.click({recordOutcome:'L'});
 assert.match(modal(),/data-record-outcome="L" class="selected" aria-pressed="true"/);
 assert.match(modal(),/Sam Carter/);assert.doesNotMatch(modal(),/Ben Taylor/);
 await app.change({id:'player-record-competition',value:'record-pairs'});
 assert.match(modal(),/value="record-pairs" selected/);assert.match(modal(),/<dt>Played<\/dt><dd>1<\/dd>/);
 assert.match(modal(),/No losses in this view/);assert.doesNotMatch(modal(),/awaiting approval/);
 await app.click({recordOutcome:'all'});assert.match(modal(),/Ben Taylor/);assert.match(modal(),/Sam Carter/);
 await app.click({profile:'sam'});assert.match(modal(),/<h3>Sam Carter<\/h3>/);assert.match(modal(),/data-record-outcome="all" class="selected"/);
 assert.equal(app.run('JSON.stringify(state)'),before);
 app.run('user={role:"admin",name:"Mr French"};showPlayerRecord("alex");');
 assert.match(modal(),/data-edit-player="alex"/);
});
test('player identity links work for each fixed partner, standings, roster cards and completed brackets',()=>{
 const app=ui();
 app.run(`state=initialState();state.players=[{id:'alex',name:'Alex <Morgan>'},{id:'ben',name:'Ben Taylor'}];
 state.competitions=[{id:'record-pairs',teams:[{id:'fixed-pair',members:['alex','ben']}],fixtures:[],rounds:[]}];`);
 const pair=app.run('player("fixed-pair",true)');
 assert.match(pair,/data-profile="alex"/);assert.match(pair,/data-profile="ben"/);assert.doesNotMatch(pair,/data-profile="fixed-pair"/);
 assert.match(pair,/Alex &lt;Morgan&gt;/);assert.doesNotMatch(pair,/<Morgan>/);
 const table=app.run('table([{id:"alex",name:"Alex <Morgan>",played:0,won:0,lost:0,for:0,against:0,points:0}])');
 assert.match(table,/data-profile="alex"/);
 app.run('user={role:"admin",name:"Mr French"};');
 const card=app.run('playerCard(state.players[0],"","","")');
 assert.match(card,/data-profile="alex"/);assert.match(card,/data-edit-player="alex"/);
 const bracket=app.run('bracketMatch({id:"record-bracket",a:"alex",b:"ben",status:"complete",score:[1,0],winner:"alex"})');
 assert.match(bracket,/<article class="tie /);assert.match(bracket,/data-profile="alex"/);assert.match(bracket,/data-profile="ben"/);assert.match(bracket,/data-correct-result="record-bracket"/);
 app.run('state.league=[];state.competitions=[];showPlayerRecord("alex");');
 assert.match(app.elements.get('#modal-root').innerHTML,/No played results yet/);
});
test('optional highlights submit the named player and frame without changing the result workflow',async()=>{
 const app=ui();
 app.run('state=initialState();state.league=[{id:"sample-match",a:state.players[0].id,b:state.players[1].id,status:"open",bestOf:3}];user={role:"player",id:state.players[0].id,name:state.players[0].name};record("sample-match");');
 const html=app.elements.get('#modal-root').innerHTML;
 for(const text of ['Match highlights','Optional','Triple Threat','Clearance','Against the Odds','data-highlight-frame','disabled required','You can submit just the score'])assert(html.includes(text));
 const id=app.run('state.players[0].id');
 app.context.FormData=class{constructor(){return new Map([['a','2'],['b','1']]);}};
 const choice={dataset:{playerId:id,kind:'clearance'},closest:()=>({querySelector:()=>({value:'3'})})};
 await app.submit({id:'score-form',getAttribute:()=> 'score-form',dataset:{match:'sample-match'},querySelector:()=>({disabled:false}),querySelectorAll:()=>[choice]});
 assert.equal(app.run('state.matchHighlights[0].frame'),3);
 assert.equal(app.run('state.matchHighlights[0].playerId'),id);
 assert.equal(app.run('state.matchHighlights[0].review'),undefined);
 assert.equal(app.run('state.league[0].status'),'open');
 assert.equal(app.run('state.submissions[0].score.join(",")'),'2,1');
});
test('highlight tasks remain in Alerts after marking notifications read and approval waits for the played score',async()=>{
 const app=ui();app.location.hash='#alerts';
 app.run('state=initialState();state.league=[{id:"sample-match",a:state.players[0].id,b:state.players[1].id,status:"open",bestOf:1}];user={role:"player",id:state.players[0].id,name:state.players[0].name};act(state,"submit",{id:"sample-match",score:[1,0],highlights:[{playerId:user.id,kind:"clearance",frame:1}]},user);route();render();');
 assert(!app.elements.get('#app').innerHTML.includes('data-respond-highlight='));
 app.run('user={role:"player",id:state.players[1].id,name:state.players[1].name};act(state,"readAlerts",{all:true},user);render();');
 assert.match(app.elements.get('#app').innerHTML,/Confirm highlight/);assert.match(app.elements.get('#app').innerHTML,/0 unread/);
 const claim=app.run('state.matchHighlights[0].id');await app.click({respondHighlight:claim,highlightDecision:'dispute'});
 assert.match(app.elements.get('#modal-root').innerHTML,/Dispute match highlight/);assert.match(app.elements.get('#modal-root').innerHTML,/name="reason".*required/);
 app.run('closeModal();act(state,"respondMatchHighlight",{id:state.matchHighlights[0].id,decision:"confirm"},user);user={role:"admin",name:"Mr French"};page="approvals";render();');
 assert.match(app.elements.get('#app').innerHTML,/data-highlight-decision="approve" disabled/);
 app.run('act(state,"approve",{id:state.submissions[0].id},user);render();');
 assert.match(app.elements.get('#app').innerHTML,/data-highlight-decision="approve" >/);
 await app.click({reviewHighlight:claim,highlightDecision:'approve'});
 assert.match(app.elements.get('#modal-root').innerHTML,/I have checked the claim/);
});
test('players can add a forgotten highlight to an approved match and the collection explains the declaration process',()=>{
 const app=ui();app.location.hash='#alerts';
 app.run('state=initialState();state.league=[{id:"sample-match",a:state.players[0].id,b:state.players[1].id,status:"open",bestOf:1}];user={role:"admin",name:"Mr French"};act(state,"recordResult",{id:"sample-match",score:[1,0]},user);user={role:"player",id:state.players[1].id,name:state.players[1].name};route();render();');
 assert.match(app.elements.get('#app').innerHTML,/Declare a match highlight/);
 app.run('declareHighlightDialog("sample-match");');
 assert.match(app.elements.get('#modal-root').innerHTML,/<details open class="match-highlights-fields"/);
 assert.match(app.elements.get('#modal-root').innerHTML,/id="declare-highlights-form"/);
 app.location.hash='#breakthroughs';app.run('closeModal();route();render();');
 assert.match(app.elements.get('#app').innerHTML,/How to earn achievements/);
 assert.match(app.elements.get('#app').innerHTML,/opposing side confirms it in Alerts/);
});
test('administrator result picker selects any singles or fixed pairs matchup and saves it without a second approval',async()=>{
 const app=ui();app.run(`state=initialState(true);user={role:'admin',name:'Mr French'};
 for(const c of state.competitions){for(const p of state.players.slice(0,8))act(state,'enterCompetition',{id:c.id},{role:'player',id:p.id});act(state,'drawCompetition',{id:c.id},user);}route();render();`);
 const modal=()=>app.elements.get('#modal-root').innerHTML;
 assert.match(app.elements.get('#app').innerHTML,/data-action="record"\s*>Enter result/);
 await app.click({action:'record'});assert.match(modal(),/id="admin-result-picker"/);assert.match(modal(),/name="match" required disabled/);
 const focusTimers=[];let focused='';app.context.setTimeout=fn=>focusTimers.push(fn);
 app.elements.set('#admin-result-competition',{value:'pairs-league',focus(){focused='competition';}});
 app.elements.set('#admin-result-player',{focus(){focused='player';}});
 await app.change({id:'admin-result-competition',value:'pairs-league'});
 focusTimers.splice(0).forEach(fn=>fn());assert.equal(focused,'competition');
 assert.match(modal(),/value="pairs-league" selected/);
 const pair=app.run('state.competitions[2].teams[0].id');
 await app.change({id:'admin-result-player',value:pair});
 focusTimers.splice(0).forEach(fn=>fn());assert.equal(focused,'player');
 assert.match(modal(),/ &amp; /);assert.match(modal(),/Unplayed/);
 const id=app.run('state.competitions[2].fixtures.find(m=>[m.a,m.b].includes(state.competitions[2].teams[0].id)).id');
 app.context.FormData=class{constructor(){return new Map([['match',id]]);}};
 await app.submit({dataset:{},getAttribute:()=> 'admin-result-picker',querySelector:()=>({disabled:false})});
 assert.match(modal(),/Save result/);assert.match(modal(),/approves this result immediately/);
 app.context.FormData=class{constructor(){return new Map([['winner','b']]);}};
 await app.submit({dataset:{match:id},getAttribute:()=> 'score-form',querySelector:()=>({disabled:false})});
 assert.equal(app.run(`findMatch(state,${JSON.stringify(id)}).status`),'complete');assert.equal(app.run('state.submissions.length'),0);
 assert.equal(app.elements.get('#toast').textContent,'Result saved and approved.');
 app.run(`record(${JSON.stringify(id)})`);assert.match(modal(),/Correct approved result/);assert.match(modal(),/name="reason"/);
 await app.click({action:'account'});assert.match(modal(),/data-action="record">.*Enter result/);
 app.location.hash='#approvals';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/data-action="record"\s*>Enter result/);
 app.location.hash='#competition/singles-knockout';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/data-admin-result="singles-knockout">Enter result/);
});
test('administrator selection reviews pending scores and can start from a player, while pupils keep their own submission flow',async()=>{
 const app=ui();app.run(`state=initialState(true);user={role:'admin',name:'Mr French'};const m=state.league.find(m=>m.status==='open');act(state,'submit',{id:m.id,score:[1,0]},{role:'player',id:m.a});record(m.id);`);
 const modal=()=>app.elements.get('#modal-root').innerHTML;
 assert.match(modal(),/Review submitted result/);assert.match(modal(),/data-approve=/);assert.match(modal(),/data-reject=/);assert.doesNotMatch(modal(),/id="score-form"/);
 const player=app.run('state.league[0].a');await app.click({adminResult:'',resultPlayer:player});assert.match(modal(),new RegExp(`value="${player}" selected`));
 app.run('user={role:"player",id:state.players[0].id,name:state.players[0].name};');
 const before=modal();await app.click({adminResult:'pairs-league'});assert.equal(modal(),before);assert.equal(app.elements.get('#toast').textContent,'Administrator access required.');
 app.run('record();');assert.match(modal(),/class="player-result-picker"/);assert.doesNotMatch(modal(),/admin-result-picker/);
 app.run('record(openMatches().find(m=>isMatchParticipant(state,m,user.id)).id);');assert.match(modal(),/Mr French will approve/);assert.match(modal(),/Submit result/);assert.doesNotMatch(modal(),/Save result/);
});
test('administrator picker handles undrawn events and legacy fixtures without changing the saved draw',()=>{
 const app=ui();app.run('state=initialState();user={role:"admin",name:"Mr French"};record();');
 assert.match(app.elements.get('#modal-root').innerHTML,/No matches available/);
 app.run('state=initialState(true);');const before=app.run('JSON.stringify(state)');app.run('adminRecordPicker();');
 assert.match(app.elements.get('#modal-root').innerHTML,/Earlier league/);assert.match(app.elements.get('#modal-root').innerHTML,/division:d0/);
 assert.equal(app.run('JSON.stringify(state)'),before);
});
test('Breakthroughs collections show public awards, separate streaks and exactly 100 distinct animation paths',()=>{
 const app=ui();app.location.hash='#breakthroughs';
 app.run('state=initialState();user={role:"player",id:state.players[0].id,name:state.players[0].name};act(state,"syncBreakthroughs",{},user);route();render();');
 const html=app.elements.get('#app').innerHTML;
 for(const text of ['Your Breakthroughs','Achievement points are separate from league points.','Singles winning streak','Pairs winning streak','Weekly playing streak','Badge collection'])assert(html.includes(text));
 assert.equal((html.match(/data-preview-celebration="/g)||[]).length,100);
 assert.equal(app.run('new Set(CELEBRATIONS.map(c=>c.name)).size'),100);
 assert.equal(app.run('new Set(CELEBRATIONS.map(c=>JSON.stringify(celebrationFrames(c,3)))).size'),100);
 assert.equal(app.run('CELEBRATIONS.every(c=>celebrationFrames(c,3).every(f=>!f.transform.includes("NaN")))'),true);
 app.run('user=null;route();render();');
 assert(!app.elements.get('#app').innerHTML.includes('data-preview-celebration'));
});
test('personal alert filters, escaped announcements and mark-read actions affect only the current account',async()=>{
 const app=ui();app.location.hash='#alerts';
 app.run('state=initialState();user={role:"player",id:state.players[0].id,name:state.players[0].name};act(state,"syncBreakthroughs",{},user);act(state,"postAnnouncement",{title:"<script>notice</script>",text:"<img onerror=alert(1)>"},{role:"admin",name:"Mr French"});route();render();');
 let html=app.elements.get('#app').innerHTML;
 assert.match(html,/Your alerts/);assert.match(html,/1 unread/);assert.match(html,/&lt;script&gt;notice/);assert(!html.includes('<img onerror'));
 await app.click({action:'readAllAlerts'});
 assert.match(app.elements.get('#app').innerHTML,/0 unread/);
 app.run('user={role:"player",id:state.players[1].id,name:state.players[1].name};render();');
 assert.match(app.elements.get('#app').innerHTML,/1 unread/);
 await app.click({alertFilter:'results'});assert.match(app.elements.get('#app').innerHTML,/No alerts here/);
 app.run('user=null;render();');assert.match(app.elements.get('#app').innerHTML,/Sign in to view competitions, standings and results/);
});
test('celebration receipt responses never redraw a form opened during the request, and account changes clear the queue',async()=>{
 const app=ui();
 app.run('state=initialState();demo=false;user={role:"player",id:state.players[0].id,name:state.players[0].name};act(state,"syncBreakthroughs",{},user);act(state,"awardSportsmanship",{playerId:user.id,kind:"fair-play",reason:"Synthetic reason"},{role:"admin",name:"Mr French"});route();render();');
 const original=app.elements.get('#app').innerHTML,state=app.run('structuredClone(state)');
 let finish;
 app.context.fetch=async()=>new Promise(resolve=>{finish=()=>resolve({ok:true,async json(){return {state,revision:1};}});});
 const receive=app.run('receiveCelebrations()');
 app.elements.set('#settings-form[data-dirty="true"]',{dataset:{dirty:'true'}});
 finish();await receive;
 assert.equal(app.elements.get('#app').innerHTML,original);
 assert(app.run('celebrationQueue.length')>0);
 app.elements.delete('#settings-form[data-dirty="true"]');
 app.run('user={role:"player",id:state.players[1].id,name:state.players[1].name};render();');
 assert.equal(app.run('celebrationQueue.length'),0);
 app.run('user=null;render();');assert.equal(app.run('celebrationIdentity'),'');
});
test('joining links preselect an individual competition, show all four choices and never enter anyone before confirmation',()=>{
 const app=ui();app.location.hash='#join/pairs-knockout';app.run('state=initialState();user={role:"player",id:state.players[0].id,name:state.players[0].name};route();render();');
 const html=app.elements.get('#app').innerHTML;
 for(const title of ['Singles league','Doubles league','Singles cup','Doubles cup'])assert(html.includes(title));
 assert.match(html,/Choose competitions/);assert.match(html,/value="pairs-knockout" data-join-pick checked/);assert.match(html,/Partners are drawn randomly/);
 assert.equal(app.run('state.competitions.every(c=>c.entries.length===0)'),true);
 app.location.hash='#join/missing';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/does not match a competition/);assert.equal(app.run('joinSelection.size'),0);
 app.location.hash='#join/singles-knockout';app.run('state.competitions[1].status="closed";route();render();');assert.match(app.elements.get('#app').innerHTML,/value="singles-knockout" data-join-pick  disabled/);assert.equal(app.run('joinSelection.size'),0);
});
test('a signed-out joining link offers account registration and preselects the competition only after sign-in',async()=>{
 const app=ui();app.location.hash='#join/pairs-knockout';app.run('state=initialState();demo=false;route();render();');
 const html=()=>app.elements.get('#app').innerHTML;
 assert.match(html(),/Player sign in/);await app.click({action:'requestAccount'});assert.match(html(),/Request an account/);assert.doesNotMatch(html(),/id="joining-form"|data-join-pick/);
 assert.equal(app.run('joinSelection.size'),0);
 const state=app.run('structuredClone(state)'),[player]=state.players,user={role:'player',id:player.id,name:player.name};
 app.context.fetch=async(path,options)=>{
  if(path==='/api/signup'){
   assert.deepEqual(JSON.parse(options.body),{playerId:player.id,pin:'704291'});
   return {ok:true,async json(){return {pending:true,name:player.name};}};
  }
  if(path==='/api/state')return {ok:true,async json(){return {state,user:app.run('user'),revision:2};}};
  assert.equal(path,'/api/login');return {ok:true,async json(){return {user};}};
 };
 await app.run(`submitSignup({rosterChoice:${JSON.stringify(player.id)},pin:'704291',confirmPin:'704291'})`);
 assert.match(html(),/Sign-up request sent/);assert.doesNotMatch(html(),/id="joining-form"/);
 await app.click({action:'signupLogin'});
 app.context.FormData=class{constructor(){return new Map([['id',player.id],['pin','704291']]);}};
 await app.submit({dataset:{role:'player'},getAttribute:()=> 'login-form',querySelector:()=>({disabled:false})});
 assert.match(html(),/Choose competitions/);assert.match(html(),/value="pairs-knockout" data-join-pick checked/);
 assert.equal(app.run('state.competitions.every(c=>c.entries.length===0)'),true);
});
test('owner review can mark a test account and confirm removal of its listed entries',async()=>{
 const app=ui();
 app.run('state=initialState();demo=false;user={role:"admin",name:"Mr French"};revision=1;page="players";state.signupRequests=[{id:"request",name:"Trial X.",ids:["full-league"]}];render();');
 await app.click({reviewSignup:'request'});
 assert.match(app.elements.get('#modal-root').innerHTML,/Mark as my test account/);
 app.elements.set('#signup-test-account',{checked:true});
 const initial=app.run('structuredClone(state)'),approved=structuredClone(initial);
 approved.signupRequests=[];
 approved.players.push({id:'trial',name:'Trial X.',rating:0,testAccount:true});
 approved.competitions[0].entries.push('trial');
 app.context.fetch=async(path,options)=>{
  assert.equal(path,'/api/action');
  assert.deepEqual(JSON.parse(options.body),{action:'reviewSignup',payload:{id:'request',decision:'approve',testAccount:true},revision:1});
  return {ok:true,async json(){return {state:approved,revision:2};}};
 };
 await app.click({signupDecision:'approve',signupId:'request',signupRevision:'1'});
 assert.match(app.elements.get('#app').innerHTML,/Test account/);
 await app.click({editPlayer:'trial'});
 assert.match(app.elements.get('#modal-root').innerHTML,/data-remove-test-account="trial"/);
 await app.click({removeTestAccount:'trial'});
 assert.match(app.elements.get('#modal-root').innerHTML,/Remove <strong>Trial X\.<\/strong>/);
 assert.match(app.elements.get('#modal-root').innerHTML,/Singles league/);
 assert.match(app.elements.get('#modal-root').innerHTML,/data-confirm-remove-test="trial"/);
 app.context.fetch=async(path,options)=>{
  assert.equal(path,'/api/action');
  assert.deepEqual(JSON.parse(options.body),{action:'removeTestAccount',payload:{id:'trial'},revision:2});
  return {ok:true,async json(){return {state:{...initial,signupRequests:[]},revision:3};}};
 };
 await app.click({confirmRemoveTest:'trial',signupRevision:'2'});
 assert.match(app.elements.get('#toast').textContent,/Test account and competition entries removed/);
 assert(!app.elements.get('#app').innerHTML.includes('Trial X.'));
});
test('signed-in selection waits for confirmation and shows only successful entries on the receipt',async()=>{
 const app=ui();app.location.hash='#join';app.run('state=initialState();route();render();');
 app.context.FormData=class{constructor(){return new Map([['id',app.run('state.players[0].id')],['pin','1234']]);}};
 const login={dataset:{role:'player'},getAttribute:()=> 'login-form',querySelector:()=>({disabled:false})};
 await app.submit(login);app.run('joinSelection=new Set(["full-league","pairs-knockout"]);render();');assert.equal(app.run('state.competitions.every(c=>c.entries.length===0)'),true);
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
test('public competition entry links lead to sign-up or sign-in, and signed-in pupils can enter directly',async()=>{
 const app=ui();app.run('state=initialState();state.players.push({id:"extra",name:"Player C",rating:0});route();render();');let html=app.elements.get('#app').innerHTML;assert.match(html.replace(/<[^>]*>/g,""),/Welcome to the Wakefield Pool Championship/);for(const title of ['Full league','Singles knockout','Pairs league','Pairs knockout'])assert(!html.includes(title));
 app.location.hash='#competition/pairs-knockout';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/id="login-form"/);assert.doesNotMatch(app.elements.get('#app').innerHTML,/Enter competition/);
 app.run('user={role:"player",id:state.players[0].id,name:state.players[0].name};');await app.click({enter:'pairs-knockout'});assert.equal(app.run('state.competitions[3].entries.length'),1);assert.match(app.elements.get('#app').innerHTML,/One more player needed/);assert.match(app.elements.get('#app').innerHTML,/data-leave="pairs-knockout"/);
 await app.click({shareCompetition:'pairs-knockout'});assert.equal(app.context.sharedLink,'https://club.example/#competition/pairs-knockout');
});
test('every competition view and pair scoring modal renders; closed odd draws explain how to add a reserve',async()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};for(const c of state.competitions){for(const p of state.players.slice(0,8))act(state,"enterCompetition",{id:c.id},{role:"player",id:p.id});act(state,"drawCompetition",{id:c.id},user);}');
 for(const id of ['full-league','singles-knockout','pairs-league','pairs-knockout'])for(const view of ['fixtures','standings','bracket','pairs']){
  app.location.hash='#competition/'+id;app.run('route();');app.run('competitionView='+JSON.stringify(view)+';render();');assert(!app.elements.get('#app').innerHTML.includes('undefined'));assert(!app.elements.get('#app').innerHTML.includes('NaN'));
 }
 app.run('const c=state.competitions[2],m=c.fixtures[0],t=c.teams.find(t=>t.id===m.a);user={role:"player",id:t.members[1],name:name(t.members[1])};record(m.id);');assert.match(app.elements.get('#modal-root').innerHTML,/ &amp; /);assert.match(app.elements.get('#modal-root').innerHTML,/Mr French will approve/);
 app.run('user={role:"admin",name:"Mr French"};act(state,"createCompetition",{name:"Odd pair cup",mode:"pairs",format:"knockout"},user);const odd=state.competitions.at(-1);for(const p of state.players.slice(0,5))act(state,"enterCompetition",{id:odd.id},{role:"player",id:p.id});confirmDraw(odd.id);');assert.match(app.elements.get('#modal-root').innerHTML,/One more player needed/);assert.match(app.elements.get('#modal-root').innerHTML,/data-confirm-draw="[^"]+" disabled/);
 for(const page of ['#league','#cup','#players','#settings','#approvals','#overview']){app.location.hash=page;app.run('route();render();');assert(!app.elements.get('#app').innerHTML.includes('undefined'));}
});

test('Players shows list details and form, with a private registered-player filter across views',async()=>{
 const app=ui();app.location.hash='#players';
 app.run(`state=initialState();demo=false;
 const [a,b]=state.players; b.hasAccount=true;
 state.players.push({id:'roster-only',name:'Roster Only',rating:0});
 state.signupRequests=[{id:'pending',playerId:a.id,name:a.name,ids:[]}];
 state.league=[{id:'result',a:a.id,b:b.id,status:'open',bestOf:1}];
 applyResult(state,'result',[1,0]);user={role:'player',id:b.id,name:b.name};route();render();`);
 const html=()=>app.elements.get('#app').innerHTML;
 assert.match(html(),/data-player-view="roster" class="selected" aria-pressed="true"/);
 assert.doesNotMatch(html(),/data-player-scope=|Pending approval|registered-account/);
 await app.click({playerView:'list'});
 assert.match(html(),/data-player-view="list" class="selected" aria-pressed="true"/);
 assert.match(html(),/Division<\/th>.*Played<\/th>.*Won<\/th>.*Points<\/th><th scope="col">Form \(last 5\)<\/th><\/tr>/);
 assert.match(html(),/class="player-list-row" data-player-name="george"[\s\S]*form-loss[\s\S]*data-player-name="mr french"[\s\S]*form-win/);
 await app.click({playerView:'form'});
 assert.match(html(),/form-win.*>W<.*>Win</);
 assert.match(html(),/form-loss.*>L<.*>Loss</);
 app.run('user={role:"admin",name:"Mr French"};render();');
 assert.match(html(),/All players <span>3<\/span>/);
 assert.match(html(),/Registered <span>1<\/span>/);
 assert.match(html(),/Pending approval/);
 assert.match(html(),/Roster only/);
 await app.click({playerView:'list'});
 await app.click({playerScope:'registered'});
 assert.match(html(),/data-player-view="list" class="selected"/);
 assert.match(html(),/>1 registered player</);
 assert.match(html(),/<th scope="col">Account<\/th>/);
 assert.match(html(),/data-player-name="george"/);
 assert.doesNotMatch(html(),/data-player-name="mr french"/);
 await app.click({playerView:'form'});
 assert.match(html(),/data-player-scope="registered" class="selected"/);
 assert.doesNotMatch(html(),/data-player-name="roster only"/);
 app.run('user={role:"player",id:state.players[1].id,name:state.players[1].name};render();');
 assert.match(html(),/data-player-name="roster only"/);
 assert.doesNotMatch(html(),/data-player-scope=|Pending approval|registered-account/);
});

test('Manage entries lists only account holders entered in that event and preserves older entries',async()=>{
 const app=ui();app.run(`state=initialState(true);demo=false;user={role:"admin",name:"Mr French"};
 state.players[0].hasAccount=true;state.players[2].hasAccount=true;state.players[3].hasAccount=true;
 state.competitions[0].entries=["p0","p1"];state.competitions[1].entries=["p2"];manageEntries("full-league");`);
 const html=()=>app.elements.get('#modal-root').innerHTML;
 assert.match(html(),/Remove Mr French/);
 assert.match(html(),/1 saved entry needs a player account/);
 assert.doesNotMatch(html(),/George|Oliver W|Harry S|Add all players|Add selected players/);
 assert.equal(app.run('state.competitions[0].entries.length'),2);
 app.run('manageEntries("pairs-league");');
 assert.match(html(),/No players with accounts have entered this competition/);
 app.run('state.competitions[2].entries=["p0"];confirmDraw("pairs-league");');
 assert.match(html(),/id="reserve-form"/);
 assert.match(html(),/Oliver W/);
 assert.doesNotMatch(html(),/<option[^>]*>George|<option[^>]*>Mr French/);
});

test('Mr French can enter an open competition from his admin session and see the entry in Manage entries',async()=>{
 const app=ui();
 app.location.hash='#join/singles-knockout';
 app.run('state=initialState();demo=false;user={role:"admin",name:"Mr French"};route();render();');
 const html=()=>app.elements.get('#app').innerHTML;
 const c=app.run('state.competitions[1]'),player=app.run('state.players[0]');
 app.context.fetch=async(path,options)=>{
  assert.equal(path,'/api/action');
  assert.deepEqual(JSON.parse(options.body),{action:'enterCompetition',payload:{id:c.id},revision:0});
  const next=app.run('structuredClone(state)');
  domain.act(next,'enterCompetition',{id:c.id},{role:'admin',name:'Mr French'});
  return {ok:true,json:async()=>({state:next,revision:1})};
 };
 assert.match(html(),/data-enter="singles-knockout">Enter as Mr French/);
 await app.click({enter:c.id});
 assert.match(html(),/You are entered/);
 assert.doesNotMatch(html(),/Enter as Mr French/);
 assert.equal(app.run('user.role'),'admin');
 assert.deepEqual([...app.run('state.competitions[1].entries')],[player.id]);
 app.run('manageEntries("singles-knockout");');
 assert.match(app.elements.get('#modal-root').innerHTML,/Remove Mr French/);
 app.run('state.competitions[1].status="closed";state.competitions[1].entries=[];render();');
 assert.doesNotMatch(html(),/Enter as Mr French/);
});

test('drawn and completed events expose Edit and a name/rules form, preserving fixed draw settings',()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};for(const p of state.players)act(state,"enterCompetition",{id:"pairs-knockout"},{role:"player",id:p.id});act(state,"drawCompetition",{id:"pairs-knockout"},user);route();render();');
 assert.match(app.elements.get('#app').innerHTML,/data-edit-competition="pairs-knockout"/);
 app.location.hash='#competition/pairs-knockout';app.run('route();render();');assert.match(app.elements.get('#app').innerHTML,/data-edit-competition="pairs-knockout"/);
 app.run('competitionForm("pairs-knockout");');const html=app.elements.get('#modal-root').innerHTML;assert.match(html,/name="name"/);assert.match(html,/name="rules"/);assert(!html.includes('name="format"'));assert(!html.includes('name="consolation"'));
});

test('administrators can open correction and withdrawal forms; pupil views do not expose correction or recovery controls',async()=>{
 const app=ui();app.run('state=initialState(true);user={role:"admin",name:"Mr French"};for(const p of state.players)act(state,"enterCompetition",{id:"pairs-league"},{role:"player",id:p.id});act(state,"drawCompetition",{id:"pairs-league"},user);const match=state.competitions[2].fixtures[0];act(state,"submit",{id:match.id,score:[1,0]},user);act(state,"approve",{id:state.submissions[0].id},user);selectedCompetition="pairs-league";page="competition";competitionView="fixtures";render();');
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

test('league players choose any opponent and submit that exact match in singles and pairs',async()=>{
 for(const id of ['full-league','pairs-league']){
  const app=ui();app.location.hash='#competition/'+id;
  app.run(`state=initialState(true);for(const p of state.players.slice(0,8))act(state,'enterCompetition',{id:${JSON.stringify(id)}},{role:'player',id:p.id});act(state,'drawCompetition',{id:${JSON.stringify(id)}},{role:'admin'});const c=state.competitions.find(c=>c.id===${JSON.stringify(id)});user={role:'player',id:c.teams[0].members.at(-1),name:name(c.teams[0].members.at(-1))};route();render();`);
  const available=app.run('c.fixtures.filter(m=>isMatchParticipant(state,m,user.id))');
  let html=app.elements.get('#app').innerHTML;
  assert.match(html,/Choose an opponent/);assert.match(html,/in any order/);
  assert.doesNotMatch(html,/Your next match|NEXT OPPONENT|SUGGESTED|ROUND \d|wait for the next round/);
  for(const m of available)assert(html.includes(`data-score="${m.id}"`));
  assert(!html.includes(`data-score="${app.run('c.fixtures.find(m=>!isMatchParticipant(state,m,user.id)).id')}"`));
  const chosen=available.at(-1);
  await app.click({score:chosen.id});
  assert.match(app.elements.get('#modal-root').innerHTML,new RegExp(`data-match="${chosen.id}"`));
  assert(app.elements.get('#modal-root').innerHTML.includes(app.run('c.name')));
  app.context.FormData=class{constructor(){return new Map([['winner','b']]);}};
  await app.submit({getAttribute:()=> 'score-form',dataset:{match:chosen.id},querySelector:()=>({disabled:false})});
  assert.equal(app.run('state.submissions[0].match'),chosen.id);
  assert.equal(app.run('c.fixtures.filter(m=>m.status==="complete").length'),0);
  html=app.elements.get('#app').innerHTML;
  assert(!html.includes(`data-score="${chosen.id}"`));assert.match(html,/Results awaiting approval \(1\)/);
  app.run('act(state,"approve",{id:state.submissions[0].id},{role:"admin"});render();');
  assert.equal(app.run(`findMatch(state,${JSON.stringify(chosen.id)}).status`),'complete');
  assert.equal(app.run('competitionStandings(state,state.competitions.find(x=>x.id===c.id)).reduce((sum,p)=>sum+p.played,0)'),2);
 }
});

test('administrator versus cards preview singles or fixed pairs without assigning or submitting a match',async()=>{
 for(const id of ['full-league','pairs-league']){
  const app=ui();app.location.hash='#competition/'+id;
  app.run(`state=initialState(true);for(const p of state.players.slice(0,8))act(state,'enterCompetition',{id:${JSON.stringify(id)}},{role:'player',id:p.id});act(state,'drawCompetition',{id:${JSON.stringify(id)}},{role:'admin'});const c=state.competitions.find(c=>c.id===${JSON.stringify(id)});user={role:'admin',name:'Mr French'};route();competitionPlayer=c.teams[0].members[0];render();`);
  assert.match(app.elements.get('#app').innerHTML,/type="submit" disabled>Enter result/);
  const match=app.run('c.fixtures.filter(m=>isMatchParticipant(state,m,competitionPlayer)).at(-1)'),side=app.run('c.teams[0].id'),key=JSON.stringify(['competition',id,side]);
  const preview={innerHTML:''},length={textContent:''},button={disabled:true},select={id:'league-opponent',value:match.id,dataset:{versusKey:key}};
  app.elements.set('#league-versus-preview',preview);app.elements.set('#versus-match-length',length);app.elements.set('#choose-league-match button[type="submit"]',button);app.elements.set('#league-opponent',select);
  const before=app.run('JSON.stringify(state)');
  await app.change(select);
  assert.equal(button.disabled,false);assert.equal(length.textContent,'Best of 1');assert.equal(app.run('JSON.stringify(state)'),before);
  for(const member of app.run(`sideMembers(state,${JSON.stringify(match.a)}).concat(sideMembers(state,${JSON.stringify(match.b)}))`))assert(preview.innerHTML.includes(app.run(`e(name(${JSON.stringify(member)}))`)));
  assert.equal(app.run('editingClub()'),true);
  app.run('render();');assert(app.elements.get('#app').innerHTML.includes(`value="${match.id}" selected`));
  select.value='';await app.change(select);assert.equal(button.disabled,true);assert.equal(app.run('editingClub()'),false);
  select.value=match.id;await app.change(select);app.run(`act(state,'submit',{id:${JSON.stringify(match.id)},score:[1,0]},{role:'player',id:competitionPlayer});render();`);
  assert(!app.elements.get('#app').innerHTML.includes(`value="${match.id}"`));assert.match(app.elements.get('#app').innerHTML,/type="submit" disabled>Enter result/);
 }
});

test('recovery is administrator-only, identifies one pupil and requires review before sending the reset',async()=>{
 const app=ui();app.run('state=initialState();state.players.forEach(p=>p.hasAccount=true);demo=false;user={role:"admin",name:"Mr French"};revision=7;page="players";render();');
 assert.match(app.elements.get('#app').innerHTML,/Recover account/);
 const id=app.run('state.players[1].id');
 await app.click({editPlayer:id});await app.click({recoverAccount:id});
 const html=app.elements.get('#modal-root').innerHTML;
 assert.match(html,/Recover pupil account/);assert.match(html,/I have checked this pupil’s identity/);assert.match(html,/type="checkbox" required/);assert(html.includes(`value="${id}" selected`));
 assert.match(html,/entries, partners and results are kept/);
 let calls=0;
 app.elements.set('#download-pins',{});
 app.context.fetch=async(path,options)=>{calls++;assert.equal(path,'/api/action');assert.deepEqual(JSON.parse(options.body),{action:'recoverAccount',payload:{id},revision:7});return {ok:true,json:async()=>({state:app.run('structuredClone(state)'),revision:8,pins:[{name:'George',pin:'654321'}]})};};
 assert.equal(calls,0);
 app.context.FormData=class{constructor(){return new Map([['id',id]]);}};
 await app.submit({getAttribute:()=> 'recover-account-form',dataset:{revision:'7'},querySelector:()=>({disabled:false})});
 assert.equal(calls,1);assert.match(app.elements.get('#modal-root').innerHTML,/Account recovered/);assert.match(app.elements.get('#modal-root').innerHTML,/654321/);assert.match(app.elements.get('#modal-root').innerHTML,/old PIN and signed-in sessions no longer work/);
 app.run('user={role:"player",id:state.players[1].id,name:state.players[1].name};render();closeModal();');
 assert.doesNotMatch(app.elements.get('#app').innerHTML,/Recover account/);
 await app.click({recoverAccount:id});assert.equal(app.elements.get('#modal-root').innerHTML,'');assert.equal(calls,1);
 app.run('user=null;login();');assert.match(app.elements.get('#app').innerHTML,/data-action="forgottenPin"/);
 await app.click({action:'forgottenPin'});assert.match(app.elements.get('#modal-root').innerHTML,/Ask Mr French to recover your account/);assert.equal(calls,1);
});

test('signed-in rules route and competition details show readable rules and preserve escaped custom text',()=>{
 const app=ui();app.location.hash='#rules';app.run('state=initialState();user={role:"player",id:state.players[0].id,name:state.players[0].name};route();render();');
 const html=app.elements.get('#app').innerHTML;
 assert.match(html,/<h1>Pool rules<\/h1>/);assert.match(html,/aria-current="page"[^>]*>.*?<span>Rules<\/span>/);
 assert.match(html,/<ol class="pool-rules-list" role="list">/);assert.equal((html.match(/<li/g)||[]).length,13);
 for(const text of ['Early black','Wrong ball first','White and black','Foul shots','White-ball placement','Colours','Break','Disputes'])assert(html.includes(`<strong>${text}:</strong>`));
 assert.match(html,/class="frame-loss-rule"/);assert.match(html,/Mr French’s approval/);
 app.run('state.competitions[0].rules="Custom: <script>alert(1)</script>\\nSecond line";selectedCompetition=state.competitions[0].id;page="competition";render();');
 const custom=app.elements.get('#app').innerHTML;
 assert.match(custom,/<strong>Custom:<\/strong> &lt;script&gt;/);assert.match(custom,/<li>Second line<\/li>/);assert.doesNotMatch(custom,/<script>/);
 assert.match(custom,/href="#rules">School pool rules/);
});

test('single-frame standings show shared positions and play-off guidance without frame difference',()=>{
 const app=ui();app.run(`state=initialState();user={role:'admin',name:'Mr French'};const c=state.competitions[0];c.status='drawn';c.teams=state.players.slice(0,3).map(p=>({id:p.id,members:[p.id]}));c.fixtures=[];selectedCompetition=c.id;competitionView='standings';page='competition';render();`);
 const html=app.elements.get('#app').innerHTML;
 assert.match(html,/0 per loss/);assert.match(html,/head-to-head/);assert.match(html,/play-off arranged by Mr French/);assert.match(html,/>1=<\/span>/);
 assert.doesNotMatch(html,/title="Frame difference"|alphabetical order/);
});

test('pupils request and cancel late league entry from league and joining pages without entering themselves',async()=>{
 const app=ui();app.run(`state=initialState(true);user={role:'player',id:'p6',name:state.players[6].name};
 for(const p of state.players.slice(0,4))act(state,'enterCompetition',{id:'full-league'},{role:'player',id:p.id});
 act(state,'drawCompetition',{id:'full-league'},{role:'admin'});page='competitions';render();`);
 assert.match(app.elements.get('#app').innerHTML,/data-request-league="full-league"/);
 assert.doesNotMatch(app.run('competitionEntryButton(state.competitions[1])'),/Request to join/);
 await app.click({requestLeague:'full-league'});
 assert.equal(app.run('state.competitions[0].entries.includes(user.id)'),false);
 assert.match(app.elements.get('#app').innerHTML,/Awaiting Mr French’s approval/);
 app.run(`page='join';render();`);
 assert.match(app.elements.get('#app').innerHTML,/data-cancel-league-request="full-league"/);
 await app.click({cancelLeagueRequest:'full-league'});
 assert.equal(app.run('state.competitions[0].entryRequests.length'),0);
 assert.match(app.elements.get('#app').innerHTML,/data-request-league="full-league"/);
});

test('administrator reviews late entry from Approvals and can add another player to a started league',async()=>{
 const app=ui();app.run(`state=initialState(true);user={role:'admin',name:'Mr French'};
 for(const p of state.players.slice(0,4))act(state,'enterCompetition',{id:'full-league'},{role:'player',id:p.id});
 act(state,'drawCompetition',{id:'full-league'},user);act(state,'requestLeagueEntry',{id:'full-league'},{role:'player',id:'p6'});page='approvals';render();`);
 assert.match(app.elements.get('#app').innerHTML,/League entry requests/);
 const id=app.run('state.competitions[0].entryRequests[0].id');
 await app.click({reviewLeagueRequest:id,league:'full-league'});
 assert.match(app.elements.get('#modal-root').innerHTML,/Approve entry/);
 app.context.FormData=class{constructor(){return new Map();}};
 await app.submit({dataset:{id:'full-league',requestId:id,playerId:'p6',revision:'0'},getAttribute:()=> 'league-request-review-form',querySelector:()=>({disabled:false})});
 assert.equal(app.run('state.competitions[0].entries.includes("p6")'),true);
 assert.equal(app.run('state.competitions[0].fixtures.length'),10);
 app.run(`selectedCompetition='full-league';page='competition';render();`);
 assert.match(app.elements.get('#app').innerHTML,/data-add-league="full-league"/);
 await app.click({addLeague:'full-league'});
 assert.match(app.elements.get('#modal-root').innerHTML,/id="league-add-form"/);
 assert.doesNotMatch(app.elements.get('#modal-root').innerHTML,/<option value="p6"/);
 app.context.FormData=class{constructor(){return new Map([['playerId','p7']]);}};
 await app.submit({dataset:{id:'full-league',revision:'0'},getAttribute:()=> 'league-add-form',querySelector:()=>({disabled:false})});
 assert.equal(app.run('state.competitions[0].fixtures.length'),15);
});

test('pairs request review waits for another applicant, then approves both while keeping the saved pairings',async()=>{
 const app=ui();app.run(`state=initialState(true);user={role:'admin',name:'Mr French'};
 for(const p of state.players.slice(0,4))act(state,'enterCompetition',{id:'pairs-league'},{role:'player',id:p.id});
 act(state,'drawCompetition',{id:'pairs-league'},user);act(state,'requestLeagueEntry',{id:'pairs-league'},{role:'player',id:'p6'});`);
 const id=app.run('state.competitions[2].entryRequests[0].id');
 await app.click({reviewLeagueRequest:id,league:'pairs-league'});
 assert.match(app.elements.get('#modal-root').innerHTML,/<button type="submit" class="button primary" disabled>Approve both/);
 app.run(`act(state,'requestLeagueEntry',{id:'pairs-league'},{role:'player',id:'p7'});`);
 await app.click({reviewLeagueRequest:id,league:'pairs-league'});
 assert.match(app.elements.get('#modal-root').innerHTML,/<option value="p7"/);
 app.context.FormData=class{constructor(){return new Map([['partnerId','p7']]);}};
 await app.submit({dataset:{id:'pairs-league',requestId:id,playerId:'p6',revision:'0'},getAttribute:()=> 'league-request-review-form',querySelector:()=>({disabled:false})});
 assert.equal(app.run('state.competitions[2].teams.length'),3);
 assert.deepEqual(Array.from(app.run('state.competitions[2].teams.at(-1).members')),['p6','p7']);
});


test('every signed-out route mounts only the welcome screen and keeps the intended destination',()=>{
 const app=ui();app.run('state=initialState(true);demo=false;');
 const before=app.run('JSON.stringify(state)');
 for(const hash of ['', '#competitions','#league','#cup','#players','#rules','#overview','#settings','#approvals','#alerts','#breakthroughs','#competition/full-league','#join/pairs-knockout']){
  app.location.hash=hash;app.run('route();render();');
  const html=app.elements.get('#app').innerHTML;
  assert.match(html,/class="welcome-shell"/);assert.match(html,/id="login-form"/);
  assert.doesNotMatch(html,/class="sidebar"|class="topbar"|class="mobile-nav"|data-profile=|id="joining-form"|class="pool-rules-list"|data-enter=|id="settings-form"/);
  assert.equal(app.location.hash,hash);
 }
 assert.equal(app.run('JSON.stringify(state)'),before);
 assert.equal(app.run('joinSelection.size'),0);
});

test('incorrect PIN keeps the welcome screen; successful sign-in restores a competition and sign-out hides it',async()=>{
 const app=ui();app.location.hash='#competition/full-league';app.run('state=initialState(true);route();render();');
 const id=app.run('state.players[0].id');let pin='0000';
 app.context.FormData=class{constructor(){return new Map([['id',id],['pin',pin]]);}};
 const error={textContent:''};app.elements.set('#login-error',error);
 const form={dataset:{role:'player'},getAttribute:()=> 'login-form',querySelector:()=>({disabled:false})};
 await app.submit(form);assert.match(error.textContent,/Use PIN 1234/);assert.equal(app.run('user'),null);assert.match(app.elements.get('#app').innerHTML,/welcome-shell/);
 pin='1234';await app.submit(form);
 assert.equal(app.run('user.id'),id);assert.equal(app.run('selectedCompetition'),'full-league');assert.equal(app.location.hash,'#competition/full-league');
 assert.match(app.elements.get('#app').innerHTML,/class="sidebar"/);assert.doesNotMatch(app.elements.get('#app').innerHTML,/welcome-shell/);
 await app.click({action:'account'});assert.match(app.elements.get('#modal-root').innerHTML,/Your account/);
 await app.click({action:'logout'});
 assert.equal(app.run('user'),null);assert.equal(app.elements.get('#modal-root').innerHTML,'');assert.match(app.elements.get('#app').innerHTML,/welcome-shell/);assert.equal(app.elements.get('#toast').textContent,'');
});

test('administrator sign-in and account request use the same welcome screen without exposing navigation',async()=>{
 const app=ui();app.run('state=initialState();demo=false;route();render();');
 await app.click({action:'adminLogin'});assert.match(app.elements.get('#app').innerHTML,/Administrator password/);assert.doesNotMatch(app.elements.get('#app').innerHTML,/class="sidebar"/);
 app.run('chatgptAdmin=true;render();');assert.match(app.elements.get('#app').innerHTML,/Sign in with ChatGPT/);assert.doesNotMatch(app.elements.get('#app').innerHTML,/Administrator password/);
 await app.click({action:'playerLogin'});await app.click({action:'requestAccount'});
 assert.match(app.elements.get('#app').innerHTML,/id="signup-form"/);assert.doesNotMatch(app.elements.get('#app').innerHTML,/id="login-form"|class="sidebar"/);
 app.run('state.players=[];showWelcome("player");');assert.match(app.elements.get('#app').innerHTML,/No players are listed yet/);assert.match(app.elements.get('#app').innerHTML,/Request an account/);
});

test('expired sessions remove an open private dialog even while automatic updates are deferred',async()=>{
 const app=ui();app.run('state=initialState();demo=false;revision=4;user={role:"player",id:state.players[0].id,name:state.players[0].name};render();actions.account();');
 const before=app.run('JSON.stringify(state)');assert.equal(app.run('editingClub()'),true);
 app.context.fetch=async path=>{assert.equal(path,'/api/revision');return {ok:true,json:async()=>({revision:4,user:null})};};
 await app.run('syncClub()');
 assert.equal(app.run('user'),null);assert.equal(app.elements.get('#modal-root').innerHTML,'');assert.match(app.elements.get('#app').innerHTML,/welcome-shell/);assert.equal(app.run('JSON.stringify(state)'),before);
});

test('background refresh preserves a partially completed welcome sign-in form',async()=>{
 const app=ui();app.run('state=initialState();demo=false;revision=4;render();');
 const original=app.elements.get('#app').innerHTML;
 app.elements.set('#login-form[data-dirty="true"]',{dataset:{dirty:'true'}});
 const updated=app.run('structuredClone(state)');updated.players.push({id:'new-player',name:'New player'});
 app.context.fetch=async()=>({ok:true,json:async()=>({revision:5,user:null,state:updated})});
 await app.run('refresh(true)');assert.equal(app.elements.get('#app').innerHTML,original);assert.equal(app.run('revision'),4);assert.equal(app.run('syncPending'),true);
});
