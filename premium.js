/* Presentation upgrade. The original roster, player pool and pennant engine stay intact. */
let ldDemo = true;
let ldBusy = false;
let ldAuto = false;
let ldFast = false;
let ldResultView = false;
let ldTimers = new Set();
let ldFinish = null;
const ldOriginalAdvance = gachaAdvance;
const ldOriginalPull = gachaPull;
const ldPositions = {C:'捕手',B1:'一塁手',B2:'二塁手',B3:'三塁手',SS:'遊撃手',OF1:'左翼手',OF2:'中堅手',OF3:'右翼手',DH:'指名打者'};
Object.assign(GC_FIELD,{OF1:[24,41],OF2:[50,35],OF3:[76,41],SS:[37,56],B2:[63,56],B3:[20,68],B1:[80,68],C:[50,86],DH:[90,88]});
const ldDelay = (fn, ms) => { const id = setTimeout(() => {ldTimers.delete(id);fn();}, ms);ldTimers.add(id);return id; };
function ldCancel(){ldTimers.forEach(clearTimeout);ldTimers.clear();ldBusy=false;ldAuto=false;ldResultView=false;ldFinish=null;ssCtx=null;ssQueue.length=0;$('ss-bg').classList.remove('show');document.querySelector('.ld-reveal')?.remove();seRollStop();}
function ldQueueNext(ms=420){ldDelay(()=>{if(ldAuto)gachaRevealNext();},ldFast?Math.min(ms,120):ms);}
function ldPause(){ldAuto=false;ldRefreshActions();}
function ldToggleSpeed(){ldFast=!ldFast;ldRefreshActions();}
function ldToggleSound(button){toggleSnd();button.textContent=sndOn?'音 ON':'音 OFF';}
function ldActions(){
  const G=state.gacha;if(!G)return '';
  if(gachaTeam().cpu||G.phase==='drop')return '<span class="ld-wait">抽選中…</span>';
  if(!G.pulls)return ldButton(ldSlots().length+'連ガチャを回す <span>→</span>','gachaPull()','primary');
  if(G.revealed>=G.pulls.length)return (G.pulls.length>1?ldButton(ldResultView?'守備位置に戻る':'獲得カード一覧','ldToggleResults()','quiet'):'')+ldButton(ldDemo?'もう一度回す ↻':'次のガチャへ →','gachaAdvance()','primary');
  return ldButton(ldFast?'速度：高速':'速度：標準','ldToggleSpeed()','quiet')+(ldAuto?ldButton('自動開封を一時停止','ldPause()','primary'):ldButton('すべて開封','gachaRevealAll()','quiet')+ldButton('次を開封 →','gachaRevealNext()','primary'));
}
function ldRefreshActions(){const actions=$('gc-foot').querySelector('.ld-foot-actions');if(actions)actions.innerHTML=ldActions();}
function ldToggleResults(){const G=state.gacha;if(ldBusy||!G?.pulls||G.revealed<G.pulls.length)return;ldResultView=!ldResultView;renderGacha();}
function ldResults(){
  const pulls=state.gacha.pulls;
  return '<section class="ld-results"><header><small>DRAFT COMPLETE</small><h2>獲得したレジェンド</h2><p>'+pulls.length+'枚のカードをタップして詳細を見る</p><div class="ld-result-counts">'+RANK_ORDER.map(r=>{const n=pulls.filter(x=>x.rank===r).length;return n?'<span>'+ldRank(r)+'<b>× '+n+'</b></span>':'';}).join('')+'</div></header><div class="ld-result-grid">'+pulls.map((x,i)=>'<div><span class="ld-result-position">'+esc(ldPositions[x.d.key]||x.d.label)+'</span>'+cardHtml(x.p,x.rank,{size:'m',pos:ldPositions[x.d.key]||x.d.label,grp:x.d.grp,onclick:'cardPop('+i+')'})+'</div>').join('')+'</div></section>';
}
function ldTrial(round=2){
  ldCancel();ldDemo=true;applyRoster(5,5,6);POOL=PLAYERS.concat(MLB_STARS);
  state.eras=new Set();state.rankCap=0;state.taken=new Set();state.budget=9999;state.opts.gacha=true;state.parts=[newTeam('MY LEGENDS','',false,'#e8bf72',0)];state.currentIdx=0;
  state.gacha={order:[0],ptr:0,round,pulls:null,revealed:0,phase:'idle'};
  show('scr-gacha');renderGacha();
}
function ldSetup(){ldCancel();ldDemo=false;state.gacha=null;goSetup();$('opt-gacha').checked=true;ldSyncSetup();}
function ldSyncSetup(){
  const on=!!$('opt-gacha')?.checked,go=document.querySelector('#scr-setup .setup-go .btn'),note=document.querySelector('#scr-setup .sg-note');
  if(go)go.textContent=on?'ガチャで球団結成へ':'ドラフト会議へ';
  if(note)note.textContent=on?'球場・監督・野手・投手を順に引いて球団を作ります':'準備ができたら、監督から順に指名します';
}
function ldRank(rank){return '<span class="ld-rank '+rank+'">'+rank+'</span>';}
function ldButton(text,call,cls=''){return '<button type="button" class="ld-btn '+cls+'" onclick="'+call+'">'+text+'</button>';}
// 小さな札は手元の写真(速い)。拡大・SSの大判だけ Commons の高解像度を使う
function ldLocalPhoto(p){
  if(p.ph!==undefined) return {src:'assets/face/'+p.ph+'.jpg',fallback:'',hi:false};
  return ldPlayerPhoto(p);
}
function ldPlayerPhoto(p){
  const fallback=p.ph!==undefined?'assets/face/'+p.ph+'.jpg':'';
  try{
    const source=new URL(p.pu||''),mark='/wiki/File:',at=source.pathname.indexOf(mark);
    if(at>=0&&source.hostname.endsWith('wikimedia.org')){
      const file=decodeURIComponent(source.pathname.slice(at+mark.length));
      return {src:source.origin+'/wiki/Special:Redirect/file/'+encodeURIComponent(file)+'?width=1200',fallback,hi:true};
    }
  }catch(e){}
  return {src:fallback,fallback:'',hi:false};
}
function ldRevealFx(){
  const rays=Array.from({length:20},(_,i)=>'<i style="--i:'+i+'"></i>').join('');
  const particles=Array.from({length:42},(_,i)=>'<b style="--i:'+i+'"></b>').join('');
  return '<div class="ld-cinema" aria-hidden="true"><div class="ld-floodlights"><span></span><span></span><span></span><span></span></div><div class="ld-speedlines">'+rays+'</div><div class="ld-orbits"><span></span><span></span><span></span></div><div class="ld-particles">'+particles+'</div><div class="ld-impact"></div><div class="ld-flare"></div></div>';
}
function ldSlots(){const R=gachaRound(),t=gachaTeam();return state.gacha.pulls || gachaOpenFor(t,R).map(d=>({d,rank:'B',open:false}));}
function ldSlot(x,i){
  const G=state.gacha, pos=ldPositions[x.d.key]||x.d.label;
  const inside=x.open?cardHtml(x.p,x.rank,{size:'s',pos,grp:x.d.grp,onclick:'cardPop('+i+')'}):gachaCapHtml(x,i,false);
  return '<div class="gc-spot '+(x.open?'open':'')+'" data-i="'+i+'">'+inside+'</div>';
}
function ldField(){
  const R=gachaRound(),slots=ldSlots();
  if(R.k==='B'){
    const field=slots.map((x,i)=>GC_FIELD[x.d.key]?'<div class="gc-at" style="left:'+GC_FIELD[x.d.key][0]+'%;top:'+GC_FIELD[x.d.key][1]+'%">'+ldSlot(x,i)+'</div>':'').join('');
    const bench=slots.map((x,i)=>!GC_FIELD[x.d.key]?ldSlot(x,i):'').join('');
    return '<div class="gc-fieldwrap"><div class="ld-field-caption"><span>先発野手</span><span>守備位置をタップして開封</span></div><div class="gc-field">'+field+'<span class="ld-mound-label">LEGEND DRAFT</span></div><div class="ld-bench"><div class="ld-bench-label">BENCH <small>控え野手</small></div><div class="ld-bench-slots">'+bench+'</div></div></div>';
  }
  if(R.k==='P')return '<div class="ld-bullpen"><div class="ld-field-caption">投手陣</div>'+['SP','RP','CL'].map(grp=>'<section><h3>'+({SP:'先発ローテーション',RP:'中継ぎ',CL:'守護神'})[grp]+'</h3><div class="ld-pitch-row">'+slots.map((x,i)=>x.d.grp===grp?ldSlot(x,i):'').join('')+'</div></section>').join('')+'</div>';
  const x=slots[0];return '<div class="ld-single"><div class="ld-single-caption">'+(R.k==='K'?'本拠地':'監督')+'</div>'+(x?(x.open?gachaCardHtml(x,true):'<div class="gc-spot one" data-i="0">'+gachaCapHtml(x,0,true)+'</div>'):'')+'<p>'+(R.k==='K'?'この球場から、伝説が始まる。':'あなたの球団を率いる、ひとり。')+'</p></div>';
}
renderGacha=function(){
  const G=state.gacha;if(!G)return;const R=gachaRound(),t=gachaTeam(),slots=ldSlots(),total=slots.length,all=!!G.pulls&&G.revealed>=total;
  $('gc-head').innerHTML='<div class="ld-brand"><b>LEGEND<span>DRAFT</span></b><small>歴代最強ペナント</small></div><div class="ld-header-right"><span class="ld-mode">'+(ldDemo?'ガチャ体験':'球団編成')+'</span>'+ldButton(sndOn?'音 ON':'音 OFF','ldToggleSound(this)','quiet')+ldButton('本編をはじめる ↗','ldSetup()','quiet')+'</div>';
  $('ld-intro').innerHTML='<div><div class="ld-eyebrow">球団をつくる</div><h1>'+R.label.replace('ガチャ','')+'<span>ガチャ</span></h1><p>'+ (R.k==='B'?'9つの守備位置と6つの控え枠。カプセルの先に、あなたのベストナイン。':R.note)+'</p></div><div class="ld-team"><small>YOUR TEAM</small><b>'+esc(t.name)+'</b><span>'+ (ldDemo?'何度でも無料で体験':(G.ptr+1)+' / '+G.order.length+' 球団')+'</span></div>';
  $('ld-tabs').innerHTML=GACHA_ROUNDS.map((r,i)=>'<button type="button" '+(!ldDemo?'disabled':'')+' class="'+(i===G.round?'active':'')+'" onclick="ldTrial('+i+')"><small>0'+(i+1)+'</small>'+r.label+'<span>'+({K:'1',M:'1',B:'15',P:'11'})[r.k]+'</span></button>').join('');
  $('gc-stage').className='gc-stage'+(G.phase==='drop'?' ld-dropping':'');
  $('gc-stage').innerHTML=(ldResultView&&all&&total>1?ldResults():ldField())+(G.phase==='drop'?'<div class="ld-draw-show" aria-hidden="true"><div class="ld-draw-beams"></div><div class="ld-draw-wave"></div><b>抽選完了</b><span>カプセルを守備位置へ</span></div>':'')+'<div class="gc-hint" role="status" aria-live="polite">'+(G.phase==='drop'?'球場にカプセルが到着中…':all?'全ての開封が完了しました':G.pulls?'気になる守備位置から、開封しよう。':'準備完了。'+total+'連ガチャを回そう。')+'</div>';
  $('gc-foot').innerHTML='<div class="ld-foot-info"><b>'+(all?'DRAFT COMPLETE':G.pulls?'CAPSULE OPEN':'LEGEND SELECTION')+'</b><span>'+(G.pulls?G.revealed+' / '+total+' 開封済み':total+'連'+(total>=5?'・Aランク以上1人確定':''))+'</span></div><div class="ld-foot-actions">'+ldActions()+'</div>';
  ldSidebar();
};
function ldSidebar(){
  const G=state.gacha,pulls=G.pulls||[],opened=pulls.filter(x=>x.open),best=opened.slice().sort((a,b)=>RANK_ORDER.indexOf(a.rank)-RANK_ORDER.indexOf(b.rank))[0];
  $('ld-side').innerHTML='<div class="ld-side-heading"><span>獲得リスト</span><b>'+String(opened.length).padStart(2,'0')+'<small> / '+String(ldSlots().length).padStart(2,'0')+'</small></b></div><div class="ld-progress"><i style="width:'+(opened.length/ldSlots().length*100)+'%"></i></div>'+(best?'<div class="ld-best"><small>TOP PICK</small>'+ldRank(best.rank)+'<strong>'+esc(best.p?best.p.name:parkShort(best.park))+'</strong></div>':'<div class="ld-empty"><span>—</span><b>最初のレジェンドを待っている</b><p>開封した選手が、ここに並びます。</p></div>')+'<div class="ld-picks">'+opened.map(x=>'<button type="button" onclick="'+(x.p?'cardPop('+pulls.indexOf(x)+')':'')+'"><span class="ld-pick-pos">'+esc(ldPositions[x.d.key]||x.d.label)+'</span><b>'+esc(x.p?x.p.name:parkShort(x.park))+'</b>'+ldRank(x.rank)+'</button>').join('')+'</div><div class="ld-odds"><h3>ランク抽選率</h3><div>'+GACHA_TIERS.map(([r,n])=>'<span>'+ldRank(r)+'<b>'+n+'<small>%</small></b></span>').join('')+'</div><p>A以上の保証・残りの候補によって、最終的な排出率は変わります。球場は別抽選です。</p></div>';
}
gachaCapHtml=function(x,i,big){const G=state.gacha,ready=!!G.pulls&&G.phase!=='drop';return '<button type="button" class="gc-cap ld-capsule '+(big?'big':'')+'" aria-label="'+esc(ldPositions[x.d.key]||x.d.label)+(ready?'のカプセルを開封':'のガチャを開始')+'" onclick="'+(ready?'gachaReveal('+i+')':'gachaPull()')+'"><img src="capsule.webp" alt="" draggable="false"><span class="ld-cap-number">'+String(i+1).padStart(2,'0')+'</span><span class="gc-cap-l">'+esc(ldPositions[x.d.key]||x.d.label)+'</span><small>'+(ready?'TAP TO OPEN':'READY')+'</small></button>';};
cardHtml=function(p,rank,opt={}){
  const size=opt.size||'m',grp=opt.grp||(p.cat==='P'?p.role:'B'),photo=(size==='l'?ldPlayerPhoto(p):ldLocalPhoto(p)),rating=ovrFor(p,grp);
  const stats=p.cat==='M'?[['リーグ優勝',p.pennants||0],['日本一',p.japan||0],['通算勝利',p.wins||0]]:p.cat==='P'?[['防御率',Number(p.era).toFixed(2)],['奪三振',p.so],['勝利',p.w]]:[['打率',avg3(p.avg)],['本塁打',p.hr],['打点',p.rbi],['盗塁',p.sb]];
  const attr=s=>esc(s).replace(/"/g,'&quot;');
  const club=FR_ACCENT[p.mlb?'MLB':p.fr]||'#416883';
  const edition=rank==='SS'?'IMMORTAL LEGEND':rank==='S'?'ELITE SELECTION':'LEGEND DRAFT';
  const action=opt.onclick?'role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();'+opt.onclick+'}" onclick="'+opt.onclick+'"':'';
  return `<div class="pc ld-card r-${rank} sz-${size} ${opt.cls||''} ${photo.src?(photo.hi?'ld-hires':'ld-low-res'):'ld-no-photo'}" style="--club:${club}" aria-label="${attr(p.name+'・'+rank+'ランク・'+(opt.pos||roleLabel(p)))}" title="${attr(p.name)}" ${action}>
    <div class="pc-in">
      <div class="ld-card-bg"></div><span class="ld-jersey" aria-hidden="true">${p.no??'LD'}</span>
      ${photo.src?`<img class="ld-portrait" src="${attr(photo.src)}" data-fallback="${attr(photo.fallback)}" alt="${attr(p.name)}" loading="${size==='l'?'eager':'lazy'}" decoding="async" fetchpriority="${size==='l'?'high':'auto'}" referrerpolicy="no-referrer" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback='';this.closest('.ld-card').classList.remove('ld-hires');this.closest('.ld-card').classList.add('ld-low-res')}else{this.hidden=true;this.closest('.ld-card').classList.add('ld-no-photo')}">`:''}
      <div class="ld-card-shade"></div><div class="ld-card-foil"></div><div class="ld-card-prism"></div><div class="ld-card-etch"></div>
      <div class="ld-card-top"><span>${esc(opt.pos||roleLabel(p))}</span><b>${p.year}<small>SEASON</small></b></div>
      <div class="ld-card-edition">${edition}</div>
      <div class="ld-card-rank">${rankIcon(rating,size==='l'?64:size==='m'?42:27)}<small>${rank==='SS'?'LEGEND':rank==='S'?'SUPER STAR':'RANK'}</small></div>
      <div class="ld-card-bottom"><div class="ld-card-club"><i></i><span>${esc(p.team)}</span>${p.mlb?'<b>MLB</b>':''}</div>
        <div class="ld-card-name ${p.name.length>9?'ld-name-long':''}">${esc(p.name)}</div>
        ${size!=='s'?`<div class="ld-card-stats ${p.cat==='B'?'ld-batting-stats':''}">${stats.map(([k,v])=>`<span><small>${k}</small><b>${v??'—'}</b></span>`).join('')}</div>${p.cat==='B'?`<div class="ld-card-career"><span>通算安打 <b>${p.car?.h??'—'}</b></span><span>通算盗塁 <b>${p.car?.sb??'—'}</b></span></div>`:''}<div class="ld-card-series"><span>${edition}</span><b><small>OVR</small> ${rating}</b></div>`:''}
      </div>
    </div></div>`;
};
gachaPull=function(auto){if(ldBusy)return;ldOriginalPull(auto);};
gachaAdvance=function(){const G=state.gacha;if(!G||ldBusy||!G.pulls||G.revealed<G.pulls.length)return;if(ldDemo)ldTrial(G.round);else ldOriginalAdvance();};
gachaPatch=function(i){
  const G=state.gacha,x=G?.pulls?.[i];if(!x)return;
  const spot=document.querySelector('#gc-stage [data-i="'+i+'"]');if(!spot)return;
  spot.innerHTML=gachaSpotHtml(x,i,G.pulls.length===1);spot.classList.toggle('open',!!x.open);
};
gachaAfterReveal=function(){
  const G=state.gacha;if(!G?.pulls)return;const total=G.pulls.length,all=G.revealed>=total;
  const hint=$('gc-stage').querySelector('.gc-hint');if(hint)hint.textContent=all?'全ての開封が完了しました':G.revealed+' / '+total+' 開封済み。気になる守備位置から開封できます。';
  const info=$('gc-foot').querySelector('.ld-foot-info');if(info)info.innerHTML='<b>'+(all?'DRAFT COMPLETE':'CAPSULE OPEN')+'</b><span>'+G.revealed+' / '+total+' 開封済み</span>';
  if(all)ldAuto=false;
  ldRefreshActions();
  ldSidebar();
};
gachaReveal=function(i){
  const G=state.gacha,x=G?.pulls?.[i];if(ldBusy||!x||x.open||G.phase==='drop')return;
  ldBusy=true;const opener=document.activeElement,kind=gachaRound().k;const rare=(kind==='B'||kind==='P')&&(x.rank==='SS'||x.rank==='S');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // During a batch, regular cards flip in place; the rest of the field stays still.
  if(ldAuto&&!rare&&(kind==='B'||kind==='P')){
    const spot=document.querySelector('#gc-stage [data-i="'+i+'"]');spot?.classList.add('ld-flipping');seCrack();
    ldDelay(()=>{if(state.gacha!==G)return;x.open=true;G.revealed++;gachaPatch(i);spot?.classList.remove('ld-flipping');gachaAfterReveal();ldBusy=false;if(ldAuto)ldQueueNext();},220);
    return;
  }
  // SS選手だけは、収録済みの詳細資料を使う専用ドキュメンタリー演出へ。
  if(x.rank==='SS'&&x.p&&x.p.cat!=='M'){
    seCrack();gachaShake();
    ldDelay(()=>{if(state.gacha!==G)return;ssShow(x,()=>{if(state.gacha!==G)return;x.open=true;x.opening=false;G.revealed++;ldBusy=false;gachaPatch(i);gachaAfterReveal();if(ldAuto)ldQueueNext();else document.querySelector('#gc-foot .primary')?.focus();});},reduced?30:520);
    return;
  }
  const overlay=document.createElement('div');overlay.className='ld-reveal r-'+x.rank+' kind-'+kind;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','カプセル開封');
  const headline=x.p?ldHeadline(x.p):'';
  const special=kind==='K'?'<div class="ld-special-intro venue"><div class="ld-scoreboard"><small>NEXT HOME</small><b>本拠地</b><span>本拠地、選定中</span></div><div class="ld-venue-lights"><i></i><i></i><i></i><i></i><i></i></div></div>':kind==='M'?'<div class="ld-special-intro manager"><div class="ld-contract"><small>OFFICIAL</small><b>MANAGER CONTRACT</b><span>新監督との契約を締結</span></div><div class="ld-press-flash"><i></i><i></i><i></i><i></i></div></div>':'';
  overlay.innerHTML='<button type="button" class="ld-skip" onclick="ldSkipReveal()">演出スキップ ≫</button>'+ldRevealFx()+'<div class="ld-reveal-aura"></div>'+special+ldCapsuleHero(x)+'<div class="ld-reveal-premonition"><small>'+(x.rank==='SS'?'球史をたどる':'スター選手、登場')+'</small><b>'+x.rank+'</b><span>'+(x.rank==='SS'?esc(headline):'白銀のスター、降臨')+'</span></div><div class="ld-reveal-result"><div class="ld-reveal-kicker">'+(kind==='K'?'WELCOME TO OUR BALLPARK':kind==='M'?'NEW FIELD BOSS':x.rank==='SS'?'IMMORTAL LEGEND':x.rank==='S'?'Sランク選手':'新加入選手')+'</div>'+(x.p?cardHtml(x.p,x.rank,{size:'l',pos:ldPositions[x.d.key]||x.d.label,grp:x.d.grp}):gachaCardHtml(x,true))+'<div class="ld-reveal-caption">'+(x.p?esc(x.p.desc||''):esc(x.park.name||parkShort(x.park)))+'</div>'+ldButton('獲得する →','ldAccept()','primary')+'</div>';
  document.body.appendChild(overlay);overlay.querySelector('button').focus();seCrack();
  let shown=false;ldFinish=()=>{if(shown||state.gacha!==G)return;shown=true;overlay.classList.add('revealed');if(x.rank==='SS')seFanfare();else seWin();overlay.querySelector('.ld-reveal-result button').focus();if(ldAuto)ldDelay(()=>{if(ldAuto)ldAccept();},rare?1900:700);};
  if(rare&&!reduced)ldDelay(()=>{if(!shown&&state.gacha===G){overlay.classList.add('ld-premonition');seWhoosh();}},x.rank==='SS'?900:1400);
  if(rare&&x.rank==='SS'&&!reduced)ldDelay(()=>{if(!shown&&state.gacha===G)overlay.classList.add('ld-ss-impact');},2050);
  if(rare&&x.rank==='S'&&!reduced)ldDelay(()=>{if(!shown&&state.gacha===G)overlay.classList.add('ld-s-impact');},2750);
  ldDelay(ldFinish,reduced?50:kind==='K'?2100:kind==='M'?1800:x.rank==='SS'?3150:x.rank==='S'?3000:700);
  overlay._accept=()=>{if(state.gacha!==G||x.open)return;overlay.remove();x.open=true;x.opening=false;G.revealed++;ldBusy=false;ldFinish=null;gachaPatch(i);gachaAfterReveal();if(ldAuto)ldQueueNext(280);else document.querySelector('#gc-foot .primary')?.focus();};
};
function ldHeadline(p){
  if(p.cat==='M')return 'リーグ優勝 '+(p.pennants||0)+'回 / 日本一 '+(p.japan||0)+'回';
  if(p.cat==='P')return p.year+'年　'+(p.role==='CL'?(p.sv||0)+'セーブ':p.w+'勝')+' / 防御率 '+Number(p.era).toFixed(2);
  return p.year+'年　打率 '+avg3(p.avg)+' / '+p.hr+'本塁打';
}
function ldSkipReveal(){if(ldFinish)ldFinish();}
function ldAccept(){const e=document.querySelector('.ld-reveal');if(e?.classList.contains('revealed'))e._accept();else ldSkipReveal();}
gachaRevealNext=function(){const G=state.gacha;if(!G?.pulls||ldBusy)return;const i=G.pulls.findIndex(x=>!x.open);if(i<0){ldAuto=false;return;}gachaReveal(i);};
gachaRevealAll=function(){if(ldBusy)return;ldAuto=true;ldRefreshActions();gachaRevealNext();};
const ldOldPop=cardPop;
cardPop=function(i){ldOldPop(i);const x=state.gacha?.pulls?.[i];if(x?.p?.pu){$('cardpop-body').insertAdjacentHTML('beforeend','<a class="ld-credit" href="'+x.p.pu.replace(/"/g,'&quot;')+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">写真：'+esc(x.p.pa||'出典')+' / '+esc(x.p.pl||'原ページの表記を参照')+'</a>');}};
document.addEventListener('keydown',e=>{const dlg=document.querySelector('.ld-reveal');if(dlg){if(e.key==='Escape'){e.preventDefault();ldAccept();}if(e.key==='Tab'){const controls=[...dlg.querySelectorAll('button,[role="button"][tabindex="0"]')].filter(b=>b.offsetParent!==null);let n=controls.indexOf(document.activeElement)+(e.shiftKey?-1:1);e.preventDefault();controls[(n+controls.length)%controls.length]?.focus();}}else if(e.key==='Escape')cardPopClose();});
document.addEventListener('change',e=>{if(e.target?.id==='opt-gacha')ldSyncSetup();});
// 読み込み時は扉から。ガチャの体験版は扉の「ガチャを試す」か #demo で開く
if(location.hash === '#demo') ldTrial();
// 本編(設定から始めた球団結成)では体験モードを切る
const ldOrigStartGacha = startGacha;
startGacha = function(){ ldDemo = false; ldOrigStartGacha(); };
if(document.modelContext?.registerTool){
  const lifetime=new AbortController();
  const tool={name:'read_gacha_state',description:'Read the current round and revealed players. Unopened results remain hidden.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');const G=state.gacha;return G?{round:gachaRound().label,phase:G.phase,revealed:G.revealed,total:ldSlots().length,players:(G.pulls||[]).filter(x=>x.open).map(x=>({name:x.p?x.p.name:parkShort(x.park),position:x.d.label,rank:x.rank}))}:{round:null};}};
  try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifetime.signal})).catch(()=>{});}catch(e){}
  window.addEventListener('pagehide',()=>lifetime.abort(),{once:true});
}
