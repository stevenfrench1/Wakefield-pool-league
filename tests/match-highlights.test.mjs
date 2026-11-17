import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,act,matchHighlightStatus,matchHighlightsForUser,breakthroughProgress,breakthroughAlerts,validateMatchHighlightsState,allMatches,sideMembers} from '../lib/domain.mjs';
import {sealBackup,openBackup,validateBackupState} from '../lib/backups.mjs';
import {createHandler} from '../lib/sites-api.mjs';
import {database} from './sqlite-d1.mjs';
const admin={role:'admin',name:'Mr French'},pupil=id=>({role:'player',id});
function setup(){
 const s=initialState();s.players=Array.from({length:6},(_,i)=>({id:'p'+i,name:i?'Sample '+i:'Mr French',rating:0}));
 act(s,'syncBreakthroughs',{},admin);return s;
}
function fixture(s,a='p1',b='p2',bestOf=1){const m={id:'m'+s.league.length,a,b,bestOf,status:'open'};s.league.push(m);return m;}
const declaration=(kind='triple-threat',playerId='p1',frame=1)=>({kind,playerId,frame});
function submit(s,m,highlights=[declaration()],score=[1,0]){act(s,'submit',{id:m.id,score,highlights},pupil(sideMembers(s,m.a)[0]));return s.matchHighlights?.at(-1);}
function approveScore(s){act(s,'approve',{id:s.submissions.at(-1).id},admin);}
function confirm(s,h,id='p2'){act(s,'respondMatchHighlight',{id:h.id,decision:'confirm'},pupil(id));}
function award(s,h){act(s,'reviewMatchHighlight',{id:h.id,decision:'approve'},admin);}
const earned=(s,id,kind)=>breakthroughProgress(s,id).badges.find(b=>b.id===kind).earned;

test('highlights need an opposing confirmation and separate admin approval of an approved played result',()=>{
 const s=setup(),m=fixture(s),h=submit(s,m);
 assert.equal(matchHighlightStatus(h),'awaiting-opponent');assert(!earned(s,'p1','triple-threat'));
 const snapshot=JSON.stringify(s);
 for(const id of ['p1','p3'])assert.throws(()=>confirm(s,h,id),/opposing side/);
 assert.equal(JSON.stringify(s),snapshot);
 assert.throws(()=>award(s,h),/opposing side must confirm/);
 confirm(s,h);assert.equal(matchHighlightStatus(h),'confirmed');
 assert.throws(()=>award(s,h),/Approve the matching played result/);
 assert.throws(()=>act(s,'reviewMatchHighlight',{id:h.id,decision:'approve'},pupil('p2')),/Administrator/);
 approveScore(s);assert(!earned(s,'p1','triple-threat'));
 const basePoints=breakthroughProgress(s,'p1').points;award(s,h);
 assert(earned(s,'p1','triple-threat'));assert(!earned(s,'p2','triple-threat'));
 assert.equal(breakthroughProgress(s,'p1').points,basePoints+30);assert.equal(s.settings.winPoints,3);
 assert.throws(()=>award(s,h),/already been reviewed/);
 assert.throws(()=>confirm(s,h),/already reviewed/);
 validateBackupState(s);
});

test('disputes and missing confirmations never block scores; resolved claims can be awarded later',()=>{
 const s=setup(),m=fixture(s),h=submit(s,m,[declaration('clearance')]);
 act(s,'respondMatchHighlight',{id:h.id,decision:'dispute',reason:'There was a missed shot.'},pupil('p2'));
 assert.equal(matchHighlightStatus(h),'disputed');approveScore(s);assert.equal(m.status,'complete');
 assert.throws(()=>award(s,h),/Resolve any dispute/);assert(!earned(s,'p1','clearance'));
 confirm(s,h);award(s,h);assert(earned(s,'p1','clearance'));
 assert(breakthroughAlerts(s,pupil('p4')).some(e=>e.type==='milestone'&&e.awardId==='clearance'));
 assert(!breakthroughAlerts(s,pupil('p4')).some(e=>e.type==='highlight'));
 const n=fixture(s),pending=submit(s,n);approveScore(s);
 assert.equal(n.status,'complete');assert.equal(matchHighlightStatus(pending),'awaiting-opponent');
});

test('pair highlights belong to the named player and a partner cannot confirm; either opponent can block an award',()=>{
 const s=setup(),c=s.competitions[2];
 Object.assign(c,{status:'drawn',entries:['p1','p2','p3','p4'],teams:[{id:'team-a',members:['p1','p2']},{id:'team-b',members:['p3','p4']}]});
 const m={id:'pairs-match',a:'team-a',b:'team-b',bestOf:1,status:'open'};c.fixtures.push(m);
 const h=submit(s,m,[declaration('clearance')]);
 assert.throws(()=>confirm(s,h,'p2'),/opposing side/);confirm(s,h,'p3');
 act(s,'respondMatchHighlight',{id:h.id,decision:'dispute',reason:'We need to agree the final visit.'},pupil('p4'));
 approveScore(s);assert.throws(()=>award(s,h),/Resolve any dispute/);
 confirm(s,h,'p4');award(s,h);
 assert(earned(s,'p1','clearance'));assert(!earned(s,'p2','clearance'));validateBackupState(s);
});

