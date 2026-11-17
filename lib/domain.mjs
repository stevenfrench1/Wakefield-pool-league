export const uid = () => globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
export const APP_NAME = 'Wakefield Pool Championship';
export const SCHOOL_POOL_RULES = [
 "1. Winning: Clear your colours, then pot the black into a pocket nominated aloud before each attempt.",
 "2. Early black: Potting the black before your colours are cleared loses the frame, including on the break or alongside your final colour.",
 "3. Wrong ball first: Potting the black after hitting an opponent’s ball first loses the frame, even accidentally.",
 "4. White and black: Potting both on one shot loses the frame, whichever drops first and whatever pocket was nominated.",
 "5. Other black-ball losses: Potting the black into an unnominated pocket, potting it while committing any foul, or knocking it off the table loses the frame.",
 "6. Fouls: Potting the white, hitting the wrong ball first, missing all balls, touching a ball or knocking one off the table.",
 "7. Legal shots: Hit your colour first (the black only once your colours are cleared). Then pot a ball or make any ball reach a cushion.",
 "8. Foul shots: The opponent receives two additional shots. Unused awarded shots carry over when potting; further awards accumulate. A foul ends your turn.",
 "9. White-ball placement: After the white is potted or leaves the table, the opponent may place it anywhere.",
 "10. Colours: The first legal colour potted after the break decides colours. If both fall, choose. Until then, either colour may be hit first.",
 "11. Continuing play: A legal pot of your colour continues your turn. An opponent’s ball stays down but earns no extra shot. Replace accidentally moved balls as closely as possible.",
 "12. Break: At least two object balls must reach a cushion unless a ball is potted; otherwise it is a foul. An early black still loses.",
 "13. Disputes: Players must try to agree first. Unresolved disputes go to Mr French, whose decision is final."
].join('\n\n');
const PREVIOUS_SCHOOL_POOL_RULES = [
 '1. Nominate the pocket before playing the shot to pot the black. To win the frame, the black must go into that pocket.',
 '2. Shots awarded after a foul carry over when you pot a ball. Potting does not use up an awarded shot.',
 '3. Potting the black before clearing all your own balls loses the frame under all circumstances.',
 '4. When on the black, you lose the frame if the cue ball hits an opponent\'s ball first and the black is potted on the same shot, even accidentally.',
 '5. Potting the white and the black on the same shot loses the frame, even if the black goes into the nominated pocket. The order in which they are potted makes no difference.',
 '6. Disputes must be resolved between the players involved. If they cannot agree, Mr French will act as arbitrator. His decision is final.'
].join('\n\n');
const LEGACY_POOL_RULES = 'Seven-ball pool. Agree school rules before breaking.';
export const defaults = { name: APP_NAME, season: 'The inaugural season', frames: 1, finalFrames: 1, winPoints: 3, divisionSize: 11, approval: true, consolation: true, rules: SCHOOL_POOL_RULES, logo: '' };
// Full days without pupils, from kesw.org/about-our-school/term-dates/
// (2026–27 page checked 16 November 2026). Administrators can edit the periods.
export const BREAKTHROUGH_HOLIDAYS = [
 {start:'2026-10-17',end:'2026-11-01'},
 {start:'2026-12-12',end:'2027-01-05'},
 {start:'2027-02-13',end:'2027-02-21'},
 {start:'2027-03-26',end:'2027-04-18'},
 {start:'2027-05-29',end:'2027-06-06'}
];
export const MATCH_HIGHLIGHTS = [
 {id:'triple-threat',name:'Triple Threat',description:'Pot at least three of your colours in one visit without missing or fouling.',points:30,major:false,icon:'ball',requiresWin:false},
 {id:'clearance',name:'Clearance',description:'Clear all your remaining colours (at least one), then legally pot the nominated black in one visit without missing or fouling.',points:50,major:true,icon:'spark',requiresWin:true},
 {id:'against-the-odds',name:'Against the Odds',description:'Legally pot the nominated black to win a frame while the opposing side still has all seven colours on the table.',points:70,major:true,icon:'trophy',requiresWin:true}
];
// Achievement points never contribute to competition standings.
export const BREAKTHROUGHS = [
 ['first-win','First Break','Win your first played match.','wins',1,20,false,'ball'],
 ['wins-5','Finding Your Angle','Win 5 played matches.','wins',5,30,false,'ball'],
 ['wins-10','Pocket Rocket','Win 10 played matches.','wins',10,50,true,'trophy'],
 ['wins-25','Table Legend','Win 25 played matches.','wins',25,100,true,'crown'],
 ['played-1','On the Table','Complete your first played match.','played',1,10,false,'ball'],
 ['played-5','Regular Cue','Complete 5 played matches.','played',5,20,false,'ball'],
 ['played-20','Table Time','Complete 20 played matches.','played',20,50,true,'clock'],
 ['played-50','Club Fixture','Complete 50 played matches.','played',50,100,true,'shield'],
 ['opponents-5','Mix It Up','Play against 5 different opponents.','opponents',5,30,false,'players'],
 ['opponents-10','Across the House','Play against 10 different opponents.','opponents',10,50,true,'players'],
 ['opponents-20','Everyone Knows Your Game','Play against 20 different opponents.','opponents',20,100,true,'players'],
 ['singles-3','Hat-trick','Win 3 consecutive dated singles matches.','singlesBest',3,30,false,'flame'],
 ['singles-5','On Fire','Win 5 consecutive dated singles matches.','singlesBest',5,60,true,'flame'],
 ['singles-10','Unstoppable','Win 10 consecutive dated singles matches.','singlesBest',10,120,true,'flame'],
 ['pairs-3','Double Trouble','Win 3 consecutive dated pairs matches.','pairsBest',3,40,false,'players'],
 ['pairs-5','Perfect Partnership','Win 5 consecutive dated pairs matches.','pairsBest',5,70,true,'players'],
 ['weeks-2','Back for More','Play in 2 consecutive school weeks.','weeklyBest',2,20,false,'calendar'],
 ['weeks-4','Four Week Form','Play in 4 consecutive school weeks.','weeklyBest',4,50,true,'calendar'],
 ['weeks-8','House Regular','Play in 8 consecutive school weeks.','weeklyBest',8,100,true,'calendar'],
 ['bounce-back','Bounce Back','Win after at least 3 consecutive dated defeats in the same format.','bounceBack',1,40,false,'refresh'],
 ['improvement','Raising the Bar','In either format, win at least 2 more of your latest 5 matches than the previous 5.','improvement',1,60,true,'arrowUp'],
 ['singles-title','Solo Crown','Win a completed singles competition with a played win.','singlesTitles',1,100,true,'crown'],
 ['pairs-title','Two of a Kind','Win a completed pairs competition with a played win.','pairsTitles',1,100,true,'crown'],
 ['fair-play','Fair Play','Awarded by Mr French for fair play.','fair-play',1,50,true,'shield'],
 ['helping-hand','Helping Hand','Awarded by Mr French for helping other players.','helping-hand',1,50,true,'players'],
 ['house-spirit','House Spirit','Awarded by Mr French for kindness and contribution.','house-spirit',1,50,true,'shield']
].map(([id,name,description,metric,target,points,major,icon])=>({id,name,description,metric,target,points,major,icon})).concat(MATCH_HIGHLIGHTS.map(h=>({...h,metric:h.id,target:1})));
const btBadge=id=>BREAKTHROUGHS.find(b=>b.id===id);
const btOwner=(s,u)=>u?.role==='admin'?administratorPlayer(s)?.id:u?.role==='player'?u.id:null;

