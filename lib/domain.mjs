export const uid = () => globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
export const APP_NAME = 'Wakefield Pool Championship';
export const defaults = { name: APP_NAME, season: 'The inaugural season', frames: 1, finalFrames: 1, winPoints: 3, divisionSize: 11, approval: true, consolation: true, rules: 'Seven-ball pool. Agree school rules before breaking.', logo: '' };
export function initialState(demo = false) {
  const names = demo ? ['Mr French','George','Oliver W.','Harry S.','Jack B.','Charlie H.','Leo M.','Oscar T.','Arthur C.','Noah P.','Alfie R.','Freddie L.','Henry D.','Theo A.','Archie K.','Thomas G.','James E.','William N.','Edward F.','Joshua V.','Max I.','Samuel J.','Isaac O.','Lucas U.','Jacob Y.','Daniel Z.','Joseph W.','Toby S.','Finley B.','Ethan H.','Benjamin M.','Hugo T.','Alexander C.','Reuben P.','Sebastian R.','Louis L.','Rory D.','Jude A.','Felix K.','Albert G.','Adam E.','Luke N.'] : ['Mr French','George'];
  const state = { competitions: defaultCompetitions(), settings: { ...defaults }, players: names.map((name,i) => ({ id: demo ? `p${i}` : uid(), name, rating: 0 })), league: [], divisions: [], cups: [], submissions: [], activity: [] };
  if (demo) {
    createLeague(state);
    for (let i = 0; i < 18; i++) { const m = state.league[i]; m.status = 'complete'; m.score = i % 3 ? [1,0] : [0,1]; }
    createCup(state, 'The Wakefield Cup');
  }
  return state;
}
export function shuffle(items) { const a = [...items]; for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export function createLeague(s) {
  if (s.players.length < 2) throw Error('Add at least two players first.');
  if (s.league.some(m => m.status === 'complete') || s.submissions.some(x=>x.kind==='league')) throw Error('Archive this league before creating another.');
  const count = Math.ceil(s.players.length / s.settings.divisionSize);
  s.divisions = Array.from({length: count}, (_,i)=>({id:`d${i}`,name:`Division ${String.fromCharCode(65+i)}`,players:[]}));
  const order = shuffle(s.players).sort((a,b)=>b.rating-a.rating);
  order.forEach((p,i)=>{ const row=Math.floor(i/count); s.divisions[row%2 ? count-1-i%count : i%count].players.push(p.id); });
  s.league=[];
  for (const div of s.divisions) {
    const ring=[...div.players]; if (ring.length%2) ring.push(null);
    for(let round=1;round<ring.length;round++) {
      for(let i=0;i<ring.length/2;i++) if(ring[i] && ring[ring.length-1-i]) s.league.push({id:uid(),division:div.id,round,a:ring[i],b:ring[ring.length-1-i],status:'open',bestOf:s.settings.frames});
      ring.splice(1,0,ring.pop());
    }
  }
}
export function standings(s, division) {
  const rows=s.players.filter(p=>!division || s.divisions.find(d=>d.id===division)?.players.includes(p.id)).map(p=>({...p,played:0,won:0,lost:0,for:0,against:0,points:0}));
  for(const m of s.league.filter(m=>m.status==='complete')) for(const [id,index] of [[m.a,0],[m.b,1]]) {
    const r=rows.find(r=>r.id===id); if(!r) continue;
    r.played++; r.for+=m.score[index];r.against+=m.score[1-index];
    if(m.score[index]>m.score[1-index]) {r.won++;r.points+=s.settings.winPoints;} else r.lost++;
  }
  return rows.sort((a,b)=>b.points-a.points || (b.for-b.against)-(a.for-a.against) || b.won-a.won || a.name.localeCompare(b.name));
}
// Recommendations use the saved round-robin draw, never a date or a standings rank.
// Filtering changes the recommendation only; every open fixture remains playable.
export function leaguePlan(s, playerId) {
 const division=s.divisions.find(d=>d.players.includes(playerId));
 const matches=division?s.league.map((match,index)=>({match,index})).filter(({match})=>match.division===division.id&&[match.a,match.b].includes(playerId)).sort((x,y)=>(x.match.round||0)-(y.match.round||0)||x.index-y.index).map(x=>x.match):[];
 const submitted=new Set(s.submissions.map(x=>x.match));
 const remaining=matches.filter(m=>m.status==='open'&&!submitted.has(m.id));
 const pending=matches.filter(m=>m.status==='open'&&submitted.has(m.id));
 return {division,next:remaining[0]||null,remaining,pending,played:matches.filter(m=>m.status==='complete').length,total:matches.length};
}
export function createCup(s,name,participants=s.players.map(p=>p.id), consolation=false) {
  if(participants.length<2) throw Error('A cup needs at least two players.');
  let size=2;while(size<participants.length)size*=2;
  const entrants=shuffle(participants), pairs=Array.from({length:size/2},()=>[null,null]);
  for(let i=0;i<size/2;i++)pairs[i][0]=entrants.shift();
  for(let i=0;entrants.length;i++)pairs[i][1]=entrants.shift();
  const cup={id:uid(),name,consolation,rounds:[]};
  for(let n=size/2;n>=1;n/=2)cup.rounds.push(Array.from({length:n},()=>({id:uid(),a:null,b:null,status:'waiting',bestOf:n===1?s.settings.finalFrames:s.settings.frames})));
  pairs.forEach(([a,b],i)=>Object.assign(cup.rounds[0][i],{a,b,status:b?'open':'bye',winner:b?null:a}));
  s.cups.push(cup); advanceCup(cup); return cup;
}
export function advanceCup(cup, withdrawn = []) { reconcileBracket(cup, new Set(withdrawn)); }

export function findMatch(s,id) { return allMatches(s).find(m=>m.id===id); }
export function validateScore(match,score) {
  if(!match || match.status!=='open')throw Error('This match is no longer available.');
  const goal=Math.floor(match.bestOf/2)+1;
  if(!Array.isArray(score)||score.length!==2||!score.every(n=>Number.isInteger(n)&&n>=0&&n<=goal)||Math.max(...score)!==goal||Math.min(...score)>=goal)throw Error(`Enter a valid best-of-${match.bestOf} result.`);
}
export function applyResult(s,id,score) {
  const m=findMatch(s,id); validateScore(m,score);m.score=score;m.status='complete';m.winner=score[0]>score[1]?m.a:m.b;
  const competition=competitionForMatch(s,id);
  if(competition){advanceCompetition(competition);return;}
  for(const c of [...s.cups]) if(c.rounds.flat().includes(m))advanceLegacyCup(s,c);

}
export function promote(s) {
  if(!s.league.length || s.league.some(m=>!['complete','void'].includes(m.status)))throw Error('Complete every league fixture before starting the next season.');
  const ranking=s.divisions.map(d=>standings(s,d.id).map(p=>p.id));
  for(let i=0;i<ranking.length-1;i++) {const lowerWinner=ranking[i+1][0],upperLast=ranking[i].at(-1);ranking[i][ranking[i].length-1]=lowerWinner;ranking[i+1][0]=upperLast;}
  s.history??=[];s.history.push({season:s.settings.season,divisions:structuredClone(s.divisions),league:structuredClone(s.league),withdrawals:[...(s.leagueWithdrawals||[])]});
  ranking.flat().forEach((id,i)=>{s.players.find(p=>p.id===id).rating=ranking.flat().length-i;});
  // Preserve promoted division membership rather than rebalance it.
  s.league=[];s.submissions=s.submissions.filter(x=>x.kind!=='league');
  s.divisions.forEach((d,i)=>d.players=ranking[i]);
  for(const d of s.divisions)for(let a=0;a<d.players.length;a++)for(let b=a+1;b<d.players.length;b++)s.league.push({id:uid(),division:d.id,round:1,a:d.players[a],b:d.players[b],status:'open',bestOf:s.settings.frames});
  s.leagueWithdrawals=[];s.settings.season='Season '+((s.history.length||0)+1);
}
export function act(s,action,payload,user) {
  const admin=user?.role==='admin';
  if(!user)throw Error('Sign in first.');
  ensureCompetitions(s);
  s.settings.name=APP_NAME;
  if(action==='enterCompetitions'){
    // Validate the whole selection before adding any entries. Identity always
    // comes from the authenticated session, never a submitted player ID.
    if(user.role!=='player'||!s.players.some(p=>p.id===user.id))throw Error('Sign in as a registered player to join competitions.');
    if(payload.playerId!==undefined&&payload.playerId!==user.id)throw Error('You can only enter yourself.');
    if(!Array.isArray(payload.ids)||!payload.ids.length||payload.ids.length>32||payload.ids.some(id=>typeof id!=='string'))throw Error('Choose at least one competition.');
    const selected=[...new Set(payload.ids)].map(id=>getCompetition(s,id));
    if(selected.some(c=>c.status!=='open'))throw Error('One of your selected competitions has closed. Check your selection and try again.');
    for(const c of selected)if(!c.entries.includes(user.id))c.entries.push(user.id);
  } else if(['enterCompetition','leaveCompetition','enterAllPlayers','enterSelectedPlayers'].includes(action)){
    changeEntry(s,action,payload,user);
  } else if(['createCompetition','editCompetition','closeEntries','reopenEntries','drawCompetition'].includes(action)){
    if(!admin)throw Error('Administrator access required.');
    manageCompetition(s,action,payload);
  } else if(action==='submit') {
    const m=findMatch(s,payload.id);validateScore(m,payload.score);
    if(!admin && !isMatchParticipant(s,m,user.id))throw Error('You can only submit your own matches.');
    if(s.submissions.some(x=>x.match===m.id))throw Error('This match already has a result awaiting approval.');
    if(!requiresApproval(s,m))applyResult(s,m.id,payload.score);
    else s.submissions.push({id:uid(),match:m.id,score:payload.score,by:user.id||'admin',at:new Date().toISOString(),kind:competitionForMatch(s,m.id)?'competition':s.league.includes(m)?'league':'cup'});
  } else {
    if(!admin)throw Error('Administrator access required.');
    if(action==='correctResult')correctResult(s,payload,user);
    else if(action==='withdrawPlayer')withdrawPlayer(s,payload,user);
    else if(action==='approve'||action==='reject') {
      const sub=s.submissions.find(x=>x.id===payload.id);if(!sub)throw Error('Submission not found.');
      if(action==='approve')applyResult(s,sub.match,sub.score);s.submissions=s.submissions.filter(x=>x.id!==sub.id);
    } else if(action==='settings') {
      const p=payload;
      for(const key of ['season','rules'])if(typeof p[key]==='string')s.settings[key]=p[key].trim().slice(0,300);
      for(const key of ['frames','finalFrames'])if(p[key]!==undefined) {if(![1,3,5,7,9].includes(+p[key]))throw Error('Choose an odd match length from 1 to 9.');s.settings[key]=+p[key];}
      if(p.winPoints!==undefined){if(!Number.isInteger(+p.winPoints)||+p.winPoints<1||+p.winPoints>10)throw Error('Win points must be 1–10.');s.settings.winPoints=+p.winPoints;}
      if(p.divisionSize!==undefined){if(!Number.isInteger(+p.divisionSize)||+p.divisionSize<3||+p.divisionSize>20)throw Error('Division size must be 3–20.');s.settings.divisionSize=+p.divisionSize;}
      for(const k of ['approval','consolation'])if(typeof p[k]==='boolean')s.settings[k]=p[k];
      if(typeof p.logo==='string') {if(p.logo.length>700000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.logo))throw Error('Choose a PNG, JPEG or WebP logo under 500 KB.');s.settings.logo=p.logo;}
    } else if(action==='addPlayers') {
      if(s.league.length||s.cups.length)throw Error('Add players before generating competitions.');
      const names=String(payload.names||'').split('\n').map(x=>x.trim()).filter(Boolean);
      if(!names.length||s.players.length+names.length>64)throw Error('Enter names; the maximum is 64 players.');
      if(names.some(n=>n.length>45)||new Set([...s.players.map(p=>p.name.toLowerCase()),...names.map(n=>n.toLowerCase())]).size!==s.players.length+names.length)throw Error('Use unique display names of up to 45 characters.');
      names.forEach(name=>s.players.push({id:uid(),name,rating:0}));
    } else if(action==='player') {
      const p=s.players.find(p=>p.id===payload.id);if(!p)throw Error('Player not found.');
      const name=String(payload.name||'').trim();if(!name||name.length>45||s.players.some(x=>x.id!==p.id&&x.name.toLowerCase()===name.toLowerCase()))throw Error('Use a unique display name of up to 45 characters.');
      p.name=name; const rating=+payload.rating;if(!Number.isFinite(rating)||rating<0||rating>100)throw Error('Ability must be 0–100.');p.rating=rating;
    } else if(action==='league')createLeague(s);
    else if(action==='cup')createCup(s,String(payload.name||'The Wakefield Cup').trim().slice(0,70)||'The Wakefield Cup');
    else if(action==='promote')promote(s);
    else throw Error('Unknown action.');
  }
  s.activity.unshift({text:({enterCompetitions:'Competition entries added',enterSelectedPlayers:'Selected players entered',enterAllPlayers:'All registered players entered',enterCompetition:'Competition entry added',leaveCompetition:'Competition entry removed',createCompetition:'Competition created',editCompetition:'Competition updated',closeEntries:'Entries closed',reopenEntries:'Entries reopened',drawCompetition:'Competition draw created',submit:'Result submitted',approve:'Result approved',reject:'Result returned for correction',correctResult:'Approved result corrected',withdrawPlayer:'Player withdrawn',league:'League fixtures generated',cup:'Cup draw created',promote:'New league season started',settings:'Club settings updated',addPlayers:'Players added',player:'Player updated'})[action],at:new Date().toISOString()});s.activity=s.activity.slice(0,30);return s;
}