test('declarations reject impossible winners, unknown players, frames, duplicate claims and forged approvals atomically',()=>{
 for(const declarations of [[declaration('unknown')],[declaration('clearance','p2')],[declaration('triple-threat','p5')],[declaration('triple-threat','p1',2)],[declaration(),declaration()],Array(13).fill(declaration())]){
  const s=setup(),m=fixture(s),before=JSON.stringify(s);
  assert.throws(()=>submit(s,m,declarations));assert.equal(JSON.stringify(s),before);
 }
 const s=setup(),m=fixture(s,'p1','p2',5);
 const h=submit(s,m,[{...declaration('clearance','p2',4),review:{decision:'approve'},responses:[{by:'p1',decision:'confirm'}]}],[3,1]);
 assert.equal(matchHighlightStatus(h),'awaiting-opponent');assert.equal(h.review,undefined);assert.deepEqual(h.responses,[]);
 const before=JSON.stringify(s);
 assert.throws(()=>act(s,'declareMatchHighlights',{id:m.id,highlights:[declaration('clearance','p2',4)]},pupil('p2')),/already has/);
 assert.equal(JSON.stringify(s),before);
});

test('score-only submission stays simple; later declarations are permitted only for participants and played results',()=>{
 const s=setup(),m=fixture(s);submit(s,m,[]);assert.equal(s.matchHighlights,undefined);approveScore(s);
 assert.throws(()=>act(s,'declareMatchHighlights',{id:m.id,highlights:[declaration()]},pupil('p3')),/own matches/);
 act(s,'declareMatchHighlights',{id:m.id,highlights:[declaration()]},pupil('p1'));
 const h=s.matchHighlights[0];confirm(s,h);award(s,h);assert(earned(s,'p1','triple-threat'));
 const next=fixture(s);assert.throws(()=>act(s,'declareMatchHighlights',{id:next.id,highlights:[declaration()]},pupil('p1')),/played match/);
 act(s,'recordResult',{id:next.id,score:[1,0],highlights:[declaration('against-the-odds')]},admin);
 assert.equal(next.status,'complete');assert(!earned(s,'p1','against-the-odds'));
});

test('corrections, returned scores and revocation remove only affected awards and allow fresh declarations',()=>{
 const s=setup(),first=fixture(s),h=submit(s,first,[declaration('clearance')]);confirm(s,h);approveScore(s);award(s,h);
 const other=fixture(s,'p1','p3'),another=submit(s,other);confirm(s,another,'p3');approveScore(s);award(s,another);
 act(s,'correctResult',{id:first.id,score:[0,1],reason:'The submitted winner was wrong.'},admin);
 assert.equal(matchHighlightStatus(h),'invalidated');assert(!earned(s,'p1','clearance'));assert(earned(s,'p1','triple-threat'));
 assert(!breakthroughAlerts(s,pupil('p4')).some(e=>e.awardId==='clearance'));
 assert.throws(()=>award(s,h),/no longer available/);
 act(s,'declareMatchHighlights',{id:first.id,highlights:[declaration('clearance','p2')]},pupil('p2'));
 const replacement=s.matchHighlights.at(-1);confirm(s,replacement,'p1');award(s,replacement);
 act(s,'revokeMatchHighlight',{id:replacement.id,reason:'Claim was entered for the wrong visit.'},admin);
 assert(!earned(s,'p2','clearance'));assert.equal(matchHighlightStatus(replacement),'rejected');
 const third=fixture(s),pending=submit(s,third);act(s,'reject',{id:s.submissions[0].id},admin);
 assert.equal(matchHighlightStatus(pending),'invalidated');assert.equal(third.status,'open');
 validateBackupState(s);
});

test('multiple approved claims earn a badge once, survive encrypted recovery and remain valid after league archiving',()=>{
 const s=setup();s.divisions=[{id:'d',name:'Sample division',players:s.players.map(p=>p.id)}];
 for(let i=0;i<2;i++){const m=fixture(s),h=submit(s,m);confirm(s,h);approveScore(s);award(s,h);}
 assert.equal(breakthroughProgress(s,'p1').badges.filter(b=>b.id==='triple-threat'&&b.earned).length,1);
 const points=breakthroughProgress(s,'p1').points;
 assert.equal(breakthroughAlerts(s,pupil('p1')).filter(e=>e.awardId==='triple-threat'&&e.type==='achievement').length,1);
 act(s,'promote',{},admin);assert(earned(s,'p1','triple-threat'));assert.equal(breakthroughProgress(s,'p1').points,points);
 const restored=openBackup(sealBackup(s,8,'test-highlight-backup-passphrase','portable'),'test-highlight-backup-passphrase','portable');
 assert.deepEqual(restored.matchHighlights,s.matchHighlights);
 for(const alter of [h=>h.responses[0].by='p1',h=>h.frame=9,h=>h.review.decision='unexpected',h=>h.review.reason=12]){
  const bad=structuredClone(s);alter(bad.matchHighlights[0]);assert.throws(()=>validateMatchHighlightsState(bad));
 }
});

