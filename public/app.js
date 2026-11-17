import { initialState, standings, findMatch, act, APP_NAME, leaguePlan, ensureCompetitions, allMatches, sideName, sideMembers, isMatchParticipant, competitionForMatch, competitionMatches, competitionStandings, requiresApproval, administratorPlayer, recentPlayerForm, playerMatchRecord, BREAKTHROUGHS, breakthroughProgress, breakthroughMetrics, breakthroughAlerts, breakthroughReceipt, MATCH_HIGHLIGHTS, matchHighlightStatus } from '/lib/domain.mjs';

const $=s=>document.querySelector(s);
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 league:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
 cup:'M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 2h8m-6-2h4',
 trophy:'M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 2h8m-6-2h4',
 players:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 check:'m5 12 4 4L19 6',settings:'m12 3 2 3 3-.5.5 3 3 2-2 3 .5 3-3 .5-2 3-3-2-3 .5-.5-3-3-2 2-3-.5-3 3-.5L12 3Zm3 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 arrow:'M4 12h15m-5-5 5 5-5 5',arrowUp:'M12 20V4m-6 6 6-6 6 6',plus:'M12 5v14M5 12h14',
 clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
 ball:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z',
 user:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 chevron:'m9 5 7 7-7 7',refresh:'M20 7v5h-5M4 17v-5h5m10.5-3a8 8 0 0 0-13-4M4.5 15a8 8 0 0 0 13 4',
 share:'M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5m0-9h.01',
 more:'M5 12h.01M12 12h.01M19 12h.01',crown:'m3 6 5 4 4-6 4 6 5-4-2 13H5L3 6Zm3 9h12',
 calendar:'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16',archive:'M3 3h18v5H3zM5 8v13h14V8m-10 5h6',
 search:'M20 20l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',shield:'m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Zm-4 9 3 3 5-6',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',flame:'M12 3c1 5 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 3 1 4 2 5 2-3 2-6 1-10Z',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',key:'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-1 3 8 8m-3-3-3 3',undo:'M4 4v6h6M4 10a8 8 0 1 1 0 6',close:'m6 6 12 12M6 18 18 6'
};
function icon(key,size=20){return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]||paths.ball}"/></svg>`;}