// New competitions are additive: saved divisions, cups, PINs and results stay intact.
export function defaultCompetitions() {
 return [['full-league','Full league','singles','league'],['singles-knockout','Singles knockout','singles','knockout'],['pairs-league','Pairs league','pairs','league'],['pairs-knockout','Pairs knockout','pairs','knockout']].map(([id,name,mode,format])=>({id,name,mode,format,status:'open',entries:[],teams:[],fixtures:[],rounds:[],bestOf:1,finalBestOf:1,winPoints:3,rules:defaults.rules,consolation:false}));
}
export function ensureCompetitions(s) { s.competitions??=defaultCompetitions();return s; }
export function competitionMatches(c) {return [...(c.fixtures||[]),...(c.rounds||[]).flat(),...(c.plate?.rounds||[]).flat()];}
export function allMatches(s) {return [...s.league,...s.cups.flatMap(c=>c.rounds.flat()),...(s.competitions||[]).flatMap(competitionMatches)];}
export function competitionForMatch(s,id) {return (s.competitions||[]).find(c=>competitionMatches(c).some(m=>m.id===id));}
export function sideMembers(s,id) {
 if(s.players.some(p=>p.id===id))return [id];
 return (s.competitions||[]).flatMap(c=>c.teams).find(t=>t.id===id)?.members||[];
}
export function sideName(s,id) {return sideMembers(s,id).map(id=>s.players.find(p=>p.id===id)?.name||'Unknown player').join(' & ')||'To be decided';}
export function isMatchParticipant(s,m,playerId) {return !!playerId&&!!m&&[m.a,m.b].some(id=>sideMembers(s,id).includes(playerId));}
export function requiresApproval(s,m) {return !!competitionForMatch(s,m.id)||s.settings.approval;}
export function competitionStandings(s,c) {
 const rows=c.teams.map(t=>({id:t.id,name:sideName(s,t.id),played:0,won:0,lost:0,for:0,against:0,points:0}));
 for(const m of c.fixtures.filter(m=>m.status==='complete'))for(const [id,i]of [[m.a,0],[m.b,1]]){
  const row=rows.find(t=>t.id===id);row.played++;row.for+=m.score[i];row.against+=m.score[1-i];
  if(m.score[i]>m.score[1-i]){row.won++;row.points+=c.winPoints;}else row.lost++;
 }
 return rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.won-a.won||a.name.localeCompare(b.name));
}
function getCompetition(s,id) {const c=s.competitions.find(c=>c.id===id);if(!c)throw Error('Competition not found.');return c;}
function changeEntry(s,action,payload,user) {
 const c=getCompetition(s,payload.id),admin=user.role==='admin',playerId=admin?payload.playerId:user.id;
 if(['enterAllPlayers','enterSelectedPlayers'].includes(action)){
  if(!admin)throw Error('Administrator access required.');
  if(c.status==='drawn')throw Error('This draw is fixed. Create a new competition for new entries.');
  const ids=action==='enterAllPlayers'?s.players.map(p=>p.id):payload.playerIds;
  if(!Array.isArray(ids)||!ids.length||ids.length>64||ids.some(id=>typeof id!=='string'||!s.players.some(p=>p.id===id)))throw Error('Select one or more registered players.');
  const entered=new Set(c.entries);
  c.entries.push(...[...new Set(ids)].filter(id=>!entered.has(id)));
  return;
 }
 if(!admin&&payload.playerId&&payload.playerId!==user.id)throw Error('You can only enter or withdraw yourself.');
 if(!s.players.some(p=>p.id===playerId))throw Error('Choose a registered player.');
 if(c.status==='drawn'||(!admin&&c.status!=='open'))throw Error('Entries are closed. Please wait for the next competition.');
 const entered=c.entries.includes(playerId);
 if(action==='enterCompetition'){if(entered)throw Error('This player is already entered.');c.entries.push(playerId);}
 else {if(!entered)throw Error('This player is not entered.');c.entries=c.entries.filter(id=>id!==playerId);}
}
function configureCompetition(c,p) {
 const next={...c};
 if(p.name!==undefined){const name=String(p.name).trim();if(!name||name.length>70)throw Error('Use a competition name of 1–70 characters.');next.name=name;}
 if(p.mode!==undefined){if(!['singles','pairs'].includes(p.mode))throw Error('Choose singles or pairs.');next.mode=p.mode;}
 if(p.format!==undefined){if(!['league','knockout'].includes(p.format))throw Error('Choose league or knockout.');next.format=p.format;}
 for(const key of ['bestOf','finalBestOf'])if(p[key]!==undefined){const n=Number(p[key]);if(!Number.isInteger(n)||n<1||n>99||n%2!==1)throw Error('Match lengths must be odd numbers from 1 to 99.');next[key]=n;}
 if(p.winPoints!==undefined){const n=Number(p.winPoints);if(!Number.isInteger(n)||n<1||n>100)throw Error('Win points must be 1–100.');next.winPoints=n;}
 if(p.rules!==undefined){if(typeof p.rules!=='string'||p.rules.length>2000)throw Error('Use up to 2,000 characters for rules.');next.rules=p.rules.trim();}
 if(p.consolation!==undefined){if(typeof p.consolation!=='boolean')throw Error('Choose whether to include a consolation cup.');next.consolation=p.consolation;}
 Object.assign(c,next);
}
function manageCompetition(s,action,p) {
 if(action==='createCompetition'){
  if(s.competitions.length>=32)throw Error('The club supports up to 32 competitions.');
  const c={...defaultCompetitions()[0],id:uid(),name:'New competition',entries:[],teams:[],fixtures:[],rounds:[]};
  configureCompetition(c,p);s.competitions.push(c);return;
 }
 const c=getCompetition(s,p.id);
 if(c.status==='drawn'){
  if(action!=='editCompetition')throw Error('This draw is fixed. Create a new competition for new entries.');
  if(['mode','format','bestOf','finalBestOf','winPoints','consolation'].some(key=>p[key]!==undefined&&String(p[key])!==String(c[key])))throw Error('Draw settings are fixed. You can still edit the name and rules.');
  const previousName=c.name;configureCompetition(c,{name:p.name,rules:p.rules});
  if(c.plate&&c.name!==previousName)c.plate.name=c.name+' · Plate';
  return;
 }
 if(action==='editCompetition')configureCompetition(c,p);
 if(action==='closeEntries')c.status='closed';
 if(action==='reopenEntries')c.status='open';
 if(action==='drawCompetition'){
  if(c.mode==='pairs'&&c.entries.length%2)throw Error('One more player needed. Add a reserve or reopen entries before drawing.');
  const minimum=c.mode==='pairs'?4:2;
  if(c.entries.length<minimum)throw Error(`At least ${minimum} players must enter before drawing.`);
  if(new Set(c.entries).size!==c.entries.length||c.entries.some(id=>!s.players.some(p=>p.id===id)))throw Error('The entry list contains an invalid player.');
  // Each competition shuffles only its own signed-up entrants, once.
  const entrants=shuffle(c.entries);
  const teams=c.mode==='pairs'?Array.from({length:entrants.length/2},(_,i)=>({id:uid(),members:entrants.slice(i*2,i*2+2)})):entrants.map(id=>({id,members:[id]}));
  const fixture=(a,b,round)=>({id:uid(),a,b,round,status:'open',bestOf:c.bestOf});
  let fixtures=[],rounds=[];
  if(c.format==='league'){
   const ring=teams.map(t=>t.id);if(ring.length%2)ring.push(null);
   for(let round=1;round<ring.length;round++){
    for(let i=0;i<ring.length/2;i++){const a=ring[i],b=ring[ring.length-1-i];if(a&&b)fixtures.push(fixture(a,b,round));}
    ring.splice(1,0,ring.pop());
   }
  }else{
   const temp={settings:{frames:c.bestOf,finalFrames:c.finalBestOf},cups:[]};
   rounds=createCup(temp,c.name,teams.map(t=>t.id)).rounds;
  }
  Object.assign(c,{teams,fixtures,rounds,status:'drawn',drawnAt:new Date().toISOString()});
 }
}
function advanceCompetition(c) {
 if(c.format!=='knockout')return;
 advanceCup(c,c.teams.filter(t=>t.withdrawn).map(t=>t.id));if(c.plate){attachPlateSources(c,c.plate);syncPlate(c,c.plate);advanceCup(c.plate,c.teams.filter(t=>t.withdrawn).map(t=>t.id));}
 if(c.consolation&&!c.plateCreated&&c.rounds[0].every(m=>['complete','bye','void'].includes(m.status))){
  const losers=c.rounds[0].filter(m=>m.status==='complete'&&!m.walkover).map(m=>m.winner===m.a?m.b:m.a);
  c.plateCreated=true;
  if(losers.length>1){c.plate=createCup({settings:{frames:c.bestOf,finalFrames:c.finalBestOf},cups:[]},c.name+' · Plate',losers,true);attachPlateSources(c,c.plate);}
 }
}