test('changing a knockout feeder cancels dependent highlight awards while preserving an unrelated approved semi-final',()=>{
 const s=setup(),c=s.competitions[1];
 c.entries=['p1','p2','p3','p4'];act(s,'drawCompetition',{id:c.id},admin);
 const [first,other]=c.rounds[0];
 function play(m,kind){
  const id=sideMembers(s,m.a)[0],opponent=sideMembers(s,m.b)[0];
  const h=submit(s,m,[declaration(kind,id)]);confirm(s,h,opponent);approveScore(s);award(s,h);return h;
 }
 const feeder=play(first,'clearance'),unrelated=play(other,'triple-threat'),final=c.rounds.at(-1)[0];
 const dependent=play(final,'against-the-odds');
 act(s,'correctResult',{id:first.id,score:[0,1],reason:'The opening result was reversed.'},admin);
 assert.equal(matchHighlightStatus(feeder),'invalidated');assert.equal(matchHighlightStatus(dependent),'invalidated');
 assert.equal(matchHighlightStatus(unrelated),'approved');assert.equal(other.status,'complete');assert.equal(final.status,'open');
 assert(!earned(s,dependent.playerId,'against-the-odds'));assert(earned(s,unrelated.playerId,'triple-threat'));
 validateBackupState(s);
});

test('API hides pending declarations and dispute reasons from others, persists confirmations and rejects stale awards',async()=>{
 const DB=await database(),s=setup(),m=fixture(s),env={DB,ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'synthetic-highlights-session-secret-32-chars'};
 const owner={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.ADMIN_EMAIL},handler=createHandler(env);
 DB.sql.prepare('INSERT INTO club_state (id,revision,data) VALUES (1,0,?)').run(JSON.stringify(s));
 const call=async(route,body,extra={})=>{const response=await handler({path:'/api/'+route,httpMethod:body?'POST':'GET',headers:{host:'club.example','content-type':'application/json',...extra},body:body&&JSON.stringify(body)});return {...response,data:JSON.parse(response.body)};};
 const action=(name,payload,revision,headers)=>call('action',{action:name,payload,revision},headers);
 try{
  const pins=await action('pins',{},0,owner),sessions={};
  for(const id of ['p1','p2','p3']){const pin=pins.data.pins.find(p=>p.name===s.players.find(p=>p.id===id).name).pin;const login=await call('login',{role:'player',id,pin});sessions[id]={cookie:login.headers['Set-Cookie'].split(';')[0]};}
  const submitted=await action('submit',{id:m.id,score:[1,0],highlights:[declaration('clearance')]},1,sessions.p1);
  assert.equal(submitted.statusCode,200);const h=submitted.data.state.matchHighlights[0];
  for(const headers of [{},sessions.p3]){const result=await call('state',undefined,headers);assert.deepEqual(result.data.state.matchHighlights,[]);assert(!result.body.includes(h.id));}
  const disputed=await action('respondMatchHighlight',{id:h.id,decision:'dispute',reason:'Private test dispute detail'},2,sessions.p2);assert.equal(disputed.statusCode,200);
  const outsider=await call('state',undefined,sessions.p3);assert(!outsider.body.includes('Private test dispute detail'));
  assert.equal((await action('respondMatchHighlight',{id:h.id,decision:'confirm'},3,sessions.p1)).statusCode,400);
  assert.equal((await action('respondMatchHighlight',{id:h.id,decision:'confirm'},3,sessions.p2)).statusCode,200);
  assert.equal((await action('approve',{id:submitted.data.state.submissions[0].id},4,owner)).statusCode,200);
  assert.equal((await action('reviewMatchHighlight',{id:h.id,decision:'approve'},4,owner)).statusCode,409);
  const awarded=await action('reviewMatchHighlight',{id:h.id,decision:'approve'},5,owner);assert.equal(awarded.statusCode,200);
  const publicState=await call('state');assert.equal(publicState.data.state.matchHighlights[0].review.decision,'approve');
  assert.equal(publicState.data.state.matchHighlights[0].declaredBy,undefined);assert.deepEqual(publicState.data.state.matchHighlights[0].responses,[]);
  const backup=await call('backup',{passphrase:'test-highlight-backup-passphrase'},owner);assert.equal(backup.statusCode,200);
  assert.equal(openBackup(backup.data.backup,'test-highlight-backup-passphrase','portable').matchHighlights[0].responses[0].by,'p2');
  assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM club_backups').get().n,6);
 }finally{DB.sql.close();}
});
