import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,act,breakthroughMetrics,breakthroughProgress,breakthroughAlerts,breakthroughReceipt,breakthroughPublicState,weeklyPlayingStreak,validateBreakthroughState} from '../lib/domain.mjs';
import {sealBackup,openBackup} from '../lib/backups.mjs';
import {createHandler} from '../lib/sites-api.mjs';
import {database} from './sqlite-d1.mjs';
const admin={role:'admin',name:'Mr French'};
const pupil=id=>({role:'player',id});
function setup(n=8){
 const s=initialState();s.players=Array.from({length:n},(_,i)=>({id:'p'+i,name:i?'Sample '+i:'Mr French',rating:0}));
 act(s,'syncBreakthroughs',{},admin);return s;
}
function fixture(s,a='p0',b='p1',pairs=false){
 const m={id:'m'+String(s.league.length+s.competitions.flatMap(c=>c.fixtures).length).padStart(3,'0'),a,b,status:'open',bestOf:1};
 (pairs?s.competitions[2].fixtures:s.league).push(m);return m;
}
function approve(s,m,score=[1,0],date='2026-11-09T12:00:00.000Z'){
 act(s,'submit',{id:m.id,score},admin);s.submissions.at(-1).at=date;act(s,'approve',{id:s.submissions.at(-1).id},admin);return m;
}
test('only approved played results grant achievements; walkovers and byes never build performance',()=>{
 const s=setup(),m=fixture(s);
 act(s,'submit',{id:m.id,score:[1,0]},pupil('p0'));
 assert.equal(breakthroughProgress(s,'p0').earned,0);
 act(s,'approve',{id:s.submissions[0].id},admin);
 assert(breakthroughProgress(s,'p0').badges.find(b=>b.id==='first-win').earned);
 assert.equal(breakthroughMetrics(s).p0.wins,1);
 const walkover=fixture(s);Object.assign(walkover,{status:'complete',score:[1,0],winner:'p0',walkover:true,resultAt:new Date().toISOString()});
 act(s,'syncBreakthroughs',{},pupil('p0'));
 assert.equal(breakthroughMetrics(s).p0.played,1);assert.equal(breakthroughProgress(s,'p0').points,30);
 assert.equal(s.settings.winPoints,3);
 assert(breakthroughAlerts(s,pupil('p1')).some(e=>e.type==='result'));
});
test('existing dated and undated results backfill once with one summary per player and no public flood',()=>{
 const s=setup();delete s.breakthroughs;
 for(let i=0;i<5;i++){const m=fixture(s);Object.assign(m,{status:'complete',score:[1,0],winner:'p0'});}
 act(s,'syncBreakthroughs',{},pupil('p0'));
 const p=breakthroughProgress(s,'p0');
 assert.equal(p.metrics.wins,5);assert.equal(p.metrics.singles,0);assert.equal(p.metrics.weekly,0);
 assert.equal(breakthroughAlerts(s,pupil('p0')).filter(e=>e.type==='catchup').length,1);
 assert(!s.breakthroughs.events.some(e=>['achievement','milestone'].includes(e.type)));
 const count=s.breakthroughs.events.length;act(s,'syncBreakthroughs',{},pupil('p0'));assert.equal(s.breakthroughs.events.length,count);
});
test('singles and pairs winning streaks are independent and both fixed partners get the same result',()=>{
 const s=setup(),c=s.competitions[2];
 Object.assign(c,{status:'drawn',entries:['p0','p1','p2','p3'],teams:[{id:'team-a',members:['p0','p1']},{id:'team-b',members:['p2','p3']}]});
 approve(s,fixture(s,'p0','p4'),[1,0],'2026-11-02T12:00:00.000Z');
 approve(s,fixture(s,'team-a','team-b',true),[0,1],'2026-11-03T12:00:00.000Z');
 approve(s,fixture(s,'p0','p5'),[1,0],'2026-11-04T12:00:00.000Z');
 approve(s,fixture(s,'p0','p6'),[1,0],'2026-11-05T12:00:00.000Z');
 const p=breakthroughMetrics(s).p0;
 assert.equal(p.singles,3);assert.equal(p.pairs,0);assert.equal(p.singlesBest,3);
 assert.equal(breakthroughMetrics(s).p2.pairs,1);assert.equal(breakthroughMetrics(s).p3.pairs,1);
 assert.equal(p.opponents,5);
 assert(breakthroughProgress(s,'p0').badges.find(b=>b.id==='singles-3').earned);
 assert(!s.breakthroughs.events.some(e=>e.type==='milestone'&&e.awardId==='singles-3'));
});
test('weekly streaks skip full holidays, reset after missed school weeks and use London dates at DST boundaries',()=>{
 const dates=['2026-12-04T12:00:00.000Z','2026-12-11T12:00:00.000Z','2027-01-06T12:00:00.000Z'];
 const holidays=[{start:'2026-12-12',end:'2027-01-05'}];
 assert.equal(weeklyPlayingStreak(dates,holidays,'2027-01-07T12:00:00.000Z').current,3);
 assert.equal(weeklyPlayingStreak(dates,holidays,'2027-01-17T23:59:00.000Z').current,3);
 assert.equal(weeklyPlayingStreak(dates,holidays,'2027-01-18T12:00:00.000Z').current,0);
 assert.equal(weeklyPlayingStreak(dates,holidays,'2026-12-23T12:00:00.000Z').paused,true);
 assert.equal(weeklyPlayingStreak(['2026-10-04T23:30:00.000Z'],[],'2026-10-05T01:00:00.000Z').playedThisWeek,true);
 assert.equal(weeklyPlayingStreak(['2026-10-25T23:30:00.000Z'],[],'2026-10-26T01:00:00.000Z').playedThisWeek,false);
 assert.equal(weeklyPlayingStreak(['2026-12-22T12:00:00.000Z'],holidays,'2026-12-23T12:00:00.000Z').best,0);
});
test('corrections recalculate streak badges, points and public milestone alerts without duplicate awards',()=>{
 const s=setup(),matches=[];
 for(let i=0;i<5;i++)matches.push(approve(s,fixture(s,'p0','p'+(i+1)),[1,0],'2026-11-'+String(i+2).padStart(2,'0')+'T12:00:00.000Z'));
 assert(breakthroughProgress(s,'p0').badges.find(b=>b.id==='singles-5').earned);
 assert(breakthroughAlerts(s,pupil('p7')).some(e=>e.type==='milestone'&&e.awardId==='singles-5'));
 const points=breakthroughProgress(s,'p0').points;
 act(s,'correctResult',{id:matches[2].id,score:[0,1],reason:'Both players confirmed the winner.'},admin);
 assert.equal(breakthroughMetrics(s).p0.singles,2);
 assert(!breakthroughProgress(s,'p0').badges.find(b=>b.id==='singles-3').earned);
 assert(breakthroughProgress(s,'p0').points<points);
 assert(!s.breakthroughs.events.some(e=>e.playerId==='p0'&&['singles-3','singles-5'].includes(e.awardId)));
 act(s,'syncBreakthroughs',{},pupil('p0'));
 const awards=breakthroughProgress(s,'p0').badges.filter(b=>b.earned);assert.equal(new Set(awards.map(b=>b.id)).size,awards.length);
});
test('improvement and bounce-back awards use dated results within each format',()=>{
 const s=setup();
 for(let i=0;i<10;i++)approve(s,fixture(s),i<5?[0,1]:[1,0],'2026-11-'+String(i+2).padStart(2,'0')+'T12:00:00.000Z');
 const p=breakthroughProgress(s,'p0');
 assert(p.badges.find(b=>b.id==='bounce-back').earned);assert(p.badges.find(b=>b.id==='improvement').earned);
});
test('private inboxes, receipts, manual awards and announcements enforce the authenticated player or administrator',()=>{
 const s=setup();
 assert.throws(()=>act(s,'postAnnouncement',{title:'Notice',text:'Test'},pupil('p1')),/Administrator/);
 assert.throws(()=>act(s,'awardSportsmanship',{playerId:'p1',kind:'fair-play',reason:'A test'},pupil('p1')),/Administrator/);
 act(s,'awardSportsmanship',{playerId:'p1',kind:'fair-play',reason:'Private administrator reason'},admin);
 const own=breakthroughAlerts(s,pupil('p1')).find(e=>e.type==='achievement');
 assert(own);assert(!breakthroughAlerts(s,pupil('p2')).some(e=>e.id===own.id));
 assert.throws(()=>act(s,'readAlerts',{id:own.id},pupil('p2')),/not found/);
 assert.throws(()=>act(s,'readAlerts',{all:true,playerId:'p1'},pupil('p2')),/own alerts/);
 act(s,'readAlerts',{id:own.id},pupil('p1'));
 assert(breakthroughReceipt(s,pupil('p1')).read.includes(own.seq));assert.equal(breakthroughReceipt(s,pupil('p2')).read.length,0);
 act(s,'seenCelebrations',{through:own.seq},pupil('p1'));
 assert.throws(()=>act(s,'seenCelebrations',{through:s.breakthroughs.sequence+1},pupil('p1')),/Invalid/);
 assert(!JSON.stringify(breakthroughPublicState(s,pupil('p1'))).includes('Private administrator reason'));
 assert(!('inbox' in breakthroughPublicState(s,null)));
 act(s,'postAnnouncement',{title:'House notice',text:'Entries open today.'},admin);
 assert(breakthroughAlerts(s,pupil('p2')).some(e=>e.type==='announcement'));
 const award=s.breakthroughs.sportsmanship[0];act(s,'revokeSportsmanship',{id:award.id,reason:'Award was assigned to the wrong player.'},admin);
 assert(!breakthroughProgress(s,'p1').badges.find(b=>b.id==='fair-play').earned);
});
test('draws announce individual partners and knockout readiness; full leagues never suggest an opponent',()=>{
 const s=setup(4);
 for(const p of s.players)act(s,'enterCompetitions',{ids:['full-league','pairs-knockout']},pupil(p.id));
 act(s,'closeEntries',{id:'pairs-knockout'},admin);
 act(s,'drawCompetition',{id:'pairs-knockout'},admin);
 const draw=breakthroughAlerts(s,pupil('p1')).find(e=>e.type==='draw');
 assert.match(draw.text,/Your partner:/);assert(breakthroughAlerts(s,pupil('p1')).some(e=>e.type==='opponent'));
 const count=s.breakthroughs.events.filter(e=>e.type==='opponent').length;
 act(s,'drawCompetition',{id:'full-league'},admin);
 assert.equal(s.breakthroughs.events.filter(e=>e.type==='opponent').length,count);
});
test('achievement state survives encrypted recovery and malformed alert data is rejected',()=>{
 const s=setup();approve(s,fixture(s));
 act(s,'postAnnouncement',{title:'Test',text:'A recovery test'},admin);act(s,'readAlerts',{all:true},pupil('p1'));
 const restored=openBackup(sealBackup(s,3,'a-portable-test-passphrase','portable'),'a-portable-test-passphrase','portable');
 assert.deepEqual(restored.breakthroughs,s.breakthroughs);
 const bad=structuredClone(s);bad.breakthroughs.events[0].href='javascript:alert(1)';assert.throws(()=>validateBreakthroughState(bad),/Invalid/);
 const duplicate=structuredClone(s);duplicate.breakthroughs.events.push(duplicate.breakthroughs.events[0]);assert.throws(()=>validateBreakthroughState(duplicate),/Invalid/);
});
test('API returns only the signed-in inbox and receipt; other devices persist reads with revision conflict protection',async()=>{
 const DB=await database(),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'synthetic-session-secret-at-least-32-characters'},handler=createHandler(env);
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL};
 const call=async(route,body,extra={})=>{const response=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',...extra},body:body&&JSON.stringify(body)});return {...response,data:JSON.parse(response.body)};};
 try{
  await call('state',undefined,owner);
  const pins=await call('action',{action:'pins',revision:0},owner),p=pins.data.state.players[1];
  const login=await call('login',{id:p.id,pin:pins.data.pins[1].pin}),headers={cookie:login.headers['Set-Cookie'].split(';')[0]};
  const awarded=await call('action',{action:'awardSportsmanship',payload:{playerId:p.id,kind:'fair-play',reason:'Admin-only note'},revision:1},owner);
  assert.equal(awarded.statusCode,200);
  const publicState=await call('state');assert(!publicState.body.includes('Admin-only note'));assert(!publicState.body.includes('"inbox"'));assert(!publicState.body.includes('"receipts"'));
  const mine=await call('state',undefined,headers);assert(!mine.body.includes('Admin-only note'));assert(!mine.body.includes('"recipients"'));
  const event=mine.data.state.breakthroughs.inbox.find(e=>e.type==='achievement');assert(event);
  const seen=await call('action',{action:'readAlerts',payload:{id:event.id},revision:mine.data.revision},headers);assert.equal(seen.statusCode,200);
  const otherDevice=await call('state',undefined,headers);assert(otherDevice.data.state.breakthroughs.receipt.read.includes(event.seq));
  assert.equal((await call('action',{action:'readAlerts',payload:{all:true},revision:mine.data.revision},headers)).statusCode,409);
  const saved=await call('backup',{passphrase:'synthetic-backup-passphrase'},owner);assert.equal(saved.statusCode,200);
  assert(openBackup(saved.data.backup,'synthetic-backup-passphrase','portable').breakthroughs.receipts[p.id].read.includes(event.seq));
 }finally{DB.sql.close();}
});