let chatgptAdmin=false;
let welcomeView='player';
let state,user=null,demo=true,page='competitions',division='d0',filter='',revision=0,cupIndex=0,busy=false;
let selectedLeaguePlayer='';
const leagueMatchSelections=new Map();
let joinSelection=new Set(),joinTarget='',joinReceipt=null,signupReceipt=null;
let leagueView='standings',fixtureStatus='available',fixtureLimit=20,myMatches=false,playerFilter='',intendedMatch=null;
let playerView='roster',playerScope='all';
let recordPlayer='',recordCompetition='',recordOutcome='all',recordLimit=30;
let resultCompetition='',resultSearch='';
const stored=()=>{try{return JSON.parse(localStorage.getItem('wakefield-demo-v1'));}catch{return null;}};
function persist(){try{localStorage.setItem('wakefield-demo-v1',JSON.stringify(state));}catch{toast('Browser storage is unavailable. Demo changes will last for this visit only.');}}
const name=id=>sideName(state,id);
const initials=n=>n.split(' ').map(x=>x[0]).slice(0,2).join('');
function playerNameLink(id){const p=state.players.find(p=>p.id===id);return p?`<button type="button" class="player-name-link" data-profile="${e(id)}" aria-label="View ${e(p.name)}’s match record">${e(p.name)}</button>`:'<span>Unknown player</span>';}
const sidePlayerLinks=id=>sideMembers(state,id).map(playerNameLink).join('<span class="pair-separator"> &amp; </span>')||'To be decided';
function player(id,small=false){
 const members=sideMembers(state,id);
 if(members.length>1)return `<span class="person-pair ${small?'small':''}">${members.map(id=>player(id,small)).join('<span class="pair-separator" aria-hidden="true">&amp;</span>')}</span>`;
 const p=state.players.find(p=>p.id===id);
 return p?`<button type="button" class="person player-link ${small?'small':''}" data-profile="${e(id)}" aria-label="View ${e(p.name)}’s match record"><span class="avatar a${state.players.indexOf(p)%6}" aria-hidden="true">${e(initials(p.name))}</span><span>${e(p.name)}${id===user?.id?'<small>You</small>':''}</span></button>`:'<span class="person">To be decided</span>';
}
const canonicalLogo='/wakefield-logo.png';
const clubLogo=()=>canonicalLogo;
function clubMark(className='',alt='Wakefield school crest'){
 return `<img class="${className}" src="${clubLogo()}" alt="${e(alt)}">`;
}
const openMatches=()=>allMatches(state).filter(m=>m.status==='open'&&!state.submissions.some(s=>s.match===m.id));
const isAdmin=()=>user?.role==='admin';
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
async function api(path,body){const res=await fetch(`/api/${path}`,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await res.json();if(!res.ok){const error=Error(data.error||'The request failed.');error.status=res.status;error.code=data.code;throw error;}return data;}
async function refresh(automatic=false){const started=revision,identity=JSON.stringify(user);if(!demo){const r=await api('state');if(user&&!r.user&&identity===JSON.stringify(user))resetWelcomeSession();if(r.revision<revision||automatic&&(busy||started!==revision||identity!==JSON.stringify(user)||editingClub())){syncPending=true;updateSyncStatus();return;}const previousPlayer=user?.id;state=r.state;user=r.user;revision=r.revision;if(previousPlayer!==user?.id){resultCompetition='';resultSearch='';joinSelection.clear();joinReceipt=null;if(page==='join')preselectJoiningTarget();}}syncPending=false;syncFailed=false;render();}
async function mutate(action,payload={},baseRevision=revision){
  if(busy)return;busy=true;
  try {
    let pins;
    if(demo){const next=structuredClone(state);if(['pins','recoverAccount'].includes(action)){if(!isAdmin())throw Error('Administrator access required.');pins=next.players.filter(p=>!payload.id||p.id===payload.id).map(p=>({name:p.name,pin:'1234'}));}else act(next,action,payload,user);state=next;persist();}
    else {const r=await api('action',{action,payload,revision:baseRevision});state=r.state;revision=r.revision;pins=r.pins;}
    if(action==='enterCompetitions'){joinReceipt=[...payload.ids];joinSelection.clear();}
    syncPending=false;closeModal();render();
    if(action==='addReserve')confirmDraw(payload.id);
    if(action==='leaveCompetition'&&isAdmin())manageEntries(payload.id);
    if(pins)showPins(pins,action==='recoverAccount');
    else if(action==='reviewSignup')toast(payload.decision==='approve'?'Sign-up approved. The pupil can now sign in.':'Sign-up declined.');
    else if(action==='removeTestAccount')toast('Test account and competition entries removed.');
    else if(action==='recordResult')toast('Result saved and approved.');
    else if(action==='requestLeagueEntry')toast('Your request has been sent to Mr French for approval.');
    else if(action==='cancelLeagueEntryRequest')toast('Entry request cancelled.');
    else if(action==='reviewLeagueEntryRequest')toast(payload.decision==='approve'?'League entry approved.':'League entry request declined.');
    else if(action==='addLeaguePlayers')toast('Players added to the league.');
    else if(action==='submit')resultReceipt(payload.id,payload.score);
    else toast(action==='submit'?((competitionForMatch(state,payload.id)||state.settings.approval)?'Result sent to Mr French for approval.':'Result recorded.'):action==='addReserve'?'Reserve entered.':action==='enterCompetitions'?'Your competition entries are confirmed.':action==='enterCompetition'?'Entry confirmed.':action==='leaveCompetition'?'Entry withdrawn.':'Saved successfully.');
  }catch(error){if(error.status===409){closeModal();await refresh();toast('The club changed. Reopen the match or form and check it before saving again.');return;}const fieldError=$('#score-error')||$('#form-error');if(fieldError)fieldError.textContent=error.message;else toast(error.message);if(!demo)await refresh().catch(()=>{});}finally{busy=false;}
}
function badge(text,type=''){return `<span class="badge ${type}"><i></i>${text}</span>`;}
function empty(title,text,button=''){return `<div class="empty"><span class="empty-icon">${icon("ball",28)}</span><h3>${title}</h3><p>${text}</p>${button}</div>`;}
function actionButton(label,action,cls='button',extra=''){return `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;}
function pendingLeagueEntryCount(){return state.competitions.reduce((n,c)=>n+(c.entryRequests?.length||0),0);}
function navItem(id,label,kind=id){return `<a class="nav-link ${(page===id||id==='competitions'&&page==='competition')?'active':''}" href="#${id}" ${(page===id||id==='competitions'&&page==='competition')?'aria-current="page"':''}>${icon(kind)}<span>${label}</span>${id==='approvals'&&(state.submissions.length+pendingHighlightCount()+pendingLeagueEntryCount())?`<b>${state.submissions.length+pendingHighlightCount()+pendingLeagueEntryCount()}</b>`:''}</a>`;}
function render(){
 ensureCompetitions(state);
 state.settings.name=APP_NAME;
 resetCelebrationIdentity();
 if(!user){document.title=APP_NAME+' · Sign in';$('#app').innerHTML=welcomePage();return;}
 const focused=document.activeElement;const focusKey=['data-division','data-league-view','data-player-view','data-player-scope','data-status','data-cup','data-action','data-competition-view','data-enter','data-leave','data-entry-status','data-draw','data-entries'].find(k=>focused?.hasAttribute?.(k));const focusValue=focusKey?focused.getAttribute(focusKey):null;
 const title={breakthroughs:'Breakthroughs',alerts:'Your alerts',rules:'Pool rules',join:'Join competitions',competitions:'Competitions',competition:state.competitions.find(c=>c.id===selectedCompetition)?.name||'Competition',overview:'Overview',league:'League',cup:'Tournaments',players:'Players',approvals:'Result approvals',settings:'Championship settings'}[page];
 document.title=`${state.settings.name} · ${title}`;
 const favicon=document.querySelector('link[rel="icon"]');if(favicon){favicon.href=canonicalLogo;favicon.removeAttribute('type');}
 $('#app').innerHTML=`<a class="skip-link" href="#main-content">Skip to content</a><aside class="sidebar"><a class="brand" href="#competitions">${clubMark()}<span>Wakefield <small>Pool Championship</small></span></a><div class="sidebar-label">CLUB</div><nav aria-label="Main navigation">${navItem('competitions','Competitions','grid')}${navItem('join','Join competitions','plus')}${navItem('league','League')}${navItem('cup','Tournaments')}${navItem('players','Players')}${navItem('rules','Rules','info')}${navItem('breakthroughs','Breakthroughs','trophy')}${user?navItem('alerts','Alerts','bell'):''}</nav>${isAdmin()?`<div class="sidebar-label admin-label">CLUB MANAGEMENT</div><nav aria-label="Administration">${navItem('approvals','Approvals','check')}${navItem('settings','Settings')}</nav>`:''}<div class="sidebar-bottom"><button class="account" data-action="${user?'account':'login'}"><span class="avatar">${user?e(initials(user.name)):icon('user',18)}</span><span>${user?e(user.name):'Player sign in'}<small>${user?(isAdmin()?'Club administrator':'Player'):'Use your name and PIN.'}</small></span>${icon('chevron',15)}</button></div></aside>
 <main><header class="topbar"><div class="breadcrumb"><span>Championship</span>${icon('chevron',13)}<strong>${e(title)}</strong></div><a class="mobile-brand" href="#competitions">${clubMark('', 'Wakefield')}<span>Wakefield <small>Pool Championship</small></span></a><div class="topbar-actions">${user?.role==='player'?actionButton('Enter result','record','button primary player-result-shortcut'):''}${user?alertsBell():''}<a class="text-link rules-shortcut" href="#rules">Rules</a>${badge(demo?'Demo club':'Club connected',demo?'neutral':'green')}<button class="icon-button" data-action="refresh" aria-label="Refresh club">${icon('refresh')}</button><button class="button secondary share-button" data-action="share">${icon('share',16)} Share championship</button><button class="icon-button mobile-account" data-action="${user?'account':'login'}" aria-label="${user?'Your account':'Sign in'}">${icon('user')}</button></div></header>
 ${demo?`<div class="demo-strip"><span>${icon('info',14)} <span><b>Demo club.</b> Sample data stored on this device.</span></span><button data-action="${isAdmin()?'logout':'demoAdmin'}">${isAdmin()?'Exit admin demo':'Try admin view'} ${icon('arrow',14)}</button></div>`:''}
 <div class="content" id="main-content" tabindex="-1">${({breakthroughs:breakthroughsPage,alerts:alertsPage,rules:rulesPage,join:joiningPage,competitions,competition:competitionDetail,overview,league:leaguesPage,cup:tournamentsPage,players,approvals,settings})[page]()}</div><footer><span class="footer-brand">${clubMark('footer-crest')}<span>Wakefield Pool Championship</span></span><a class="text-link footer-rules" href="#rules">Pool rules</a><span>${demo?'Demo · saved on this device':'Shared club'}</span><span id="sync-status" role="status">${syncText()}</span></footer></main>
 <nav class="mobile-nav" aria-label="Mobile navigation">${navItem('competitions','Home','grid')}${navItem('join','Join','plus')}${navItem('league','League')}${navItem('cup','Knockout')}${navItem('players','Players')}${isAdmin()?`<button data-action="account" class="nav-link ${['settings','approvals'].includes(page)?'active':''}" aria-label="Admin menu">${icon('more')}<span>Manage</span>${state.submissions.length+pendingHighlightCount()+pendingLeagueEntryCount()?'<i class="notification-dot"></i>':''}</button>`:''}</nav>`;
 scheduleBreakthroughs();
 if(focusKey){[...document.querySelectorAll(`[${focusKey}]`)].find(el=>el.getAttribute(focusKey)===focusValue)?.focus({preventScroll:true});}
}
function welcomePage(){
 const admin=welcomeView==='admin',signup=welcomeView==='signup';
 return `<a class="skip-link welcome-skip" href="#main-content">Skip to sign in</a><div class="welcome-shell"><header class="welcome-header"><a class="welcome-brand" href="#competitions" data-action="welcomeHome">${clubMark()}<span>Wakefield <small>Pool Championship</small></span></a>${demo?badge('Demo club','neutral'):''}</header>
 <main class="welcome-main" id="main-content" tabindex="-1"><section class="welcome-intro" aria-labelledby="welcome-heading">${clubMark('welcome-logo')}<h1 id="welcome-heading"><span>Welcome to the</span> Wakefield Pool Championship</h1><p>Sign in to view competitions, standings and results.</p></section>
 <section class="welcome-access" aria-label="${signup?'Request a player account':'Sign in'}">${signup?signupPage():`<div class="welcome-tabs" role="group" aria-label="Sign-in type"><button type="button" data-action="playerLogin" class="${admin?'':'selected'}" aria-pressed="${!admin}">Player</button><button type="button" data-action="adminLogin" class="${admin?'selected':''}" aria-pressed="${admin}">Mr French</button></div><h2>${admin?'Administrator sign in':'Player sign in'}</h2>${loginForm(admin)}${!admin&&!demo?'<div class="welcome-signup"><span>New player?</span><button class="text-link" type="button" data-action="requestAccount">Request an account '+icon('arrow',16)+'</button></div>':''}`}</section></main>
 <footer class="welcome-footer"><span class="footer-brand">${clubMark('footer-crest')}<span>Wakefield Pool Championship</span></span><span>Account help: ask Mr French</span></footer></div>`;
}
function resetWelcomeSession(){user=null;welcomeView='player';joinSelection.clear();joinReceipt=null;signupReceipt=null;intendedMatch=null;$('#toast').classList.remove('show');$('#toast').textContent='';closeModal();render();}
function showWelcome(view){closeModal();welcomeView=view;render();$('.welcome-access h2')?.setAttribute('tabindex','-1');$('.welcome-access h2')?.focus();}
function loginForm(admin=false){
 if(admin&&!demo&&chatgptAdmin)return '<p class="form-hint">Use Mr French’s linked ChatGPT account to administer the club.</p><a class="button primary full" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in with ChatGPT</a>';
 const available=state.players.length>0;
 return `${demo?`<p class="form-hint">Demo mode: ${admin?'use any password':'use PIN <b>1234</b> for a sample player'}.</p>`:admin?'<p class="form-hint">Use your administrator password.</p>':'<p class="form-hint">Use your name and player PIN.</p>'}${!admin&&!available?'<p class="form-hint">No players are listed yet. Request an account or ask Mr French for help.</p>':`<form id="login-form" data-role="${admin?'admin':'player'}">${admin?'<label>Administrator password<input name="password" type="password" autocomplete="current-password" required></label>':`<label>Your name<select name="id" autocomplete="username" required><option value="" disabled selected>Choose your name</option>${state.players.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('')}</select></label><label>Your player PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="current-password" required></label>`}<p id="login-error" class="error" role="alert"></p><button class="button primary full" type="submit">Sign in ${icon('arrow',16)}</button></form>`}${!admin?'<button class="text-link welcome-pin-help" type="button" data-action="forgottenPin">Forgotten your PIN?</button>':''}`;
}
function heading(eyebrow,title,description,buttons=''){return `<div class="page-heading"><div>${eyebrow?`<div class="eyebrow"><span></span>${eyebrow}</div>`:''}<h1>${title}</h1>${description?`<p>${description}</p>`:''}</div>${buttons?`<div class="heading-actions">${buttons}</div>`:''}</div>`;}
function rulesContent(text){
 const lines=String(text||'').split(/\n+/).map(line=>line.trim()).filter(Boolean);
 return `<ol class="pool-rules-list" role="list">${lines.map(line=>{
  const clean=line.replace(/^\d+\.\s*/,''),colon=clean.indexOf(':');
  return `<li${/loses the frame/.test(clean)?' class="frame-loss-rule"':''}>${colon>0&&colon<40?`<strong>${e(clean.slice(0,colon))}:</strong> ${e(clean.slice(colon+1).trim())}`:e(clean)}</li>`;
 }).join('')}</ol>`;
}
function rulesPage(){
 return `${heading('','Pool rules','Read these before playing. A frame is one game.')}<section class="panel school-rules" aria-labelledby="school-rules-heading"><div class="panel-heading"><h2 id="school-rules-heading">School pool rules</h2></div>${rulesContent(state.settings.rules)}<p class="rules-approval">All competition scores require Mr French’s approval. Check your competition’s rules for any changes.</p><a class="text-link" href="#competitions">View competitions ${icon('arrow',16)}</a></section>`;
}
function cardFacts(items){return `<dl class="card-facts">${items.map(([label,value,extra])=>`<div><dt>${e(label)}</dt><dd>${e(value)}${extra?` <small>${e(extra)}</small>`:''}</dd></div>`).join('')}</dl>`;}
function poolArtwork(){return `<svg class="pool-art" viewBox="0 0 500 350" fill="none" aria-hidden="true"><defs><radialGradient id="black-ball" cx=".3" cy=".2" r=".85"><stop stop-color="#59655a"/><stop offset=".4" stop-color="#253c30"/><stop offset="1" stop-color="#0d1c15"/></radialGradient><radialGradient id="gold-ball" cx=".3" cy=".2" r=".8"><stop stop-color="#ffed9c"/><stop offset=".6" stop-color="#ebbe39"/><stop offset="1" stop-color="#bc8924"/></radialGradient><radialGradient id="white-ball" cx=".3" cy=".3" r=".8"><stop stop-color="#fffef4"/><stop offset="1" stop-color="#c8d2b8"/></radialGradient><filter id="ball-shadow" x="-50%" y="-50%" width="200%" height="220%"><feDropShadow dx="15" dy="24" stdDeviation="15" flood-color="#06120b" flood-opacity=".55"/></filter></defs><circle cx="315" cy="180" r="155" stroke="#a7b69c" stroke-opacity=".11"/><circle cx="315" cy="180" r="120" stroke="#a7b69c" stroke-opacity=".1"/><path d="m24 324 192-170" stroke="#dac7a4" stroke-width="9" stroke-linecap="round"/><path d="m24 324 57-50" stroke="#4d5240" stroke-width="9" stroke-linecap="round"/><path d="m215 155 13-12" stroke="#b5c0a0" stroke-width="7" stroke-linecap="round"/><circle cx="338" cy="175" r="93" fill="url(#black-ball)" filter="url(#ball-shadow)"/><ellipse cx="304" cy="122" rx="27" ry="12" fill="#a3b3a0" opacity=".12" transform="rotate(-35 304 122)"/><circle cx="322" cy="166" r="35" fill="#f8f6e8"/><text x="322" y="183" text-anchor="middle" fill="#25372c" font-family="Arial,sans-serif" font-size="49" font-weight="700">8</text><circle cx="224" cy="256" r="48" fill="url(#gold-ball)" filter="url(#ball-shadow)"/><ellipse cx="211" cy="232" rx="14" ry="6" fill="#fff9cf" opacity=".35" transform="rotate(-35 211 232)"/><circle cx="440" cy="267" r="29" fill="url(#white-ball)" filter="url(#ball-shadow)"/><path d="M154 76h40m-20-20v40" stroke="#f0d15e" stroke-opacity=".5"/><circle cx="430" cy="76" r="3" fill="#d2bd68"/><circle cx="140" cy="209" r="2" fill="#d2bd68"/></svg>`;}
function leagueVersusFighter(id,label,matches){
 const completed=id?matches.filter(m=>m.status==='complete'&&[m.a,m.b].includes(id)):[];
 const won=completed.filter(m=>m.winner===id||!m.winner&&m.score?.[m.a===id?0:1]>m.score?.[m.a===id?1:0]).length;
 const members=id?sideMembers(state,id):[];
 return `<div class="versus-fighter ${id?'is-selected':'is-empty'}"><span class="versus-player-label">${e(label)}</span><div class="versus-portrait"><span class="versus-portrait-lines" aria-hidden="true"></span>${members.length?members.map(member=>`<button type="button" class="versus-monogram" data-profile="${e(member)}" aria-label="View ${e(name(member))}’s match record">${e(initials(name(member)))}</button>`).join(''):'<span class="versus-monogram">?</span>'}</div><h3>${id?members.map(member=>`<span>${playerNameLink(member)}</span>`).join(''):'Choose '+(label==='Player 1'?'a player':'an opponent')}</h3>${id?`<dl class="versus-record"><div><dt>Played</dt><dd>${completed.length}</dd></div><div><dt>Won</dt><dd>${won}</dd></div></dl>`:'<span class="versus-empty-line" aria-hidden="true"></span>'}</div>`;
}
function leagueVersusPreview(side,match,matches){
 const opponent=match?(match.a===side?match.b:match.a):'';
 return `<div class="versus-stage ${match?'has-match':''}">${leagueVersusFighter(side,'Player 1',matches)}<div class="versus-divider" aria-hidden="true"><span>VS</span><i>8</i></div>${leagueVersusFighter(opponent,'Player 2',matches)}</div><p class="sr-only" role="status">${match?e(name(side))+' versus '+e(name(opponent))+'. Best of '+match.bestOf+'.':'Choose '+(side?'an opponent':'a player and an opponent')+' to preview the match.'}</p>`;
}
function matchPlayerId(entries,requested=''){
 if(user?.role==='player')return user.id;
 if(entries.includes(requested))return requested;
 const own=isAdmin()?administratorPlayer(state)?.id:'';
 return entries.includes(own)?own:'';
}
function leagueOpponentPanel({scope,selected,entries,matches,side=selected,context=''}){
 selected=matchPlayerId(entries,selected);
 side=scope==='competition'?state.competitions.find(c=>c.id===selectedCompetition)?.teams.find(t=>t.members.includes(selected))?.id||'':selected;
 const mine=matches.filter(m=>[m.a,m.b].includes(side)),submitted=new Set(state.submissions.map(s=>s.match));
 const opponent=m=>m.a===side?m.b:m.a;
 const available=mine.filter(m=>m.status==='open'&&!submitted.has(m.id)).sort((a,b)=>name(opponent(a)).localeCompare(name(opponent(b))));
 const pending=mine.filter(m=>m.status==='open'&&submitted.has(m.id)),played=mine.filter(m=>m.status==='complete').length;
 const entered=entries.includes(selected),pupil=user?.role==='player',pairs=scope==='competition'&&state.competitions.find(c=>c.id===selectedCompetition)?.mode==='pairs';
 const selectionKey=JSON.stringify([scope,scope==='competition'?selectedCompetition:'',side]),chosen=available.find(m=>m.id===leagueMatchSelections.get(selectionKey));
 if(!chosen)leagueMatchSelections.delete(selectionKey);
 const selector=pupil?`<div class="versus-signed-player"><span>Player${sideMembers(state,side).length===2?' · Your pair':''}</span><strong>${e(name(side||selected))}</strong></div>`:`<label>Player<select id="${scope}-player" aria-label="Choose a league player"><option value="">Choose a player</option>${[...entries].sort((a,b)=>name(a).localeCompare(name(b))).map(id=>`<option value="${e(id)}" ${id===selected?'selected':''}>${e(name(id))}</option>`).join('')}</select></label>`;
 const message=!entered?(pupil?'You are not entered in this league.':'Choose a player to see their remaining opponents.'):!available.length?(pending.length?'All remaining results are awaiting Mr French’s approval.':'You have no matches left to play.'):'';
 return `<section class="panel next-league-panel versus-panel" aria-label="Choose a league opponent"><div class="panel-heading"><h2>Choose an opponent</h2><span class="versus-format">${icon('ball',16)} ${pairs?'Pairs':'Singles'} league</span></div><div class="versus-arena"><div class="versus-arena-heading"><span>League match</span><span>One match per opponent</span></div><div id="league-versus-preview">${leagueVersusPreview(entered?side:'',chosen,matches)}</div><div class="versus-arena-bottom"><span>${e(context||state.settings.season)}</span><span id="versus-match-length">${chosen?'Best of '+chosen.bestOf:'Choose your matchup'}</span></div></div><div class="next-league-body"><form id="choose-league-match" class="opponent-picker versus-controls">${selector}<label>Opponent<select id="league-opponent" aria-label="Opponent" name="match" data-versus-key="${e(selectionKey)}" required ${available.length?'':'disabled'}><option value="" ${chosen?'':'selected'}>${entered?(available.length?'Choose who you played':'No opponents available'):'Choose a player first'}</option>${available.map(m=>`<option value="${e(m.id)}" ${m===chosen?'selected':''}>${e(name(opponent(m)))}</option>`).join('')}</select></label><button class="button primary" type="submit" ${chosen?'':'disabled'}>Enter result ${icon('arrow',16)}</button></form><p class="next-message versus-instructions">Play each opponent once, in any order, whenever you are both free. Select who you played to enter the result.</p>${message?`<p class="next-message">${message}</p>`:`<p class="next-progress">${played} of ${mine.length} played · ${available.length} still to play${pending.length?` · ${pending.length} awaiting approval`:''}</p>`}${pending.length?`<details class="remaining-matches"><summary>Results awaiting approval (${pending.length})</summary>${pending.map(matchRow).join('')}</details>`:''}</div></section>`;
}
function nextLeaguePanel(){
 if(!state.league.length)return '';
 if(user?.role==='player')return playerResultPanel('division:'+(state.divisions.find(d=>d.players.includes(user.id))?.id||''));
 const selected=matchPlayerId(state.divisions.flatMap(d=>d.players),selectedLeaguePlayer),plan=leaguePlan(state,selected);
 return leagueOpponentPanel({scope:'league',selected,entries:state.divisions.flatMap(d=>d.players),matches:state.league,context:plan.division?.name||''});
}
function overview(){
 const completed=state.league.filter(m=>m.status==='complete').length,total=state.league.length,rate=total?Math.round(completed/total*100):0,available=openMatches();
 const mine=user?.id?available.filter(m=>isMatchParticipant(state,m,user.id)):available;
 const recent=[...state.league,...state.cups.flatMap(c=>c.rounds.flat())].filter(m=>m.status==='complete').slice(-3).reverse();
 const current=state.cups.find(c=>!c.consolation),cupFinal=current?.rounds.at(-1)[0],leader=standings(state,division)[0];
 return `${heading('','Overview','',actionButton(`${icon('plus',17)} Submit a result`,'record','button primary'))}
 ${isAdmin()&&!total?`<section class="setup-banner"><div class="setup-icon">${icon('settings',24)}</div><div><b>Set up the club</b><p>Add your players, personalise your rules, then generate your league.</p></div>${actionButton('Add players','addPlayers','button primary')}${actionButton('Club settings','openSettings','button secondary')}</section>`:''}
 ${isAdmin()&&pendingLeagueEntryCount()?`<a class="approval-alert" href="#approvals">${icon('players',18)} ${pendingLeagueEntryCount()} league entry request${pendingLeagueEntryCount()===1?'':'s'} awaiting approval ${icon('arrow',18)}</a>`:''}
 ${isAdmin()&&state.submissions.length?`<a class="approval-alert" href="#approvals">${icon('check',18)}<span><b>${state.submissions.length} result${state.submissions.length===1?'':'s'} ready for your approval.</b></span>${icon('arrow',18)}</a>`:''}
 <section class="hero"><div class="hero-copy"><span class="hero-label"><span class="status-dot"></span>${e(state.settings.season)}</span>${clubMark('welcome-crest','Wakefield school crest')}<h2>Welcome to the Wakefield Pool Championship</h2><div class="hero-actions"><a class="button gold" href="#league" data-go-fixtures>Find an opponent ${icon('arrow',16)}</a><span class="hero-format">${icon('ball',17)} ${state.settings.frames===1?'Single-frame pool':`Best of ${state.settings.frames}`}</span></div><div class="hero-foot"><span class="mini-avatars">${state.players.slice(0,4).map(p=>`<i><button type="button" data-profile="${e(p.id)}" aria-label="View ${e(p.name)}’s match record">${e(initials(p.name))}</button></i>`).join('')}</span><span><b>${state.players.length} players</b> registered</span></div></div><div class="hero-art">${poolArtwork()}</div></section>
 <div id="next-league">${nextLeaguePanel()}</div>
 <section class="stats-grid" aria-label="Club at a glance"><div class="stat"><div><span>Club players</span>${icon('players')}</div><strong>${state.players.length}</strong></div><div class="stat"><div><span>Matches played</span>${icon('ball')}</div><strong>${completed}<small>of ${total}</small></strong><div class="stat-progress"><progress value="${rate}" max="100" aria-label="League completion"></progress><span>${rate}%</span></div></div><div class="stat"><div><span>League divisions</span>${icon('league')}</div><strong>${state.divisions.length}</strong></div><div class="stat accent-stat"><div><span>Ready to play</span>${icon('arrow')}</div><strong>${available.length}<small>available matches</small></strong></div></section>
 <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>${user?.id?'Your available matches':'Available matches'}</h2></div><a href="#league" class="text-link" data-go-fixtures>${user?.id?'Your matches':'All matches'} ${icon('arrow',15)}</a></div><div class="panel-description">${user?.id?'Ask one of these opponents when they’re free.':'These matches are unplayed. Ask your opponent, then use the table when it’s free.'}</div>${mine.length?mine.slice(0,4).map(matchRow).join(''):empty('No available matches',total?'No unplayed matches are available for this player.':'League opponents will appear here once the league starts.',!user?actionButton('Sign in to find your matches','login','button secondary'):'')}<div class="panel-foot">${icon('clock',14)} Play when both players and the table are available.</div></section>
 <section class="panel standings-panel"><div class="panel-heading"><div><h2>Standings</h2></div><a href="#league" class="text-link" data-go-standings>Full table ${icon('arrow',15)}</a></div>${state.divisions.length?`<div class="tabs compact" aria-label="Choose division">${state.divisions.map(d=>`<button class="${d.id===division?'selected':''}" data-division="${d.id}" aria-pressed="${d.id===division}">${e(d.name.replace('Division ','Div '))}</button>`).join('')}</div>${table(standings(state,division).slice(0,5),true)}<div class="panel-foot">${icon('trophy',14)} ${leader?.played?`${e(leader.name)} leads ${e(state.divisions.find(d=>d.id===division)?.name||'the division')}.`:'No results recorded in this division.'}</div>`:empty('No league drawn','League standings appear after the administrator generates the league.')}</section></div>
 <div class="bottom-grid"><a class="cup-promo" href="#cup"><div><span class="section-kicker">TOURNAMENTS</span><h2>${cupFinal?.winner?`Winner: ${e(name(cupFinal.winner))}`:'Tournaments'}</h2><p>${current?e(current.name):'No tournament drawn.'}</p><span class="text-link">View tournaments ${icon('arrow',16)}</span></div><div class="trophy-art">${icon('trophy',75)}<span>WAKEFIELD CUP</span></div></a><section class="panel results-panel"><div class="panel-heading"><div><h2>Latest approved results</h2></div></div>${recent.length?recent.map(m=>`<div class="recent-result"><span>${sidePlayerLinks(m.a)}</span><b>${m.score[0]}<i>–</i>${m.score[1]}</b><span>${sidePlayerLinks(m.b)}</span></div>`).join(''):'<p class="no-results">No approved results.</p>'}</section></div>`;
}
function matchRow(m){
 const sub=state.submissions.find(s=>s.match===m.id),div=state.divisions.find(d=>d.id===m.division),c=state.cups.find(c=>c.rounds.flat().some(x=>x.id===m.id));
 const canSubmit=!user||isAdmin()||isMatchParticipant(state,m,user.id);
 return `<div class="match-row"><div class="match-meta"><span>${e(competitionForMatch(state,m.id)?.name||div?.name||c?.name||'Match')}</span><small>${m.walkover?'Withdrawal walkover':m.status==='void'?'Both sides withdrawn':m.status==='complete'?'Final score':sub?'Awaiting Mr French':`Best of ${m.bestOf} · Play anytime`}</small></div><div class="match-pair">${player(m.a,true)}<span class="vs ${m.score?'match-score':''}">${m.score?`${m.score[0]} <i>:</i> ${m.score[1]}`:'vs'}</span>${player(m.b,true)}</div>${m.status==='complete'?(isAdmin()&&!m.walkover?`<button class="button secondary" data-correct-result="${m.id}">Correct result</button>`:badge(m.walkover?'Walkover':'Played','neutral')):m.status==='void'?badge('Withdrawn','neutral'):sub?badge('Pending','amber'):canSubmit?`<button class="round-button" data-score="${m.id}" aria-label="Submit result for ${e(name(m.a))} versus ${e(name(m.b))}"><span>Submit result</span>${icon('arrow',16)}</button>`:badge('Available','green')}</div>`;
}
function table(rows,compact=false,singleFrame=false){return `<div class="table-scroll"><table><caption class="sr-only">League standings, ordered by points${singleFrame?' then head-to-head results':' then frame difference'}</caption><thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col"><abbr title="Played">P</abbr></th>${compact?'':`<th scope="col"><abbr title="Won">W</abbr></th><th scope="col"><abbr title="Lost">L</abbr></th>${singleFrame?'':'<th scope="col"><abbr title="Frame difference">FD</abbr></th>'}`}<th scope="col">Pts</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${sideMembers(state,r.id).includes(user?.id)?'your-row':''}"><td><span class="rank ${(r.rank!==undefined?r.rank===1&&!r.tied:i===0)?'first':''}">${r.rank!==undefined?`${r.rank}${r.tied?'=':''}`:i===0?icon('crown',15):i+1}</span></td><td>${player(r.id,true)}${state.competitions.some(c=>c.teams.some(t=>t.id===r.id&&t.withdrawn))?'<small class="withdrawn-label">Withdrawn</small>':''}</td><td>${r.played}</td>${compact?'':`<td>${r.won}</td><td>${r.lost}</td>${singleFrame?'':`<td>${r.for-r.against>0?'+':''}${r.for-r.against}</td>`}`}<td><strong>${r.points}</strong></td></tr>`).join('')}</tbody></table></div>`;}
function divisionTabs(){return `<div class="tabs division-tabs" aria-label="Choose division">${state.divisions.map(d=>`<button class="${division===d.id?'selected':''}" data-division="${d.id}" aria-pressed="${division===d.id}">${e(d.name)}<span>${d.players.length}</span></button>`).join('')}</div>`;}
function matchingFixtures(){return state.league.filter(m=>m.division===division&&(!filter||[name(m.a),name(m.b)].some(n=>n.toLowerCase().includes(filter.toLowerCase())))&&(!myMatches||!user?.id||isMatchParticipant(state,m,user.id))&&(fixtureStatus==='all'||fixtureStatus==='played'&&m.status==='complete'||fixtureStatus==='pending'&&state.submissions.some(s=>s.match===m.id)||fixtureStatus==='available'&&m.status==='open'&&!state.submissions.some(s=>s.match===m.id)));}
function fixtureList(){const matches=matchingFixtures();return matches.length?`${matches.slice(0,fixtureLimit).map(matchRow).join('')}<div class="list-footer"><span>Showing ${Math.min(matches.length,fixtureLimit)} of ${matches.length} matches</span>${matches.length>fixtureLimit?'<button class="text-link" data-action="moreFixtures">Show more '+icon('plus',14)+'</button>':''}</div>`:empty('No matches here','Try a different player, division, or match status.',filter||myMatches?actionButton('Clear filters','clearFilters','button secondary'):'');}
function league(){
 const active=state.divisions.find(d=>d.id===division)||state.divisions[0];if(active)division=active.id;
 const matches=state.league.filter(m=>m.division===division),played=matches.filter(m=>m.status==='complete').length;
 return `${heading('','League standings & matches','Play each player in your division once, in any order and at any time.',isAdmin()?actionButton(`${icon(state.league.length?'archive':'plus',17)} ${state.league.length?'Next season':'Generate league'}`,state.league.length?'promote':'generateLeague','button primary'):'')}
 <div id="next-league">${nextLeaguePanel()}</div><div class="league-topline"><span>${icon('calendar',16)} ${e(state.settings.season)}</span>${badge('Open-ended season','green')}</div>${state.divisions.length?`${divisionTabs()}<div class="view-tabs" aria-label="League view"><button data-league-view="standings" class="${leagueView==='standings'?'selected':''}" aria-pressed="${leagueView==='standings'}">${icon('league',17)} Standings</button><button data-league-view="fixtures" class="${leagueView==='fixtures'?'selected':''}" aria-pressed="${leagueView==='fixtures'}">${icon('ball',17)} Matches & results<span>${matches.length}</span></button></div>
 ${leagueView==='standings'?`<div class="league-grid"><section class="panel"><div class="panel-heading"><div><span class="section-kicker">${e(active.name.toUpperCase())}</span><h2>Division standings</h2></div>${badge(`${active.players.length} players`,'neutral')}</div>${table(standings(state,division))}<div class="panel-note"><span class="legend-dot"></span>${state.settings.winPoints} points per win · frame difference breaks ties</div></section><aside class="league-side"><section class="season-card"><span class="section-kicker">SEASON PROGRESS</span><strong>${played}<span>/ ${matches.length}</span></strong><p>matches completed in ${e(active.name)}</p><progress value="${played}" max="${Math.max(matches.length,1)}" aria-label="Division completion"></progress><div>${played===matches.length?'All division matches completed.':'Choose any opponent you have yet to play.'}</div></section><section class="rules-card">${icon('ball',24)}<h3>Pool rules</h3>${rulesContent(state.settings.rules)}<span>Best of ${state.settings.frames} · one table</span></section><p class="promotion-note">${icon('arrowUp',18)} Top player moves up. Bottom player moves down between neighbouring divisions next season.</p></aside></div>`:`<section class="panel fixtures"><div class="panel-heading"><div><span class="section-kicker">${e(active.name.toUpperCase())}</span><h2>Matches & results</h2></div><label class="search-wrap">${icon('search',17)}<input class="search" id="fixture-search" placeholder="Search a player…" value="${e(filter)}" aria-label="Filter matches by player"></label></div><div class="fixture-toolbar"><div class="filter-pills" aria-label="Match status">${[['available','Available'],['pending','Pending'],['played','Played'],['all','All matches']].map(([key,label])=>`<button class="${fixtureStatus===key?'selected':''}" data-status="${key}" aria-pressed="${fixtureStatus===key}">${label}</button>`).join('')}</div>${user?.id?`<label class="checkbox mine-toggle"><input id="my-matches" type="checkbox" ${myMatches?'checked':''}>My matches only</label>`:''}</div><div id="fixture-list">${fixtureList()}</div></section>`}`:empty('No league drawn','Add your players and generate balanced divisions. Play every opponent in the division once, in any order.',isAdmin()?actionButton('Generate league','generateLeague','button primary'):'')}
 ${state.history?.length?`<section class="panel archive"><div class="panel-heading"><div><span class="section-kicker">HISTORY</span><h2>Past seasons</h2></div>${icon('archive',20)}</div>${state.history.map(h=>`<details><summary>${e(h.season)}<span>View final tables ${icon('chevron',15)}</span></summary>${h.divisions.map(d=>`<h3>${e(d.name)}</h3>${table(standings({...state,league:h.league,divisions:h.divisions},d.id))}`).join('')}</details>`).join('')}</section>`:''}`;
}
function roundName(c,r){return r===c.rounds.length-1?'Final':r===c.rounds.length-2?'Semi-finals':r===c.rounds.length-3?'Quarter-finals':`Round ${r+1}`;}
function bracketMatch(m){
 const pending=state.submissions.some(s=>s.match===m.id),correctable=isAdmin()&&m.status==='complete'&&!m.walkover;
 const enabled=m.status==='open'&&!pending&&(!user||isAdmin()||isMatchParticipant(state,m,user.id));
 const status=m.walkover?'Withdrawal walkover':m.status==='void'?'Both sides withdrawn':m.status==='bye'?'Automatic advancement':pending?'Awaiting approval':m.status==='complete'?'Approved score':m.status==='open'?`Best of ${m.bestOf}`:'Waiting for previous round';
 return `<article class="tie ${m.status==='bye'?'bye':''}">${[[m.a,0],[m.b,1]].map(([id,i])=>`<div class="tie-player ${m.winner===id&&id?'winner':''}"><span>${id?sidePlayerLinks(id):i&&m.status==='bye'?'Bye':'To be decided'}</span><b>${m.score?.[i]??(m.status==='bye'&&i===0?icon('check',14):'—')}</b></div>`).join('')}<div class="tie-footer"><small>${status}</small>${correctable||enabled?`<button type="button" class="tie-result-button" ${correctable?`data-correct-result="${e(m.id)}"`:`data-score="${e(m.id)}"`} aria-label="${correctable?'Correct':'Submit'} result for ${e(name(m.a))} versus ${e(name(m.b))}">${correctable?'Correct result':'Submit result'} ${icon('arrow',12)}</button>`:''}</div></article>`;
}
function cup(){
 const c=state.cups[cupIndex]||state.cups[0],final=c?.rounds.at(-1)[0];
 return `${heading('','Tournaments','',isAdmin()?actionButton(`${icon('plus',17)} Create tournament`,'newCup','button primary'):'')}
 ${c?`<div class="tabs division-tabs cup-tabs" aria-label="Choose tournament">${state.cups.map((x,i)=>`<button data-cup="${i}" class="${c.id===x.id?'selected':''}" aria-pressed="${c.id===x.id}">${icon(x.consolation?'shield':'trophy',16)} ${e(x.name)}</button>`).join('')}</div><section class="cup-header"><div class="cup-emblem">${icon('trophy',40)}</div><div><span class="section-kicker">${c.consolation?'CONSOLATION CUP':'KNOCKOUT CUP'}</span><h2>${e(c.name)}</h2><p>${c.rounds[0].flatMap(m=>[m.a,m.b]).filter(Boolean).length} players · knockout · play when ready</p></div>${badge(final.winner?'Complete':'In progress',final.winner?'neutral':'green')}</section>${final.winner?`<div class="winner-banner">${icon('trophy',40)}<span>WINNER<strong>${sidePlayerLinks(final.winner)}</strong></span></div>`:''}
 <div class="bracket-toolbar"><span>${icon('info',15)} ${state.settings.consolation&&!c.consolation?'First-round losers enter the consolation cup.':'Winners advance. Your next opponent appears here.'}</span><label>Jump to round<select id="round-jump" aria-label="Jump to tournament round">${c.rounds.map((_,r)=>`<option value="${r}">${roundName(c,r)}</option>`).join('')}</select></label></div>
 <section class="panel bracket-panel" aria-label="Tournament bracket"><div class="bracket">${c.rounds.map((round,r)=>`<div class="bracket-round" id="bracket-round-${r}"><h3><span>${roundName(c,r)}</span><b>${round.length} ${round.length===1?'tie':'ties'}</b></h3><div class="round-matches">${round.map(m=>bracketMatch(m)).join('')}</div></div>`).join('')}</div></section><p class="bracket-hint">${icon('arrow',14)} Scroll across to view later rounds.</p>`:empty('No tournament drawn','Create a knockout tournament. Byes are assigned automatically.',isAdmin()?actionButton('Create tournament','newCup','button primary'):'')}`;
}
function playerForm(results){
 if(!results.length)return '<p class="player-form-empty">No played results</p>';
 return `<ol class="player-form" role="list" aria-label="Recent results">${results.map(({outcome})=>{
  const label=outcome==='W'?'Win':'Loss';
  return `<li class="form-${label.toLowerCase()}"><span aria-hidden="true">${outcome}</span><span class="sr-only">${label}</span></li>`;
 }).join('')}</ol>`;
}
function playerRecordRow(r,walkover=false){
 const won=r.outcome==='W',date=r.resultAt?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(new Date(r.resultAt)):'Date not recorded';
 return `<li class="player-record-match ${won?'record-win':'record-loss'}${walkover?' record-walkover':''}">
  <span class="record-result-icon" aria-hidden="true">${icon(walkover?'shield':won?'check':'close',18)}</span>
  <div class="record-match-copy"><div class="record-opponent"><span class="record-vs">vs</span> <span>${r.opponentIds.map(playerNameLink).join('<span class="pair-separator"> &amp; </span>')}</span></div>
   ${r.partnerIds.length?`<p class="record-partner">Partner: ${r.partnerIds.map(playerNameLink).join(' &amp; ')}</p>`:''}
   <p class="record-match-meta">${e([r.competitionName,r.detail,date].filter(Boolean).join(' · '))}</p>
  </div><div class="record-match-outcome">${!walkover&&r.score[0]+r.score[1]>1?`<b class="record-frame-score" aria-label="${r.score[0]} frames to ${r.score[1]}">${r.score.join('–')}</b>`:''}<span class="record-result-label">${won?'Won':'Lost'}${walkover?' by walkover':''}</span></div>
 </li>`;
}
function showPlayerRecord(id,competition='',outcome='all',limit=30,focusSelector=''){
 const p=state.players.find(p=>p.id===id);if(!p)return;
 recordPlayer=id;recordCompetition=competition;recordOutcome=['all','W','L'].includes(outcome)?outcome:'all';recordLimit=limit;
 const record=playerMatchRecord(state,id,competition),wins=record.results.filter(r=>r.outcome==='W').length,losses=record.results.length-wins;
 const results=record.results.filter(r=>recordOutcome==='all'||r.outcome===recordOutcome),walkovers=record.walkovers.filter(r=>recordOutcome==='all'||r.outcome===recordOutcome);
 const recent=record.results.filter(r=>r.resultAt).slice(0,6).reverse();
 modal('Player record',`<div class="player-record-identity"><span class="avatar" aria-hidden="true">${e(initials(p.name))}</span><div><h3>${e(p.name)}</h3><p>Match record across competitions</p></div>${id===user?.id?'<span class="you-badge">You</span>':''}</div>
  <div class="player-record-controls"><label class="sr-only" for="player-record-competition">Filter player record by competition</label><div class="player-record-select"><select id="player-record-competition"><option value="">All competitions · singles &amp; pairs</option>${record.competitions.map(c=>`<option value="${e(c.id)}" ${c.id===competition?'selected':''}>${e(c.name)}</option>`).join('')}</select>${icon('chevron',14)}</div>
   <dl class="player-record-stats" aria-label="Played match totals"><div><dt>Played</dt><dd>${record.results.length}</dd></div><div class="record-win"><dt>${icon('check',14)} Won</dt><dd>${wins}</dd></div><div class="record-loss"><dt>${icon('close',14)} Lost</dt><dd>${losses}</dd></div></dl>
   ${recent.length?`<div class="player-record-form"><span>Recent form</span><ol aria-label="Recent dated results, oldest to newest">${recent.map(r=>`<li class="${r.outcome==='W'?'record-win':'record-loss'}"><span aria-hidden="true">${r.outcome}</span><span class="sr-only">${r.outcome==='W'?'Won':'Lost'}</span></li>`).join('')}</ol><small>Oldest → newest</small></div>`:''}
  </div><section class="player-record-history" aria-labelledby="record-history-heading"><div class="player-record-history-heading"><h3 id="record-history-heading" tabindex="-1">Match history</h3><span>Latest first</span></div>
   <div class="player-record-filters" aria-label="Filter match results">${[['all','All',record.results.length],['W','Won',wins],['L','Lost',losses]].map(([key,label,count])=>`<button type="button" data-record-outcome="${key}" class="${recordOutcome===key?'selected':''}" aria-pressed="${recordOutcome===key}">${label}<span>${count}</span></button>`).join('')}</div>
   <p class="sr-only" role="status">${results.length} ${results.length===1?'match':'matches'}${recordOutcome==='all'?'':recordOutcome==='W'?' won':' lost'}</p>
   ${results.length?`<ol class="player-record-results" aria-label="Approved played results">${results.slice(0,limit).map(r=>playerRecordRow(r)).join('')}</ol>${results.length>limit?`<button type="button" class="button secondary record-show-more" data-record-more>Show more (${results.length-limit} remaining)</button>`:''}`:`<div class="player-record-empty"><h4>${recordOutcome==='all'?'No played results yet':recordOutcome==='W'?'No wins in this view':'No losses in this view'}</h4><p>${recordOutcome==='all'?'Approved results appear here after a match is played.':'Choose All or a different competition to see other results.'}</p></div>`}
   ${walkovers.length?`<details class="player-record-walkovers"><summary>Walkovers (${walkovers.length}) · not played</summary><ol class="player-record-results">${walkovers.map(r=>playerRecordRow(r,true)).join('')}</ol></details>`:''}
   ${record.pending.length?`<p class="player-record-pending">${icon('clock',16)}<strong>${record.pending.length} ${record.pending.length===1?'result':'results'} awaiting approval</strong><span>Not counted yet</span></p>`:''}
   ${record.results.some(r=>!r.resultAt)?'<p class="player-record-date-note">Earlier results without recorded dates appear last and are not included in recent form.</p>':''}
  </section><div class="player-record-footer"><span>${icon('shield',15)} Played, approved results only</span><div>${isAdmin()?`<button type="button" class="text-link" data-edit-player="${e(id)}">Manage player</button>`:''}<a class="text-link" href="#breakthroughs/${e(id)}" data-close-on-nav>View Breakthroughs ${icon('arrow',14)}</a></div></div>`,focusSelector,'player-record-modal');
}
const matchesPlayerSearch=p=>p.name.toLowerCase().includes(playerFilter.toLowerCase());
const playerDivision=p=>state.divisions.find(d=>d.players.includes(p.id))?.name||'No division';
const playerRole=p=>isAdmin()&&p.testAccount?'Test account':p.name==='Mr French'?'Club administrator':'';
function playerAction(p){
 return `data-profile="${e(p.id)}" aria-label="View ${e(p.name)}’s match record"`;
}
function playerCard(p,detail,divisionName,account){
 const role=playerRole(p);
 const status=(divisionName!==undefined?badge(e(divisionName),'neutral'):'')+account+(p.id===user?.id?'<span class="you-badge">You</span>':'');
 return `<article class="panel player-card" data-player-name="${e(p.name.toLowerCase())}" ${matchesPlayerSearch(p)?'':'hidden'}>
  <div class="player-identity">
   <button type="button" class="avatar" data-profile="${e(p.id)}" aria-label="View ${e(p.name)}’s match record">${e(initials(p.name))}</button>
   <div><h3>${playerNameLink(p.id)}</h3>${role?`<p>${role}</p>`:''}</div>
  </div>
  ${status?`<div class="player-card-status">${status}</div>`:''}
  ${detail}
  <div class="player-card-actions"><button class="text-link card-target" ${playerAction(p)}>View player ${icon('arrow',15)}</button>${isAdmin()?`<button type="button" class="text-link" data-edit-player="${e(p.id)}">Manage player</button>`:''}</div>
 </article>`;
}
function playerList(roster,scores,form,accounts){
 const rows=roster.map(p=>{
  const {played,won,points}=scores.get(p.id);
  const subline=[playerRole(p),p.id===user?.id?'You':''].filter(Boolean).join(' · ');
  return `<tr class="player-list-row" data-player-name="${e(p.name.toLowerCase())}" ${matchesPlayerSearch(p)?'':'hidden'}>
   <th scope="row"><button class="player-list-action" ${playerAction(p)}><span>${e(p.name)}${subline?`<small>${subline}</small>`:''}</span>${icon('chevron',15)}</button></th>
   ${accounts?`<td>${accounts.get(p.id)}</td>`:''}
   <td>${e(playerDivision(p))}</td><td class="player-list-number">${played}</td><td class="player-list-number">${won}</td><td class="player-list-number">${points}</td>
   <td>${playerForm(form.get(p.id))}</td>
  </tr>`;
 }).join('');
 return `<div class="panel table-scroll players-list" role="region" aria-label="Player list" tabindex="0"><table>
  <thead><tr><th scope="col">Player</th>${accounts?'<th scope="col">Account</th>':''}<th scope="col">Division</th><th scope="col" class="player-list-number">Played</th><th scope="col" class="player-list-number">Won</th><th scope="col" class="player-list-number">Points</th><th scope="col">Form (last 5)</th></tr></thead>
  <tbody>${rows}</tbody></table></div>`;
}
function playerCount(count){return `${count} ${playerScope==='registered'?'registered ':''}player${count===1?'':'s'}`;}
function players(){
 const admin=isAdmin();
 if(!admin)playerScope='all';
 const views=[['roster','Cards'],['list','List'],['form','Form']];
 const list=playerView==='list';
 const formOnly=playerView==='form';
 const registered=admin?state.players.filter(hasPlayerAccount):[];
 const pending=new Set((state.signupRequests||[]).map(r=>r.playerId));
 const accounts=admin?new Map(state.players.map(p=>[p.id,hasPlayerAccount(p)?badge('Registered','registered-account'):pending.has(p.id)?badge('Pending approval','amber'):badge('Roster only','neutral')])):null;
 let roster=playerScope==='registered'?registered:state.players;
 if(list)roster=[...roster].sort((a,b)=>a.name.localeCompare(b.name));
 const count=roster.filter(matchesPlayerSearch).length;
 const scores=formOnly?null:new Map(standings(state).map(p=>[p.id,p]));
 const form=list||formOnly?recentPlayerForm(state):null;
 const hasUndatedResults=form&&roster.some(p=>form.get(p.id).some(result=>!result.dated));
 const results=list?playerList(roster,scores,form,accounts):`<div class="players-grid">${roster.map(p=>{
  const account=accounts?.get(p.id)||'';
  if(formOnly)return playerCard(p,playerForm(form.get(p.id)),undefined,account);
  const {played,won,points}=scores.get(p.id);
  return playerCard(p,cardFacts([['Played',played],['Won',won],['Points',points]]),playerDivision(p),account);
 }).join('')}</div>`;
 return `${heading('','Players','',admin?actionButton(`${icon('plus',17)} Add players`,'addPlayers','button primary'):'')}
 ${admin&&!demo?signupRequestsPanel():''}
 ${admin?`<div class="filter-pills player-scope" role="group" aria-label="Filter by account status">${[['all','All players',state.players.length],['registered','Registered',registered.length]].map(([id,label,total])=>`<button data-player-scope="${id}" class="${playerScope===id?'selected':''}" aria-pressed="${playerScope===id}">${label} <span>${total}</span></button>`).join('')}</div><p class="player-account-key">Registered players can sign in with their PIN. Roster-only players still need an account.</p>`:''}
 <div class="view-tabs player-view-tabs" role="group" aria-label="Player view">${views.map(([id,label])=>`<button data-player-view="${id}" class="${playerView===id?'selected':''}" aria-pressed="${playerView===id}">${label}</button>`).join('')}</div>
 <div class="players-toolbar"><label class="search-wrap">${icon('search',18)}<input id="player-search" class="search" placeholder="Find a player…" value="${e(playerFilter)}" aria-label="Search players"></label><span class="player-count" aria-live="polite">${playerCount(count)}</span>${admin?actionButton(`${icon('key',16)} Recover account`,'recoverAccount','button secondary'):''}${admin&&!formOnly?actionButton('Player PINs','pins','button secondary'):''}</div>
 ${form?`<p class="player-form-key">${list?'Played, Won and Points are from the division league. Form shows the latest five played results, newest first.':'Latest five played results, newest first.'}${hasUndatedResults?' Undated results appear last, in reverse fixture order.':''}</p>`:''}
 ${results}
 <div id="player-empty" ${count?'hidden':''}>${playerScope==='registered'&&!roster.length?empty('No registered players','Approved sign-ups and players with an issued PIN appear here.'):empty('No player found','Try another name.')}</div>`;
}
function approvals(){if(!isAdmin())return empty('For Mr French','Sign in as the club administrator to review submitted results.',actionButton('Administrator sign in','adminLogin','button primary'));
 return `${heading('','Result approvals',`${state.submissions.length} result${state.submissions.length===1?' is':'s are'} waiting for your approval.`,actionButton('Enter result','record','button primary'))}<div class="approval-explainer">${icon('shield',20)}<p>Check both players agree on the score. <b>Approve</b> to update the standings, or <b>Return</b> so they can submit again.</p></div><section class="panel approval-panel">${state.submissions.length?state.submissions.map(s=>{const m=findMatch(state,s.match);return `<div class="approval-row"><div class="approval-meta">${badge(s.kind==='competition'?e(competitionForMatch(state,m.id)?.name||'Competition result'):s.kind==='league'?'League result':'Cup result','neutral')}<span>${e(new Date(s.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}</span></div><div class="approval-match">${player(m.a)}<span class="score">${s.score[0]} <i>:</i> ${s.score[1]}</span>${player(m.b)}</div><div class="approval-bottom"><span>${icon('user',14)} Submitted by ${e(s.by==='admin'?'Mr French':name(s.by))}</span><div><button class="button secondary" data-reject="${s.id}">${icon('undo',15)} Return</button><button class="button primary" data-approve="${s.id}">${icon('check',15)} Approve result</button></div></div></div>`;}).join(''):empty('No results awaiting approval','Submitted results appear here until approved or returned.',`<a class="button secondary" href="#competitions">Back to competitions ${icon('arrow',16)}</a>`)}</section>${matchHighlightsPanel(true)}${leagueEntryRequestsPanel()}`;
}
function settings(){if(!isAdmin())return empty('Administrator access','Sign in as Mr French to manage the club.');const s=state.settings;return `${heading('','Club settings','Set the defaults for your next competition. Existing match lengths stay as drawn.')}
 <form id="settings-form" class="settings-grid"><section class="panel settings-card"><h2>Championship identity</h2><p class="application-name">Wakefield Pool Championship</p><label>Season name<input name="season" value="${e(s.season)}" required></label>${clubMark("settings-crest")}<label>School pool rules<textarea name="rules" maxlength="2000" rows="8">${e(s.rules)}</textarea></label></section>
 <section class="panel settings-card"><h2>Competition defaults</h2><div class="form-pair"><label>Match length<select name="frames">${[1,3,5,7,9].map(n=>`<option value="${n}" ${n===s.frames?'selected':''}>Best of ${n}</option>`).join('')}</select></label><label>Cup final length<select name="finalFrames">${[1,3,5,7,9].map(n=>`<option value="${n}" ${n===s.finalFrames?'selected':''}>Best of ${n}</option>`).join('')}</select></label></div><div class="form-pair"><label>Points for a win<input type="number" name="winPoints" min="1" max="10" value="${s.winPoints}" required></label></div><label class="checkbox"><input type="checkbox" name="approval" ${s.approval?'checked':''}> Approve scores for earlier division leagues and cups</label><p class="form-hint">New competitions always require Mr French’s approval.</p><label class="checkbox"><input type="checkbox" name="consolation" ${s.consolation?'checked':''}> Consolation cup for earlier cups</label><div class="settings-note">New leagues use one full table. Set entries, rules and match lengths on each competition page.</div><button class="button primary" type="submit">Save club settings ${icon("check",16)}</button></section></form>
 <section class="panel settings-card"><h2>${demo?'Demo storage':'Shared results'}</h2><p>${demo?'This demo is saved only in this browser. Shared results use the published club.':'Player PINs and administrator credentials are checked on the server. Only approved results affect standings when approval is enabled.'}</p>${demo?'<button class="button secondary" data-action="resetDemo">Reset demo data</button>':''}</section>${recoverySettings()}${breakthroughAdminSettings()}`;}
function modal(title,body,focusSelector='',kind=''){const active=document.activeElement;if(!$('#modal-root').contains(active))window.lastFocus=active;$('#modal-root').innerHTML=`<div class="modal-backdrop${kind==='player-record-modal'?' player-record-backdrop':''}"><section class="modal${kind?' '+e(kind):''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div>${clubMark('dialog-crest')}<span class="eyebrow">Wakefield Pool Championship</span><h2 id="modal-title">${title}</h2></div><button class="icon-button" data-action="close" aria-label="Close dialog">${icon("close",20)}</button></div>${body}</section></div>`;document.body.classList.add('modal-open');setTimeout(()=>$(focusSelector||'#modal-root input, #modal-root select, #modal-root button')?.focus(),0);}
function closeModal(){$('#modal-root').innerHTML='';document.body.classList.remove('modal-open');window.lastFocus?.focus();window.lastFocus=null;pendingRecovery=null;if(syncPending&&!demo)setTimeout(()=>syncClub().catch(()=>{}),0);if(state&&user)scheduleBreakthroughs();}
function login(admin=false){if(!user){showWelcome(admin?'admin':'player');return;}modal(admin?'Administrator sign in':'Player sign in',loginForm(admin));}
function adminResultGroups(){
 const playable=m=>m.a&&m.b&&['open','complete'].includes(m.status)&&!m.walkover;
 return [
  ...state.competitions.filter(c=>c.status==='drawn').map(c=>({id:c.id,name:c.name,matches:competitionMatches(c)})),
  ...state.divisions.map(d=>({id:'division:'+d.id,name:'Earlier league · '+d.name,matches:state.league.filter(m=>m.division===d.id)})),
  ...state.cups.map(c=>({id:'cup:'+c.id,name:c.name,matches:c.rounds.flat()}))
 ].map(g=>({...g,matches:g.matches.filter(playable)})).filter(g=>g.matches.length);
}
function adminRecordPicker(groupId='',sideId='',playerId='',focusSelector='#admin-result-competition'){
 if(!isAdmin()){toast('Administrator access required.');return;}
 const groups=adminResultGroups();
 const group=groupId?groups.find(g=>g.id===groupId):groups.find(g=>g.matches.some(m=>isMatchParticipant(state,m,playerId)))||groups[0];
 if(!group){modal('Enter result',empty('No matches available','Start a competition or draw its matches before entering a result.'));return;}
 const sides=[...new Set(group.matches.flatMap(m=>[m.a,m.b]))].sort((a,b)=>name(a).localeCompare(name(b)));
 const selected=sides.includes(sideId)?sideId:sides.find(id=>sideMembers(state,id).includes(playerId))||'';
 const matches=group.matches.filter(m=>[m.a,m.b].includes(selected)).sort((a,b)=>name(a.a===selected?a.b:a.a).localeCompare(name(b.a===selected?b.b:b.a)));
 const pending=new Map(state.submissions.map(s=>[s.match,s]));
 const scoreText=(m,score)=>(m.a===selected?score:[...score].reverse()).join('–');
 modal('Enter result',`<p class="form-hint">Choose any matchup in a saved competition. Results you enter are approved immediately. Approved results can be corrected with a reason.</p><form id="admin-result-picker"><label>Competition<select id="admin-result-competition" name="competition" required>${groups.map(g=>`<option value="${e(g.id)}" ${g===group?'selected':''}>${e(g.name)}</option>`).join('')}</select></label><label>Player or pair<select id="admin-result-player" name="player" required><option value="">Choose a player or pair</option>${sides.map(id=>`<option value="${e(id)}" ${id===selected?'selected':''}>${e(name(id))}</option>`).join('')}</select></label><label>Opponent<select name="match" required ${selected?'':'disabled'}><option value="">${selected?'Choose an opponent':'Choose a player or pair first'}</option>${matches.map(m=>`<option value="${e(m.id)}">${e(name(m.a===selected?m.b:m.a))} · ${m.status==='complete'?`Approved ${scoreText(m,m.score)}`:pending.has(m.id)?`Awaiting approval ${scoreText(m,pending.get(m.id).score)}`:'Unplayed'}</option>`).join('')}</select></label><p class="form-hint">Opponent list scores show the selected player or pair first.</p><button class="button primary full" type="submit" ${selected?'':'disabled'}>Continue ${icon('arrow',16)}</button></form>`,focusSelector);
}
function playerResultGroups(){
 return adminResultGroups().map(g=>({...g,matches:g.matches.filter(m=>isMatchParticipant(state,m,user.id))})).filter(g=>g.matches.length);
}
const playerSide=m=>sideMembers(state,m.a).includes(user.id)?m.a:m.b;
const playerOpponent=m=>m.a===playerSide(m)?m.b:m.a;
function playerResultPicker(scope='',dialog=false){
 const prefix=dialog?'dialog-':'';
 const groups=playerResultGroups(),group=groups.find(g=>g.id===(scope||resultCompetition))||(!scope&&groups.length===1?groups[0]:null);
 if(group){if(resultCompetition!==group.id)resultSearch='';resultCompetition=group.id;}
 const pendingIds=new Set(state.submissions.map(s=>s.match));
 const available=(group?.matches||[]).filter(m=>m.status==='open'&&!pendingIds.has(m.id)).sort((a,b)=>name(playerOpponent(a)).localeCompare(name(playerOpponent(b))));
 const pending=(group?.matches||[]).filter(m=>pendingIds.has(m.id)),played=(group?.matches||[]).filter(m=>m.status==='complete').length;
 const c=state.competitions.find(c=>c.id===group?.id),side=group?.matches[0]&&playerSide(group.matches[0]);
 return `<div class="player-result-picker" data-result-scope="${e(scope)}" data-result-dialog="${dialog}">
  ${!scope&&groups.length>1?`<label class="result-competition-label" for="${prefix}result-competition">Competition<select id="${prefix}result-competition" data-result-competition><option value="">Choose the competition you played in</option>${groups.map(g=>`<option value="${e(g.id)}" ${g===group?'selected':''}>${e(g.name)}</option>`).join('')}</select></label>`:group?`<p class="result-competition-name">${e(group.name)}</p>`:''}
  ${group?`<div class="result-player-identity"><span class="avatar" aria-hidden="true">${e(initials(user.name))}</span><div><small>${c?.mode==='pairs'?'Your fixed pair':'Playing as'}</small><strong>${e(name(side))}</strong></div></div>
  <div class="result-opponents-heading"><h3>Choose an opponent</h3><span>${available.length} available</span></div>
  <p class="result-picker-hint">${c?.format==='knockout'||group.id.startsWith('cup:')?'Choose the match you played. Only your available ties are shown.':'Play in any order. Choose who you played to enter the result.'}</p>
  ${available.length?`<label class="result-search" for="${prefix}result-opponent-search">${icon('search',18)}<span class="sr-only">Search opponents</span><input type="search" id="${prefix}result-opponent-search" data-result-search placeholder="Search opponents" autocomplete="off" value="${e(resultSearch)}"></label><div class="result-opponent-list" role="group" aria-label="Available opponents">${available.map(m=>`<button type="button" class="result-opponent" data-score="${e(m.id)}" data-opponent-name="${e(name(playerOpponent(m)).toLowerCase())}" ${name(playerOpponent(m)).toLowerCase().includes(resultSearch.toLowerCase().trim())?'':'hidden'}><span class="result-opponent-avatar" aria-hidden="true">${icon(c?.mode==='pairs'?'players':'user',19)}</span><span class="result-opponent-copy"><strong>${e(name(playerOpponent(m)))}</strong><small>${m.bestOf===1?'1 frame':'Best of '+m.bestOf}</small></span><span class="result-row-action">Enter result ${icon('chevron',16)}</span></button>`).join('')}</div><p class="result-no-search" ${available.some(m=>name(playerOpponent(m)).toLowerCase().includes(resultSearch.toLowerCase().trim()))?'hidden':''}>No opponents match your search. Try another name.</p><p class="sr-only result-search-status" role="status"></p>`:`<div class="result-empty"><strong>${pending.length?'No other results to enter':played===group.matches.length?'All your matches are complete':'No match available yet'}</strong><p>${pending.length?'Your submitted results are listed below.':c?.format==='knockout'?'Check the draw for your progress.':'Your approved results are in the standings and match history.'}</p></div>`}
  <div class="result-picker-footer"><span>${played} played · ${pending.length} awaiting approval</span>${c?`<a class="text-link" href="#competition/${e(c.id)}" data-close-on-nav>View competition ${icon('arrow',14)}</a>`:''}</div>
  ${pending.length?`<details class="result-pending"><summary>Results awaiting approval (${pending.length})</summary><p>Already sent to Mr French. No need to submit again.</p>${pending.map(m=>{const s=state.submissions.find(s=>s.match===m.id),score=m.a===playerSide(m)?s.score:[...s.score].reverse();return `<div><span>vs <strong>${e(name(playerOpponent(m)))}</strong></span><b aria-label="Your score ${score[0]}, opponent score ${score[1]}">${score.join('–')}</b></div>`;}).join('')}</details>`:''}`:`<div class="result-empty"><strong>${groups.length?'Choose a competition above':'No matches available yet'}</strong><p>${groups.length?'Then select your opponent.':'Your opponents will appear when a competition you have entered is drawn.'}</p>${groups.length?'':'<a class="text-link" href="#join" data-close-on-nav>Join competitions '+icon('arrow',14)+'</a>'}</div>`}
 </div>`;
}
function playerResultPanel(scope=''){
 return `<section class="panel player-result-panel" aria-labelledby="player-result-heading"><div class="panel-heading"><div><h2 id="player-result-heading">Enter a result</h2><p>Choose your opponent, then enter the score.</p></div>${icon('ball',24)}</div>${playerResultPicker(scope)}</section>`;
}
function playerResultDialog(scope=''){
 modal('Enter a result',playerResultPicker(scope,true),'#dialog-result-competition, #dialog-result-opponent-search, #modal-root .result-opponent, #modal-root [data-action="close"]','result-modal');
}
function resultReceipt(id,score){
 const m=findMatch(state,id),approval=state.submissions.some(s=>s.match===id),side=playerSide(m),ordered=m.a===side?score:[...score].reverse();
 resultSearch='';
 modal(approval?'Result submitted':'Result recorded',`<div class="result-receipt"><span class="result-receipt-icon">${icon('check',28)}</span><p class="result-competition-name">${e(competitionForMatch(state,id)?.name||adminResultGroups().find(g=>g.matches.some(x=>x.id===id))?.name||'Match')}</p><div class="result-receipt-score"><span><small>${sideMembers(state,side).length>1?'Your pair':'You'}</small><strong>${e(name(side))}</strong></span><b>${ordered.join('–')}</b><span><small>Opponent</small><strong>${e(name(playerOpponent(m)))}</strong></span></div><p class="result-receipt-status">${icon(approval?'clock':'check',18)} ${approval?'Awaiting Mr French’s approval':'Approved result'}</p><p>${approval?'Your result has been saved. It will count once Mr French approves it.':'Your result now counts in the competition.'}</p></div><button type="button" class="button primary full" data-action="close">Done</button><button type="button" class="button secondary full spaced" data-result-again="${e(resultCompetition)}">Enter another result</button>`, '[data-action="close"]','result-modal');
}
function scorePreview(form){
 const m=findMatch(state,form.dataset.match);if(!m)return;
 const data=Object.fromEntries(new FormData(form)),goal=Math.ceil(m.bestOf/2),winner=data.winner;
 const score=m.bestOf===1?(winner?(winner==='a'?[1,0]:[0,1]):null):(data.a!==''&&data.b!==''?[Number(data.a),Number(data.b)]:null);
 const valid=score&&score.every(n=>Number.isInteger(n)&&n>=0)&&((score[0]===goal&&score[1]<goal)||(score[1]===goal&&score[0]<goal));
 const preview=form.querySelector('[data-score-preview]');
 if(preview){preview.textContent=valid?`${name(score[0]>score[1]?m.a:m.b)} won${m.bestOf===1?'':` ${Math.max(...score)}–${Math.min(...score)}`}. Check both sides agree before submitting.`:score?'A finished match needs one winner with '+goal+' '+(goal===1?'frame':'frames')+'.':'Select '+(m.bestOf===1?'the winner':'both scores')+' to check your result.';preview.classList.toggle('invalid',!!score&&!valid);}
 const button=form.querySelector('[type="submit"]');if(button)button.disabled=!valid||busy;
}
function record(id){
 if(!user){intendedMatch=id||true;login();return;}
 if(isAdmin()&&!id){adminRecordPicker(page==='competition'?selectedCompetition:'');return;}
 const m=id?findMatch(state,id):null;
 if(id&&!m){toast('This match is no longer available.');return;}
 if(m){
  if(!isAdmin()&&!isMatchParticipant(state,m,user.id)){toast('Choose one of your own matches to submit a result.');return;}
  if(isAdmin()&&m.status==='complete'){correctResultDialog(m.id);return;}
  if(m.status!=='open'){toast('This match has already been played.');return;}
  const submission=state.submissions.find(s=>s.match===m.id);
  if(submission){
   if(isAdmin())modal('Review submitted result',`<p><strong>${e(name(m.a))} ${submission.score.join('–')} ${e(name(m.b))}</strong></p><p class="form-hint">Submitted by ${e(submission.by==='admin'?'Mr French':name(submission.by))}. Approve this score, or return it before entering a different result.</p><button class="button primary full" data-approve="${e(submission.id)}">Approve result</button><button class="button secondary full spaced" data-reject="${e(submission.id)}">Return for correction</button>`);
   else toast('This result is already with Mr French for approval.');
   return;
  }
  if(!isAdmin())resultCompetition=playerResultGroups().find(g=>g.matches.some(x=>x.id===m.id))?.id||'';
  const approval=!isAdmin()&&requiresApproval(state,m);
  const sides=[[m.a,'a'],[m.b,'b']];
  if(!isAdmin()&&playerSide(m)===m.b)sides.reverse();
  const sideLabel=id=>!isAdmin()&&id===playerSide(m)?(sideMembers(state,id).length>1?'Your pair':'You'):'Opponent';
  const goal=Math.ceil(m.bestOf/2);
  const scoreFields=m.bestOf===1?`<fieldset class="winner-options"><legend class="sr-only">Choose the winner</legend>${sides.map(([id,key])=>`<label class="winner-option"><small>${isAdmin()?'Player':sideLabel(id)}</small><span class="winner-name">${e(name(id))}</span><span class="winner-select-label">Won the frame</span><input type="radio" name="winner" value="${key}" required aria-label="${e(name(id))} won"></label>`).join('')}</fieldset>`:`<div class="score-entry">${sides.map(([id,key],i)=>`${i?'<span aria-hidden="true">–</span>':''}<label><small>${isAdmin()?'Frames won':sideLabel(id)}</small><strong>${e(name(id))}</strong><select name="${key}" required aria-label="Frames won by ${e(name(id))}"><option value="">Score</option>${Array.from({length:goal+1},(_,n)=>`<option value="${n}">${n}</option>`).join('')}</select></label>`).join('')}</div>`;
  modal(m.bestOf===1?'Who won the frame?':isAdmin()?'Enter result':'Enter the score',`${!isAdmin()?`<button class="text-link result-change-opponent" type="button" data-result-again="${e(playerResultGroups().find(g=>g.matches.some(x=>x.id===m.id))?.id||'')}">← Change opponent</button>`:''}<p class="result-competition-name">${e(competitionForMatch(state,m.id)?.name||state.divisions.find(d=>d.id===m.division)?.name||state.cups.find(c=>c.rounds.flat().some(x=>x.id===m.id))?.name||'Match')}</p><p class="result-picker-hint">${m.bestOf===1?'Select who won.':'Best of '+m.bestOf+' · First to '+goal+' frames. Enter the frames each side won.'}</p><form id="score-form" data-match="${m.id}" data-revision="${revision}">${scoreFields}<p class="score-preview" data-score-preview role="status">Select ${m.bestOf===1?'the winner':'both scores'} to check your result.</p>${matchHighlightsFields(m)}<div class="result-summary">${icon(approval?'shield':'check',17)}<span>${approval?'Mr French will approve the result before it counts.':isAdmin()?'Saving as Mr French approves this result immediately and updates the competition.':'This result will update the standings immediately.'}</span></div><p id="score-error" class="error" role="alert"></p><button class="button primary full" type="submit" disabled>${icon('check',16)} ${isAdmin()?'Save result':'Submit result'}</button></form>`, '#score-form input[name="winner"], #score-form select', 'result-modal');
 }else{
  playerResultDialog(page==='competition'?selectedCompetition:'');
 }
}
function showPins(pins,recovered=false){modal(recovered?'Account recovered':'Private player PINs',`<p class="form-hint">${demo?'These are demo PINs only.':recovered?'Give this replacement PIN privately to the pupil after checking their identity. Their old PIN and signed-in sessions no longer work. Their entries and results are kept. This PIN is shown only now.':'New PINs replace previous ones and sign those players out. Give each player only their own PIN. Download now: these values cannot be retrieved later.'}</p><div class="pin-list">${pins.map(p=>`<div><span>${e(p.name)}</span><code>${e(p.pin)}</code></div>`).join('')}</div><button class="button primary full" id="download-pins">Download private PIN list ↓</button>`);$('#download-pins').onclick=()=>{const blob=new Blob(['Player,PIN\n'+pins.map(p=>`"${p.name.replaceAll('"','""')}",${p.pin}`).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wakefield-private-player-pins.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};}
function recoverAccountDialog(id=''){
 if(!isAdmin()){toast('Administrator access required.');return;}
 const pupils=state.players.filter(p=>hasPlayerAccount(p)),p=pupils.find(p=>p.id===id);
 if(id&&!p){toast('This player needs an account first. Approve their sign-up or issue a PIN.');return;}
 modal('Recover pupil account',pupils.length?`<form id="recover-account-form" data-revision="${revision}"><label>Pupil<select name="id" required><option value="" disabled ${p?'':'selected'}>Choose a pupil</option>${[...pupils].sort((a,b)=>a.name.localeCompare(b.name)).map(person=>`<option value="${e(person.id)}" ${person.id===p?.id?'selected':''}>${e(person.name)}</option>`).join('')}</select></label><p class="form-hint">Issue a new six-digit PIN for the existing account. The old PIN will stop working and the pupil will be signed out on other devices. Competition entries, partners and results are kept.</p><label class="checkbox"><input type="checkbox" required> I have checked this pupil’s identity.</label><p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">Issue replacement PIN</button></form>`:'<p>No pupil accounts are available. Approve their sign-up requests or issue player PINs first.</p>');
}

const actions={
 retry:()=>location.reload(),
 welcomeHome:()=>{if(!user)showWelcome('player');},
 requestAccount:()=>showWelcome('signup'),
 recoverAccount:()=>recoverAccountDialog(),
 forgottenPin:()=>modal('Forgotten your PIN?',`<p>Ask Mr French to recover your account. Tell him the name you use on the roster. He will check your identity and give you a replacement PIN.</p><p>Your competition entries and results will stay on your existing account.</p><button class="button primary full" data-action="playerLogin">Back to sign in</button>`),
 openSettings:()=>{location.hash='settings';},
 moreFixtures:()=>{fixtureLimit+=20;$('#fixture-list').innerHTML=fixtureList();},
 clearFilters:()=>{filter='';myMatches=false;fixtureStatus='available';fixtureLimit=20;render();},
 share:()=>joiningLinks(),
 joiningLinks:()=>joiningLinks(),
 signupLogin:()=>login(),
 editJoining:()=>{joinReceipt=null;render();},
 close:closeModal,login:()=>login(),playerLogin:()=>login(),adminLogin:()=>login(true),record:()=>record(),refresh:()=>refresh().then(()=>toast('Club updated.')).catch(x=>toast(x.message)),
 demoAdmin:()=>{user={role:'admin',name:'Mr French'};render();toast('You’re exploring the demo as Mr French.');},
 logout:async()=>{const adminExit=!demo&&chatgptAdmin&&isAdmin();if(!demo)await api('logout',{});selectedLeaguePlayer='';if(adminExit){location.href='/signout-with-chatgpt?return_to=%2F';return;}page='competitions';location.hash='competitions';resetWelcomeSession();},
 account:()=>modal('Your account',`<p>Signed in as <b>${e(user.name)}</b>.</p>${isAdmin()?`<div class="admin-menu"><button class="button primary full" data-action="record">${icon('plus',19)} Enter result</button><a href="#approvals" data-close-on-nav>${icon('check',19)} Result approvals ${state.submissions.length?badge(String(state.submissions.length),'amber'):''}${icon('chevron',15)}</a><a href="#settings" data-close-on-nav>${icon('settings',19)} Club settings ${icon('chevron',15)}</a></div>`:''}<button class="button secondary full" data-action="logout">Sign out</button>`),
 legacyNewCup:()=>modal('A new cup competition',`<p class="form-hint">All ${state.players.length} players enter a random draw. Byes are assigned automatically.</p><form id="cup-form"><label>Tournament name<input name="name" value="The Wakefield Cup" maxlength="70" required></label><button class="button primary full" type="submit">Make the draw ${icon("arrow",16)}</button></form>`),
 legacyGenerateLeague:()=>modal('Generate league',`<p>Players will be balanced across divisions of up to ${state.settings.divisionSize}. Set ability ratings in Players first, or leave everyone at zero for a random draw.</p><p>Every player faces everyone in their division once. There are no fixed match times.</p><button class="button primary full" data-action="confirmLeague">Generate fixtures ${icon("arrow",16)}</button>`),
 confirmLeague:()=>mutate('league'),
 promote:()=>modal('A new season',`<p>Every current fixture must be completed first. The top player in each lower division moves up; the bottom player in the neighbouring division moves down. This season is saved in Past seasons.</p><button class="button primary full" data-action="confirmPromote">Archive and start next season ${icon("arrow",16)}</button>`),confirmPromote:()=>mutate('promote'),
 addPlayers:()=>modal('Add players',`<p class="form-hint">Use first names and surname initials. One unique display name per line, up to 64 players in total.</p><form id="players-form"><label>Player names<textarea name="names" rows="7" placeholder="Oliver W.&#10;Harry S.&#10;Jack B." required></textarea></label><button class="button primary full" type="submit">Add players ${icon("plus",16)}</button></form>`),
 pins:()=>modal('Generate player PINs?',`<p>This replaces all existing player PINs. Download the private list and share each PIN only with its owner.</p><button class="button primary full" data-action="confirmPins">Generate and show PINs</button>`),confirmPins:()=>mutate('pins'),
 resetDemo:()=>{if(confirm('Reset the sample club on this device?')){state=initialState(true);persist();render();toast('Demo reset.');}}
};
document.addEventListener('click',async event=>{const b=event.target.closest('button')||event.target.closest('.player-list-row')?.querySelector('.player-list-action');if(!b)return;try{
 if(b.dataset.action)await actions[b.dataset.action]?.();
 else if(b.dataset.division){division=b.dataset.division;filter='';fixtureLimit=20;render();}
 else if(b.dataset.leagueView){leagueView=b.dataset.leagueView;render();}
 else if(b.dataset.playerView){playerView=b.dataset.playerView;render();}
 else if(b.dataset.playerScope&&isAdmin()){playerScope=b.dataset.playerScope;render();}
 else if(b.dataset.status){fixtureStatus=b.dataset.status;fixtureLimit=20;render();}
 else if(b.dataset.profile)showPlayerRecord(b.dataset.profile);
 else if(b.dataset.recordOutcome)showPlayerRecord(recordPlayer,recordCompetition,b.dataset.recordOutcome,30,`[data-record-outcome="${b.dataset.recordOutcome}"]`);
 else if(b.dataset.recordMore!==undefined)showPlayerRecord(recordPlayer,recordCompetition,recordOutcome,recordLimit+30,'#record-history-heading');
 else if(b.dataset.cup){cupIndex=+b.dataset.cup;render();}
 else if(b.dataset.adminResult!==undefined)adminRecordPicker(b.dataset.adminResult,'',b.dataset.resultPlayer||'');
 else if(b.dataset.resultAgain!==undefined){resultCompetition=b.dataset.resultAgain;playerResultDialog();}
 else if(b.dataset.score)record(b.dataset.score);
 else if(b.dataset.correctResult)correctResultDialog(b.dataset.correctResult);
 else if(b.dataset.withdrawPlayer)withdrawalDialog(b.dataset.withdrawPlayer,b.dataset.withdrawCompetition||'');
 else if(b.dataset.withdrawCompetition)withdrawalDialog('',b.dataset.withdrawCompetition);
 else if(b.dataset.previewSnapshot)await previewRecovery({backupId:b.dataset.previewSnapshot});
 else if(b.dataset.approve)await mutate('approve',{id:b.dataset.approve});
 else if(b.dataset.reject)await mutate('reject',{id:b.dataset.reject});
 else if(b.dataset.reviewSignup)reviewSignupDialog(b.dataset.reviewSignup);
 else if(b.dataset.signupDecision)await mutate('reviewSignup',{id:b.dataset.signupId,decision:b.dataset.signupDecision,testAccount:$('#signup-test-account')?.checked===true},Number(b.dataset.signupRevision));
 else if(b.dataset.removeTestAccount)removeTestAccountDialog(b.dataset.removeTestAccount);
 else if(b.dataset.confirmRemoveTest)await mutate('removeTestAccount',{id:b.dataset.confirmRemoveTest},Number(b.dataset.signupRevision));
 else if(b.dataset.editPlayer){const p=state.players.find(p=>p.id===b.dataset.editPlayer);modal('Manage player',`<form id="player-form" data-id="${p.id}"><label>Display name<input name="name" maxlength="45" value="${e(p.name)}" required></label><label>Ability rating (0–100)<input type="number" name="rating" min="0" max="100" value="${p.rating}" required></label><p class="form-hint">Ratings do not affect new leagues, points or random pairs.</p><button class="button primary full" type="submit">Save player ${icon("check",16)}</button></form><p><a class="button secondary full" href="#breakthroughs/${e(p.id)}" data-close-on-nav>View Breakthroughs</a></p><button class="button secondary full spaced" ${hasPlayerAccount(p)?`data-recover-account="${e(p.id)}"`:`data-reset-pin="${e(p.id)}"`}>${hasPlayerAccount(p)?'Recover account':'Issue player PIN'}</button><button class="button primary full spaced" data-admin-result="" data-result-player="${e(p.id)}">Enter result</button><button class="button secondary full spaced" data-withdraw-player="${p.id}">Withdraw from a competition</button>${p.testAccount?`<button class="button secondary full spaced" data-remove-test-account="${e(p.id)}">Remove test account</button>`:''}`);}
 else if(b.dataset.recoverAccount)recoverAccountDialog(b.dataset.recoverAccount);
 else if(b.dataset.resetPin)await mutate('pins',{id:b.dataset.resetPin});
 }catch(error){toast(error.message);}});
document.addEventListener('submit',async event=>{event.preventDefault();const f=event.target,data=Object.fromEntries(new FormData(f));const button=f.querySelector('[type="submit"]');if(button)button.disabled=true;
 try {
 if(f.getAttribute('id')==='login-form'){
  const role=f.dataset.role;
  if(demo){if(role==='player'&&data.pin!=='1234')throw Error('Use PIN 1234 in the demo.');user=role==='admin'?{role,name:'Mr French'}:{role,id:data.id,name:name(data.id)};}
  else {const r=await api('login',{...data,role});user=r.user;await refresh();}
  if(!user)throw Error('Your session could not be confirmed. Please sign in again.');
  selectedLeaguePlayer=user.id||'';competitionMine=!!user.id;resultCompetition='';resultSearch='';
  joinReceipt=null;signupReceipt=null;
  if(page==='join')preselectJoiningTarget();
  if(user.id){division=state.divisions.find(d=>d.players.includes(user.id))?.id||division;}closeModal();render();$('#main-content')?.focus();toast(`Signed in as ${user.name}.`);if(intendedMatch){const next=intendedMatch;intendedMatch=null;record(next===true?undefined:next);}
 }else if(f.getAttribute('id')==='signup-form')await submitSignup(data);
 else if(f.getAttribute('id')==='correction-form'){await mutate('correctResult',{id:f.dataset.match,score:data.resolution==='reopen'?null:[+data.a,+data.b],reason:data.reason});}
 else if(f.getAttribute('id')==='withdrawal-form')await mutate('withdrawPlayer',data);
 else if(f.getAttribute('id')==='backup-form'){if(data.passphrase!==data.confirmPassphrase)throw Error('The passphrases do not match.');const r=await api('backup',{passphrase:data.passphrase});downloadJson(r.backup,'wakefield-backup-'+new Date().toISOString().slice(0,10)+'.json');closeModal();toast('Encrypted backup downloaded. Keep its passphrase separately.');}
 else if(f.getAttribute('id')==='restore-file-form'){const file=f.elements.backupFile.files[0];if(!file||file.size>2000000)throw Error('Choose a Wakefield backup JSON file under 2 MB.');await previewRecovery({backup:JSON.parse(await file.text()),passphrase:data.passphrase});}
 else if(f.getAttribute('id')==='restore-confirm-form'){if(busy)return;busy=true;try{const r=await api('restore',{...pendingRecovery,confirmation:data.confirmation});state=r.state;revision=r.revision;user=r.user;syncPending=false;closeModal();render();toast('Club restored. A recovery snapshot was saved first. Players must sign in again.');}finally{busy=false;}}
 else if(f.getAttribute('id')==='competition-form'){await mutate(f.dataset.id?'editCompetition':'createCompetition',{...data,id:f.dataset.id,...(f.elements.consolation?{consolation:f.elements.consolation.checked}:{})});}
 else if(f.getAttribute('id')==='joining-form')await submitJoiningEntries();
 else if(f.getAttribute('id')==='league-add-form')await mutate('addLeaguePlayers',{id:f.dataset.id,playerIds:[data.playerId,...(data.partnerId?[data.partnerId]:[])]},Number(f.dataset.revision));
 else if(f.getAttribute('id')==='league-request-review-form')await mutate('reviewLeagueEntryRequest',{id:f.dataset.id,requestId:f.dataset.requestId,playerId:f.dataset.playerId,decision:'approve',partnerId:data.partnerId},Number(f.dataset.revision));
 else if(f.getAttribute('id')==='reserve-form')await mutate('addReserve',{id:f.dataset.id,playerId:data.playerId});
 else if(['choose-match','choose-league-match','admin-result-picker'].includes(f.getAttribute('id')))record(data.match);
 else if(f.getAttribute('id')==='recover-account-form')await mutate('recoverAccount',{id:data.id},Number(f.dataset.revision));
 else if(f.getAttribute('id')==='score-form'){const score=data.winner?(data.winner==='a'?[1,0]:[0,1]):[+data.a,+data.b];await mutate(isAdmin()?'recordResult':'submit',{id:f.dataset.match,score,highlights:readMatchHighlights(f)},Number(f.dataset.revision??revision));}
 else if(f.getAttribute('id')==='cup-form'){cupIndex=state.cups.length;await mutate('cup',data);}
 else if(f.getAttribute('id')==='players-form')await mutate('addPlayers',data);
 else if(f.getAttribute('id')==='player-form')await mutate('player',{...data,id:f.dataset.id});
 else if(f.getAttribute('id')==='settings-form'){
   data.approval=f.approval.checked;data.consolation=f.consolation.checked;
   await mutate('settings',data);
 }
 }catch(error){const el=$('#login-error')||$('#score-error')||$('#form-error');if(el)el.textContent=error.message;else toast(error.message);}finally{if(button){button.disabled=false;if(f.getAttribute('id')==='score-form'&&f.isConnected)scorePreview(f);}}
});
document.addEventListener('click',event=>{if(!user&&event.target.closest('[data-action="welcomeHome"]'))showWelcome('player');if(event.target.classList?.contains('modal-backdrop'))closeModal();if(event.target.closest('[data-go-fixtures]')){leagueView='fixtures';fixtureStatus='available';filter='';myMatches=!!user?.id;fixtureLimit=20;if(location.hash==='#league')render();}if(event.target.closest('[data-go-standings]')){leagueView='standings';if(location.hash==='#league')render();}if(event.target.closest('[data-close-on-nav]'))closeModal();});
document.addEventListener('input',event=>{
 if(event.target.matches?.('[data-result-search]')){resultSearch=event.target.value;const root=event.target.closest('.player-result-picker');let visible=0;root.querySelectorAll('[data-opponent-name]').forEach(row=>{row.hidden=!row.dataset.opponentName.includes(resultSearch.toLowerCase().trim());if(!row.hidden)visible++;});root.querySelector('.result-no-search').hidden=visible>0;root.querySelector('.result-search-status').textContent=visible+' opponents found';}
 const form=event.target.closest?.('#settings-form, #signup-form, #login-form');if(form)form.dataset.dirty='true';
 if(event.target.id==='fixture-search'){filter=event.target.value;fixtureLimit=20;$('#fixture-list').innerHTML=fixtureList();}
 if(event.target.id==='player-search'){playerFilter=event.target.value;let count=0;document.querySelectorAll('[data-player-name]').forEach(card=>{card.hidden=!card.dataset.playerName.includes(playerFilter.toLowerCase());if(!card.hidden)count++;});$('.player-count').textContent=playerCount(count);$('#player-empty').hidden=count>0;}
});
document.addEventListener('change',event=>{
 if(event.target.closest?.('#score-form')&&['winner','a','b'].includes(event.target.name)){scorePreview(event.target.closest('#score-form'));$('#score-error').textContent='';}
 if(event.target.matches?.('[data-result-competition]')){resultCompetition=event.target.value;resultSearch='';const root=event.target.closest('.player-result-picker'),dialog=root.dataset.resultDialog==='true';root.outerHTML=playerResultPicker('',dialog);$(dialog?'#dialog-result-competition':'#result-competition')?.focus();}
 const settingsForm=event.target.closest?.('#settings-form');if(settingsForm)settingsForm.dataset.dirty='true';
 if(event.target.id==='player-record-competition')showPlayerRecord(recordPlayer,event.target.value,recordOutcome,30,'#player-record-competition');
 if(event.target.id==='league-opponent'){
  const select=event.target,[scope,competitionId,side]=JSON.parse(select.dataset.versusKey),matches=scope==='competition'?state.competitions.find(c=>c.id===competitionId)?.fixtures||[]:state.league;
  const match=matches.find(m=>m.id===select.value&&[m.a,m.b].includes(side)&&m.status==='open'&&!state.submissions.some(s=>s.match===m.id));
  if(match)leagueMatchSelections.set(select.dataset.versusKey,match.id);else leagueMatchSelections.delete(select.dataset.versusKey);
  $('#league-versus-preview').innerHTML=leagueVersusPreview(side,match,matches);
  $('#versus-match-length').textContent=match?'Best of '+match.bestOf:'Choose your matchup';
  $('#choose-league-match button[type="submit"]').disabled=!match;
 }
 if(event.target.id==='admin-result-competition')adminRecordPicker(event.target.value);
 if(event.target.id==='admin-result-player')adminRecordPicker($('#admin-result-competition').value,event.target.value,'','#admin-result-player');
 if(event.target.id==='withdraw-competition')withdrawalDialog($('#withdraw-player').value,event.target.value);
 if(event.target.id==='league-player'){selectedLeaguePlayer=event.target.value;$('#next-league').innerHTML=nextLeaguePanel();$('#league-player')?.focus({preventScroll:true});}
 if(event.target.id==='my-matches'){myMatches=event.target.checked;fixtureLimit=20;$('#fixture-list').innerHTML=fixtureList();}
 if(event.target.id==='round-jump'){const round=$(`#bracket-round-${event.target.value}`);const bracket=$('.bracket');bracket.scrollTo({left:round.getBoundingClientRect().left-bracket.getBoundingClientRect().left+bracket.scrollLeft-20,behavior:'instant'});}
});
document.addEventListener('keydown',event=>{const modalEl=$('.modal');if(!modalEl)return;if(event.key==='Escape')closeModal();if(event.key==='Tab'){const fields=[...modalEl.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);const first=fields[0],last=fields.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
window.addEventListener('hashchange',()=>{if(!state||location.hash==='#main-content')return;route();filter='';fixtureLimit=20;render();window.scrollTo({top:0,behavior:'smooth'});});
async function boot(){try{const config=await api('config');demo=!config.configured;chatgptAdmin=config.adminAuth==='chatgpt';if(!demo){await refresh();}else{state=stored()||initialState(true);persist();}}catch{ $('#app').innerHTML=`<div class="loading" role="alert">${clubMark('loading-crest')}The club could not connect.<span>Check your connection and reload. Your data has not been changed.</span><button class="button primary" data-action="retry">Try again</button></div>`;return;}ensureCompetitions(state);route();render();if(!demo)startSync();}
// Entry pages use one stable hash link per competition, including before a draw.
let selectedCompetition='',competitionView='fixtures',competitionPlayer='',competitionLimit=30,competitionFilter='',competitionStatus='all',competitionMine=false;
const competitionLabel=c=>`${c.mode==='pairs'?'Pairs':'Singles'} · ${c.format==='league'?'League':'Knockout'}`;
const competitionComplete=c=>c.status==='drawn'&&(c.format==='league'?c.fixtures.every(m=>['complete','void'].includes(m.status)):!!c.rounds.at(-1)?.[0]?.winner);
function competitionStatusLabel(c){return competitionComplete(c)?'Complete':c.status==='drawn'?'In progress':c.status==='closed'?'Entries closed':'Entries open';}
function leagueRequestButton(c){
 if(c.format!=='league'||isAdmin()||c.entries.includes(user?.id))return '';
 const pending=(c.entryRequests||[]).some(r=>r.playerId===user?.id);
 if(pending)return `<span class="competition-entered" role="status">Awaiting Mr French’s approval</span><button type="button" class="button secondary" data-cancel-league-request="${e(c.id)}">Cancel request</button>`;
 if(c.status==='open')return '';
 return user?`<button type="button" class="button primary" data-request-league="${e(c.id)}">Request to join</button>`:`<a class="button primary" href="#join/${encodeURIComponent(c.id)}">Request to join</a>`;
}
function competitionEntryButton(c){
 const adminPlayer=isAdmin()?administratorPlayer(state):null;
 const entered=c.entries.includes(adminPlayer?.id??user?.id);
 const entryStatus=entered?`<span class="competition-entered">${icon('check',16)} You are entered</span>`:'';
 const request=leagueRequestButton(c);
 if(request)return request;
 if(c.status!=='open')return entryStatus;
 if(isAdmin()){
  if(entered)return entryStatus;
  return adminPlayer?`<button class="button primary" data-enter="${e(c.id)}">Enter as Mr French</button>`:'';
 }
 if(!user)return `<a class="button primary" href="#join/${encodeURIComponent(c.id)}">Enter competition</a>`;
 return `${entryStatus}<button class="button ${entered?'secondary':'primary'}" data-${entered?'leave':'enter'}="${c.id}">${entered?'Withdraw':'Enter competition'}</button>`;
}
function competitionFacts(c){
 const pairCount=c.mode==='pairs'&&c.status==='drawn'?`· ${c.teams.length} ${c.teams.length===1?'pair':'pairs'}`:'';
 return cardFacts([
  ['Entrants',c.entries.length,pairCount],
  ['Match length',`Best of ${c.bestOf}`],
  c.format==='league'?['Points per win',c.winPoints]:['Final length',`Best of ${c.finalBestOf}`]
 ]);
}
function competitionCards(items){
 return `<div class="competition-grid">${items.map(c=>{
  const entry=competitionEntryButton(c);
  const admin=isAdmin()?`${c.status==='drawn'&&c.format!=='league'?'':`<button class="text-link" data-entries="${c.id}">Manage entries</button>`}<button class="text-link" data-edit-competition="${c.id}">Edit competition</button>`:'';
  return `<article class="panel competition-card">
   <div class="card-top"><span>${competitionLabel(c)}</span>${badge(competitionStatusLabel(c),c.status==='open'?'amber':'neutral')}</div>
   <h2><a class="card-target" href="#competition/${c.id}">${e(c.name)} ${icon('arrow',18)}</a></h2>
   <p>${c.mode==='pairs'?'Partners are drawn randomly from entrants.':c.format==='league'?'Play every other entrant once, in any order.':'Knockout draw with automatic byes.'}</p>
   ${competitionFacts(c)}
   ${c.mode==='pairs'&&c.status!=='drawn'&&c.entries.length%2?'<p class="entry-note">One more player needed for an even draw.</p>':''}
   ${entry||admin?`<div class="competition-card-actions">${entry}${admin?`<div class="competition-admin-links">${admin}</div>`:''}</div>`:''}
  </article>`;
 }).join('')}</div>`;
}
function competitions(){
 const all=state.competitions||[],mine=user?.id?all.filter(c=>c.entries.includes(user.id)):[],pupil=user?.role==='player';
 return `${heading('',pupil?'Your matches':'Competitions',pupil?'':'Choose which competitions you would like to enter.',isAdmin()?actionButton('Enter result','record','button primary')+actionButton(`${icon('plus',16)} New competition`,'newCompetition','button secondary'):'')}
 ${pupil?playerResultPanel():''}
 <section class="entry-welcome panel ${pupil?'player-welcome':''}"><div>${clubMark('entry-crest')}<div><h2>Welcome to the Wakefield Pool Championship</h2><p>${user?`Signed in as ${e(user.name)}.`:demo?'Sign in with your name and PIN to enter competitions.':'Sign up or sign in before choosing your competitions.'} Scores need Mr French’s approval.</p></div></div><div class="entry-welcome-actions"><a class="button ${pupil?'secondary':'primary'}" href="#join">${user?'Join competitions':demo?'Sign in':'Sign up or sign in'} ${icon('arrow',16)}</a>${actionButton('Share joining links','joiningLinks','button secondary')}</div></section>
 ${user?breakthroughHomeSummary():''}
 ${isAdmin()&&state.signupRequests?.length?`<a class="approval-alert" href="#players">${icon('user',18)} ${state.signupRequests.length} pupil sign-up request${state.signupRequests.length===1?'':'s'} awaiting review ${icon('arrow',18)}</a>`:''}
 ${isAdmin()&&pendingLeagueEntryCount()?`<a class="approval-alert" href="#approvals">${icon('players',18)} ${pendingLeagueEntryCount()} league entry request${pendingLeagueEntryCount()===1?'':'s'} awaiting approval ${icon('arrow',18)}</a>`:''}
 ${isAdmin()&&state.submissions.length?`<a class="approval-alert" href="#approvals">${icon('check',18)} ${state.submissions.length} result${state.submissions.length===1?'':'s'} awaiting approval ${icon('arrow',18)}</a>`:''}
 ${mine.some(c=>c.status==='drawn')?`<section class="panel my-competition-summary"><div class="panel-heading"><h2>Your competitions</h2></div>${mine.filter(c=>c.status==='drawn').map(c=>`<a class="my-competition-link" href="#competition/${c.id}"><span>${e(c.name)}</span><span>${competitionMatches(c).filter(m=>m.status==='open'&&isMatchParticipant(state,m,user.id)&&!state.submissions.some(x=>x.match===m.id)).length} matches available ${icon('arrow',16)}</span></a>`).join('')}</section>`:''}
 ${all.length?competitionCards(all):empty('No competitions yet','Mr French will open entries here.')}
 <p class="competition-help">Enter any open competition. You can withdraw until entries close. Late league entries need Mr French’s approval. Existing pairs stay together; knockout draws are fixed. League opponents can play in any order, at any time.</p>`;
}
function leaguesPage(){return `${heading('','Leagues','Play every other entrant once, in any order and at any time.',isAdmin()?actionButton('New league','newLeague','button primary'):'')}${competitionCards(state.competitions.filter(c=>c.format==='league'))}${state.league.length?`<details class="legacy-competition"><summary>Earlier division league</summary>${league()}</details>`:''}`;}
function tournamentsPage(){return `${heading('','Knockout tournaments','',isAdmin()?actionButton('New knockout','newKnockout','button primary'):'')}${competitionCards(state.competitions.filter(c=>c.format==='knockout'))}${state.cups.length?`<details class="legacy-competition"><summary>Earlier cups</summary>${cup()}</details>`:''}`;}
function competitionAdminControls(c){
 if(!isAdmin())return '';
 return `<div class="competition-admin" role="group" aria-label="Competition administration">
  <div class="competition-admin-links">
   <button class="text-link" data-edit-competition="${c.id}">Edit competition</button>
   ${c.status==='drawn'&&c.format!=='league'?'':`<button class="text-link" data-entries="${c.id}">Manage entries</button>`}
  </div>
  <div class="competition-admin-actions">
   ${c.status==='drawn'?`${c.format==='league'?`<button class="button secondary" data-add-league="${c.id}">${c.mode==='pairs'?'Add new pair':'Add player'}</button>`:''}<button class="button primary" data-admin-result="${c.id}">Enter result</button><button class="button secondary" data-withdraw-competition="${c.id}">Withdraw player</button>`:`
    <button class="button secondary" data-entry-status="${c.id}">${c.status==='open'?'Close entries':'Reopen entries'}</button>
    <button class="button primary" data-draw="${c.id}">${c.format==='league'?(c.mode==='pairs'?'Draw partners & start league':'Start league'):(c.mode==='pairs'?'Draw partners & matches':'Draw matches')}</button>`}
  </div>
 </div>`;
}
function competitionOverview(c){
 const league=c.format==='league',pairs=c.mode==='pairs';
 return `<section class="panel competition-overview" aria-label="Competition details">
  <div class="competition-overview-top">
   <div class="competition-entry-state">${badge(competitionStatusLabel(c),c.status==='open'?'amber':'neutral')}${competitionEntryButton(c)}</div>
   <div class="competition-join-action">
    ${user||c.status!=='open'?`<a class="text-link" href="#join/${c.id}">View your entries ${icon('arrow',16)}</a>`:''}
    <button class="text-link" data-joining-links="${c.id}">${icon('share',16)} Share joining link</button>
   </div>
  </div>
  ${competitionFacts(c)}
  <p>${league?'Play every other opponent once, in any order. There are no scheduled rounds.':'Winners advance. The draw assigns byes automatically.'} ${pairs?'Partners are drawn for this competition and stay together throughout. ':''}Play whenever both sides and the table are free.</p>
  <details class="competition-rules">
   <summary>Competition rules</summary>
   ${rulesContent(c.rules||state.settings.rules)}<a class="text-link" href="#rules">School pool rules ${icon('arrow',16)}</a>
   <p>All scores require Mr French’s approval.${c.consolation&&!league?' First-round losers enter a consolation cup.':''}</p>
  </details>
  ${competitionAdminControls(c)}
 </section>`;
}
function competitionDetail(){
 const c=state.competitions.find(c=>c.id===selectedCompetition);
 if(!c)return empty('Competition not found','Use the competition page to select an event.','<a class="button primary" href="#competitions">All competitions</a>');
 const matches=competitionMatches(c),completed=matches.filter(m=>m.status==='complete').length;
 return `<a class="text-link competition-back" href="#competitions">← All competitions</a>${heading(competitionLabel(c),e(c.name),'',`<button class="button secondary" data-share-competition="${c.id}">${icon('share',16)} Share competition</button>`)}
 ${competitionOverview(c)}
 ${c.status!=='drawn'?`<section class="panel competition-entry-list"><div class="panel-heading"><h2>Entrants</h2>${badge(`${c.entries.length} ${c.entries.length===1?'player':'players'}`,'neutral')}</div>${c.mode==='pairs'&&c.entries.length%2?'<p class="entry-note">One more player needed. Mr French can add a reserve before drawing.</p>':''}${c.entries.length?`<ul class="entrant-list">${c.entries.map(id=>`<li>${player(id,true)}</li>`).join('')}</ul>`:'<p class="panel-description">No entries yet.</p>'}${c.status==='open'&&!user?'<p class="panel-description">Sign in to enter this competition.</p>':''}</section>`:`
 ${c.withdrawals?.length?`<p class="entry-note">${c.withdrawals.map(w=>e(name(w.teamId))).join(', ')} withdrawn. Completed scores are retained; remaining matches are walkovers.</p>`:''}${competitionNext(c)}
 <div class="competition-progress"><span>${completed} approved result${completed===1?'':'s'}</span><span>${matches.filter(m=>m.status==='open').length} unplayed matches</span></div>
 <div class="view-tabs" aria-label="Competition view">${(c.format==='league'?[['standings','Standings'],['fixtures','Matches & results']]:[['fixtures','Matches & results'],['bracket','Bracket']]).concat(c.mode==='pairs'?[['pairs','Pairs']]:[]).map(([id,label])=>`<button data-competition-view="${id}" class="${competitionView===id?'selected':''}" aria-pressed="${competitionView===id}">${label}</button>`).join('')}</div>
 ${competitionView==='standings'&&c.format==='league'?`<section class="panel">${table(competitionStandings(state,c),false,c.bestOf===1).replace('<th scope="col">Player</th>',`<th scope="col">${c.mode==='pairs'?'Pair':'Player'}</th>`)}<p class="panel-description">${c.winPoints} points per win · 0 per loss. ${c.bestOf===1?'Equal points use head-to-head results once all matches between the tied players or pairs are approved. For three or more tied entrants, use wins in those matches. An = marks a shared position. After all league matches, a tie affecting the title or qualification needs a play-off arranged by Mr French.':'Ties use frame difference, then wins, then alphabetical order.'}</p></section>`:competitionView==='pairs'&&c.mode==='pairs'?`<section class="panel competition-pairs"><div class="panel-heading"><h2>Randomly drawn pairs</h2></div>${c.teams.map((t,i)=>`<div class="pair-row"><span>Pair ${i+1}</span><strong>${sidePlayerLinks(t.id)}</strong>${t.members.includes(user?.id)?badge('Your pair','amber'):''}</div>`).join('')}</section>`:competitionView==='bracket'&&c.format==='knockout'?`${competitionBracket(c)}${c.plate?`<h2 class="plate-heading">Consolation cup</h2>${competitionBracket(c.plate)}`:''}`:`<section class="panel"><div class="panel-heading"><h2>Matches & results</h2><label class="search-wrap">${icon('search',16)}<input class="search" id="competition-search" placeholder="Search a player…" aria-label="Search competition matches" value="${e(competitionFilter)}"></label></div><div class="fixture-toolbar"><label>Show<select id="competition-status" aria-label="Filter competition results">${[['all','All matches'],['available','Available'],['pending','Awaiting approval'],['played','Played']].map(([v,label])=>`<option value="${v}" ${v===competitionStatus?'selected':''}>${label}</option>`).join('')}</select></label>${user?.id?`<label class="checkbox"><input type="checkbox" id="competition-mine" ${competitionMine?'checked':''}> My matches only</label>`:''}</div><div id="competition-fixtures">${competitionFixtureList(c)}</div></section>`}`}`;
}
function competitionFixtureList(c){
 const matches=competitionMatches(c).filter(m=>['open','complete','void'].includes(m.status)&&(!competitionMine||!user?.id||isMatchParticipant(state,m,user.id))&&[name(m.a),name(m.b)].some(n=>n.toLowerCase().includes(competitionFilter.toLowerCase()))&&(competitionStatus==='all'||competitionStatus==='played'&&m.status==='complete'||competitionStatus==='pending'&&state.submissions.some(x=>x.match===m.id)||competitionStatus==='available'&&m.status==='open'&&!state.submissions.some(x=>x.match===m.id)));
 return matches.length?`${matches.slice(0,competitionLimit).map(matchRow).join('')}<div class="list-footer"><span>Showing ${Math.min(competitionLimit,matches.length)} of ${matches.length}</span>${matches.length>competitionLimit?'<button class="text-link" data-action="moreCompetitionFixtures">Show more</button>':''}</div>`:empty('No matches here',c.format==='league'?'Try another player or match status.':'Try another filter, or wait for the next round.');
}
function competitionNext(c){
 if(user?.role==='player')return c.entries.includes(user.id)?playerResultPanel(c.id):'';
 if(c.format==='league'){
  const selected=matchPlayerId(c.entries,competitionPlayer),team=c.teams.find(t=>t.members.includes(selected));
  return leagueOpponentPanel({scope:'competition',selected,entries:c.entries,matches:c.fixtures,side:team?.id||'',context:c.mode==='pairs'&&team?'Your pair: '+name(team.id):''});
 }

 const selected=matchPlayerId(c.entries,competitionPlayer),team=c.teams.find(t=>t.members.includes(selected)),matches=competitionMatches(c).filter(m=>isMatchParticipant(state,m,selected)),next=matches.find(m=>m.status==='open'&&!state.submissions.some(s=>s.match===m.id));
 const selector=user?.role==='player'?`<strong>${e(name(team?.id||selected))}</strong>`:`<label class="next-player-label">Player<select id="competition-player" aria-label="Choose player for next competition match"><option value="">Choose a player</option>${c.entries.map(id=>`<option value="${e(id)}" ${selected===id?'selected':''}>${e(name(id))}</option>`).join('')}</select></label>`;
 return `<section class="panel next-league-panel"><div class="panel-heading"><h2>Your next match</h2>${selector}</div><div class="next-league-body">${!team?'<p class="next-message">Choose an entrant to see their next match.</p>':next?`<div class="next-opponent"><div><span class="section-kicker">${c.mode==='pairs'?'YOUR PAIR · '+e(name(team.id)):'NEXT OPPONENT'}</span><h3>${e(name(next.a===team.id?next.b:next.a))}</h3><p>Best of ${next.bestOf}.</p></div>${!user||isAdmin()||isMatchParticipant(state,next,user.id)?`<button class="button primary" data-score="${next.id}">Submit result ${icon('arrow',16)}</button>`:''}</div>`:'<p class="next-message">No match available. Check pending results, the next round, or your completed fixtures below.</p>'}</div></section>`;
}
function competitionBracket(c){return `<section class="panel bracket-panel" aria-label="${e(c.name)} bracket"><div class="bracket">${c.rounds.map((round,r)=>`<div class="bracket-round"><h3>${roundName(c,r)}</h3><div class="round-matches">${round.map(m=>bracketMatch(m)).join('')}</div></div>`).join('')}</div></section>${c.rounds.at(-1)?.[0]?.winner?`<div class="winner-banner">${icon('trophy',32)}<span>Winner<strong>${sidePlayerLinks(c.rounds.at(-1)[0].winner)}</strong></span></div>`:''}`;}
function competitionForm(id='',format='league'){
 const c=state.competitions.find(c=>c.id===id)||{name:'',mode:'singles',format,bestOf:state.settings.frames,finalBestOf:state.settings.finalFrames,winPoints:state.settings.winPoints,rules:state.settings.rules,consolation:false};
 if(c.status==='drawn'){modal('Edit competition',`<form id="competition-form" data-id="${e(id)}"><label>Competition name<input name="name" value="${e(c.name)}" maxlength="70" required></label><label>Rules<textarea name="rules" maxlength="2000" rows="5">${e(c.rules)}</textarea></label><p class="form-hint">The draw has been made. You can edit its name and rules. ${c.format==='league'?'Use Manage entries to add late entrants. Existing partners, match lengths and scoring stay fixed.':'Entrants, partners, match lengths and scoring are fixed.'}</p><p class="error" id="form-error" role="alert"></p><button type="submit" class="button primary full">Save competition</button></form>`);return;}
 modal(id?'Edit competition':'New competition',`<form id="competition-form" data-id="${e(id)}"><label>Competition name<input name="name" value="${e(c.name)}" maxlength="70" required></label><div class="form-pair"><label>Players<select name="mode"><option value="singles" ${c.mode==='singles'?'selected':''}>Singles</option><option value="pairs" ${c.mode==='pairs'?'selected':''}>Random pairs</option></select></label><label>Format<select name="format"><option value="league" ${c.format==='league'?'selected':''}>Full league</option><option value="knockout" ${c.format==='knockout'?'selected':''}>Knockout</option></select></label></div><div class="form-pair"><label>Match length (best of)<input type="number" name="bestOf" min="1" max="99" step="2" value="${c.bestOf}" required></label><label>Knockout final (best of)<input type="number" name="finalBestOf" min="1" max="99" step="2" value="${c.finalBestOf}" required></label></div><label>League points per win<input type="number" name="winPoints" min="1" max="100" value="${c.winPoints}" required></label><label>Rules<textarea name="rules" maxlength="2000" rows="4">${e(c.rules)}</textarea></label><label class="checkbox"><input type="checkbox" name="consolation" ${c.consolation?'checked':''}> Consolation cup for first-round knockout losers</label><p class="form-hint">Entries open immediately for a new competition. Match lengths and scoring are fixed when you draw. Names and rules remain editable. All scores require your approval.</p><p class="error" id="form-error" role="alert"></p><button type="submit" class="button primary full">${id?'Save competition':'Create & open entries'}</button></form>`);
}
const hasPlayerAccount=p=>demo||p.hasAccount;
function manageEntries(id){
 if(!isAdmin()){toast('Administrator access required.');return;}
 const c=state.competitions.find(c=>c.id===id);if(!c){toast('Competition not found.');return;}
 if(c.status==='drawn'&&c.format!=='league'){toast('This draw is fixed. Create a new competition for new entries.');return;}
 const adminPlayer=administratorPlayer(state);
 const entrants=c.entries.map(id=>state.players.find(p=>p.id===id)).filter(p=>p&&(hasPlayerAccount(p)||p.id===adminPlayer?.id));
 const awaitingAccount=c.entries.length-entrants.length;
 modal('Manage entries',`<p class="form-hint">${e(c.name)} · ${entrants.length} entered.</p>
 ${c.format==='league'?`<button type="button" class="button primary" data-add-league="${e(c.id)}">${c.status==='drawn'&&c.mode==='pairs'?'Add new pair':'Add player'}</button>${leagueEntryRequestsPanel(c.id)}`:''}
 ${entrants.length?`<ul class="manage-entry-list">${entrants.map(p=>`<li><span>${e(p.name)}</span>${c.status==='drawn'?'':`<button class="button secondary" data-remove-entry="${e(p.id)}" data-from-competition="${e(c.id)}" aria-label="Remove ${e(p.name)}">Remove</button>`}</li>`).join('')}</ul>`:'<p>No players with accounts have entered this competition.</p>'}
 ${awaitingAccount?`<p class="form-hint">${awaitingAccount} saved ${awaitingAccount===1?'entry needs':'entries need'} a player account to appear here.</p>`:''}${c.status==='drawn'?'<p class="form-hint">Use Withdraw player for a player who is leaving. Completed scores are kept.</p>':''}`);
}
function leagueEntryRequestsPanel(id=''){
 if(!isAdmin())return '';
 const requests=state.competitions.filter(c=>c.format==='league'&&(!id||c.id===id)).flatMap(c=>(c.entryRequests||[]).map(r=>({c,r})));
 if(!requests.length)return '';
 return `<section class="panel signup-requests"><div class="panel-heading"><h2>League entry requests</h2>${badge(`${requests.length} pending`,'amber')}</div>${requests.map(({c,r})=>`<div class="signup-request-row"><div><strong>${e(name(r.playerId))}</strong><p>${e(c.name)}${c.mode==='pairs'&&c.status==='drawn'?' · Needs another new player to form a pair':''}</p></div><button type="button" class="button secondary" data-review-league-request="${e(r.id)}" data-league="${e(c.id)}" aria-label="Review league entry for ${e(name(r.playerId))}">Review</button></div>`).join('')}</section>`;
}
function addLeaguePlayersDialog(id){
 const c=state.competitions.find(c=>c.id===id);if(!isAdmin()||c?.format!=='league')return;
 const pairs=c.mode==='pairs'&&c.status==='drawn',available=state.players.filter(p=>(hasPlayerAccount(p)||p.id===administratorPlayer(state)?.id)&&!p.testAccount&&!c.entries.includes(p.id));
 const options=`<option value="">Choose a player</option>${available.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('')}`;
 modal(pairs?'Add new pair':'Add league player',`<form id="league-add-form" data-id="${e(id)}" data-revision="${revision}"><p>${e(c.name)}</p><p class="form-hint">Choose ${pairs?'two players who have':'a player who has'} agreed to join. ${c.status==='drawn'?`${pairs?'They will form a new fixed pair. ':''}One match against every existing ${pairs?'pair':'player'} will be added. Existing results are kept.`:'The player will be added to this entry list.'}</p><label>${pairs?'First player':'Player'}<select name="playerId" required>${options}</select></label>${pairs?`<label>Second player<select name="partnerId" required>${options}</select></label>`:''}${available.length<(pairs?2:1)?'<p class="form-hint">Not enough registered players are available. Approve a sign-up or issue an account PIN first.</p>':''}<p class="error" id="form-error" role="alert"></p><button type="submit" class="button primary full" ${available.length<(pairs?2:1)?'disabled':''}>${pairs?'Add pair':'Add player'}</button></form>`);
}
function reviewLeagueEntryDialog(id,requestId){
 const c=state.competitions.find(c=>c.id===id),r=c?.entryRequests?.find(r=>r.id===requestId);if(!isAdmin()||!r)return;
 const pairs=c.mode==='pairs'&&c.status==='drawn',others=c.entryRequests.filter(other=>other.id!==r.id);
 modal('Review league entry',`<form id="league-request-review-form" data-id="${e(id)}" data-request-id="${e(r.id)}" data-player-id="${e(r.playerId)}" data-revision="${revision}"><p><strong>${e(name(r.playerId))}</strong> has requested to join ${e(c.name)}.</p>${pairs?`<label>New partner<select name="partnerId" required><option value="">Choose another waiting player</option>${others.map(other=>`<option value="${e(other.playerId)}">${e(name(other.playerId))}</option>`).join('')}</select></label><p class="form-hint">Both requests will be approved together as a new fixed pair. Existing partners stay together.${others.length?'':' Another player must request entry before you can approve this pair. You can also use Add new pair with a consenting registered player.'}</p>`:''}<p class="form-hint">${c.status==='drawn'?'Approval adds one match against every existing opponent. Existing results are kept.':'Approval adds the player to the entry list.'}</p><p class="error" id="form-error" role="alert"></p><div class="joining-receipt-actions"><button type="submit" class="button primary" ${pairs&&!others.length?'disabled':''}>${pairs?'Approve both & add pair':'Approve entry'}</button><button type="button" class="button secondary" data-decline-league-request="${e(r.id)}" data-league="${e(id)}" data-player-id="${e(r.playerId)}" data-revision="${revision}">Decline request</button></div></form>`);
}
function confirmDraw(id){
 const c=state.competitions.find(c=>c.id===id),odd=c.mode==='pairs'&&c.entries.length%2,minimum=c.mode==='pairs'?4:2,sides=c.mode==='pairs'?c.entries.length/2:c.entries.length;
 const reserves=odd?state.players.filter(p=>hasPlayerAccount(p)&&!c.entries.includes(p.id)):[];
 modal(c.format==='league'?'Start league':'Draw competition',`<p>${e(c.name)} · ${c.entries.length} entrants.</p>
 <p class="form-hint">${c.mode==='pairs'?'Partners will be randomly assigned from this entry list. ':''}${c.format==='league'?'Starting closes normal entries. Mr French can approve late entrants; existing partners and match settings stay fixed.':'Drawing closes entries and fixes the entrants, partners and match lengths. Further entrants wait for the next competition.'}</p>
 ${odd?`<p class="error">One more player needed. ${reserves.length?'Add a reserve or reopen entries before drawing.':'Keep entries open until another player enters.'}</p>`:c.entries.length<minimum?`<p class="error">At least ${minimum} players must enter.</p>`:`<p class="form-hint">${c.format==='league'?`${sides*(sides-1)/2} matches to complete. Choose any remaining opponent at any time; each opponent is played once.`:`${sides} ${c.mode==='pairs'?'pairs':'players'} in the knockout draw.`}</p>`}
 <button class="button primary full" data-confirm-draw="${e(c.id)}" ${odd||c.entries.length<minimum?'disabled':''}>${c.format==='league'?'Start league & close entries':'Draw & close entries'}</button>
 ${reserves.length?`<form id="reserve-form" data-id="${e(c.id)}" class="spaced">
 <p class="form-hint">Choose a player who has agreed to enter this competition as a reserve.</p>
 <label>Reserve<select name="playerId" required><option value="">Choose a player</option>${reserves.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('')}</select></label>
 <p class="error" id="form-error" role="alert"></p>
 <button type="submit" class="button secondary full">Add reserve</button></form>`:''}`);
}
// Joining links contain competition IDs only. They never sign a pupil in or
// include a player name, PIN, session or administrator credential.
const joiningTitle=c=>({'Full league':'Singles league','Singles knockout':'Singles cup','Pairs league':'Doubles league','Pairs knockout':'Doubles cup'}[c.name]||c.name);
const joiningFormat=c=>`${c.mode==='pairs'?'Doubles':'Singles'} ${c.format==='league'?'league':'cup'}`;
const selectedJoining=()=>state.competitions.filter(c=>joinSelection.has(c.id)&&c.status==='open'&&!c.entries.includes(user?.id));
function signupRequestsPanel(){
 const requests=state.signupRequests||[];
 return `<section class="panel signup-requests"><div class="panel-heading"><h2>Pupil sign-up requests</h2>${badge(`${requests.length} pending`,requests.length?'amber':'neutral')}</div>${requests.length?requests.map(request=>`<div class="signup-request-row"><strong>${e(request.name)}</strong><button class="button secondary" data-review-signup="${e(request.id)}" aria-label="Review sign-up for ${e(request.name)}">Review</button></div>`).join(''):'<p class="panel-description">No requests awaiting review.</p>'}</section>`;
}
function removeTestAccountDialog(id){
 const player=state.players.find(p=>p.id===id&&p.testAccount===true);
 if(!isAdmin()||!player)return;
 const entries=state.competitions.filter(c=>c.entries.includes(id));
 modal('Remove test account',`<p>Remove <strong>${e(player.name)}</strong> from the roster${entries.length?' and these competitions':''}.</p>${entries.length?`<ul class="joining-summary-list">${entries.map(c=>`<li>${e(joiningTitle(c))}</li>`).join('')}</ul>`:''}<p id="form-error" class="error" role="alert"></p><div class="joining-receipt-actions"><button class="button primary" data-confirm-remove-test="${e(id)}" data-signup-revision="${revision}">Remove test account</button>${actionButton('Cancel','close','button secondary')}</div>`);
}
function reviewSignupDialog(id){
 if(!isAdmin())return;
 const request=state.signupRequests?.find(r=>r.id===id);
 if(!request)return;
 const competitions=request.ids.map(id=>state.competitions.find(c=>c.id===id));
 const openCount=competitions.filter(c=>c?.status==='open').length;
 const approveLabel=openCount===competitions.length?'Approve sign-up':openCount?'Approve player and open entries':'Approve player only';
 modal('Review pupil sign-up',`<h3>${e(request.name)}</h3>${competitions.length?`<ul class="joining-summary-list">${competitions.map(c=>`<li>${e(c?joiningTitle(c):'Competition unavailable')}${c?.status==='open'?'':' · Closed to entries'}</li>`).join('')}</ul><p class="form-hint">The pupil will also be entered in the competitions shown as open.</p>`:''}<p class="form-hint">${request.playerId?'Confirm this request with the pupil before activating their roster account.':'Approval creates the pupil’s account.'} They can then sign in with the PIN they chose.</p>${request.playerId?'':'<label class="checkbox"><input id="signup-test-account" type="checkbox"> Mark as my test account</label>'}<p id="form-error" class="error" role="alert"></p><div class="joining-receipt-actions"><button class="button primary" data-signup-decision="approve" data-signup-id="${e(id)}" data-signup-revision="${revision}">${approveLabel}</button><button class="button secondary" data-signup-decision="decline" data-signup-id="${e(id)}" data-signup-revision="${revision}">Decline request</button></div>`);
}
function signupPage(){
 const signIn=actionButton(icon('chevron',15)+' Back to sign in','signupLogin','text-link welcome-back');
 if(signupReceipt)return `<div class="welcome-receipt" role="status">${icon('check',28)}<h2>Sign-up request sent</h2><p><strong>${e(signupReceipt)}</strong></p><p>Once Mr French approves your account, use your PIN to sign in and choose competitions.</p></div>${signIn}`;
 if(demo)return `${heading('','Player sign in','')}<section class="panel joining-receipt">${clubMark('entry-crest')}<p>Use demo PIN 1234 to sign in as a sample player.</p>${signIn}</section>`;
 return `${signIn}<h2>Request an account</h2><p class="form-hint">Mr French must approve your account before you can sign in and choose competitions.</p><form id="signup-form"><label>Your name on the roster<select name="rosterChoice" id="signup-roster" required><option value="" disabled selected>Choose your name</option>${state.players.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('')}<option value="new">My name is not listed</option></select></label><fieldset id="signup-new-name" hidden disabled><div class="form-pair"><label>First name<input name="firstName" maxlength="40" autocomplete="given-name" required></label><label>Surname initial<input name="initial" maxlength="2" autocapitalize="characters" required></label></div></fieldset><label>Choose a six-digit PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required></label><label>Confirm your PIN<input name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required></label><p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">Send sign-up request</button></form>`;
}
async function submitSignup(data){
 if(busy||user||demo)return;
 if(data.pin!==data.confirmPin)throw Error('The PINs do not match.');
 const identity=data.rosterChoice==='new'?{firstName:data.firstName,initial:data.initial}:{playerId:data.rosterChoice};
 busy=true;
 try{
  const r=await api('signup',{...identity,pin:data.pin});
  signupReceipt=r.name;
  render();$('#main-content')?.focus();
 }finally{busy=false;}
}
function joiningSummary(){
 const selected=selectedJoining();
 return `<h2>Your selection</h2>${selected.length?`<ul class="joining-summary-list">${selected.map(c=>`<li>${icon('check',17)}<span>${e(joiningTitle(c))}</span></li>`).join('')}</ul>`:'<p>Select the competitions you want to enter.</p>'}<p class="joining-count" role="status" aria-live="polite">${selected.length} competition${selected.length===1?'':'s'} selected</p><p>Entries will be saved for <strong>${e(user.name)}</strong>.</p><button class="button primary full" type="submit" ${selected.length?'':'disabled'}>Confirm entries ${icon('check',17)}</button><p id="joining-error" class="error" role="alert"></p>`;
}
function updateJoiningSummary(){const summary=$('#joining-summary');if(summary)summary.innerHTML=joiningSummary();}
function joiningPage(){
 if(!user)return signupPage();
 if(isAdmin()){
  const target=state.competitions.find(c=>c.id===joinTarget);
  const events=target?[target]:state.competitions;
  const message=administratorPlayer(state)?'Enter open competitions using your administrator account.':'The Mr French player record could not be identified.';
  return `${heading('','Choose competitions',message,actionButton(`${icon('share',16)} Share joining links`,'joiningLinks','button secondary'))}
  ${target?'<a class="text-link competition-back" href="#join">← All competitions</a>':''}
  ${events.length?competitionCards(events):empty('No competitions yet','Create a competition to open entries.')}`;
 }
 const mine=user?.role==='player'?state.competitions.filter(c=>c.entries.includes(user.id)):[];
 if(joinReceipt&&user?.role==='player'){
  const confirmed=state.competitions.filter(c=>joinReceipt.includes(c.id)&&c.entries.includes(user.id));
  return `${heading('','Your entries are confirmed','')}<section class="panel joining-receipt"><span class="joining-receipt-icon">${icon('check',28)}</span><h2>${e(user.name)}</h2><p>You are entered in ${confirmed.length} competition${confirmed.length===1?'':'s'}.</p><ul class="joining-receipt-list">${confirmed.map(c=>`<li><div><strong>${e(joiningTitle(c))}</strong><small>${c.mode==='pairs'?'Your partner will be drawn for this competition.':'Your matches will appear after the draw.'}</small></div><a class="text-link" href="#competition/${e(c.id)}">View ${icon('arrow',16)}</a></li>`).join('')}</ul><p>You can withdraw on the competition page until entries close. Mr French approves all results.</p><div class="joining-receipt-actions">${actionButton('Enter another competition','editJoining','button secondary')}<a class="button primary" href="#competitions">View competitions ${icon('arrow',16)}</a></div></section>`;
 }
 const missing=joinTarget&&!state.competitions.some(c=>c.id===joinTarget);
 return `${heading('','Choose competitions','',actionButton(`${icon('share',16)} Share joining links`,'joiningLinks','button secondary'))}
 <section class="panel joining-identity">${clubMark('entry-crest')}<div><p>Signed in as <strong>${e(user.name)}</strong>. You can only enter yourself.</p></div></section>
 ${missing?'<p class="entry-note" role="alert">This joining link does not match a competition. Choose from the current competitions below.</p>':''}
 <form id="joining-form" class="joining-layout"><fieldset class="joining-choices"><legend class="sr-only">Select competitions to enter</legend>${state.competitions.map(c=>{
  const entered=c.entries.includes(user?.id),available=c.status==='open'&&!entered,selected=available&&joinSelection.has(c.id);
  return `<div class="panel joining-choice ${selected?'is-selected':''}"><label class="joining-choice-label"><input type="checkbox" name="competitions" value="${e(c.id)}" data-join-pick ${selected||entered?'checked':''} ${available?'':'disabled'} aria-labelledby="joining-title-${e(c.id)}" aria-describedby="joining-note-${e(c.id)}"><span class="joining-choice-content"><span class="card-top"><span>${joiningFormat(c)}</span>${badge(entered?'You are entered':competitionStatusLabel(c),entered||c.status==='open'?'amber':'neutral')}</span><strong id="joining-title-${e(c.id)}">${e(joiningTitle(c))}</strong><span id="joining-note-${e(c.id)}">${c.mode==='pairs'?'Enter on your own. Partners are drawn randomly for this competition.':c.format==='league'?'Play every other entrant once.':'Play in a knockout cup.'}</span><span class="joining-choice-meta"><span>${c.entries.length} entered</span><span>Best of ${c.bestOf}</span>${c.format==='knockout'?`<span>Final best of ${c.finalBestOf}</span>`:''}</span></span></label><div class="joining-choice-links">${leagueRequestButton(c)}<a class="text-link" href="#competition/${e(c.id)}">Rules & details ${icon('arrow',15)}</a><button class="text-link" type="button" data-joining-links="${e(c.id)}" aria-label="Share joining link for ${e(joiningTitle(c))}">${icon('share',15)} Share joining link</button></div></div>`;
 }).join('')||empty('No competitions yet','Mr French will open entries here.')}<p class="competition-help">Enter only yourself. Doubles partners are drawn separately for each competition and stay fixed. Entries close when Mr French closes them; late league entries need Mr French’s approval. Knockout draws are fixed.</p></fieldset><aside class="panel joining-summary" id="joining-summary" aria-label="Review your entries">${joiningSummary()}</aside></form>
 ${mine.length?`<section class="panel joining-existing"><h2>Your existing entries</h2>${mine.map(c=>`<a class="my-competition-link" href="#competition/${e(c.id)}"><span>${e(joiningTitle(c))}</span><span>${competitionStatusLabel(c)} ${icon('arrow',16)}</span></a>`).join('')}</section>`:''}`;
}
async function submitJoiningEntries(){
 if(!user||isAdmin())return;
 const ids=selectedJoining().map(c=>c.id);
 if(!ids.length){const field=$('#joining-error');if(field)field.textContent='Choose at least one open competition.';return;}
 await mutate('enterCompetitions',{ids});
}
function joiningLink(id=''){return location.href.split('#')[0].split('?')[0]+(id?'#join/'+encodeURIComponent(id):'#join');}
function joiningMessage(id=''){
 const c=state.competitions.find(c=>c.id===id);
 return `Wakefield Pool Championship${c?' — '+joiningTitle(c):''}\n${joiningLink(id)}\nSign up or sign in with your name and PIN, then choose your competitions.`;
}
function joiningLinks(id=''){
 if(location.protocol==='file:'){toast('Use the published championship to share joining links.');return;}
 if(id&&!state.competitions.some(c=>c.id===id))id='';
 const c=state.competitions.find(c=>c.id===id),link=joiningLink(id),message=joiningMessage(id);
 modal('Share joining links',`<p class="form-hint">Share the general link, or choose one competition to preselect it. Pupils still confirm their own entries.</p><label>Joining page<select id="joining-link-target"><option value="" ${id?'':'selected'}>All competitions</option>${state.competitions.map(c=>`<option value="${e(c.id)}" ${c.id===id?'selected':''}>${e(joiningTitle(c))} · ${competitionStatusLabel(c)}</option>`).join('')}</select></label>${c&&c.status!=='open'?`<p class="entry-note">${c.format==='league'?'Players can request to join with Mr French’s approval.':'This competition is closed to new entries. Its link still shows its current status.'}</p>`:''}<label>Joining link<input id="joining-link" value="${e(link)}" readonly></label><div class="joining-share-actions"><button class="button primary" data-copy-joining="${e(id)}">Copy link</button>${typeof navigator.share==='function'?`<button class="button secondary" data-native-joining="${e(id)}">${icon('share',16)} Share…</button>`:''}<a class="button secondary" href="https://wa.me/?text=${encodeURIComponent(message)}" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="button secondary" href="mailto:?subject=${encodeURIComponent('Wakefield Pool Championship'+(c?' — '+joiningTitle(c):''))}&body=${encodeURIComponent(message)}">Email</a></div><label>Message to send<textarea rows="5" readonly>${e(message)}</textarea></label><p class="form-hint">Links contain no PINs and do not grant administrator access. Give each pupil their PIN separately.</p>`);
}
async function copyJoiningLink(id){try{await navigator.clipboard.writeText(joiningLink(id));toast('Joining link copied.');}catch{const input=$('#joining-link');input?.focus();input?.select();toast('Copy the selected joining link.');}}
async function nativeShareJoining(id){try{await navigator.share({title:'Wakefield Pool Championship',text:joiningMessage(id),url:joiningLink(id)});}catch(error){if(error.name!=='AbortError')await copyJoiningLink(id);}}
async function shareCompetition(id){const link=location.href.split('#')[0]+(id?'#competition/'+id:'#competitions');if(location.protocol==='file:'){toast('Use the published club to share competition links.');return;}try{await navigator.clipboard.writeText(link);toast(id?'Competition link copied.':'Competition page link copied.');}catch{modal('Share competition',`<label>Copy this link<input id="share-url" readonly value="${e(link)}"></label>`);$('#share-url').select();}}
function preselectJoiningTarget(){if(user?.role==='player'&&state.competitions.some(c=>c.id===joinTarget&&c.status==='open'&&!c.entries.includes(user.id)))joinSelection.add(joinTarget);}
function route(){const hash=location.hash.slice(1);if(hash==='breakthroughs'||hash.startsWith('breakthroughs/')){page='breakthroughs';breakthroughPlayer=hash.split('/')[1]||'';}else if(hash==='join'||hash.startsWith('join/')){page='join';let target=hash==='join'?'':hash.slice(5);try{target=decodeURIComponent(target);}catch{}if(target!==joinTarget){joinSelection.clear();joinTarget=target;joinReceipt=null;}preselectJoiningTarget();}else if(hash.startsWith('competition/')){selectedCompetition=hash.slice(12);page='competition';}else page=['alerts','rules','competitions','overview','league','cup','players','approvals','settings'].includes(hash)?hash:'competitions';competitionView=state?.competitions.find(c=>c.id===selectedCompetition)?.format==='league'?'standings':'fixtures';competitionPlayer='';competitionLimit=30;competitionFilter='';competitionStatus=state?.competitions.find(c=>c.id===selectedCompetition)?.format==='league'?'available':'all';competitionMine=!!user?.id;}
Object.assign(actions,{newCup:()=>competitionForm('','knockout'),generateLeague:()=>competitionForm('','league'),newCompetition:()=>competitionForm(),newLeague:()=>competitionForm('','league'),newKnockout:()=>competitionForm('','knockout'),moreCompetitionFixtures:()=>{competitionLimit+=30;$('#competition-fixtures').innerHTML=competitionFixtureList(state.competitions.find(c=>c.id===selectedCompetition));}});
document.addEventListener('click',async event=>{const b=event.target.closest('button');if(!b)return;try{
 if(b.dataset.enter&&user)await mutate('enterCompetition',{id:b.dataset.enter});
 else if(b.dataset.requestLeague)await mutate('requestLeagueEntry',{id:b.dataset.requestLeague});
 else if(b.dataset.cancelLeagueRequest)await mutate('cancelLeagueEntryRequest',{id:b.dataset.cancelLeagueRequest});
 else if(b.dataset.addLeague)addLeaguePlayersDialog(b.dataset.addLeague);
 else if(b.dataset.reviewLeagueRequest)reviewLeagueEntryDialog(b.dataset.league,b.dataset.reviewLeagueRequest);
 else if(b.dataset.declineLeagueRequest)await mutate('reviewLeagueEntryRequest',{id:b.dataset.league,requestId:b.dataset.declineLeagueRequest,playerId:b.dataset.playerId,decision:'decline'},Number(b.dataset.revision));
 else if(b.dataset.leave)await mutate('leaveCompetition',{id:b.dataset.leave});
 else if(b.dataset.entries)manageEntries(b.dataset.entries);
 else if(b.dataset.editCompetition)competitionForm(b.dataset.editCompetition);
 else if(b.dataset.entryStatus){const c=state.competitions.find(c=>c.id===b.dataset.entryStatus);await mutate(c.status==='open'?'closeEntries':'reopenEntries',{id:c.id});}
 else if(b.dataset.draw)confirmDraw(b.dataset.draw);
 else if(b.dataset.confirmDraw)await mutate('drawCompetition',{id:b.dataset.confirmDraw});
 else if(b.dataset.removeEntry)await mutate('leaveCompetition',{id:b.dataset.fromCompetition,playerId:b.dataset.removeEntry});
 else if(b.dataset.competitionView){competitionView=b.dataset.competitionView;render();}
 else if(b.dataset.shareCompetition)await shareCompetition(b.dataset.shareCompetition);
 else if(b.dataset.joiningLinks)joiningLinks(b.dataset.joiningLinks);
 else if(b.dataset.copyJoining!==undefined)await copyJoiningLink(b.dataset.copyJoining);
 else if(b.dataset.nativeJoining!==undefined)await nativeShareJoining(b.dataset.nativeJoining);
 }catch(error){toast(error.message);}});
document.addEventListener('input',event=>{if(event.target.id==='competition-search'){competitionFilter=event.target.value;competitionLimit=30;$('#competition-fixtures').innerHTML=competitionFixtureList(state.competitions.find(c=>c.id===selectedCompetition));}});
document.addEventListener('change',event=>{
 if(event.target.id==='signup-roster'){
  const names=$('#signup-new-name');
  names.hidden=names.disabled=event.target.value!=='new';
 }
 if(event.target.matches?.('[data-join-pick]')){const id=event.target.value;if(event.target.checked)joinSelection.add(id);else joinSelection.delete(id);updateJoiningSummary();}
 if(event.target.id==='joining-link-target')joiningLinks(event.target.value);
 if(event.target.id==='competition-player'){competitionPlayer=event.target.value;render();$('#competition-player')?.focus({preventScroll:true});}
 if(['competition-status','competition-mine'].includes(event.target.id)){competitionStatus=$('#competition-status').value;competitionMine=$('#competition-mine')?.checked||false;competitionLimit=30;$('#competition-fixtures').innerHTML=competitionFixtureList(state.competitions.find(c=>c.id===selectedCompetition));}
});

let syncBusy=false,syncPending=false,syncFailed=false,syncStarted=false,pendingRecovery=null;
function syncText(){return demo?'':syncFailed?'Connection lost · retrying':syncPending?'Updates waiting · close your form or save changes':'Updates every 15 seconds';}
function updateSyncStatus(){const el=$('#sync-status');if(el)el.textContent=syncText();}
function editingClub(){return page==='join'&&joinSelection.size>0||!!$('#modal-root')?.innerHTML||!!$('#settings-form[data-dirty="true"]')||!!$('#signup-form[data-dirty="true"]')||!!$('#login-form[data-dirty="true"]')||!!$('#league-opponent')?.value||!!document.activeElement?.matches?.('input,select,textarea');}
async function syncClub(){
 if(demo||syncBusy||busy||document.hidden)return;
 syncBusy=true;const identity=JSON.stringify(user);
 try{const r=await api('revision');syncFailed=false;if(user&&!r.user&&identity===JSON.stringify(user))resetWelcomeSession();if(r.revision!==revision||JSON.stringify(r.user)!==JSON.stringify(user)){if(editingClub()){syncPending=true;}else await refresh(true);}updateSyncStatus();}
 catch{syncFailed=true;updateSyncStatus();}finally{syncBusy=false;}
}
function startSync(){if(syncStarted)return;syncStarted=true;const tick=async()=>{await syncClub();setTimeout(tick,15000);};setTimeout(tick,15000);}
window.addEventListener('focus',()=>{if(state&&!demo)syncClub();});
document.addEventListener('visibilitychange',()=>{if(state&&!demo&&!document.hidden)syncClub();});
function correctResultDialog(id){
 if(!isAdmin())throw Error('Administrator access required.');
 const m=findMatch(state,id);if(!m||m.status!=='complete'||m.walkover)throw Error('Choose an approved played result.');
 modal('Correct approved result',`<p>${e(name(m.a))} versus ${e(name(m.b))} · currently ${m.score.join('–')}.</p><p class="form-hint">Changing the winner or reopening a knockout match clears dependent results and updates affected consolation ties. Unrelated results stay in place. A recovery snapshot is saved first.</p><form id="correction-form" data-match="${m.id}"><label>Action<select name="resolution"><option value="score">Save corrected score</option><option value="reopen">Return match to unplayed</option></select></label><div class="score-entry"><label>${e(name(m.a))}<input type="number" name="a" min="0" max="${Math.ceil(m.bestOf/2)}" value="${m.score[0]}" required></label><span>–</span><label>${e(name(m.b))}<input type="number" name="b" min="0" max="${Math.ceil(m.bestOf/2)}" value="${m.score[1]}" required></label></div><label>Reason<textarea name="reason" maxlength="300" rows="3" required></textarea></label><label class="checkbox"><input type="checkbox" required> I have checked this correction and its effect on later rounds.</label><p class="error" id="form-error" role="alert"></p><button class="button primary full" type="submit">Save correction</button></form>`);
}
function withdrawalDialog(playerId='',competitionId=''){
 if(!isAdmin())throw Error('Administrator access required.');
 const events=state.competitions.filter(c=>c.status==='drawn'&&(!playerId||c.teams.some(t=>!t.withdrawn&&t.members.includes(playerId)))).map(c=>({id:c.id,name:c.name,players:c.teams.filter(t=>!t.withdrawn).flatMap(t=>t.members),pairs:c.mode==='pairs'}));
 if(state.league.length&&(!playerId||state.league.some(m=>[m.a,m.b].includes(playerId)))&&!state.leagueWithdrawals?.includes(playerId))events.push({id:'legacy-league',name:'Earlier division league',players:state.players.filter(p=>!state.leagueWithdrawals?.includes(p.id)).map(p=>p.id)});
 for(const c of state.cups)if(!playerId||c.rounds[0].some(m=>[m.a,m.b].includes(playerId)))events.push({id:c.id,name:c.name,players:[...new Set(c.rounds[0].flatMap(m=>[m.a,m.b]).filter(id=>id&&!c.withdrawnSides?.includes(id)))]});
 const event=events.find(c=>c.id===competitionId)||events[0];
 if(!event){modal('Withdraw player','<p>No drawn competition is available for this player. Before drawing, use Manage entries to remove an entry.</p>');return;}
 modal('Withdraw from competition',`<form id="withdrawal-form"><label>Competition<select id="withdraw-competition" name="competitionId">${events.map(c=>`<option value="${c.id}" ${c.id===event.id?'selected':''}>${e(c.name)}</option>`).join('')}</select></label><label>Player<select id="withdraw-player" name="playerId">${event.players.map(id=>`<option value="${id}" ${id===playerId?'selected':''}>${e(name(id))}</option>`).join('')}</select></label><p class="form-hint">${event.pairs?'Withdrawing either partner withdraws the whole fixed pair in this competition. Partners will not be redrawn. ':''}Completed scores are kept. Remaining matches are awarded to opponents as walkovers; pending scores for those matches are removed. Other competitions and player PINs stay in place. Restore the preceding recovery snapshot to undo a withdrawal.</p><label>Reason<textarea name="reason" maxlength="300" rows="3" required></textarea></label><label class="checkbox"><input type="checkbox" required> I have checked the player and competition.</label><p class="error" id="form-error" role="alert"></p><button class="button primary full" type="submit">Confirm withdrawal</button></form>`);
}
const snapshotReason=reason=>({requestLeagueEntry:'requesting league entry',cancelLeagueEntryRequest:'cancelling league entry request',reviewLeagueEntryRequest:'reviewing league entry request',addLeaguePlayers:'adding league players',correctResult:'result correction',withdrawPlayer:'player withdrawal',approve:'result approval',submit:'result submission',reject:'returning a result',recoverAccount:'pupil account recovery',pins:'PIN generation',settings:'settings change',player:'player update',addPlayers:'adding players',removeTestAccount:'removing a test account',enterCompetitions:'competition entries',enterCompetition:'competition entry',leaveCompetition:'entry withdrawal',addReserve:'entering a reserve',createCompetition:'competition creation',editCompetition:'competition update',closeEntries:'closing entries',reopenEntries:'reopening entries',drawCompetition:'competition draw',league:'league draw',cup:'cup draw',promote:'starting a season','Before restore':'restoring the club','Before roster import':'roster import'}[reason]||'club update');
function recoverySettings(){
 const log=state.auditLog||[];
 return `<section class="panel settings-card"><h2>Backup and recovery</h2><p>The last 50 changes have automatic encrypted recovery snapshots. Download a separate encrypted backup regularly and keep its passphrase separately. Snapshots on this site depend on its server session secret.</p><div class="recovery-actions">${actionButton('Download encrypted backup','downloadBackup','button secondary',demo?'disabled':'')}${actionButton('Restore backup','restoreBackup','button secondary',demo?'disabled':'')}${actionButton('Check setup','checkSetup','button secondary',demo?'disabled':'')}</div>${demo?'<p class="form-hint">Recovery tools are available in the shared club after administrator sign-in.</p>':''}</section><section class="panel settings-card"><h2>Administrator history</h2>${log.length?`<ol class="audit-list">${log.slice(0,30).map(item=>`<li><strong>${e({correctResult:'Result corrected',withdrawPlayer:'Player withdrawn',recoverAccount:'Pupil account recovered',restore:'Club restored'}[item.action]||item.action)}</strong><p>${e(item.reason)}${item.action==='recoverAccount'?' · '+e(item.playerName):''}</p>${item.action==='correctResult'?`<p>${e(name(item.before.a))} versus ${e(name(item.before.b))}: ${e(item.before.score?.join('–')||'Unplayed')} → ${e(item.after.score?.join('–')||'Unplayed')} · ${item.affectedMatches.length} affected match${item.affectedMatches.length===1?'':'es'}</p>`:''}<small>${e(item.actor)} · ${e(new Date(item.at).toLocaleString('en-GB'))}</small></li>`).join('')}</ol>`:'<p>No administrator operations recorded.</p>'}</section>`;
}
function downloadJson(value,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(value)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadBackupDialog(){modal('Download encrypted backup',`<p class="form-hint">Includes players, PIN hashes, entries, draws, results and administrator history. Choose a passphrase and keep it separately. The file can be restored even after a server secret changes.</p><form id="backup-form"><label>Backup passphrase<input name="passphrase" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></label><label>Repeat passphrase<input name="confirmPassphrase" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></label><p class="error" id="form-error" role="alert"></p><button class="button primary full" type="submit">Download backup</button></form>`);}
async function restoreBackupDialog(){
 const r=await api('backups');
 modal('Restore backup',`<p class="form-hint">Preview a recovery snapshot or upload an encrypted backup. Restoring replaces the current club and signs players out. A safety snapshot is saved first.</p><form id="restore-file-form"><label>Backup file<input type="file" name="backupFile" accept=".json,application/json" required></label><label>File passphrase<input name="passphrase" type="password" minlength="12" maxlength="256" autocomplete="off" required></label><p class="error" id="form-error" role="alert"></p><button class="button primary full" type="submit">Preview uploaded backup</button></form><h3>Automatic recovery snapshots</h3>${r.backups.length?`<ul class="snapshot-list">${r.backups.map(b=>`<li><span>${e(new Date(b.created_at).toLocaleString('en-GB'))}<small>Before ${e(snapshotReason(b.reason))} · revision ${b.revision}</small></span><button class="button secondary" data-preview-snapshot="${b.id}">Preview</button></li>`).join('')}</ul>`:'<p>No snapshots yet. The first will be saved before the next change.</p>'}`);
}
async function previewRecovery(input){
 const r=await api('restore-preview',input);pendingRecovery={...input,revision:r.revision};
 const labels={players:'Players',playersWithPins:'Players with PINs',competitions:'Competitions',matches:'Matches',approvedResults:'Approved results',pendingResults:'Pending results'};
 modal('Confirm club recovery',`<div class="table-scroll"><table><thead><tr><th>Records</th><th>Current</th><th>Backup</th></tr></thead><tbody>${Object.entries(labels).map(([k,v])=>`<tr><th>${v}</th><td>${r.current[k]}</td><td>${r.summary[k]}</td></tr>`).join('')}</tbody></table></div><p class="form-hint">This replaces the current club. Players must sign in again. A snapshot of the current state is saved first, so this restore can be undone.</p><form id="restore-confirm-form"><label>Type RESTORE to confirm<input name="confirmation" pattern="RESTORE" autocomplete="off" required></label><p class="error" id="form-error" role="alert"></p><button class="button primary full" type="submit">Restore club</button></form>`);
}
async function checkSetup(){
 const r=await api('health'),s=r.summary;
 if(!s)throw Error('Sign in with Mr French’s ChatGPT account to check setup.');
 modal('Club setup check',`<ul class="setup-check-list"><li>Shared database: connected</li><li>Administrator identity: verified</li><li>Registered players: ${s.players}</li><li>Players with PINs: ${s.playersWithPins} of ${s.players}</li><li>Competitions: ${s.competitions}</li><li>Approved results: ${s.approvedResults}</li><li>Pending approvals: ${s.pendingResults}</li><li>Recovery snapshots: ${r.recoverySnapshots}</li><li>Automatic updates: every 15 seconds while the page is visible</li></ul><p class="form-hint">Before first use, check the roster, issue each player their own PIN, and test sign-in and an agreed result on two devices. Existing PINs and competitions are not changed by this check.</p>`);
}
Object.assign(actions,{downloadBackup:downloadBackupDialog,restoreBackup:restoreBackupDialog,checkSetup});

// Breakthroughs: public collections, private inboxes and bounded celebrations.
let breakthroughPlayer='',breakthroughFilter='all',alertFilter='all',btScheduled=false,btAcknowledging=false;
let celebrationTimer=null,celebrationQueue=[],celebrationIdentity='';
const personalPlayerId=()=>isAdmin()?administratorPlayer(state)?.id:user?.id;
const alertRead=(event,receipt)=>event.seq<=receipt.readThrough||(receipt.read||[]).includes(event.seq);
function alertsBell(){
 const events=breakthroughAlerts(state,user),receipt=breakthroughReceipt(state,user),unread=events.filter(event=>!alertRead(event,receipt)).length;
 return '<a class="icon-button alerts-bell" href="#alerts" aria-label="Your alerts'+(unread?', '+unread+' unread':'')+'">'+icon('bell')+(unread?'<b class="alerts-count">'+(unread>99?'99+':unread)+'</b>':'')+'</a>';
}
function btMeter(value,max,label){return '<progress max="'+max+'" value="'+value+'" aria-label="'+e(label)+'"></progress>';}
function breakthroughHomeSummary(){
 const id=personalPlayerId(),progress=id&&breakthroughProgress(state,id);if(!progress)return '';
 return '<section class="panel breakthrough-home"><a href="#breakthroughs" class="breakthrough-home-identity"><span class="bt-level-icon">'+icon('trophy',24)+'</span><span><strong>Breakthroughs</strong><small>Level '+progress.level+' · '+e(progress.title)+' · '+progress.points+' achievement points</small></span>'+icon('arrow',18)+'</a><div class="bt-home-streaks"><span>'+icon('flame',18)+' <b>'+progress.metrics.singles+'</b> singles wins</span><span>'+icon('players',18)+' <b>'+progress.metrics.pairs+'</b> pairs wins</span><span>'+icon('calendar',18)+' <b>'+progress.metrics.weekly+'</b> school weeks</span></div></section>';
}
function breakthroughCard(badge,own){
 const earned=badge.earned;
 return '<article class="bt-badge-card '+(earned?'earned':'locked')+'"><div class="bt-badge-top"><span class="bt-medal">'+icon(badge.icon,30)+'</span><span class="bt-points">'+badge.points+' AP</span></div><h3>'+e(badge.name)+'</h3><p>'+e(badge.description)+'</p><div class="bt-badge-bottom">'+(earned?'<span class="bt-earned">'+icon('check',15)+' Earned</span><time datetime="'+e(badge.earnedAt)+'">'+e(new Date(badge.earnedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))+'</time>':own&& !['fair-play','helping-hand','house-spirit'].includes(badge.id)?btMeter(badge.progress,badge.target,badge.name+' progress')+'<span>'+badge.progress+' / '+badge.target+'</span>':'<span>'+(['fair-play','helping-hand','house-spirit'].includes(badge.id)?'Awarded by Mr French':'Locked')+'</span>')+'</div></article>';
}
function breakthroughsPage(){
 const id=breakthroughPlayer||personalPlayerId(),p=state.players.find(p=>p.id===id);
 if(!p)return heading('','Breakthroughs','Badges, streaks and achievement points.')+'<section class="panel bt-player-picker"><label>View a player<select id="breakthrough-player"><option value="">Choose a player</option>'+state.players.map(p=>'<option value="'+e(p.id)+'">'+e(p.name)+'</option>').join('')+'</select></label>'+(!user?actionButton('Sign in to view your progress','login','button primary'):'')+'</section>';
 const own=id===personalPlayerId(),progress=breakthroughProgress(state,id),metrics=progress.metrics;
 const list=progress.badges.filter(b=>breakthroughFilter==='all'||(breakthroughFilter==='earned'?b.earned:!b.earned));
 return heading('',own?'Your Breakthroughs':e(p.name)+' · Breakthroughs','Achievement points are separate from league points.',isAdmin()?actionButton('Award sportsmanship','sportsmanship','button primary'):'')+
 '<section class="panel bt-profile"><div class="bt-profile-main"><span class="bt-level-icon">'+icon('trophy',34)+'</span><div><h2>'+e(p.name)+'</h2><p>Level '+progress.level+' · '+e(progress.title)+'</p></div><label class="bt-view-player"><span>View player</span><select id="breakthrough-player">'+state.players.map(player=>'<option value="'+e(player.id)+'" '+(player.id===id?'selected':'')+'>'+e(player.name)+'</option>').join('')+'</select></label></div><div class="bt-level-progress"><strong>'+progress.points+' <small>achievement points</small></strong><span>'+progress.toNext+' AP to level '+(progress.level+1)+'</span>'+btMeter(progress.levelProgress,100,'Progress to next level')+'</div><div class="bt-profile-counts"><span><b>'+progress.earned+' / '+BREAKTHROUGHS.length+'</b> badges earned</span><span><b>'+metrics.played+'</b> matches played</span><span><b>'+metrics.wins+'</b> wins</span><span><b>'+metrics.opponents+'</b> different opponents</span></div></section>'+
 '<div class="bt-streak-grid">'+[['flame','Singles winning streak',metrics.singles,metrics.singlesBest,'consecutive wins'],['players','Pairs winning streak',metrics.pairs,metrics.pairsBest,'consecutive wins'],['calendar','Weekly playing streak',metrics.weekly,metrics.weeklyBest,'school weeks']].map(([kind,title,current,best,unit])=>'<section class="panel bt-streak-card"><span class="bt-streak-symbol">'+icon(kind,24)+'</span><h3>'+title+'</h3><strong>'+current+'</strong><p>'+unit+' · Best '+best+'</p>'+(kind==='calendar'?'<small>'+(metrics.paused?'Paused for a school holiday':metrics.playedThisWeek?'Played this school week':'Play a match this school week to continue')+'</small>':'')+'</section>').join('')+'</div>'+
 '<p class="form-hint">Only approved played results count. Walkovers and byes do not build streaks. Older undated results count towards totals; dated results build streaks. Weekly streaks use London time, Monday to Sunday, and pause for the configured school holidays.</p>'+
 '<section class="panel match-highlight-guide"><h2>How to earn achievements</h2><p>Wins, match totals, opponents and streaks update from approved results. For Triple Threat, Clearance and Against the Odds, add an optional match highlight when submitting your result. A player on the opposing side confirms it in Alerts, then Mr French approves it. Each badge earns points once. Sportsmanship badges are awarded by Mr French.</p><p>Highlights do not delay score approval. Only legal play under the pool rules qualifies.</p></section><div class="bt-collection-heading"><h2>Badge collection</h2><div class="filter-pills" role="group" aria-label="Filter badges">'+[['all','All'],['earned','Earned'],['locked','Locked']].map(([v,label])=>'<button data-bt-filter="'+v+'" class="'+(breakthroughFilter===v?'selected':'')+'" aria-pressed="'+(breakthroughFilter===v)+'">'+label+'</button>').join('')+'</div></div><div class="bt-badge-grid">'+list.map(b=>breakthroughCard(b,own)).join('')+'</div>'+
 (own?'<section class="panel bt-effects-settings"><h2>Celebrations</h2><label class="checkbox"><input id="bt-animations" type="checkbox" '+(animationsEnabled()?'checked':'')+'> Show achievement animations</label><p class="form-hint">Animations are silent and respect your device’s reduced-motion setting.</p><details><summary>Preview all 100 unlock animations</summary><div class="bt-animation-grid">'+CELEBRATIONS.map((c,i)=>'<button data-preview-celebration="'+i+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+e(c.name)+'</button>').join('')+'</div></details></section>':'');
}
function alertsPage(){
 if(!user)return empty('Your alerts','Sign in to view your own results, achievements and announcements.',actionButton('Player sign in','login','button primary'));
 const events=breakthroughAlerts(state,user),receipt=breakthroughReceipt(state,user);
 const list=events.filter(event=>alertFilter==='all'||alertFilter==='unread'&&!alertRead(event,receipt)||alertFilter==='achievements'&&['achievement','level','milestone','catchup'].includes(event.type)||alertFilter==='competitions'&&['draw','opponent','entry','competition'].includes(event.type)||alertFilter==='results'&&['result','correction','highlight'].includes(event.type)||alertFilter==='announcements'&&event.type==='announcement');
 const unread=events.filter(event=>!alertRead(event,receipt)).length;
 return heading('','Your alerts',unread+' unread',actionButton('Mark all as read','readAllAlerts','button secondary')+(isAdmin()?actionButton('Post announcement','announcement','button primary'):''))+
 matchHighlightsPanel(false)+'<div class="filter-pills bt-alert-filters" role="group" aria-label="Filter alerts">'+[['all','All'],['unread','Unread'],['achievements','Achievements'],['results','Results'],['competitions','Competitions'],['announcements','Announcements']].map(([v,label])=>'<button data-alert-filter="'+v+'" class="'+(alertFilter===v?'selected':'')+'" aria-pressed="'+(alertFilter===v)+'">'+label+'</button>').join('')+'</div>'+
 (list.length?'<section class="panel bt-inbox"><ol role="list">'+list.map(event=>{const read=alertRead(event,receipt),kind={achievement:'trophy',milestone:'spark',level:'crown',catchup:'archive',announcement:'bell',result:'check',correction:'undo',highlight:'spark',draw:'players',opponent:'cup',entry:'check',competition:'calendar'}[event.type]||'bell';return '<li class="bt-alert '+(read?'read':'unread')+'"><span class="bt-alert-icon">'+icon(kind,22)+'</span><div class="bt-alert-copy"><div class="bt-alert-heading"><h2>'+e(event.title)+'</h2>'+(!read?'<span class="bt-unread-dot" aria-label="Unread"></span>':'')+'</div><p>'+e(event.text)+'</p><time datetime="'+e(event.at)+'">'+e(new Date(event.at).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))+'</time><div class="bt-alert-actions"><a class="text-link" href="'+e(event.href)+'" data-open-alert="'+e(event.id)+'">View '+icon('arrow',14)+'</a>'+(!read?'<button class="text-link" data-read-alert="'+e(event.id)+'">Mark as read</button>':'')+'</div></div></li>';}).join('')+'</ol></section>':empty('No alerts here',alertFilter==='all'?'Your results, Breakthroughs and club announcements will appear here.':'There are no alerts in this category.'));
}
function breakthroughAdminSettings(){
 if(!isAdmin())return '';
 return '<section class="panel settings-card bt-admin-settings"><h2>Breakthroughs & alerts</h2><div class="bt-admin-actions">'+actionButton('Award sportsmanship','sportsmanship','button secondary')+actionButton('Post announcement','announcement','button secondary')+actionButton('School holiday dates','holidayDates','button secondary')+'</div><p>Winning streaks are separate for singles and pairs. Weekly streaks pause during the saved school holidays.</p></section>';
}
function sportsmanshipDialog(){
 if(!isAdmin())throw Error('Administrator access required.');
 const awards=state.breakthroughs?.sportsmanship||[];
 modal('Award sportsmanship','<form id="sportsmanship-form"><label>Player<select name="playerId" required>'+state.players.filter(p=>!p.testAccount).map(p=>'<option value="'+e(p.id)+'">'+e(p.name)+'</option>').join('')+'</select></label><label>Award<select name="kind">'+BREAKTHROUGHS.filter(b=>['fair-play','helping-hand','house-spirit'].includes(b.id)).map(b=>'<option value="'+b.id+'">'+b.name+'</option>').join('')+'</select></label><label>Reason for your records<textarea name="reason" maxlength="300" required rows="3"></textarea></label><p class="form-hint">Each badge is awarded once per player. The badge is public; your reason stays in the administrator record.</p><p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">Award badge</button></form>'+(awards.length?'<h3>Existing sportsmanship awards</h3><ul class="bt-manual-list">'+awards.map(a=>'<li><span><strong>'+e(name(a.playerId))+' · '+e(BREAKTHROUGHS.find(b=>b.id===a.kind)?.name)+'</strong><small>'+e(a.reason)+'</small></span><button class="text-link" data-revoke-award="'+e(a.id)+'">Remove</button></li>').join('')+'</ul>':''));
}
function announcementDialog(){
 if(!isAdmin())throw Error('Administrator access required.');
 modal('Post announcement','<form id="announcement-form"><label>Title<input name="title" maxlength="80" required></label><label>Message<textarea name="text" maxlength="500" rows="5" required></textarea></label><p class="form-hint">This will appear in every player’s alerts inbox.</p><p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">Post announcement</button></form>');
}
function holidaysDialog(){
 if(!isAdmin())throw Error('Administrator access required.');
 modal('School holiday dates','<form id="holidays-form"><label>Holiday periods<textarea name="periods" rows="8" placeholder="2026-12-12 to 2027-01-05">'+(state.breakthroughs?.holidays||[]).map(h=>h.start+' to '+h.end).join('\n')+'</textarea></label><p class="form-hint">One period per line: YYYY-MM-DD to YYYY-MM-DD. Include the first and last full days off. A week with any school days still needs a played match; complete holiday weeks are skipped. Up to 30 periods.</p><p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">Save holiday dates</button></form>');
}
async function updateAlertReceipt(action,payload={}){
 if(busy)return false;
 busy=true;const identity=JSON.stringify(user);
 try{
  if(demo){act(state,action,payload,user);persist();}
  else{const r=await api('action',{action,payload,revision});if(identity!==JSON.stringify(user)||r.revision<revision)return false;state=r.state;revision=r.revision;}
  return true;
 }catch(error){if(error.status===409)syncPending=true;else toast(error.message);return false;}finally{busy=false;}
}
function scheduleBreakthroughs(){
 if(btScheduled||!user)return;
 btScheduled=true;window.setTimeout(async()=>{
  btScheduled=false;
  if(!user||busy||document.hidden||editingClub())return;
  if(!state.breakthroughs){if(await updateAlertReceipt('syncBreakthroughs')&&!editingClub())render();return;}
  playNextCelebration();
  await receiveCelebrations();
 },100);
}
Object.assign(actions,{sportsmanship:sportsmanshipDialog,announcement:announcementDialog,holidayDates:holidaysDialog,readAllAlerts:async()=>{if(await updateAlertReceipt('readAlerts',{all:true}))render();}});
document.addEventListener('click',async event=>{
 const b=event.target.closest('button'),link=event.target.closest('[data-open-alert]');
 try{
  if(link?.dataset.openAlert){if(await updateAlertReceipt('readAlerts',{id:link.dataset.openAlert})&&!editingClub())render();}
  if(event.target.closest('[data-close-celebration]'))dismissCelebration();
  if(!b)return;
  if(b.dataset.btFilter){breakthroughFilter=b.dataset.btFilter;render();}
  else if(b.dataset.alertFilter){alertFilter=b.dataset.alertFilter;render();}
  else if(b.dataset.readAlert){if(await updateAlertReceipt('readAlerts',{id:b.dataset.readAlert}))render();}
  else if(b.dataset.previewCelebration!==undefined)showCelebration({type:'preview',title:'First Break',text:'Animation preview · '+CELEBRATIONS[+b.dataset.previewCelebration].name,major:true},+b.dataset.previewCelebration);
  else if(b.dataset.dismissCelebration!==undefined)dismissCelebration();
  else if(b.dataset.revokeAward)modal('Remove sportsmanship award','<form id="revoke-award-form" data-award="'+e(b.dataset.revokeAward)+'"><label>Reason<textarea name="reason" maxlength="300" required rows="3"></textarea></label><p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">Remove award</button></form>');
 }catch(error){toast(error.message);}
});
document.addEventListener('change',event=>{
 if(event.target.id==='breakthrough-player')location.hash='breakthroughs/'+event.target.value;
 if(event.target.id==='bt-animations'){try{localStorage.setItem('wakefield-animations-'+personalPlayerId(),String(event.target.checked));}catch{}}
});
document.addEventListener('submit',async event=>{
 const f=event.target,id=f.getAttribute('id');
 if(!['announcement-form','sportsmanship-form','holidays-form','revoke-award-form'].includes(id))return;
 event.preventDefault();const data=Object.fromEntries(new FormData(f));
 try{
  if(id==='announcement-form')await mutate('postAnnouncement',data);
  if(id==='sportsmanship-form')await mutate('awardSportsmanship',data);
  if(id==='revoke-award-form')await mutate('revokeSportsmanship',{id:f.dataset.award,reason:data.reason});
  if(id==='holidays-form'){
   const holidays=data.periods.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const match=line.match(/^(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})$/);if(!match)throw Error('Use YYYY-MM-DD to YYYY-MM-DD on each line.');return {start:match[1],end:match[2]};});
   await mutate('setHolidays',{holidays});
  }
 }catch(error){const field=$('#form-error');if(field)field.textContent=error.message;else toast(error.message);}
});
function animationsEnabled(){try{return localStorage.getItem('wakefield-animations-'+personalPlayerId())!=='false';}catch{return true;}}
// Ten movement families, each with ten distinct paths and compositions.
// Colour is not used to distinguish the one hundred presets.
const CELEBRATION_FAMILIES=[
 ['Pocket Supernova','burst'],['Orbital Cue','orbit'],['Disco Break','dance'],['Golden Rain','rain'],['Ricochet','bounce'],
 ['Helix Hustle','helix'],['Wave Rider','wave'],['Spiral Spark','spiral'],['Crown Cascade','crown'],['Comet Club','comet']
];
const CELEBRATION_VARIANTS=['Pop','Shuffle','Twist','Flip','Ripple','Boomerang','Zigzag','Swing','Pinwheel','Finale'];
const CELEBRATIONS=CELEBRATION_FAMILIES.flatMap(([name,family],group)=>CELEBRATION_VARIANTS.map((variant,v)=>({id:group*10+v,name:name+' '+variant,family,variant:v,particles:12+v*2,duration:950+v*65,shape:['disc','diamond','star','bar','ring'][v%5]})));
function celebrationFrames(preset,index){
 const v=preset.variant,n=preset.particles,phase=index/n*Math.PI*2,r=36+v*5,frames=[];
 for(let step=0;step<=12;step++){
  const t=step/12,a=phase+t*(1+v*.16)*Math.PI*2,spread=(index-(n-1)/2);
  let x=0,y=0;
  switch(preset.family){
   case 'burst':x=Math.cos(phase+Math.sin(t*Math.PI)*(v+1)*.08)*r*t*2;y=Math.sin(phase)*r*t*1.3-t*t*(12+v*2);break;
   case 'orbit':x=Math.cos(a)*r*(.4+t);y=Math.sin(a)*r*.6+Math.sin(t*Math.PI*(v+1))*12;break;
   case 'dance':x=Math.sin(t*Math.PI*(3+v)+phase)*(30+v*3);y=Math.cos(t*Math.PI*(2+v*.4)+phase)*25-t*20;break;
   case 'rain':x=spread*(5+v*.3)+Math.sin(t*Math.PI*(v+1)+phase)*18;y=-80+t*170+(index%3)*10*Math.sin(t*Math.PI);break;
   case 'bounce':x=(t*2-1)*spread*6;y=-Math.abs(Math.sin(t*Math.PI*(2+v*.25)+phase))*(40+v*4)+35;break;
   case 'helix':x=Math.sin(a)*(r*t+15);y=-65+t*130+Math.cos(a)*14*(v%3+1);break;
   case 'wave':x=-90+t*180;y=Math.sin(t*Math.PI*(2+v*.5)+phase)*(15+v*3)+spread*2;break;
   case 'spiral':x=Math.cos(a*(1+v*.1))*r*(1-t);y=Math.sin(a*(1+v*.1))*r*(1-t)+t*spread*3;break;
   case 'crown':x=Math.cos(phase)*r*t*1.6;y=-Math.abs(Math.sin(phase*(3+v%4)))*r*Math.sin(t*Math.PI)+t*35;break;
   case 'comet':x=-90+t*180+Math.sin(a)*v*2;y=50-t*100+Math.sin(t*Math.PI*(1+v*.25)+phase)*25;break;
  }
  // Variants change trajectory, depth, rotation and scale, not just timing.
  x+=Math.sin(t*Math.PI*(v+1)+phase)*(v*1.4);
  frames.push({offset:t,transform:'translate('+x.toFixed(3)+'px,'+y.toFixed(3)+'px) rotate('+(t*(180+v*90)+index*30)+'deg) scale('+(Math.sin(t*Math.PI)*(.7+(v%3)*.25)+.05)+')',opacity:step===0||step===12?0:1});
 }
 return frames;
}
function nextCelebrationIndex(){
 const key='wakefield-celebration-cycle-'+personalPlayerId();
 try{const cursor=Number(localStorage.getItem(key)||0);localStorage.setItem(key,String(cursor+1));return (cursor*37+13)%100;}catch{return Math.floor(Math.random()*100);}
}
async function receiveCelebrations(){
 const id=personalPlayerId();if(!id||btAcknowledging)return;
 if(celebrationIdentity!==id){celebrationQueue=[];dismissCelebration(false);celebrationIdentity=id;}
 const receipt=breakthroughReceipt(state,user),events=breakthroughAlerts(state,user).filter(e=>e.seq>receipt.seenThrough&&['achievement','level','catchup','milestone'].includes(e.type)).reverse();
 if(!events.length)return;
 btAcknowledging=true;
 try{
  const through=Math.max(...events.map(e=>e.seq));
  if(!await updateAlertReceipt('seenCelebrations',{through}))return;
  celebrationQueue=events.length>4?[{type:'catchup',title:events.length+' new updates',text:'Your achievements and major milestones are in your alerts inbox.',major:false}]:events;
  if(!editingClub()){render();playNextCelebration();}
 }finally{btAcknowledging=false;}
}
function resetCelebrationIdentity(){
 const id=user?personalPlayerId()||'':'';
 if(celebrationIdentity!==id){celebrationQueue=[];dismissCelebration(false);celebrationIdentity=id;}
}
function playNextCelebration(){if(user&&!document.hidden&&!editingClub()&&!$('#celebration-root')&&celebrationQueue.length)showCelebration(celebrationQueue.shift());}
function dismissCelebration(next=true){clearTimeout(celebrationTimer);$('#celebration-root')?.remove();if(next&&celebrationQueue.length)window.setTimeout(playNextCelebration,300);}
function showCelebration(event,index=nextCelebrationIndex()){
 if(!user||document.hidden)return;
 dismissCelebration(false);
 const preset=CELEBRATIONS[index],root=document.createElement('aside'),badge=BREAKTHROUGHS.find(b=>b.id===event.awardId);
 root.id='celebration-root';root.className='bt-celebration';root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 root.innerHTML='<div class="bt-celebration-particles" aria-hidden="true"></div><span class="bt-celebration-icon">'+icon(badge?.icon||'trophy',28)+'</span><div><small>'+(['milestone','catchup'].includes(event.type)?'Championship update':event.type==='preview'?'Animation preview':'Breakthrough unlocked')+'</small><strong>'+e(event.title)+'</strong><p>'+e(event.text)+'</p><a class="text-link" data-close-celebration href="'+e(event.href||'#breakthroughs')+'">View '+icon('arrow',14)+'</a></div><button class="icon-button" data-dismiss-celebration aria-label="Dismiss celebration">'+icon('close',16)+'</button>';
 document.body.append(root);
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(animationsEnabled()&&!reduce&&root.animate){
  const tilt=(preset.variant-4.5)*1.5;
  root.animate([{transform:'translateX(40px) scale(.92) rotate('+tilt+'deg)',opacity:0},{transform:'translateX(-5px) scale(1.025) rotate('+(-tilt*.2)+'deg)',opacity:1,offset:.7},{transform:'none',opacity:1}],{duration:400+preset.variant*22,easing:'cubic-bezier(.2,.7,.3,1)'});
  const medalFrames=celebrationFrames(preset,0).map(frame=>({...frame,opacity:1,transform:frame.transform.replace(/(-?[\d.]+)px/g,(_,value)=>(Number(value)*.18).toFixed(2)+'px')}));
  root.querySelector('.bt-celebration-icon').animate(medalFrames,{duration:preset.duration,easing:'ease-out'});
  if(event.major){const field=root.querySelector('.bt-celebration-particles');for(let i=0;i<preset.particles;i++){
   const particle=document.createElement('i');particle.className='bt-particle bt-particle-'+preset.shape;field.append(particle);
   particle.animate(celebrationFrames(preset,i),{duration:preset.duration,delay:(i%5)*(12+preset.variant*4),fill:'both',easing:'ease-out'});
  }}
 }
 celebrationTimer=window.setTimeout(()=>dismissCelebration(),6500);
}
document.addEventListener('focusout',()=>{if(state&&user)scheduleBreakthroughs();});

// Optional declared highlights have their own confirmation and approval flow.
function matchHighlightsFields(m){
 const members=[...sideMembers(state,m.a),...sideMembers(state,m.b)];
 return `<details class="match-highlights-fields"><summary>Match highlights <span>Optional</span></summary><p class="form-hint">Select only what happened, and who did it. The opposing side confirms in Alerts, then Mr French approves each highlight. You can submit just the score. Each badge earns achievement points once.</p>${members.map(id=>`<fieldset><legend>${e(name(id))}</legend>${MATCH_HIGHLIGHTS.map(h=>`<div class="match-highlight-option"><label class="checkbox"><input type="checkbox" name="highlight-${e(id)}-${h.id}" data-highlight-choice data-player-id="${e(id)}" data-kind="${h.id}"><span><strong>${e(h.name)}</strong><small>${e(h.description)}</small></span></label>${m.bestOf>1?`<label class="highlight-frame">Frame<input name="frame-${e(id)}-${h.id}" data-highlight-frame type="number" min="1" max="${m.bestOf}" value="1" disabled required aria-label="Frame for ${e(name(id))}: ${e(h.name)}"></label>`:''}</div>`).join('')}</fieldset>`).join('')}<p class="form-hint">The black must be potted legally into the nominated pocket. Early black, black-ball fouls and withdrawal walkovers cannot earn a winning highlight.</p></details>`;
}
function readMatchHighlights(form){
 return [...(form.querySelectorAll?.('[data-highlight-choice]:checked')||[])].map(input=>({playerId:input.dataset.playerId,kind:input.dataset.kind,frame:Number(input.closest('.match-highlight-option').querySelector('[data-highlight-frame]')?.value||1)}));
}
const highlightFixture=h=>findMatch(state,h.matchId)||(state.history||[]).flatMap(h=>h.league||[]).find(m=>m.id===h.matchId);
const highlightParticipant=(h,id)=>[...sideMembers(state,h.a),...sideMembers(state,h.b)].includes(id);
const highlightCanRespond=h=>!h.review&&!h.invalidatedAt&&sideMembers(state,sideMembers(state,h.a).includes(h.playerId)?h.b:h.a).includes(personalPlayerId());
function pendingHighlightCount(){return (state.matchHighlights||[]).filter(h=>['awaiting-opponent','confirmed','disputed'].includes(matchHighlightStatus(h))).length;}
function matchHighlightCard(h,adminReview){
 const kind=MATCH_HIGHLIGHTS.find(k=>k.id===h.kind);if(!kind)return '';
 const status=matchHighlightStatus(h),m=highlightFixture(h),ready=status==='confirmed'&&m?.status==='complete';
 const labels={'awaiting-opponent':'Awaiting opponent confirmation',confirmed:m?.status==='complete'?'Awaiting Mr French’s approval':'Confirmed · awaiting score approval',disputed:'Disputed · agree what happened before approval',approved:'Approved',rejected:'Declined',invalidated:'Cancelled after a result change'};
 let controls='';
 if(highlightCanRespond(h))controls+=`<button class="button secondary" data-respond-highlight="${e(h.id)}" data-highlight-decision="confirm">Confirm highlight</button><button class="button secondary" data-respond-highlight="${e(h.id)}" data-highlight-decision="dispute">Dispute</button>`;
 if(adminReview&&!h.review&&!h.invalidatedAt)controls+=`<button class="button primary" data-review-highlight="${e(h.id)}" data-highlight-decision="approve" ${ready?'':'disabled'}>Approve highlight</button><button class="button secondary" data-review-highlight="${e(h.id)}" data-highlight-decision="reject">Decline</button>`;
 if(adminReview&&status==='approved')controls+=`<button class="text-link" data-revoke-highlight="${e(h.id)}">Remove award</button>`;
 const responses=(h.responses||[]).map(r=>`<p class="form-hint">${e(name(r.by))}: ${r.decision==='confirm'?'Confirmed':'Disputed'}${r.reason?' — '+e(r.reason):''}</p>`).join('');
 return `<article class="match-highlight-card"><div class="match-highlight-heading"><h3>${e(name(h.playerId))} · ${e(kind.name)}</h3>${badge(e(labels[status]),status==='approved'?'neutral':'amber')}</div><p>${e(kind.description)}</p><p class="form-hint">${e(name(h.a))} vs ${e(name(h.b))} · ${h.score.join('–')} · Frame ${h.frame}${m&&competitionForMatch(state,m.id)?' · '+e(competitionForMatch(state,m.id).name):''}</p>${responses}${h.review?.reason?`<p class="form-hint">Mr French: ${e(h.review.reason)}</p>`:''}${controls?`<div class="match-highlight-actions">${controls}</div>`:''}</article>`;
}
function matchHighlightsPanel(adminReview=false){
 if(!user)return '';
 const id=personalPlayerId(),claims=(state.matchHighlights||[]).filter(h=>adminReview||highlightParticipant(h,id));
 if(!claims.length&&adminReview)return '';
 const pending=claims.filter(h=>['awaiting-opponent','confirmed','disputed'].includes(matchHighlightStatus(h)));
 const history=claims.filter(h=>!pending.includes(h)).slice().reverse();
 return `<section class="panel match-highlights-panel"><h2>${adminReview?'Match highlight approvals':'Your match highlights'}</h2><p class="panel-description">${adminReview?'Approve the played score first. Confirmed highlights can then be awarded separately. Disputes or unanswered claims never block a score.':'Confirm or dispute highlights for the opposing side. You cannot confirm your own or your partner’s highlight. Mr French awards confirmed highlights after the score is approved.'}</p>${!adminReview&&highlightDeclarationMatches().length?actionButton('Declare a match highlight','declareHighlight','button secondary'):''}${pending.map(h=>matchHighlightCard(h,adminReview)).join('')}${!claims.length?'<p class="form-hint">No highlights declared yet. Add them when submitting a score, or declare one for a match you have already played.</p>':''}${history.length?`<details class="match-highlight-history"><summary>Reviewed or cancelled highlights (${history.length})</summary>${history.map(h=>matchHighlightCard(h,adminReview)).join('')}</details>`:''}</section>`;
}
function highlightDeclarationMatches(){
 return [...allMatches(state),...(state.history||[]).flatMap(h=>h.league||[])].filter(m=>m.a&&m.b&&!m.walkover&&(isAdmin()||isMatchParticipant(state,m,user?.id))&&(m.status==='complete'||m.status==='open'&&state.submissions.some(s=>s.match===m.id)));
}
function declareHighlightPicker(){
 const matches=highlightDeclarationMatches();
 modal('Declare a match highlight',matches.length?`<form id="choose-highlight-match"><label>Played match<select name="match" required>${matches.map(m=>`<option value="${e(m.id)}">${e(name(m.a))} vs ${e(name(m.b))} · ${(m.score||state.submissions.find(s=>s.match===m.id).score).join('–')}${competitionForMatch(state,m.id)?' · '+e(competitionForMatch(state,m.id).name):''}</option>`).join('')}</select></label><button class="button primary full" type="submit">Choose highlights</button></form>`:'<p>Submit a played result before declaring a highlight.</p>');
}
function declareHighlightDialog(id){
 const m=highlightDeclarationMatches().find(m=>m.id===id);if(!m)throw Error('This played match is no longer available.');
 modal('Declare match highlights',`<p><strong>${e(name(m.a))} vs ${e(name(m.b))}</strong></p><form id="declare-highlights-form" data-match="${e(m.id)}">${matchHighlightsFields(m).replace('<details class=','<details open class=')}<p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">Submit highlights</button></form>`);
}
Object.assign(actions,{declareHighlight:declareHighlightPicker});
function matchHighlightDialog(id,decision,mode){
 const h=(state.matchHighlights||[]).find(h=>h.id===id);if(!h)throw Error('This highlight is no longer available.');
 const kind=MATCH_HIGHLIGHTS.find(k=>k.id===h.kind),reason=decision==='dispute'||decision==='reject',revoke=mode==='revoke';
 const title=revoke?'Remove highlight award':decision==='confirm'?'Confirm match highlight':decision==='dispute'?'Dispute match highlight':decision==='approve'?'Approve match highlight':'Decline match highlight';
 modal(title,`<p><strong>${e(name(h.playerId))} · ${e(kind.name)}</strong></p><p>${e(kind.description)}</p><p class="form-hint">${e(name(h.a))} vs ${e(name(h.b))} · Frame ${h.frame}</p><form id="match-highlight-form" data-highlight="${e(id)}" data-decision="${e(decision)}" data-mode="${e(mode)}">${reason?'<label>Reason<textarea name="reason" maxlength="300" rows="3" required></textarea></label>':`<label class="checkbox"><input type="checkbox" required> ${mode==='respond'?'I confirm this happened in this frame.':'I have checked the claim and the opposing side’s confirmation.'}</label>`}<p id="form-error" class="error" role="alert"></p><button class="button primary full" type="submit">${title}</button></form>`);
}
document.addEventListener('change',event=>{
 if(event.target.matches?.('[data-highlight-choice]')){const frame=event.target.closest('.match-highlight-option').querySelector('[data-highlight-frame]');if(frame)frame.disabled=!event.target.checked;}
});
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 try{
  if(b.dataset.respondHighlight)matchHighlightDialog(b.dataset.respondHighlight,b.dataset.highlightDecision,'respond');
  else if(b.dataset.reviewHighlight)matchHighlightDialog(b.dataset.reviewHighlight,b.dataset.highlightDecision,'review');
  else if(b.dataset.revokeHighlight)matchHighlightDialog(b.dataset.revokeHighlight,'reject','revoke');
 }catch(error){toast(error.message);}
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!['match-highlight-form','choose-highlight-match','declare-highlights-form'].includes(form.id))return;
 event.preventDefault();
 if(form.id==='choose-highlight-match'){declareHighlightDialog(new FormData(form).get('match'));return;}
 if(form.id==='declare-highlights-form'){await mutate('declareMatchHighlights',{id:form.dataset.match,highlights:readMatchHighlights(form)});return;}
 await mutate({respond:'respondMatchHighlight',review:'reviewMatchHighlight',revoke:'revokeMatchHighlight'}[form.dataset.mode],{id:form.dataset.highlight,decision:form.dataset.decision,reason:new FormData(form).get('reason')||''});
});

boot();
