/* Home ground and manager appointments have their own ceremonies. */
const ldPlayerField=ldField,ldPlayerActions=ldActions,ldPlayerPull=gachaPull,ldPlayerCard=gachaCardHtml,ldClubRender=renderGacha;
function ldParkPhoto(pk){const source=PARK_PHOTO[pk.id];return source?ldPlayerPhoto({pu:source.u}).src:'';}
function ldParkStage(x){
  const G=state.gacha,done=!!x?.open,phase=done?'complete':G.ceremony||'idle',pk=x?.park;
  const photo=pk&&ldParkPhoto(pk),credit=pk&&PARK_PHOTO[pk.id];
  return '<section class="home-ceremony home-'+phase+'" aria-label="本拠地の決定"><img class="home-panorama" src="'+(photo||'stadium.webp')+'" alt="'+(done&&photo?esc(pk.name):'')+'" onerror="this.src=\'stadium.webp\';this.onerror=null;this.closest(\'section\').classList.add(\'home-fallback\')"><img class="home-tunnel" src="stadium-entry.webp" alt=""><div class="home-shade"></div><div class="home-light" aria-hidden="true"></div><div class="home-lamps" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="home-content">'+(done?'<span class="home-eyebrow">'+esc(gachaTeam().name)+' の本拠地</span><h2>'+esc(pk.name)+'</h2><p class="home-type">'+esc(pk.cat)+' / '+esc(pk.type)+'</p><div class="home-facts"><span><small>本塁打</small><b>'+(pk.hr>=1.12?'出やすい':pk.hr<=.9?'出にくい':'標準')+'</b></span><span><small>球場の傾向</small><b>'+(pk.run>=1.06?'打者有利':pk.run<=.96?'投手有利':'バランス型')+'</b></span></div><p class="home-note">'+esc(pk.note||'')+'</p>':'<span class="home-eyebrow">本拠地を決める</span><h2>'+(phase==='idle'?'ここから、<br>球団の歴史が始まる。':phase==='approach'?'スタンドの、その先へ。':'照明が、灯る。')+'</h2><p class="home-type">'+(phase==='idle'?'まだ誰もいない球場へ。':'まもなく、あなたのホームが決まります。')+'</p>')+'</div><button type="button" class="ceremony-tap-surface" aria-label="'+(done?'本拠地を確認して次へ':'タップして球場へ入る')+'" onclick="ldCeremonyTap()"></button><div class="ceremony-tap-note">'+(done?(ldDemo?'タップして別の球場へ':'タップして次へ'):phase==='idle'?'タップして球場に入る':'')+'</div>'+(done?'<div class="home-credit">'+(credit?'<a href="'+esc(credit.u)+'" target="_blank" rel="noopener">写真：'+esc(credit.a)+' / '+esc(credit.l)+'</a>':'<span>球場イメージ</span>')+'<span class="home-image-fallback">球場イメージ</span></div>':'')+'</section>';
}
function ldManagerStage(x){
  const done=!!x?.open,p=x?.p,phase=done?'complete':state.gacha.ceremony||'idle';
  const paper='<article class="manager-document"><header><span>監督就任に関する契約書</span><b>'+esc(gachaTeam().name)+'</b></header><p class="manager-clause">本球団は、次の監督にチームの指揮を委ねる。</p><div class="manager-signature"><small>就任監督</small><strong>'+(done?esc(p.name):'────────')+'</strong></div>'+(done?'<div class="manager-record"><span>通算勝利 <b>'+(p.wins??'—')+'</b></span><span>リーグ優勝 <b>'+(p.pennants??'—')+'</b></span><span>'+(p.mlb?'世界一':'日本一')+' <b>'+(p.japan??'—')+'</b></span></div><p>'+esc(p.desc||'')+'</p><div class="manager-seal">契約成立</div>':'<p class="manager-status">就任の署名を確認しています…</p>')+'<footer><span>契約先</span><b>'+esc(gachaTeam().name)+'</b></footer></article>';
  return '<section class="manager-ceremony manager-'+phase+'"><div class="manager-heading"><span>球団人事</span><h2>'+(done?'新監督、就任。':'一通の封筒が、届いた。')+'</h2><p>'+esc(gachaTeam().name)+' の指揮を託す。</p></div><div class="manager-mail"><div class="manager-letter">'+paper+'</div><img class="mail-closed" src="envelope-closed.webp" alt=""><img class="mail-open" src="envelope-open.webp" alt=""><button type="button" class="ceremony-tap-surface" aria-label="'+(done?'契約を確認して次へ':'封筒をタップして開封')+'" onclick="ldCeremonyTap()"></button><div class="ceremony-tap-note">'+(done?(ldDemo?'タップして次の契約へ':'タップして次へ'):phase==='idle'?'封筒をタップして開ける':'')+'</div></div>'+(done?'<div class="manager-appointed">'+cardHtml(p,x.rank,{size:'l',pos:'監督',onclick:'cardPop(0)'})+'</div>':'')+'</section>';
}
function ldCeremonyTap(){
  const G=state.gacha;if(!G||ldBusy)return;
  if(!G.pulls){gachaPull();return;}
  if(G.revealed&&Date.now()-(G.ceremonyDoneAt||0)>700)gachaAdvance();
}
function ldCeremonyPhase(G,phase){
  if(state.gacha!==G||G.ceremony==='complete')return;
  const kind=gachaRound().k,scene=document.querySelector(kind==='K'?'.home-ceremony':'.manager-ceremony');
  G.ceremony=phase;
  if(scene){scene.classList.remove(kind==='K'?'home-approach':'manager-approach');scene.classList.add((kind==='K'?'home-':'manager-')+phase);const line=scene.querySelector('.home-content h2');if(line)line.textContent='照明が、灯る。';}else renderGacha();
  if(kind==='M')ldDelay(()=>ldWriteSignature(G),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:950);
  seWin();
}

