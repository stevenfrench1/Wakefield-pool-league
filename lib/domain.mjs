export const uid = () => globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
export const defaults = { name: 'Wakefield Pool Club', season: 'The inaugural season', frames: 1, finalFrames: 1, winPoints: 3, divisionSize: 11, approval: true, consolation: true, rules: 'Seven-ball pool. Agree school rules before breaking.', logo: '' };
export function initialState(demo = false) {
  const names = demo ? ['Mr French','George','Oliver W.','Harry S.','Jack B.','Charlie H.','Leo M.','Oscar T.','Arthur C.','Noah P.','Alfie R.','Freddie L.','Henry D.','Theo A.','Archie K.','Thomas G.','James E.','William N.','Edward F.','Joshua V.','Max I.','Samuel J.','Isaac O.','Lucas U.','Jacob Y.','Daniel Z.','Joseph W.','Toby S.','Finley B.','Ethan H.','Benjamin M.','Hugo T.','Alexander C.','Reuben P.','Sebastian R.','Louis L.','Rory D.','Jude A.','Felix K.','Albert G.','Adam E.','Luke N.'] : ['Mr French','George'];
  const state = { settings: { ...defaults }, players: names.map((name,i) => ({ id: demo ? `p${i}` : uid(), name, rating: 0 })), league: [], divisions: [], cups: [], submissions: [], activity: [] };
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
export function advanceCup(cup) {
  for(let r=0;r<cup.rounds.length-1;r++) for(let i=0;i<cup.rounds[r].length;i+=2) {
    const x=cup.rounds[r][i], y=cup.rounds[r][i+1], target=cup.rounds[r+1][i/2];
    if(x.winner)target.a=x.winner;if(y.winner)target.b=y.winner;
    if(target.a && target.b && target.status==='waiting')target.status='open';
  }
}
export function findMatch(s,id) { return s.league.find(m=>m.id===id) || s.cups.flatMap(c=>c.rounds.flat()).find(m=>m.id===id); }
export function validateScore(match,score) {
  if(!match || match.status!=='open')throw Error('This match is no longer available.');
  const goal=Math.floor(match.bestOf/2)+1;
  if(!Array.isArray(score)||score.length!==2||!score.every(n=>Number.isInteger(n)&&n>=0&&n<=goal)||Math.max(...score)!==goal||Math.min(...score)>=goal)throw Error(`Enter a valid best-of-${match.bestOf} result.`);
}
export function applyResult(s,id,score) {
  const m=findMatch(s,id); validateScore(m,score);m.score=score;m.status='complete';m.winner=score[0]>score[1]?m.a:m.b;
  for(const c of [...s.cups]) if(c.rounds.flat().includes(m)) {
    advanceCup(c);
    if(!c.consolation && s.settings.consolation && !c.consolationCreated && c.rounds[0].every(m=>['complete','bye'].includes(m.status))) {
      c.consolationCreated=true; const losers=c.rounds[0].filter(m=>m.status==='complete').map(m=>m.winner===m.a?m.b:m.a);
      if(losers.length>1)createCup(s,`${c.name} · Plate`,losers,true);
    }
  }
}
export function promote(s) {
  if(!s.league.length || s.league.some(m=>m.status!=='complete'))throw Error('Complete every league fixture before starting the next season.');
  const ranking=s.divisions.map(d=>standings(s,d.id).map(p=>p.id));
  for(let i=0;i<ranking.length-1;i++) {const lowerWinner=ranking[i+1][0],upperLast=ranking[i].at(-1);ranking[i][ranking[i].length-1]=lowerWinner;ranking[i+1][0]=upperLast;}
  s.history??=[];s.history.push({season:s.settings.season,divisions:structuredClone(s.divisions),league:structuredClone(s.league)});
  ranking.flat().forEach((id,i)=>{s.players.find(p=>p.id===id).rating=ranking.flat().length-i;});
  // Preserve promoted division membership rather than rebalance it.
  s.league=[];s.submissions=s.submissions.filter(x=>x.kind!=='league');
  s.divisions.forEach((d,i)=>d.players=ranking[i]);
  for(const d of s.divisions)for(let a=0;a<d.players.length;a++)for(let b=a+1;b<d.players.length;b++)s.league.push({id:uid(),division:d.id,round:1,a:d.players[a],b:d.players[b],status:'open',bestOf:s.settings.frames});
  s.settings.season='Season '+((s.history.length||0)+1);
}
export function act(s,action,payload,user) {
  const admin=user?.role==='admin';
  if(!user)throw Error('Sign in first.');
  if(action==='submit') {
    const m=findMatch(s,payload.id);validateScore(m,payload.score);
    if(!admin && ![m.a,m.b].includes(user.id))throw Error('You can only submit your own matches.');
    if(s.submissions.some(x=>x.match===m.id))throw Error('This match already has a result awaiting approval.');
    if(!s.settings.approval)applyResult(s,m.id,payload.score);
    else s.submissions.push({id:uid(),match:m.id,score:payload.score,by:user.id||'admin',at:new Date().toISOString(),kind:s.league.includes(m)?'league':'cup'});
  } else {
    if(!admin)throw Error('Administrator access required.');
    if(action==='approve'||action==='reject') {
      const sub=s.submissions.find(x=>x.id===payload.id);if(!sub)throw Error('Submission not found.');
      if(action==='approve')applyResult(s,sub.match,sub.score);s.submissions=s.submissions.filter(x=>x.id!==sub.id);
    } else if(action==='settings') {
      const p=payload;
      for(const key of ['name','season','rules'])if(typeof p[key]==='string')s.settings[key]=p[key].trim().slice(0,300);
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
  s.activity.unshift({text:({submit:'Result submitted',approve:'Result approved',reject:'Result returned for correction',league:'League fixtures generated',cup:'Cup draw created',promote:'New league season started',settings:'Club settings updated',addPlayers:'Players added',player:'Player updated'})[action],at:new Date().toISOString()});s.activity=s.activity.slice(0,30);return s;
}