const highlightMatches=s=>[...(s.history||[]).flatMap(h=>h.league||[]),...allMatches(s)];
const highlightMatch=(s,id)=>highlightMatches(s).find(m=>m.id===id);
const highlightMembers=(s,h)=>[...sideMembers(s,h.a),...sideMembers(s,h.b)];
const highlightOpponents=(s,h)=>sideMembers(s,sideMembers(s,h.a).includes(h.playerId)?h.b:h.a);
const highlightCurrent=(m,h)=>m&&m.a===h.a&&m.b===h.b&&m.status==='complete'&&!m.walkover&&JSON.stringify(m.score)===JSON.stringify(h.score);
export function matchHighlightStatus(h){
 if(h.invalidatedAt)return 'invalidated';
 if(h.review)return h.review.decision==='approve'?'approved':'rejected';
 if(h.responses.some(r=>r.decision==='dispute'))return 'disputed';
 return h.responses.some(r=>r.decision==='confirm')?'confirmed':'awaiting-opponent';
}
export function matchHighlightsForUser(s,user){
 const id=btOwner(s,user);
 return (s.matchHighlights||[]).filter(h=>user?.role==='admin'||highlightMembers(s,h).includes(id)||matchHighlightStatus(h)==='approved').map(h=>{
  if(user?.role==='admin'||highlightMembers(s,h).includes(id))return structuredClone(h);
  const {id:claimId,matchId,playerId,kind,frame,a,b,score,at,review}=h;
  return {id:claimId,matchId,playerId,kind,frame,a,b,score,at,responses:[],review:{decision:'approve',at:review.at}};
 });
}
function prepareMatchHighlights(s,m,score,declarations,u){
 if(declarations===undefined)return [];
 if(!Array.isArray(declarations)||declarations.length>12)throw Error('Choose up to 12 match highlights.');
 const members=[...sideMembers(s,m.a),...sideMembers(s,m.b)],seen=new Set();
 const claims=declarations.map(d=>{
  if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Choose a match highlight and player.');
  const kind=MATCH_HIGHLIGHTS.find(h=>h.id===d.kind),key=d.playerId+':'+d.kind;
  if(!kind||!members.includes(d.playerId))throw Error('Choose a highlight for someone who played this match.');
  if(!Number.isInteger(d.frame)||d.frame<1||d.frame>score[0]+score[1])throw Error('Choose a frame that was played in this match.');
  const index=sideMembers(s,m.a).includes(d.playerId)?0:1;
  if(kind.requiresWin&&!score[index])throw Error('This highlight requires that player or pair to have won a frame.');
  if(seen.has(key)||(s.matchHighlights||[]).some(h=>h.matchId===m.id&&h.playerId===d.playerId&&h.kind===d.kind&&!['rejected','invalidated'].includes(matchHighlightStatus(h))))throw Error('This match already has that player’s highlight.');
  seen.add(key);
  return {id:uid(),matchId:m.id,playerId:d.playerId,kind:d.kind,frame:d.frame,a:m.a,b:m.b,score:[...score],declaredBy:u.role==='admin'?'admin':u.id,at:new Date().toISOString(),responses:[]};
 });
 return claims;
}
function invalidateMatchHighlights(s,ids){
 for(const h of s.matchHighlights||[])if(ids.includes(h.matchId)&&!h.invalidatedAt)h.invalidatedAt=new Date().toISOString();
}
function matchHighlightAction(s,action,p,u){
 const h=(s.matchHighlights||[]).find(h=>h.id===p.id);
 if(!h||h.invalidatedAt)throw Error('This match highlight is no longer available.');
 const status=matchHighlightStatus(h);
 if(action==='respondMatchHighlight'){
  const id=btOwner(s,u);
  if(!highlightOpponents(s,h).includes(id))throw Error('Only a player on the opposing side can confirm or dispute this highlight.');
  if(h.review)throw Error('Mr French has already reviewed this highlight.');
  if(!['confirm','dispute'].includes(p.decision))throw Error('Confirm or dispute this highlight.');
  const reason=p.decision==='dispute'?operationReason(p.reason):'';
  h.responses=h.responses.filter(r=>r.by!==id);
  h.responses.push({by:id,decision:p.decision,reason,at:new Date().toISOString()});
 }else{
  if(u.role!=='admin')throw Error('Administrator access required.');
  if(action==='revokeMatchHighlight'){
   if(status!=='approved')throw Error('Choose an approved match highlight.');
   h.review={by:'admin',decision:'reject',reason:operationReason(p.reason),at:new Date().toISOString()};
  }else{
   if(h.review)throw Error('This match highlight has already been reviewed.');
   if(!['approve','reject'].includes(p.decision))throw Error('Approve or reject this highlight.');
   if(p.decision==='approve'){
    if(status!=='confirmed')throw Error('The opposing side must confirm this highlight before approval. Resolve any dispute first.');
    if(!highlightCurrent(highlightMatch(s,h.matchId),h))throw Error('Approve the matching played result before awarding this highlight.');
   }
   h.review={by:'admin',decision:p.decision,reason:p.decision==='reject'?operationReason(p.reason):'',at:new Date().toISOString()};
  }
 }
 const record=action==='respondMatchHighlight'?h.responses.find(r=>r.by===btOwner(s,u)):h.review;
 audit(s,action,u,{highlightId:h.id,matchId:h.matchId,playerId:h.playerId,decision:record.decision,...(record.reason?{reason:record.reason}:{})});
}
export function validateMatchHighlightsState(s){
 if(s.matchHighlights===undefined)return;
 const fail=()=>{throw Error('Invalid match highlight data.');};
 const list=(v,n)=>Array.isArray(v)&&v.length<=n,object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
 const date=v=>typeof v==='string'&&v.length<=30&&Number.isFinite(Date.parse(v));
 const reason=v=>typeof v==='string'&&v.length<=300;
 if(!list(s.matchHighlights,20000))fail();
 const ids=new Set(),keys=new Set();
 for(const h of s.matchHighlights){
  if(!object(h)||!id(h.id)||ids.has(h.id)||!id(h.matchId)||!id(h.playerId)||!MATCH_HIGHLIGHTS.some(k=>k.id===h.kind)||!id(h.a)||!id(h.b)||h.a===h.b||!date(h.at)||!list(h.score,2)||h.score.length!==2||!h.score.every(n=>Number.isInteger(n)&&n>=0)||!Number.isInteger(h.frame)||h.frame<1||h.frame>h.score[0]+h.score[1]||!list(h.responses,2))fail();
  ids.add(h.id);
  const m=highlightMatch(s,h.matchId),members=highlightMembers(s,h),opponents=highlightOpponents(s,h);
  if(!m||!s.players.some(p=>p.id===h.playerId)||!members.includes(h.playerId)||(h.declaredBy!=='admin'&&!members.includes(h.declaredBy)))fail();
  validateScore({...m,status:'open'},h.score);
  if(MATCH_HIGHLIGHTS.find(k=>k.id===h.kind).requiresWin&&!h.score[sideMembers(s,h.a).includes(h.playerId)?0:1])fail();
  if(new Set(h.responses.map(r=>r?.by)).size!==h.responses.length||h.responses.some(r=>!object(r)||!opponents.includes(r.by)||!['confirm','dispute'].includes(r.decision)||!date(r.at)||!reason(r.reason)||(r.decision==='dispute'&&!r.reason.trim())))fail();
  if(h.review!==undefined&&(!object(h.review)||h.review.by!=='admin'||!['approve','reject'].includes(h.review.decision)||!date(h.review.at)||!reason(h.review.reason)||(h.review.decision==='reject'&&!h.review.reason.trim())||(h.review.decision==='approve'&&(!h.responses.some(r=>r.decision==='confirm')||h.responses.some(r=>r.decision==='dispute')))))fail();
  if(h.invalidatedAt!==undefined&&!date(h.invalidatedAt))fail();
  const status=matchHighlightStatus(h),key=h.matchId+':'+h.playerId+':'+h.kind;
  if(!['rejected','invalidated'].includes(status)){if(keys.has(key)||m.a!==h.a||m.b!==h.b||(m.status==='complete'&&!highlightCurrent(m,h))||!['open','complete'].includes(m.status))fail();keys.add(key);}
  if(!['rejected','invalidated'].includes(status)&&m.status==='open'&&!s.submissions.some(sub=>sub.match===m.id&&JSON.stringify(sub.score)===JSON.stringify(h.score)))fail();
  if(status==='approved'&&!highlightCurrent(m,h))fail();
 }
}
const btDateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'});
const btDay=value=>btDateFormat.format(new Date(value));
const btMonday=day=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
const btAddDays=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const btHoliday=(day,holidays)=>holidays.some(h=>day>=h.start&&day<=h.end);
const btSchoolWeek=(monday,holidays)=>Array.from({length:5},(_,i)=>btAddDays(monday,i)).some(day=>!btHoliday(day,holidays));
export function weeklyPlayingStreak(dates,holidays=[],now=new Date().toISOString()){
 const weeks=new Set(dates.filter(d=>Number.isFinite(Date.parse(d))&&d<=now&&!btHoliday(btDay(d),holidays)).map(d=>btMonday(btDay(d))));
 const currentWeek=btMonday(btDay(now));
 let current=0,best=0,run=0;
 const first=[...weeks].sort()[0];
 if(first)for(let week=first;week<=currentWeek;week=btAddDays(week,7)){
  if(!btSchoolWeek(week,holidays))continue;
  if(weeks.has(week)){run++;best=Math.max(best,run);}
  else if(week!==currentWeek)run=0;
 }
 current=run;
 return {current,best,playedThisWeek:weeks.has(currentWeek),paused:btHoliday(btDay(now),holidays)};
}
export function breakthroughMetrics(s,now=new Date().toISOString()){
 const metrics=Object.fromEntries(s.players.map(p=>[p.id,{played:0,wins:0,opponents:new Set(),singles:0,pairs:0,singlesBest:0,pairsBest:0,weekly:0,weeklyBest:0,bounceBack:0,improvement:0,singlesTitles:0,pairsTitles:0,dates:[],results:{singles:[],pairs:[]}}]));
 const matches=[...(s.history||[]).flatMap(h=>h.league||[]),...allMatches(s)];
 const unique=[...new Map(matches.map(m=>[m.id,m])).values()];
 const played=unique.filter(m=>m.status==='complete'&&!m.walkover&&m.a&&m.b&&m.score?.length===2&&m.score[0]!==m.score[1]).sort((a,b)=>(Date.parse(a.resultAt)||0)-(Date.parse(b.resultAt)||0)||a.id.localeCompare(b.id));
 for(const m of played)for(const [side,index] of [[m.a,0],[m.b,1]]){
  const members=sideMembers(s,side),opponents=sideMembers(s,index?m.a:m.b),mode=members.length===2?'pairs':'singles';
  for(const id of members){
   const p=metrics[id];if(!p)continue;p.played++;const win=m.score[index]>m.score[1-index];p.wins+=Number(win);
   for(const opponent of opponents)if(opponent!==id)p.opponents.add(opponent);
   if(Number.isFinite(Date.parse(m.resultAt))&&m.resultAt<=now){p.dates.push(m.resultAt);p.results[mode].push(win);}
  }
 }
 for(const p of Object.values(metrics)){
  p.opponents=p.opponents.size;
  for(const mode of ['singles','pairs']){
   let run=0,losses=0;
   for(const [i,win] of p.results[mode].entries()){
    if(win&&losses>=3)p.bounceBack=1;
    run=win?run+1:0;losses=win?0:losses+1;p[mode+'Best']=Math.max(p[mode+'Best'],run);
    if(i>=9){const results=p.results[mode],previous=results.slice(i-9,i-4).filter(Boolean).length,latest=results.slice(i-4,i+1).filter(Boolean).length;if(latest>=previous+2)p.improvement=1;}
   }
   p[mode]=run;
  }
  const weeks=weeklyPlayingStreak(p.dates,s.breakthroughs?.holidays||[],now);
  p.weekly=weeks.current;p.weeklyBest=weeks.best;p.playedThisWeek=weeks.playedThisWeek;p.paused=weeks.paused;
 }
 const title=(winner,mode,matches)=>{if(!winner)return;for(const id of sideMembers(s,winner))if(metrics[id]&&matches.some(m=>m.status==='complete'&&!m.walkover&&m.score&&sideMembers(s,m.score[0]>m.score[1]?m.a:m.b).includes(id)))metrics[id][mode+'Titles']++;};
 for(const c of s.competitions||[]){
  if(c.status!=='drawn')continue;
  if(c.format==='knockout'){title(c.rounds.at(-1)?.[0]?.winner,c.mode,competitionMatches(c));if(c.plate)title(c.plate.rounds.at(-1)?.[0]?.winner,c.mode,c.plate.rounds.flat());}
  else if(c.fixtures.length&&c.fixtures.every(m=>['complete','void'].includes(m.status))){
   const rows=competitionStandings(s,c),top=rows[0],next=rows[1];
   const uniqueLeader=top&&(!next||top.points>next.points||(c.bestOf===1?!top.tied:(top.for-top.against)!==(next.for-next.against)||top.won!==next.won));
   if(uniqueLeader)title(top.id,c.mode,c.fixtures);
  }
 }
 for(const cup of s.cups)title(cup.rounds.at(-1)?.[0]?.winner,'singles',cup.rounds.flat());
 for(const h of s.matchHighlights||[])if(matchHighlightStatus(h)==='approved'&&highlightCurrent(unique.find(m=>m.id===h.matchId),h)&&metrics[h.playerId])metrics[h.playerId][h.kind]=1;
 for(const manual of s.breakthroughs?.sportsmanship||[])if(metrics[manual.playerId])metrics[manual.playerId][manual.kind]=1;
 return metrics;
}
export function breakthroughProgress(s,id,now=new Date().toISOString(),metrics=breakthroughMetrics(s,now)){
 const p=metrics[id];if(!p)return null;
 const awards=s.breakthroughs?.awards?.[id]||[];
 const badges=BREAKTHROUGHS.map(b=>({...b,earned:awards.some(a=>a.id===b.id),earnedAt:awards.find(a=>a.id===b.id)?.at,progress:Math.min(b.target,p[b.metric]||0)}));
 const points=badges.filter(b=>b.earned).reduce((sum,b)=>sum+b.points,0),level=Math.floor(points/100)+1;
 const title=level>=11?'House Legend':level>=8?'Table Master':level>=5?'Cue Captain':level>=3?'Contender':'Challenger';
 return {metrics:p,badges,points,level,title,toNext:100-points%100,levelProgress:points%100,earned:badges.filter(b=>b.earned).length};
}
function btEvent(s,type,title,text,recipients,extra={}){
 const b=s.breakthroughs;
 const event={seq:++b.sequence,id:uid(),type,title,text,recipients,at:new Date().toISOString(),href:'#breakthroughs',...extra};
 b.events.unshift(event);b.events=b.events.slice(0,500);
 return event;
}
function btReconcile(s,catchup=false){
 const b=s.breakthroughs,now=new Date().toISOString(),metrics=breakthroughMetrics(s,now);
 for(const p of s.players){
  const old=b.awards[p.id]||[],earned=BREAKTHROUGHS.filter(badge=>(metrics[p.id]?.[badge.metric]||0)>=badge.target);
  b.awards[p.id]=earned.map(badge=>old.find(a=>a.id===badge.id)||{id:badge.id,at:now});
  const removed=old.filter(a=>!earned.some(badge=>badge.id===a.id));
  if(removed.length)b.events=b.events.filter(e=>e.playerId!==p.id||!removed.some(a=>a.id===e.awardId));
  const added=earned.filter(badge=>!old.some(a=>a.id===badge.id));
  if(catchup){if(added.length)btEvent(s,'catchup','Your Breakthroughs so far',added.length+' achievements earned from your existing approved results.',[p.id],{href:'#breakthroughs',count:added.length});}
  else{
   for(const badge of added){
    btEvent(s,'achievement',badge.name,badge.description,[p.id],{playerId:p.id,awardId:badge.id,major:badge.major});
    if(badge.major)btEvent(s,'milestone',p.name+' earned '+badge.name,badge.description,'all',{playerId:p.id,awardId:badge.id,exclude:[p.id],href:'#breakthroughs/'+p.id});
   }
   const oldPoints=old.reduce((n,a)=>n+(btBadge(a.id)?.points||0),0),points=earned.reduce((n,a)=>n+a.points,0);
   if(Math.floor(points/100)>Math.floor(oldPoints/100))btEvent(s,'level','Level '+(Math.floor(points/100)+1)+' reached',points+' achievement points earned.',[p.id],{major:true});
  }
 }
 // Removed test accounts must not leave personal records behind.
 for(const id of Object.keys(b.awards))if(!s.players.some(p=>p.id===id)){
  delete b.awards[id];delete b.receipts[id];
  b.events=b.events.filter(e=>e.playerId!==id).map(e=>({...e,...(Array.isArray(e.recipients)?{recipients:e.recipients.filter(value=>value!==id)}:{}),...(e.exclude?{exclude:e.exclude.filter(value=>value!==id)}:{})})).filter(e=>e.recipients==='all'||e.recipients.length);
 }
}
function beginBreakthroughAction(s){
 let baseline;
 if(!s.breakthroughs){
  baseline={version:1,launchedAt:new Date().toISOString(),holidays:structuredClone(BREAKTHROUGH_HOLIDAYS),awards:{},sportsmanship:[],sequence:0,events:[],receipts:{}};
  btReconcile({...s,breakthroughs:baseline},true);
 }
 return {baseline,highlightIds:new Set((s.matchHighlights||[]).map(h=>h.id)),submissions:structuredClone(s.submissions),openKnockouts:btOpenKnockouts(s),entries:Object.fromEntries(s.competitions.map(c=>[c.id,[...c.entries]]))};
}
function btOpenKnockouts(s){return [...s.cups.flatMap(c=>c.rounds.flat()),...(s.competitions||[]).filter(c=>c.format==='knockout').flatMap(competitionMatches)].filter(m=>m.status==='open'&&m.a&&m.b).map(m=>({id:m.id,a:m.a,b:m.b}));}
function btMatchAlert(s,m,type,title){
 if(!m)return;
 const ids=[...sideMembers(s,m.a),...sideMembers(s,m.b)],c=competitionForMatch(s,m.id);
 btEvent(s,type,title,sideName(s,m.a)+' vs '+sideName(s,m.b)+(c?' · '+c.name:''),ids,{href:c?'#competition/'+c.id:'#league'});
}
function finishBreakthroughAction(s,before,action,p,user){
 s.breakthroughs??=before.baseline;
 for(const h of s.matchHighlights||[])if(!before.highlightIds.has(h.id))btEvent(s,'highlight','Confirm a match highlight',sideName(s,h.playerId)+' · '+btBadge(h.kind).name+' · Frame '+h.frame,highlightOpponents(s,h),{href:'#alerts'});
 if(['respondMatchHighlight','reviewMatchHighlight','revokeMatchHighlight'].includes(action)){
  const h=s.matchHighlights.find(h=>h.id===p.id),status=matchHighlightStatus(h);
  btEvent(s,'highlight',status==='approved'?'Match highlight approved':status==='rejected'?'Match highlight declined':status==='disputed'?'Match highlight disputed':'Match highlight confirmed',sideName(s,h.playerId)+' · '+btBadge(h.kind).name,highlightMembers(s,h),{href:'#alerts'});
 }
 if(action==='approve'||action==='reject'){const sub=before.submissions.find(x=>x.id===p.id);btMatchAlert(s,sub&&findMatch(s,sub.match),action==='approve'?'result':'correction',action==='approve'?'Your result was approved':'Your result was returned for correction');}
 if(action==='recordResult')btMatchAlert(s,findMatch(s,p.id),'result','Mr French recorded your result');
 if(action==='correctResult'){
  for(const m of allMatches(s))if(m.id===p.id)btMatchAlert(s,m,'correction','An approved result was corrected');
 }
 if(['enterCompetitions','enterCompetition','leaveCompetition','addReserve','addLeaguePlayers','reviewLeagueEntryRequest'].includes(action)){
  for(const c of s.competitions){
   const old=before.entries[c.id]||[];
   for(const id of c.entries.filter(id=>!old.includes(id)))btEvent(s,'entry','Entry confirmed',c.name,[id],{href:'#competition/'+c.id});
   for(const id of old.filter(id=>!c.entries.includes(id)))btEvent(s,'entry','Entry withdrawn',c.name,[id],{href:'#competition/'+c.id});
  }
 }
 if(action==='reviewLeagueEntryRequest'&&p.decision==='decline'){
  const c=getCompetition(s,p.id);
  btEvent(s,'entry','League entry request declined',c.name,[p.playerId],{href:'#competition/'+c.id});
 }
 if(['createCompetition','closeEntries','reopenEntries'].includes(action)){
  const c=action==='createCompetition'?s.competitions.at(-1):s.competitions.find(c=>c.id===p.id);
  if(c)btEvent(s,'competition',action==='closeEntries'?'Competition entries closed':'Competition entries open',c.name,'all',{href:'#competition/'+c.id});
 }
 if(action==='drawCompetition'){
  const c=s.competitions.find(c=>c.id===p.id);
  for(const id of c.entries){const team=c.teams.find(t=>t.members.includes(id)),partner=team?.members.find(member=>member!==id);btEvent(s,'draw','Your competition has been drawn',c.name+(partner?' · Your partner: '+sideName(s,partner):''),[id],{href:'#competition/'+c.id});}
 }
 for(const m of btOpenKnockouts(s))if(!before.openKnockouts.some(old=>old.id===m.id&&old.a===m.a&&old.b===m.b))btMatchAlert(s,m,'opponent','Your knockout opponent is ready');
 if(['syncBreakthroughs','approve','submit','recordResult','correctResult','withdrawPlayer','drawCompetition','addLeaguePlayers','reviewLeagueEntryRequest','awardSportsmanship','revokeSportsmanship','reviewMatchHighlight','revokeMatchHighlight','setHolidays','removeTestAccount','promote','league','cup'].includes(action))btReconcile(s);
}
export function breakthroughAlerts(s,user){
 const id=btOwner(s,user),b=s.breakthroughs;if(!id||!b)return [];
 return (b.inbox||b.events||[]).filter(e=>!(e.exclude||[]).includes(id)&&(e.recipients==='all'||e.recipients?.includes(id)||!e.recipients));
}
export function breakthroughReceipt(s,user){const id=btOwner(s,user);return s.breakthroughs?.receipt||s.breakthroughs?.receipts?.[id]||{readThrough:0,read:[],seenThrough:0};}
export function breakthroughPublicState(s,user){
 const b=s.breakthroughs;if(!b)return undefined;
 const result={version:b.version,launchedAt:b.launchedAt,holidays:b.holidays,awards:b.awards,sequence:b.sequence};
 if(btOwner(s,user)){result.inbox=breakthroughAlerts(s,user).map(({recipients,exclude,...event})=>event);result.receipt=breakthroughReceipt(s,user);}
 if(user?.role==='admin')result.sportsmanship=b.sportsmanship;
 return result;
}
function breakthroughAction(s,action,p,u,baseline){
 const b=s.breakthroughs||baseline,id=btOwner(s,u);
 if((!id||!s.players.some(player=>player.id===id))&&u.role!=='admin')throw Error('Sign in as a registered player.');
 if(p.playerId!==undefined&&['readAlerts','seenCelebrations','syncBreakthroughs'].includes(action)&&p.playerId!==id)throw Error('You can only update your own alerts.');
 if(action==='syncBreakthroughs')return;
 if(action==='readAlerts'||action==='seenCelebrations'){
  if(!id)throw Error('Your roster record is unavailable.');
  const receipt=b.receipts[id]||{readThrough:0,read:[],seenThrough:0};
  if(action==='seenCelebrations'){
   if(!Number.isSafeInteger(p.through)||p.through<0||p.through>b.sequence)throw Error('Invalid alert position.');
   receipt.seenThrough=Math.max(receipt.seenThrough,p.through);b.receipts[id]=receipt;return;
  }
  if(p.all===true){receipt.readThrough=b.sequence;receipt.read=[];}
  else{const event=breakthroughAlerts({...s,breakthroughs:b},u).find(e=>e.id===p.id);if(!event)throw Error('Alert not found.');receipt.read=[...new Set([...receipt.read,event.seq])].slice(-500);}
  b.receipts[id]=receipt;
  return;
 }
 if(u.role!=='admin')throw Error('Administrator access required.');
 if(action==='postAnnouncement'){
  const title=typeof p.title==='string'?p.title.trim():'',text=typeof p.text==='string'?p.text.trim():'';
  if(!title||title.length>80||!text||text.length>500)throw Error('Use a title of 1–80 characters and a message of 1–500 characters.');
  btEvent({...s,breakthroughs:b},'announcement',title,text,'all',{href:'#alerts'});
 }else if(action==='setHolidays'){
  if(!Array.isArray(p.holidays)||p.holidays.length>30)throw Error('Use up to 30 holiday periods.');
  const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  if(p.holidays.some(h=>!h||!valid(h.start)||!valid(h.end)||h.end<h.start||(Date.parse(h.end)-Date.parse(h.start))/86400000>180))throw Error('Enter valid holiday start and end dates, up to 180 days apart.');
  b.holidays=p.holidays.map(h=>({start:h.start,end:h.end})).sort((a,b)=>a.start.localeCompare(b.start));
 }else if(action==='awardSportsmanship'){
  if(!s.players.some(player=>player.id===p.playerId&&!player.testAccount)||!['fair-play','helping-hand','house-spirit'].includes(p.kind))throw Error('Choose a player and sportsmanship award.');
  const reason=operationReason(p.reason);
  if(b.sportsmanship.some(a=>a.playerId===p.playerId&&a.kind===p.kind))throw Error('This player already has that award.');
  b.sportsmanship.push({id:uid(),playerId:p.playerId,kind:p.kind,reason,at:new Date().toISOString()});
  audit(s,action,u,{playerId:p.playerId,kind:p.kind,reason});
 }else if(action==='revokeSportsmanship'){
  const award=b.sportsmanship.find(a=>a.id===p.id);if(!award)throw Error('Award not found.');
  const reason=operationReason(p.reason);b.sportsmanship=b.sportsmanship.filter(a=>a.id!==p.id);audit(s,action,u,{playerId:award.playerId,kind:award.kind,reason});
 }
}
export function validateBreakthroughState(s){
 const b=s.breakthroughs;if(b===undefined)return;
 const fail=()=>{throw Error('Invalid achievement or alert data.');};
 const ids=new Set(s.players.map(p=>p.id)),array=(x,n)=>Array.isArray(x)&&x.length<=n;
 const string=(x,n)=>typeof x==='string'&&x.length<=n;
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!object(b)||b.version!==1||!string(b.launchedAt,30)||!Number.isFinite(Date.parse(b.launchedAt))||!Number.isSafeInteger(b.sequence)||b.sequence<0||!array(b.holidays,30)||!object(b.awards)||!object(b.receipts)||!array(b.events,500)||!array(b.sportsmanship,192))fail();
 const day=d=>string(d,10)&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(b.holidays.some(h=>!h||!day(h.start)||!day(h.end)||h.end<h.start||(Date.parse(h.end)-Date.parse(h.start))/86400000>180))fail();
 for(const [id,awards] of Object.entries(b.awards))if(!ids.has(id)||!array(awards,BREAKTHROUGHS.length)||new Set(awards.map(a=>a.id)).size!==awards.length||awards.some(a=>!btBadge(a.id)||!string(a.at,30)||!Number.isFinite(Date.parse(a.at))))fail();
 for(const [id,r] of Object.entries(b.receipts))if(!ids.has(id)||!object(r)||![r.readThrough,r.seenThrough].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=b.sequence)||!array(r.read,500)||r.read.some(n=>!Number.isSafeInteger(n)||n<1||n>b.sequence))fail();
 if(b.events.some(e=>!object(e)||!string(e.id,100)||!Number.isSafeInteger(e.seq)||e.seq<1||e.seq>b.sequence||!string(e.type,30)||!string(e.title,150)||!string(e.text,600)||!string(e.at,30)||!Number.isFinite(Date.parse(e.at))||!string(e.href,150)||!/^#(?:alerts|breakthroughs|competition|league)(?:\/[a-zA-Z0-9_-]+)?$/.test(e.href)||(e.recipients!=='all'&&(!array(e.recipients,64)||e.recipients.some(id=>!ids.has(id))))||(e.exclude!==undefined&&(!array(e.exclude,64)||e.exclude.some(id=>!ids.has(id))))))fail();
 if(new Set(b.events.map(e=>e.seq)).size!==b.events.length||new Set(b.events.map(e=>e.id)).size!==b.events.length)fail();
 if(b.sportsmanship.some(a=>!object(a)||!ids.has(a.playerId)||!['fair-play','helping-hand','house-spirit'].includes(a.kind)||!string(a.id,100)||!string(a.reason,300)||!string(a.at,30)||!Number.isFinite(Date.parse(a.at))))fail();
}
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
function checkDrawPlayers(s,entrants) {
  if(s.players?.some(p=>p.testAccount===true&&entrants.includes(p.id)))throw Error('Remove the test account before making the draw.');
}
export function createLeague(s) {
  checkDrawPlayers(s,s.players.map(p=>p.id));
  if (s.players.length < 2) throw Error('Add at least two players first.');
  if (s.league.some(m => m.status === 'complete') || s.submissions.some(x=>x.kind==='league')) throw Error('Archive this league before creating another.');
  const count = Math.ceil(s.players.length / s.settings.divisionSize);
  s.divisions = Array.from({length: count}, (_,i)=>({id:`d${i}`,name:`Division ${String.fromCharCode(65+i)}`,players:[]}));
  const order = shuffle(s.players).sort((a,b)=>b.rating-a.rating);
  order.forEach((p,i)=>{ const row=Math.floor(i/count); s.divisions[row%2 ? count-1-i%count : i%count].players.push(p.id); });
  s.league=[];
  for (const div of s.divisions) {
    for(let i=0;i<div.players.length;i++)for(let j=i+1;j<div.players.length;j++)
      s.league.push({id:uid(),division:div.id,a:div.players[i],b:div.players[j],status:'open',bestOf:s.settings.frames});
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
// Match records track each opponent once. They never impose a playing order.
export function leaguePlan(s, playerId) {
 const division=s.divisions.find(d=>d.players.includes(playerId));
 const matches=division?s.league.filter(m=>m.division===division.id&&[m.a,m.b].includes(playerId)):[];
 const submitted=new Set(s.submissions.map(x=>x.match));
 const remaining=matches.filter(m=>m.status==='open'&&!submitted.has(m.id));
 const pending=matches.filter(m=>m.status==='open'&&submitted.has(m.id));
 return {division,remaining,pending,played:matches.filter(m=>m.status==='complete').length,total:matches.length};
}
export function createCup(s,name,participants=s.players.map(p=>p.id), consolation=false) {
  checkDrawPlayers(s,participants);
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
function setPlayedResult(match,score,resultAt) {
  match.score=[...score];
  match.status='complete';
  match.winner=score[0]>score[1]?match.a:match.b;
  if(resultAt)match.resultAt=resultAt;
}
export function applyResult(s,id,score,resultAt=new Date().toISOString()) {
  const m=findMatch(s,id);validateScore(m,score);setPlayedResult(m,score,resultAt);
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
export function addPlayerNames(s,names) {
  if(!names.length||s.players.length+names.length>64)throw Error('Enter names; the maximum is 64 players.');
  if(names.some(n=>n.length>45)||new Set([...s.players.map(p=>p.name.toLowerCase()),...names.map(n=>n.toLowerCase())]).size!==s.players.length+names.length)throw Error('Use unique display names of up to 45 characters.');
  const players=names.map(name=>({id:uid(),name,rating:0}));
  s.players.push(...players);
  return players;
}
function removeTestAccount(s,id) {
  const player=s.players.find(p=>p.id===id&&p.testAccount===true);
  if(!player)throw Error('Choose a marked test account.');
  const drawn=s.competitions.some(c=>(c.status==='drawn'&&c.entries.includes(id))||c.teams.some(team=>team.members.includes(id)));
  const divisions=[...s.divisions,...(s.history||[]).flatMap(season=>season.divisions||[])];
  if(drawn||divisions.some(d=>d.players.includes(id))||allMatches(s).some(m=>m.a===id||m.b===id))throw Error('This account is part of a saved draw and cannot be removed.');
  for(const c of s.competitions){c.entries=c.entries.filter(playerId=>playerId!==id);if(c.entryRequests)c.entryRequests=c.entryRequests.filter(r=>r.playerId!==id);}
  s.players=s.players.filter(p=>p.id!==id);
}
export function act(s,action,payload,user) {
  const admin=user?.role==='admin';
  if(!user)throw Error('Sign in first.');
  ensureCompetitions(s);
  s.settings.name=APP_NAME;
  const breakthroughBefore=beginBreakthroughAction(s);
  if(action==='declareMatchHighlights'){
    const m=highlightMatch(s,payload.id),sub=s.submissions.find(x=>x.match===payload.id);
    if(!m||m.walkover||!['open','complete'].includes(m.status)||(m.status==='open'&&!sub))throw Error('Choose a played match with a submitted or approved result.');
    if(!admin&&!isMatchParticipant(s,m,user.id))throw Error('You can only declare highlights for your own matches.');
    const highlights=prepareMatchHighlights(s,m,m.status==='complete'?m.score:sub.score,payload.highlights,user);
    if(!highlights.length)throw Error('Select at least one match highlight.');
    (s.matchHighlights??=[]).push(...highlights);
  } else if(['respondMatchHighlight','reviewMatchHighlight','revokeMatchHighlight'].includes(action)){
    matchHighlightAction(s,action,payload,user);
  } else if(['syncBreakthroughs','readAlerts','seenCelebrations','awardSportsmanship','revokeSportsmanship','setHolidays','postAnnouncement'].includes(action)){
    breakthroughAction(s,action,payload,user,breakthroughBefore.baseline);
  } else if(action==='enterCompetitions'){
    // Validate the whole selection before adding any entries. Identity always
    // comes from the authenticated session, never a submitted player ID.
    if(user.role!=='player'||!s.players.some(p=>p.id===user.id))throw Error('Sign in as a registered player to join competitions.');
    if(payload.playerId!==undefined&&payload.playerId!==user.id)throw Error('You can only enter yourself.');
    if(!Array.isArray(payload.ids)||!payload.ids.length||payload.ids.length>32||payload.ids.some(id=>typeof id!=='string'))throw Error('Choose at least one competition.');
    const selected=[...new Set(payload.ids)].map(id=>getCompetition(s,id));
    if(selected.some(c=>c.status!=='open'))throw Error('One of your selected competitions has closed. Check your selection and try again.');
    for(const c of selected){if(!c.entries.includes(user.id))c.entries.push(user.id);if(c.entryRequests)c.entryRequests=c.entryRequests.filter(r=>r.playerId!==user.id);}
  } else if(['requestLeagueEntry','cancelLeagueEntryRequest','reviewLeagueEntryRequest','addLeaguePlayers'].includes(action)){
    leagueEntryAction(s,action,payload,user);
  } else if(['enterCompetition','leaveCompetition','addReserve'].includes(action)){
    changeEntry(s,action,payload,user);
  } else if(['createCompetition','editCompetition','closeEntries','reopenEntries','drawCompetition'].includes(action)){
    if(!admin)throw Error('Administrator access required.');
    manageCompetition(s,action,payload);
  } else if(action==='submit') {
    const m=findMatch(s,payload.id);validateScore(m,payload.score);
    if(!admin && !isMatchParticipant(s,m,user.id))throw Error('You can only submit your own matches.');
    if(s.submissions.some(x=>x.match===m.id))throw Error('This match already has a result awaiting approval.');
    const highlights=prepareMatchHighlights(s,m,payload.score,payload.highlights,user);
    if(!requiresApproval(s,m))applyResult(s,m.id,payload.score);
    else s.submissions.push({id:uid(),match:m.id,score:payload.score,by:user.id||'admin',at:new Date().toISOString(),kind:competitionForMatch(s,m.id)?'competition':s.league.includes(m)?'league':'cup'});
    if(highlights.length)(s.matchHighlights??=[]).push(...highlights);
  } else {
    if(!admin)throw Error('Administrator access required.');
    if(action==='removeTestAccount')removeTestAccount(s,payload.id);
    else if(action==='recordResult'){
      const m=findMatch(s,payload.id);validateScore(m,payload.score);
      if(s.submissions.some(x=>x.match===m.id))throw Error('This match has a submitted result. Approve or return it first.');
      const highlights=prepareMatchHighlights(s,m,payload.score,payload.highlights,user);
      const before=resultSnapshot(m);
      applyResult(s,m.id,payload.score);
      if(highlights.length)(s.matchHighlights??=[]).push(...highlights);
      audit(s,'recordResult',user,{matchId:m.id,before,after:resultSnapshot(m)});
    }
    else if(action==='correctResult')correctResult(s,payload,user);
    else if(action==='withdrawPlayer')withdrawPlayer(s,payload,user);
    else if(action==='approve'||action==='reject') {
      const sub=s.submissions.find(x=>x.id===payload.id);if(!sub)throw Error('Submission not found.');
      if(action==='approve')applyResult(s,sub.match,sub.score,sub.at);
      else invalidateMatchHighlights(s,[sub.match]);
      s.submissions=s.submissions.filter(x=>x.id!==sub.id);
    } else if(action==='settings') {
      const p=payload;
      if(p.rules!==undefined&&(typeof p.rules!=='string'||p.rules.length>2000))throw Error('Use up to 2,000 characters for rules.');
      if(typeof p.season==='string')s.settings.season=p.season.trim().slice(0,300);
      if(typeof p.rules==='string')s.settings.rules=p.rules.trim();
      for(const key of ['frames','finalFrames'])if(p[key]!==undefined) {if(![1,3,5,7,9].includes(+p[key]))throw Error('Choose an odd match length from 1 to 9.');s.settings[key]=+p[key];}
      if(p.winPoints!==undefined){if(!Number.isInteger(+p.winPoints)||+p.winPoints<1||+p.winPoints>10)throw Error('Win points must be 1–10.');s.settings.winPoints=+p.winPoints;}
      if(p.divisionSize!==undefined){if(!Number.isInteger(+p.divisionSize)||+p.divisionSize<3||+p.divisionSize>20)throw Error('Division size must be 3–20.');s.settings.divisionSize=+p.divisionSize;}
      for(const k of ['approval','consolation'])if(typeof p[k]==='boolean')s.settings[k]=p[k];
      if(typeof p.logo==='string') {if(p.logo.length>700000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.logo))throw Error('Choose a PNG, JPEG or WebP logo under 500 KB.');s.settings.logo=p.logo;}
    } else if(action==='addPlayers') {
      if(s.league.length||s.cups.length)throw Error('Add players before generating competitions.');
      const names=String(payload.names||'').split('\n').map(x=>x.trim()).filter(Boolean);
      addPlayerNames(s,names);
    } else if(action==='player') {
      const p=s.players.find(p=>p.id===payload.id);if(!p)throw Error('Player not found.');
      const name=String(payload.name||'').trim();if(!name||name.length>45||s.players.some(x=>x.id!==p.id&&x.name.toLowerCase()===name.toLowerCase()))throw Error('Use a unique display name of up to 45 characters.');
      p.name=name; const rating=+payload.rating;if(!Number.isFinite(rating)||rating<0||rating>100)throw Error('Ability must be 0–100.');p.rating=rating;
    } else if(action==='league')createLeague(s);
    else if(action==='cup')createCup(s,String(payload.name||'The Wakefield Cup').trim().slice(0,70)||'The Wakefield Cup');
    else if(action==='promote')promote(s);
    else throw Error('Unknown action.');
  }
  finishBreakthroughAction(s,breakthroughBefore,action,payload,user);
  if(['declareMatchHighlights','respondMatchHighlight','reviewMatchHighlight','revokeMatchHighlight'].includes(action))s.activity.unshift({text:action==='declareMatchHighlights'?'Match highlights declared':action==='respondMatchHighlight'?'Match highlight response saved':action==='revokeMatchHighlight'?'Match highlight award removed':'Match highlight reviewed',at:new Date().toISOString()});
  const activityText=({awardSportsmanship:'Sportsmanship awarded',revokeSportsmanship:'Sportsmanship award removed',setHolidays:'Streak holiday dates updated',postAnnouncement:'Announcement posted',enterCompetitions:'Competition entries added',addReserve:'Competition reserve entered',enterCompetition:'Competition entry added',leaveCompetition:'Competition entry removed',createCompetition:'Competition created',editCompetition:'Competition updated',closeEntries:'Entries closed',reopenEntries:'Entries reopened',drawCompetition:'Competition draw created',submit:'Result submitted',recordResult:'Result recorded by Mr French',approve:'Result approved',reject:'Result returned for correction',correctResult:'Approved result corrected',withdrawPlayer:'Player withdrawn',league:'League fixtures generated',cup:'Cup draw created',promote:'New league season started',settings:'Club settings updated',addPlayers:'Players added',player:'Player updated',removeTestAccount:'Test account removed'})[action];
  const entryActivity=({requestLeagueEntry:'League entry requested',cancelLeagueEntryRequest:'League entry request cancelled',reviewLeagueEntryRequest:'League entry request reviewed',addLeaguePlayers:'League players added'})[action];
  if(activityText||entryActivity)s.activity.unshift({text:activityText||entryActivity,at:new Date().toISOString()});s.activity=s.activity.slice(0,30);return s;
}


// New competitions are additive: saved divisions, cups, PINs and results stay intact.
export function defaultCompetitions() {
 return [['full-league','Full league','singles','league'],['singles-knockout','Singles knockout','singles','knockout'],['pairs-league','Pairs league','pairs','league'],['pairs-knockout','Pairs knockout','pairs','knockout']].map(([id,name,mode,format])=>({id,name,mode,format,status:'open',entries:[],teams:[],fixtures:[],rounds:[],bestOf:1,finalBestOf:1,winPoints:3,rules:defaults.rules,consolation:false}));
}
export function ensureCompetitions(s) {
 s.competitions??=defaultCompetitions();
 // Replace only the shipped placeholder; administrator-written rules stay intact.
 if([LEGACY_POOL_RULES,PREVIOUS_SCHOOL_POOL_RULES].includes(s.settings.rules))s.settings.rules=SCHOOL_POOL_RULES;
 for(const c of s.competitions)if([LEGACY_POOL_RULES,PREVIOUS_SCHOOL_POOL_RULES].includes(c.rules))c.rules=SCHOOL_POOL_RULES;
 return s;
}
export function competitionMatches(c) {return [...(c.fixtures||[]),...(c.rounds||[]).flat(),...(c.plate?.rounds||[]).flat()];}
export function allMatches(s) {return [...s.league,...s.cups.flatMap(c=>c.rounds.flat()),...(s.competitions||[]).flatMap(competitionMatches)];}
export function competitionForMatch(s,id) {return (s.competitions||[]).find(c=>competitionMatches(c).some(m=>m.id===id));}
export function sideMembers(s,id) {
 if(s.players.some(p=>p.id===id))return [id];
 return (s.competitions||[]).flatMap(c=>c.teams).find(t=>t.id===id)?.members||[];
}
export function sideName(s,id) {return sideMembers(s,id).map(id=>s.players.find(p=>p.id===id)?.name||'Unknown player').join(' & ')||'To be decided';}
export function isMatchParticipant(s,m,playerId) {return !!playerId&&!!m&&[m.a,m.b].some(id=>sideMembers(s,id).includes(playerId));}
export function playerMatchRecord(s,playerId,competitionId='') {
 const result={competitions:[],results:[],walkovers:[],pending:[]};
 if(!s.players.some(p=>p.id===playerId))return result;
 const roundLabel=(rounds,index)=>index===rounds.length-1?'Final':index===rounds.length-2?'Semi-final':index===rounds.length-3?'Quarter-final':`Round ${index+1}`;
 const bracket=(c,prefix='')=>(c.rounds||[]).flatMap((round,i)=>round.map(match=>({match,detail:[prefix,roundLabel(c.rounds,i)].filter(Boolean).join(' · ')})));
 const league=(matches,divisions=[])=>matches.map(match=>({match,detail:divisions.find(d=>d.id===match.division)?.name||''}));
 const groups=[
  ...(s.competitions||[]).map(c=>({id:c.id,name:c.name,matches:[...league(c.fixtures||[]),...bracket(c),...(c.plate?bracket(c.plate,c.plate.name||'Consolation cup'):[])]})),
  {id:'legacy:league',name:s.settings.season||'Earlier league',matches:league(s.league,s.divisions)},
  ...s.cups.map(c=>({id:'legacy:cup:'+c.id,name:c.name,matches:bracket(c)})),
  ...(s.history||[]).map((h,i)=>({id:'history:'+i,name:`${h.season||'Past season'} · archived`,matches:league(h.league||[],h.divisions||[])}))
 ];
 const seen=new Set(),submitted=new Set(s.submissions.map(sub=>sub.match));
 let order=0;
 for(const group of groups){
  const matches=group.matches.filter(({match})=>isMatchParticipant(s,match,playerId));
  if(!matches.length)continue;
  result.competitions.push({id:group.id,name:group.name});
  for(const {match:m,detail} of matches){
   if(seen.has(m.id))continue;seen.add(m.id);
   if(competitionId&&group.id!==competitionId)continue;
   if(m.status==='open'&&submitted.has(m.id)){result.pending.push({matchId:m.id,competitionId:group.id});continue;}
   if(m.status!=='complete'||!m.a||!m.b||m.score?.length!==2||!m.score.every(Number.isInteger)||m.score.some(n=>n<0)||m.score[0]===m.score[1])continue;
   const ownIndex=sideMembers(s,m.a).includes(playerId)?0:1,ownSide=ownIndex?m.b:m.a,otherSide=ownIndex?m.a:m.b;
   const time=Date.parse(m.resultAt),timestamp=Number.isFinite(time)?time:0;
   const entry={matchId:m.id,competitionId:group.id,competitionName:group.name,detail,mode:sideMembers(s,ownSide).length>1?'pairs':'singles',
    opponentIds:[...sideMembers(s,otherSide)],partnerIds:sideMembers(s,ownSide).filter(id=>id!==playerId),
    outcome:m.score[ownIndex]>m.score[1-ownIndex]?'W':'L',score:[m.score[ownIndex],m.score[1-ownIndex]],
    resultAt:Number.isFinite(time)?m.resultAt:null,timestamp,order:order++};
   (m.walkover?result.walkovers:result.results).push(entry);
  }
 }
 const latest=(a,b)=>b.timestamp-a.timestamp||b.order-a.order;
 result.results.sort(latest);result.walkovers.sort(latest);
 return result;
}
export function recentPlayerForm(s) {
 const archived=(s.history||[]).flatMap(season=>season.league||[]);
 const played=[...archived,...allMatches(s)].reverse()
  .filter(m=>m.status==='complete'&&!m.walkover&&m.a&&m.b&&m.score?.length===2&&m.score[0]!==m.score[1])
  .map(match=>({match,time:Date.parse(match.resultAt)||0}))
  .sort((a,b)=>b.time-a.time);
 const form=new Map(s.players.map(p=>[p.id,[]]));
 for(const {match,time} of played)for(const [side,index] of [[match.a,0],[match.b,1]]){
  const outcome=match.score[index]>match.score[1-index]?'W':'L';
  for(const id of sideMembers(s,side)){
   const results=form.get(id);
   if(results.length<5)results.push({outcome,dated:!!time});
  }
 }
 return form;
}
export function requiresApproval(s,m) {return !!competitionForMatch(s,m.id)||s.settings.approval;}
export function competitionStandings(s,c) {
 const rows=c.teams.map(t=>({id:t.id,name:sideName(s,t.id),played:0,won:0,lost:0,for:0,against:0,points:0}));
 for(const m of c.fixtures.filter(m=>m.status==='complete'))for(const [id,i]of [[m.a,0],[m.b,1]]){
  const row=rows.find(t=>t.id===id);row.played++;row.for+=m.score[i];row.against+=m.score[1-i];
  if(m.score[i]>m.score[1-i]){row.won++;row.points+=c.winPoints;}else row.lost++;
 }
 if(c.bestOf===1)return singleFramePositions(rows,c.fixtures);
 return rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.won-a.won||a.name.localeCompare(b.name));
}
// Equal points use a mini-table of all tied entrants. Wait until every mutual
// fixture is approved; circular or otherwise equal records share a position.
function singleFramePositions(rows,fixtures) {
 const ordered=[];
 for(const points of [...new Set(rows.map(r=>r.points))].sort((a,b)=>b-a)){
  const group=rows.filter(r=>r.points===points),ids=new Set(group.map(r=>r.id));
  const mutual=fixtures.filter(m=>ids.has(m.a)&&ids.has(m.b));
  const complete=group.length>1&&group.every((a,i)=>group.slice(i+1).every(b=>mutual.some(m=>m.status==='complete'&&((m.a===a.id&&m.b===b.id)||(m.a===b.id&&m.b===a.id)))));
  const wins=new Map(group.map(r=>[r.id,0]));
  if(complete)for(const m of mutual.filter(m=>m.status==='complete')){
   const winner=m.score[0]>m.score[1]?m.a:m.b;
   wins.set(winner,wins.get(winner)+1);
  }
  group.sort((a,b)=>wins.get(b.id)-wins.get(a.id)||a.name.localeCompare(b.name));
  const offset=ordered.length;
  group.forEach(row=>{
   const same=group.filter(r=>wins.get(r.id)===wins.get(row.id));
   row.rank=offset+group.findIndex(r=>wins.get(r.id)===wins.get(row.id))+1;
   row.tied=same.length>1;
   ordered.push(row);
  });
 }
 return ordered;
}
function getCompetition(s,id) {const c=s.competitions.find(c=>c.id===id);if(!c)throw Error('Competition not found.');return c;}
export function administratorPlayer(s) {
 const matches=s.players.filter(p=>p.name==='Mr French'&&!p.testAccount);
 return matches.length===1?matches[0]:null;
}
function changeEntry(s,action,payload,user) {
 const c=getCompetition(s,payload.id),admin=user.role==='admin',entering=action==='enterCompetition';
 let playerId=admin?payload.playerId:user.id;
 if(action==='addReserve'){
  if(!admin)throw Error('Administrator access required.');
  if(c.status==='drawn')throw Error('This draw is fixed.');
  if(c.mode!=='pairs'||c.entries.length%2===0)throw Error('This competition does not need a reserve.');
 }
 if(admin&&entering){
  if(payload.playerId!==undefined)throw Error('You can only enter yourself.');
  playerId=administratorPlayer(s)?.id;
  if(!playerId)throw Error('The Mr French player record could not be identified.');
 }
 if(!admin&&payload.playerId&&payload.playerId!==user.id)throw Error('You can only enter or withdraw yourself.');
 if(!s.players.some(p=>p.id===playerId))throw Error('Choose a registered player.');
 if(c.status==='drawn'||((entering||!admin)&&c.status!=='open'))throw Error('Entries are closed. Please wait for the next competition.');
 const entered=c.entries.includes(playerId);
 if(action!=='leaveCompetition'){if(entered)throw Error('This player is already entered.');c.entries.push(playerId);if(c.entryRequests)c.entryRequests=c.entryRequests.filter(r=>r.playerId!==playerId);}
 else {if(!entered)throw Error('This player is not entered.');c.entries=c.entries.filter(id=>id!==playerId);}
}
// Late league entries extend the saved round robin. Never redraw existing sides
// or recreate fixtures: scores, pending submissions and fixed partners survive.
function addLeaguePlayers(s,c,ids,user){
 if(!Array.isArray(ids)||!ids.length||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!s.players.some(p=>p.id===id)))throw Error('Choose one or two different registered players.');
 if(ids.some(id=>c.entries.includes(id)))throw Error('This player is already entered.');
 if(c.status==='drawn'&&ids.length!==(c.mode==='pairs'?2:1))throw Error(c.mode==='pairs'?'Choose two new players to add as a pair.':'Add one player at a time.');
 checkDrawPlayers(s,ids);
 const fixtures=[];
 let team;
 if(c.status==='drawn'){
  team={id:c.mode==='pairs'?uid():ids[0],members:[...ids]};
  for(const other of c.teams)fixtures.push({id:uid(),a:other.id,b:team.id,status:'open',bestOf:c.bestOf});
  const withdrawn=new Set(c.teams.filter(t=>t.withdrawn).map(t=>t.id));
  for(const id of withdrawn)awardWithdrawal(fixtures,id,withdrawn);
 }
 c.entries.push(...ids);
 if(team){c.teams.push(team);c.fixtures.push(...fixtures);}
 if(c.entryRequests)c.entryRequests=c.entryRequests.filter(r=>!ids.includes(r.playerId));
 audit(s,'addLeaguePlayers',user,{competitionId:c.id,playerIds:[...ids],teamId:team?.id,addedMatches:fixtures.map(m=>m.id)});
}
function leagueEntryAction(s,action,p,user){
 const c=getCompetition(s,p.id);
 if(c.format!=='league')throw Error('Late entry is available for leagues only.');
 if(['requestLeagueEntry','cancelLeagueEntryRequest'].includes(action)){
  if(user.role!=='player'||!s.players.some(player=>player.id===user.id))throw Error('Sign in as a registered player to request entry.');
  if(p.playerId!==undefined&&p.playerId!==user.id)throw Error('You can only request entry for yourself.');
  const existing=(c.entryRequests||[]).find(r=>r.playerId===user.id);
  if(action==='cancelLeagueEntryRequest'){
   if(!existing)throw Error('No entry request is waiting for approval.');
   c.entryRequests=c.entryRequests.filter(r=>r.id!==existing.id);return;
  }
  if(c.entries.includes(user.id))throw Error('You are already entered in this league.');
  if(c.status==='open')throw Error('Entries are open. Enter the league directly.');
  if(existing)throw Error('Your request is already awaiting Mr French’s approval.');
  (c.entryRequests??=[]).push({id:uid(),playerId:user.id,at:new Date().toISOString()});return;
 }
 if(user.role!=='admin')throw Error('Administrator access required.');
 if(action==='addLeaguePlayers'){addLeaguePlayers(s,c,p.playerIds,user);return;}
 const request=(c.entryRequests||[]).find(r=>r.id===p.requestId&&r.playerId===p.playerId);
 if(!request)throw Error('This league entry request has already been reviewed.');
 if(!['approve','decline'].includes(p.decision))throw Error('Choose whether to approve or decline the request.');
 if(p.decision==='approve'){
  const ids=[request.playerId];
  if(c.status==='drawn'&&c.mode==='pairs'){
   if(!(c.entryRequests||[]).some(r=>r.playerId===p.partnerId&&r.id!==request.id))throw Error('Choose another waiting player to form a new pair.');
   ids.push(p.partnerId);
  }
  addLeaguePlayers(s,c,ids,user);
 }else c.entryRequests=c.entryRequests.filter(r=>r.id!==request.id);
 audit(s,'reviewLeagueEntryRequest',user,{competitionId:c.id,playerId:request.playerId,decision:p.decision,partnerId:p.partnerId});
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
 if(next.format!=='league'&&c.entryRequests?.length)throw Error('Review pending league entry requests before changing to a knockout.');
 Object.assign(c,next);
 if(c.format!=='league')delete c.entryRequests;
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
  checkDrawPlayers(s,c.entries);
  if(c.mode==='pairs'&&c.entries.length%2)throw Error('One more player needed. Add a reserve or reopen entries before drawing.');
  const minimum=c.mode==='pairs'?4:2;
  if(c.entries.length<minimum)throw Error(`At least ${minimum} players must enter before drawing.`);
  if(new Set(c.entries).size!==c.entries.length||c.entries.some(id=>!s.players.some(p=>p.id===id)))throw Error('The entry list contains an invalid player.');
  // Each competition shuffles only its own signed-up entrants, once.
  const entrants=shuffle(c.entries);
  const teams=c.mode==='pairs'?Array.from({length:entrants.length/2},(_,i)=>({id:uid(),members:entrants.slice(i*2,i*2+2)})):entrants.map(id=>({id,members:[id]}));
  const fixture=(a,b)=>({id:uid(),a,b,status:'open',bestOf:c.bestOf});
  let fixtures=[],rounds=[];
  if(c.format==='league'){
   for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++)fixtures.push(fixture(teams[i].id,teams[j].id));
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
function resetResult(m) {delete m.score;delete m.winner;delete m.resultAt;delete m.walkover;delete m.withdrawalReason;m.status='waiting';}
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
 const resultAt=m.resultAt;
 resetResult(m);m.status='open';
 if(p.score!==null)setPlayedResult(m,p.score,resultAt);
 if(c?.format==='knockout')advanceCompetition(c);
 else if(cup)advanceLegacyCup(s,cup);
 const changed=allMatches(s).filter(x=>oldMatches.get(x.id)!==JSON.stringify(resultSnapshot(x))).map(x=>x.id);
 s.submissions=s.submissions.filter(x=>!changed.includes(x.match));
 invalidateMatchHighlights(s,changed);
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
 invalidateMatchHighlights(s,changed);
 audit(s,'withdrawPlayer',user,{competitionId:target.id,playerId:player.id,sideId:side,reason,affectedMatches:changed});
}