function ldWriteSignature(G){
  if(state.gacha!==G||G.ceremony!=='lights')return;
  const name=G.pulls?.[0]?.p?.name,signature=document.querySelector('.manager-signature strong');
  if(!name||!signature)return;
  signature.classList.add('ink-signature');
  signature.innerHTML=Array.from(name).map((letter,i)=>'<span style="--stroke:'+i+'">'+esc(letter)+'</span>').join('');
  const status=document.querySelector('.manager-status');if(status)status.textContent='新監督の署名が、記されていく。';
}

ldField=function(){const kind=gachaRound().k,x=state.gacha.pulls?.[0];return kind==='K'?ldParkStage(x):kind==='M'?ldManagerStage(x):ldPlayerField();};
gachaCardHtml=function(x,big){return x.park?ldParkStage(x):ldPlayerCard(x,big);};
ldActions=function(){
  const G=state.gacha,kind=gachaRound().k;if(kind!=='K'&&kind!=='M')return ldPlayerActions();
  if(gachaTeam().cpu)return '<span class="ld-wait">決定中…</span>';
  if(!G.pulls)return '<span class="ceremony-foot-hint">'+(kind==='K'?'球場をタップして入場':'封筒をタップして開封')+'</span>';
  if(!G.pulls[0]?.open)return ldButton('演出をスキップ','ldCeremonyFinish()','quiet');
  return '<span class="ceremony-foot-hint">'+(ldDemo?'画面をタップしてもう一度':'画面をタップして次へ')+'</span>';
};
function ldCeremonyFinish(){
  const G=state.gacha,kind=gachaRound().k,x=G?.pulls?.[0];if(!x||x.open||(kind!=='K'&&kind!=='M'))return;
  x.open=true;G.revealed=1;G.ceremony='complete';G.ceremonyDoneAt=Date.now();G.phase='caps';ldBusy=false;seRollStop();seFanfare();renderGacha();
  document.querySelector('.ceremony-tap-surface')?.focus();
}
gachaPull=function(auto){
  const G=state.gacha,kind=gachaRound().k;if(auto||!['K','M'].includes(kind))return ldPlayerPull(auto);
  if(!G||G.pulls||ldBusy)return;
  G.ceremony='approach';ldOriginalPull();ldBusy=true;seRollStop();seWhoosh();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ldDelay(()=>ldCeremonyPhase(G,'lights'),reduced?60:kind==='K'?2400:1050);
  ldDelay(()=>{if(state.gacha===G)ldCeremonyFinish();},reduced?160:kind==='K'?4300:4000+Array.from(G.pulls[0].p.name).length*400);
};
renderGacha=function(){
  const G=state.gacha;if(!G)return;
  if(G.ceremony==='approach'&&G.phase==='caps'&&document.querySelector('.home-approach,.manager-approach'))return;
  ldClubRender();
  const tabs=$('ld-tabs').querySelectorAll('button');if(tabs[0])tabs[0].innerHTML='<small>01</small>本拠地';if(tabs[1])tabs[1].innerHTML='<small>02</small>監督契約';
  const kind=gachaRound().k;if(!['K','M'].includes(kind))return;
  const title=document.querySelector('#ld-intro h1');if(title)title.textContent=kind==='K'?'本拠地の決定':'監督契約';
  const subtitle=document.querySelector('#ld-intro p');if(subtitle)subtitle.textContent=kind==='K'?'ホームの景色が、球団の個性になる。':'このチームの、最初のリーダー。';
  const hint=$('gc-stage').querySelector('.gc-hint');if(hint)hint.textContent=G.revealed?'決定しました':G.pulls?'まもなく決定します':kind==='K'?'球場をタップして、本拠地へ。':'届いた封筒をタップして、監督を迎えましょう。';
  $('gc-stage').querySelector('.ld-draw-show')?.remove();
  const info=$('gc-foot').querySelector('.ld-foot-info');if(info)info.innerHTML='<b>'+(kind==='K'?'本拠地':'監督契約')+'</b><span>'+(G.revealed?'決定':G.pulls?'確認中':'準備完了')+'</span>';
};
renderGacha();
