import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, createLeague, createCup, applyResult, standings, act, promote, recentPlayerForm, ensureCompetitions, SCHOOL_POOL_RULES } from '../lib/domain.mjs';
const admin={role:'admin',name:'Mr French'};
test('rules placeholder upgrades preserve custom rules, fixed draws, scores and private account data',()=>{
 const s=initialState(true),placeholder='Seven-ball pool. Agree school rules before breaking.';
 s.settings.rules=placeholder;s.competitions.forEach(c=>c.rules=placeholder);
 s.players[0].pinHash='synthetic-private-hash';
 for(const p of s.players.slice(0,4))act(s,'enterCompetition',{id:'pairs-league'},{role:'player',id:p.id});
 act(s,'drawCompetition',{id:'pairs-league'},admin);
 const match=s.competitions[2].fixtures[0];applyResult(s,match.id,[1,0]);
 s.settings.rules=placeholder;s.competitions[0].rules=placeholder;s.competitions[2].rules=placeholder;
 s.competitions[1].rules='Administrator-written cup rules';s.competitions[3].rules='';
 const expected=structuredClone(s);expected.settings.rules=SCHOOL_POOL_RULES;
 for(const index of [0,2])expected.competitions[index].rules=SCHOOL_POOL_RULES;
 ensureCompetitions(s);assert.deepEqual(s,expected);
 s.settings.rules='Administrator-written school rules';const custom=structuredClone(s);
 ensureCompetitions(s);assert.deepEqual(s,custom);
});
test('42-player league: four balanced divisions, each pair plays exactly once',()=>{
 const s=initialState(true);assert.deepEqual(s.divisions.map(d=>d.players.length).sort(),[10,10,11,11]);assert.equal(s.league.length,200);
 for(const d of s.divisions){const matches=s.league.filter(m=>m.division===d.id);assert.equal(matches.length,d.players.length*(d.players.length-1)/2);assert.equal(new Set(matches.map(m=>[m.a,m.b].sort().join(':'))).size,matches.length);assert(matches.every(m=>m.a!==m.b));}
});
test('league standings only include completed results, sort by points and frame difference',()=>{
 const s=initialState();createLeague(s);const m=s.league[0];act(s,'submit',{id:m.id,score:[1,0]},admin);assert.equal(standings(s)[0].played,0);act(s,'approve',{id:s.submissions[0].id},admin);assert.equal(standings(s)[0].id,m.a);assert.equal(standings(s)[0].points,3);assert.equal(standings(s)[1].lost,1);
});
test('player form uses the latest five played results across singles and pairs, preserving their dates after correction',()=>{
 const s=initialState(),[a,b]=s.players.map(p=>p.id);
 s.players.push({id:'partner'},{id:'opposing-partner'},{id:'inactive'});
 const date=day=>`2026-11-${String(day).padStart(2,'0')}T10:00:00.000Z`;
 const match=(id,sideA=a,sideB=b)=>({id,a:sideA,b:sideB,status:'open',bestOf:1});
 const pairs=s.competitions[2];
 pairs.teams=[{id:'team-a',members:[a,'partner']},{id:'team-b',members:[b,'opposing-partner']}];
 const paired=match('paired','team-a','team-b');pairs.fixtures=[paired];
 const legacy={...match('legacy'),status:'complete',score:[0,1]};
 const walkover={...match('walkover'),status:'complete',score:[1,0],walkover:true,resultAt:date(9)};
 s.league=[match('recent'),walkover,match('unapproved'),match('early'),match('middle'),match('later')];
 s.history=[{league:[legacy]}];
 const outcomes=id=>recentPlayerForm(s).get(id).map(result=>result.outcome).join('');
 assert.deepEqual(recentPlayerForm(s).get(a),[{outcome:'L',dated:false}]);
 applyResult(s,'recent',[0,1],date(6));
 applyResult(s,'early',[0,1],date(1));
 applyResult(s,'middle',[1,0],date(3));
 applyResult(s,'later',[0,1],date(5));
 act(s,'submit',{id:'unapproved',score:[1,0]},admin);
 act(s,'submit',{id:'paired',score:[1,0]},admin);
 const submission=s.submissions.find(sub=>sub.match==='paired');submission.at=date(4);
 assert.equal(outcomes('partner'),'');
 act(s,'approve',{id:submission.id},admin);
 assert.equal(paired.resultAt,date(4));
 assert.equal(outcomes(a),'LLWWL');
 assert.equal(outcomes('partner'),'W');
 assert.equal(outcomes('opposing-partner'),'L');
 assert.equal(outcomes('inactive'),'');
 act(s,'correctResult',{id:'paired',score:[0,1],reason:'Corrected score'},admin);
 assert.equal(paired.resultAt,date(4));
 assert.equal(outcomes(a),'LLLWL');
 act(s,'correctResult',{id:'paired',score:null,reason:'Replay required'},admin);
 assert.equal(paired.resultAt,undefined);
 assert.equal(outcomes('partner'),'');
});
test('score validation, duplicate submission and participant authorization',()=>{
 const s=initialState(true),m=s.league.find(m=>m.status==='open');const user={role:'player',id:m.a};
 assert.throws(()=>act(s,'submit',{id:m.id,score:[1,1]},user),/valid/);
 assert.throws(()=>act(s,'submit',{id:m.id,score:[1,0]},{role:'player',id:'stranger'}),/own matches/);
 act(s,'submit',{id:m.id,score:[1,0]},user);assert.throws(()=>act(s,'submit',{id:m.id,score:[1,0]},user),/already/);
 assert.throws(()=>act(s,'approve',{id:s.submissions[0].id},user),/Administrator/);
 act(s,'reject',{id:s.submissions[0].id},admin);act(s,'submit',{id:m.id,score:[0,1]},user);act(s,'approve',{id:s.submissions[0].id},admin);assert.equal(m.winner,m.b);
});
test('best-of-five validates winning threshold and immediate results setting',()=>{
 const s=initialState();s.settings.frames=5;s.settings.approval=false;createLeague(s);const m=s.league[0];
 assert.throws(()=>act(s,'submit',{id:m.id,score:[2,1]},admin),/valid/);
 act(s,'submit',{id:m.id,score:[3,2]},admin);assert.equal(m.status,'complete');assert.equal(s.submissions.length,0);
});
test('every cup size 2–64 produces one champion with no player duplicated and n−1 played matches',()=>{
 for(let n=2;n<=64;n++){
  const s=initialState();s.settings.consolation=false;s.players=Array.from({length:n},(_,i)=>({id:`p${i}`,name:`Player ${i}`}));const cup=createCup(s,'Cup');
  const first=cup.rounds[0].flatMap(m=>[m.a,m.b]).filter(Boolean);assert.equal(first.length,n);assert.equal(new Set(first).size,n);
  let played=0;for(const round of cup.rounds)for(const m of round)if(m.status==='open'){applyResult(s,m.id,[1,0]);played++;}
  assert.equal(played,n-1);assert(cup.rounds.at(-1)[0].winner);
 }
});
test('consolation draw is created once, after opening round completes, and only contains losers',()=>{
 const s=initialState(true);s.cups=[];const c=createCup(s,'Cup');for(const m of c.rounds[0])if(m.status==='open')applyResult(s,m.id,[1,0]);
 assert.equal(s.cups.length,2);const plate=s.cups[1];assert(plate.consolation);const losers=c.rounds[0].filter(m=>m.status==='complete').map(m=>m.b).sort();assert.deepEqual(plate.rounds[0].flatMap(m=>[m.a,m.b]).filter(Boolean).sort(),losers);
 for(const round of plate.rounds)for(const m of round)if(m.status==='open')applyResult(s,m.id,[1,0]);assert.equal(s.cups.length,2);
});
test('new season requires completion, archives results and promotes/relegates without losing players',()=>{
 const s=initialState(true);assert.throws(()=>promote(s),/Complete/);for(const m of s.league)if(m.status==='open')applyResult(s,m.id,[1,0]);
 const old=s.divisions.map(d=>standings(s,d.id).map(r=>r.id));promote(s);assert.equal(s.history.length,1);assert.equal(s.history[0].league.length,200);assert(s.league.every(m=>m.status==='open'));assert(s.divisions[0].players.includes(old[1][0]));assert(s.divisions[1].players.includes(old[0].at(-1)));assert.equal(new Set(s.divisions.flatMap(d=>d.players)).size,42);
});
test('protected settings, invalid names, and existing competition guards',()=>{
 const s=initialState();assert.throws(()=>act(s,'settings',{frames:2},admin),/odd/);assert.throws(()=>act(s,'settings',{logo:'data:image/svg+xml;abc'},admin),/PNG/);assert.throws(()=>act(s,'addPlayers',{names:'George'},admin),/unique/);createLeague(s);assert.throws(()=>act(s,'addPlayers',{names:'Oliver'},admin),/before/);
});

test('previous shipped house rules upgrade without altering a customised copy or fixed competition data',()=>{
 const previousRules = [
 '1. Nominate the pocket before playing the shot to pot the black. To win the frame, the black must go into that pocket.',
 '2. Shots awarded after a foul carry over when you pot a ball. Potting does not use up an awarded shot.',
 '3. Potting the black before clearing all your own balls loses the frame under all circumstances.',
 '4. When on the black, you lose the frame if the cue ball hits an opponent\'s ball first and the black is potted on the same shot, even accidentally.',
 '5. Potting the white and the black on the same shot loses the frame, even if the black goes into the nominated pocket. The order in which they are potted makes no difference.',
 '6. Disputes must be resolved between the players involved. If they cannot agree, Mr French will act as arbitrator. His decision is final.'
].join('\n\n');
 const s=initialState(true);s.settings.rules=previousRules;s.competitions[0].rules=previousRules;s.competitions[1].rules=previousRules+'\nLocal amendment';
 const expected=structuredClone(s);expected.settings.rules=SCHOOL_POOL_RULES;expected.competitions[0].rules=SCHOOL_POOL_RULES;
 ensureCompetitions(s);assert.deepEqual(s,expected);assert(SCHOOL_POOL_RULES.length<=2000);
});
