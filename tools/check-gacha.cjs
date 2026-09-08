const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const nodes=new Map();function node(id){return {id,innerHTML:'',textContent:'',children:[],style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},appendChild(){},insertAdjacentHTML(){},querySelector(){return node('child');},querySelectorAll(){return[];},addEventListener(){},remove(){},focus(){}};}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},querySelectorAll(){return[];},querySelector(){return null;},createElement:node,body:node('body'),addEventListener(){}};
const tasks=[];const ctx=vm.createContext({console,document,window:{location:{hash:'',search:''},matchMedia(){return{matches:true}},addEventListener(){}},location:{hash:'',search:''},localStorage:{getItem(){return'0'},setItem(){}},navigator:{},URLSearchParams,Set,Map,Math,Date,setTimeout(fn){tasks.push(fn);return tasks.length},clearTimeout(){},setInterval(){},clearInterval(){},Image:function(){},requestAnimationFrame(){},AbortController});
for(const f of ['players.js','danger.js','data-fixes.js','party.js','ss.js','game.js','premium.js']){let s=fs.readFileSync(''+f,'utf8');if(f==='game.js')s=s.replace(/^buildFrontPage\(\);/m,'');vm.runInContext(s,ctx,{filename:f});}
const run=s=>vm.runInContext(s,ctx);
run('ldTrial(2);');   // 読み込み時の自動起動を止めたので、ここで体験版を開く
assert.equal(run('state.gacha.round'),2);assert.equal(run('ldSlots().length'),15);
for(const [round,count] of [[0,1],[1,1],[2,15],[3,11]]){
  for(let attempt=0;attempt<20;attempt++){
    run('ldTrial('+round+');gachaPull(true);');
    assert.equal(run('state.gacha.pulls.length'),count);
    assert.equal(run('state.gacha.revealed'),count);
    assert.equal(run('new Set(state.gacha.pulls.map(x=>x.p?.id||x.park.id)).size'),count);
    assert.equal(run('state.gacha.pulls.every(x=>!x.p||eligibleGrp(x.p,x.d.grp))'),true);
    assert.equal(run('state.gacha.pulls.every(x=>!x.p||Object.values(gachaTeam().slots).some(p=>p.id===x.p.id))'),true);
    if(count>=5)assert.equal(run('state.gacha.pulls.some(x=>["SS","S","A"].includes(x.rank))'),true);
    assert(!nodes.get('gc-stage').innerHTML.includes('undefined'));
  }
}
run('ldTrial(2);gachaPull();');const g=run('state.gacha');run('gachaPull();');assert.equal(run('state.gacha'),g);assert.equal(run('state.gacha.pulls.length'),15);
const ptr=run('state.gacha.ptr');run('gachaAdvance();');assert.equal(run('state.gacha.ptr'),ptr);
assert.equal(run('ldBusy'),false);
const missingSsLore=run('POOL.filter(p=>p.cat!=="M"&&rankOf(p.ovr)==="SS"&&!SS_LORE[p.name]).map(p=>p.name)');
assert.equal(missingSsLore.length,0,`SS lore missing: ${missingSsLore.join(', ')}`);
assert.equal(run('["クリスチャン・イエリチ","テオスカー・ヘルナンデス","ウィル・スミス (投手)","マーカス・セミエン","ボビー・コックス"].every(n=>POOL.some(p=>p.name===n&&!Object.hasOwn(p,"ph")&&/commons\\.wikimedia\\.org/.test(p.pu)))'),true);
// A queued automatic reveal must respect a pause before its timer fires.
run('var savedNext=gachaRevealNext;var nextCalls=0;gachaRevealNext=()=>nextCalls++;ldAuto=true;ldQueueNext();ldPause();');
tasks.pop()();assert.equal(run('nextCalls'),0);
run('ldAuto=true;ldQueueNext();');tasks.pop()();assert.equal(run('nextCalls'),1);
run('gachaRevealNext=savedNext;ldTrial(2);');
run('ldToggleResults();');assert.equal(run('ldResultView'),false);
run('gachaPull(true);ldToggleResults();');assert.equal(run('ldResultView'),true);
assert.equal((nodes.get('gc-stage').innerHTML.match(/class="ld-result-position"/g)||[]).length,15);
run('ldToggleResults();');assert.equal(run('ldResultView'),false);
run('ssCtx={page:2};ssQueue.push([]);ldCancel();');assert.equal(run('ssCtx'),null);assert.equal(run('ssQueue.length'),0);
console.log('PASS: 80 draw batches; roster and guarantees; pause/resume timers; complete-only 15-card results; SS cancellation.');
vm.runInContext(fs.readFileSync('pull.js','utf8'),ctx,{filename:'pull.js'});
run('ldTrial(2);gachaPull();');
assert.equal(run('state.gacha.pulls'),null,'Do not draw before the handle sequence finishes');
assert.equal(run('ldBusy&&ldPulling'),true);
const pending=tasks.length;run('gachaPull();');assert.equal(tasks.length,pending,'Ignore double pulls');
const completePull=tasks.pop();tasks.pop()();completePull();
assert.equal(run('state.gacha.pulls.length'),15);assert.equal(run('ldPulling'),false);
run('ldTrial(2);gachaPull();');const stalePull=tasks.pop();run('ldTrial(3);');stalePull();
assert.equal(run('state.gacha.pulls'),null,'Switching rounds cancels the pending draw');
run('ldTrial(2);var lever={value:45};ldRelease(lever);');assert.equal(run('lever.value'),0);assert.equal(run('state.gacha.pulls'),null);
run('gachaPull(true);');assert.equal(run('state.gacha.revealed'),15,'CPU draws remain immediate');
console.log('PASS: handle completion, double-pull guard, interrupted draw cancellation, partial-drag reset and CPU compatibility.');
run('ldTrial(2);var crank={dataset:{},setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){}};var down={pointerId:1,clientY:0,currentTarget:crank,button:0};ldGrip(down);ldDrag({...down,clientY:35});ldLetGo({...down,clientY:35});ldCrankClick({currentTarget:crank,detail:1});');
assert.equal(run('state.gacha.pulls'),null);assert.equal(run('ldPulling'),false,'Partial drag must not become a click draw');
run('ldGrip(down);ldDrag({...down,clientY:100});');assert.equal(run('ldPulling'),true,'Full direct drag starts the draw');
run('ldCancel();ldTrial(2);ldCrankClick({currentTarget:crank,detail:0});');assert.equal(run('ldPulling'),true,'Keyboard activation remains available');
console.log('PASS: direct crank drag, partial-drag click suppression and keyboard activation.');
vm.runInContext(fs.readFileSync('ss-story.js','utf8'),ctx,{filename:'ss-story.js'});
run('ldCancel();var storyDone=0;var legend=POOL.find(p=>p.cat==="B"&&rankOf(p.ovr)==="SS");var storyPick={p:legend,d:{grp:"B",label:"野手"},rank:"SS"};ssShow(storyPick,()=>storyDone++);');
assert.equal(run('ssCtx.page'),0);assert(nodes.get('ss-panel').innerHTML.includes('時を巻き戻す'));
const rewindEnd=tasks[tasks.length-1];run('ssNext();');assert.equal(run('ssCtx.page'),1);
rewindEnd();assert.equal(run('ssCtx.eventIndex'),0,'Stale rewind timer cannot skip an event');
const eventCount=run('ldStoryEvents(legend).length');
for(let i=0;i<eventCount;i++)run('ssNext();');assert.equal(run('ssCtx.page'),2);
run('ssNext();');assert.equal(run('ssCtx.page'),3);
run('ldStoryCard();');assert.equal(run('ssCtx.page'),4);
run('ssNext();ssNext();');assert.equal(run('storyDone'),1);
console.log('PASS: SS rewind, chronological steps, stale-timer protection, awards/records, card skip and exactly-once acquisition.');
vm.runInContext(fs.readFileSync('capsules.js','utf8'),ctx,{filename:'capsules.js'});
run('ldCancel();ldTrial(2);gachaPull(true);');
assert.notEqual(run('ldCapsuleColor({mlb:true,team:"ドジャース"})'),run('ldCapsuleColor({mlb:true,team:"レッドソックス"})'));
assert.equal(run('POOL.filter(p=>p.mlb).every(p=>/^#[0-9a-f]{6}$/i.test(ldCapsuleColor(p)))'),true);
const shell=run('gachaCapHtml({...state.gacha.pulls[0],rank:"SS"},0,false)');assert(shell.includes('cap-SS'));assert(shell.includes('伝説の輝き'));
assert(!shell.includes(run('state.gacha.pulls[0].p.name')),'Capsule must not expose the player name');
console.log('PASS: club palettes, SS capsule cues and player-name concealment.');
vm.runInContext(fs.readFileSync('club-ceremony.js','utf8'),ctx,{filename:'club-ceremony.js'});
for(const round of [0,1]){
  run('ldCancel();ldTrial('+round+');');assert(!nodes.get('gc-stage').innerHTML.includes('ld-machine-stage'));
  assert(run('ldActions()').includes(round===0?'球場をタップ':'封筒をタップ'));
  run('gachaPull();');assert.equal(run('state.gacha.revealed'),0);assert.equal(run('ldBusy'),true);
  const selection=run('state.gacha.pulls[0]');run('gachaPull();');assert.equal(run('state.gacha.pulls[0]'),selection);
  const pendingFinish=tasks[tasks.length-1];run('ldCeremonyFinish();ldCeremonyFinish();');assert.equal(run('state.gacha.revealed'),1);assert.equal(run('ldBusy'),false);
  assert(nodes.get('gc-stage').innerHTML.includes(round===0?'home-complete':'契約成立'));
  run('ldTrial(2);');pendingFinish();assert.equal(run('state.gacha.pulls'),null);
}
console.log('PASS: stadium entry and manager contract, single assignment, skip, completion and stale-ceremony cancellation.');
vm.runInContext(fs.readFileSync('tap-first.js','utf8'),ctx,{filename:'tap-first.js'});
run('ldTrial(1);ldCeremonyTap();');const tapped=run('state.gacha');run('ldCeremonyTap();');assert.equal(run('state.gacha'),tapped);
run('ldCeremonyFinish();ldCeremonyTap();');assert.equal(run('state.gacha'),tapped,'Ignore completion double-taps');
run('state.gacha.ceremonyDoneAt=Date.now()-1000;ldCeremonyTap();');assert.notEqual(run('state.gacha'),tapped);
assert(nodes.get('gc-stage').innerHTML.includes('envelope-closed.webp'));
run('ldTrial(0);');assert(nodes.get('gc-stage').innerHTML.includes('stadium-entry.webp'));
run('ldTrial(2);');assert(!run('ldActions()').includes('gachaPull()'));
console.log('PASS: envelope/stadium tap targets, repeated-tap guard, confirmation tap and direct machine control.');
run('ldTrial(2);gachaPull(true);');
const hero=run('ldCapsuleHero({...state.gacha.pulls[0],rank:"S"})');
assert(hero.includes(run('ldCapsuleColor(state.gacha.pulls[0].p)')));assert(hero.includes('ld-cap-tint'));assert(hero.includes('shell-upper'));assert(hero.includes('shell-lower'));
const previousQuery=document.querySelector,ink=node('ink');document.querySelector=selector=>selector==='.manager-signature strong'?ink:null;
run('ldTrial(1);gachaPull();state.gacha.ceremony="lights";ldWriteSignature(state.gacha);');
assert(ink.innerHTML.includes('--stroke:0'));assert.equal((ink.innerHTML.match(/<span /g)||[]).length,run('Array.from(state.gacha.pulls[0].p.name).length'));
ink.innerHTML='done';run('state.gacha.ceremony="complete";ldWriteSignature(state.gacha);');assert.equal(ink.innerHTML,'done');document.querySelector=previousQuery;
run('ldCancel();ssShow(storyPick,()=>{});');assert(!nodes.get('ss-panel').innerHTML.includes('archive-photo'));
console.log('PASS: matching enlarged capsule palette, split shell, signature glyphs/cancellation and concealed SS face.');