// Resolve fixed brackets from their saved draw. Changed feeders invalidate only
// dependent matches; unrelated approved results and match IDs are preserved.
function resetResult(m) {delete m.score;delete m.winner;delete m.walkover;delete m.withdrawalReason;m.status='waiting';}
function reconcileBracket(cup, withdrawn = new Set()) {
 for(let r=0;r<cup.rounds.length;r++)for(let i=0;i<cup.rounds[r].length;i++){
  const m=cup.rounds[r][i];let ready=true;
  if(r){const previous=cup.rounds[r-1],left=previous[i*2],right=previous[i*2+1];
   const a=left.winner||null,b=right.winner||null;
   if((m.a||null)!==a||(m.b||null)!==b)resetResult(m);
   m.a=a;m.b=b;ready=[left,right].every(x=>['complete','bye','void'].includes(x.status));
  }else if(m.sources){ready=!m.sourceWaiting;}
  if(!ready){if(m.status!=='complete')m.status='waiting';continue;}
  if(m.status==='complete')continue;
  const active=[m.a,m.b].filter(id=>id&&!withdrawn.has(id));
  if(!active.length){resetResult(m);m.status='void';}
  else if(m.a&&m.b&&active.length===2){m.status='open';delete m.winner;}
  else if(m.a&&m.b){const goal=Math.ceil(m.bestOf/2);m.status='complete';m.winner=active[0];m.score=m.a===active[0]?[goal,0]:[0,goal];m.walkover=true;}
  else {m.status='bye';m.winner=active[0];delete m.score;}
 }
}
function attachPlateSources(parent,plate){
 for(const m of plate.rounds[0]){
  m.sources??={};
  for(const side of ['a','b'])if(m[side]&&!m.sources[side]){
   const source=parent.rounds[0].find(x=>x.status==='complete'&&[x.a,x.b].includes(m[side])&&x.winner!==m[side]);
   if(source)m.sources[side]=source.id;
  }
 }
}
function syncPlate(parent,plate){
 for(const m of plate.rounds[0])m.sourceWaiting=Object.values(m.sources||{}).some(id=>!['complete','bye','void'].includes(parent.rounds[0].find(x=>x.id===id)?.status));
 for(const m of plate.rounds[0])for(const side of ['a','b'])if(m.sources?.[side]){
  const source=parent.rounds[0].find(x=>x.id===m.sources[side]);
  const loser=source?.status==='complete'&&!source.walkover?(source.winner===source.a?source.b:source.a):null;
  if(m[side]!==loser){resetResult(m);m[side]=loser;}
 }
}
function legacyPlate(s,c){return s.cups.find(p=>p.parentCupId===c.id)||s.cups.find(p=>p.consolation&&p.name===c.name+' · Plate');}
function advanceLegacyCup(s,c){
 advanceCup(c,c.withdrawnSides||[]);
 if(c.consolation)return;
 let plate=legacyPlate(s,c);
 if(!c.consolationCreated&&s.settings.consolation&&c.rounds[0].every(m=>['complete','bye','void'].includes(m.status))){
  c.consolationCreated=true;const losers=c.rounds[0].filter(m=>m.status==='complete'&&!m.walkover).map(m=>m.winner===m.a?m.b:m.a);
  if(losers.length>1){plate=createCup(s,c.name+' · Plate',losers,true);plate.parentCupId=c.id;}
 }
 if(plate){attachPlateSources(c,plate);syncPlate(c,plate);advanceCup(plate,plate.withdrawnSides||[]);}
}

function resultSnapshot(m){return {a:m.a,b:m.b,status:m.status,score:m.score||null,winner:m.winner||null,walkover:!!m.walkover};}
function audit(s,action,user,details){
 s.auditLog??=[];s.auditLog.unshift({id:uid(),action,actor:user.id||user.name||'Mr French',at:new Date().toISOString(),...details});s.auditLog=s.auditLog.slice(0,500);
}
function operationReason(value){if(typeof value!=='string'||!value.trim()||value.length>300)throw Error('Enter a reason of 1–300 characters.');return value.trim();}
function correctResult(s,p,user){
 const reason=operationReason(p.reason),m=findMatch(s,p.id);
 if(!m||m.status!=='complete')throw Error('Choose an approved result to correct.');
 if(m.walkover)throw Error('This is a withdrawal walkover. Restore the backup from before withdrawal to undo it.');
 if(p.score!==null)validateScore({...m,status:'open'},p.score);
 const before=resultSnapshot(m),oldMatches=new Map(allMatches(s).map(x=>[x.id,JSON.stringify(resultSnapshot(x))]));
 const c=competitionForMatch(s,m.id),cup=s.cups.find(c=>c.rounds.flat().includes(m));
 const parent=c?.format==='knockout'?c:cup&&!cup.consolation?cup:null;
 const plate=parent?(c?c.plate:legacyPlate(s,parent)):null;
 if(plate)attachPlateSources(parent,plate);
 resetResult(m);m.status='open';
 if(p.score!==null){m.score=[...p.score];m.status='complete';m.winner=p.score[0]>p.score[1]?m.a:m.b;}
 if(c?.format==='knockout')advanceCompetition(c);
 else if(cup)advanceLegacyCup(s,cup);
 const changed=allMatches(s).filter(x=>oldMatches.get(x.id)!==JSON.stringify(resultSnapshot(x))).map(x=>x.id);
 s.submissions=s.submissions.filter(x=>!changed.includes(x.match));
 audit(s,'correctResult',user,{matchId:m.id,reason,before,after:resultSnapshot(m),affectedMatches:changed});
}
function awardWithdrawal(matches,side,withdrawn){
 for(const m of matches)if(m.status==='open'&&[m.a,m.b].includes(side)){
  const other=m.a===side?m.b:m.a;
  if(withdrawn.has(other)){resetResult(m);m.status='void';continue;}
  const goal=Math.ceil(m.bestOf/2);m.score=m.a===other?[goal,0]:[0,goal];m.status='complete';m.winner=other;m.walkover=true;
 }
}
function withdrawPlayer(s,p,user){
 const reason=operationReason(p.reason),player=s.players.find(x=>x.id===p.playerId);
 if(!player)throw Error('Choose a registered player.');
 const c=s.competitions.find(x=>x.id===p.competitionId),legacyCup=s.cups.find(x=>x.id===p.competitionId);
 let target,side,matches;
 const before=new Map(allMatches(s).map(x=>[x.id,JSON.stringify(resultSnapshot(x))]));
 if(c){
  if(c.status!=='drawn')throw Error('Use Manage entries to remove a player before drawing.');
  const team=c.teams.find(t=>t.members.includes(player.id));if(!team)throw Error('This player is not in this draw.');
  if(team.withdrawn)throw Error('This player or pair is already withdrawn.');
  target=c;side=team.id;team.withdrawn=true;matches=competitionMatches(c);
  c.withdrawals??=[];c.withdrawals.push({playerId:player.id,teamId:side,at:new Date().toISOString(),reason});
  const withdrawn=new Set(c.teams.filter(t=>t.withdrawn).map(t=>t.id));
  if(c.format==='league')awardWithdrawal(c.fixtures,side,withdrawn);else advanceCompetition(c);
 }else if(p.competitionId==='legacy-league'){
  if(!s.league.some(m=>[m.a,m.b].includes(player.id)))throw Error('This player is not in this league.');
  s.leagueWithdrawals??=[];if(s.leagueWithdrawals.includes(player.id))throw Error('This player is already withdrawn.');
  s.leagueWithdrawals.push(player.id);target={id:'legacy-league'};side=player.id;matches=s.league;awardWithdrawal(matches,side,new Set(s.leagueWithdrawals));
 }else if(legacyCup){
  if(!legacyCup.rounds[0].some(m=>[m.a,m.b].includes(player.id)))throw Error('This player is not in this cup.');
  legacyCup.withdrawnSides??=[];if(legacyCup.withdrawnSides.includes(player.id))throw Error('This player is already withdrawn.');
  legacyCup.withdrawnSides.push(player.id);target=legacyCup;side=player.id;matches=legacyCup.rounds.flat();advanceLegacyCup(s,legacyCup);
  const plate=legacyPlate(s,legacyCup);if(plate){plate.withdrawnSides??=[];plate.withdrawnSides.push(player.id);advanceCup(plate,plate.withdrawnSides);matches=matches.concat(plate.rounds.flat());}
 }else throw Error('Competition not found.');
 const changed=allMatches(s).filter(x=>before.get(x.id)!==JSON.stringify(resultSnapshot(x))).map(x=>x.id);
 s.submissions=s.submissions.filter(x=>!changed.includes(x.match)&&!matches.some(m=>m.id===x.match&&[m.a,m.b].includes(side)));
 audit(s,'withdrawPlayer',user,{competitionId:target.id,playerId:player.id,sideId:side,reason,affectedMatches:changed});
}
