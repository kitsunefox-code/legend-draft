const ldTapActions=ldActions,ldTapReveal=gachaReveal,ldTapStory=ssRender;
ldActions=function(){
  const G=state.gacha,kind=gachaRound().k;if(!G||kind==='K'||kind==='M')return ldTapActions();
  if(!G.pulls)return '<span class="ceremony-foot-hint">金色のハンドルをタップ、または下へ引く</span>';
  return ldTapActions().replace(ldButton('次を開封 →','gachaRevealNext()','primary'),'');
};
gachaReveal=function(i){
  ldTapReveal(i);
  const card=document.querySelector('.ld-reveal .ld-reveal-result .ld-card');
  if(card&&!card.dataset.tapReady){
    card.dataset.tapReady='true';card.setAttribute('role','button');card.setAttribute('tabindex','0');
    card.setAttribute('aria-label',(state.gacha?.pulls?.[i]?.p?.name||'選手')+'のカードをタップして獲得');
    card.addEventListener('click',e=>{e.stopPropagation();ldAccept();});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();ldAccept();}});
    card.insertAdjacentHTML('afterend','<p class="tap-card-note">カードをタップして獲得</p>');
  }
};
ssRender=function(){
  ldTapStory();const c=ssCtx;if(!c||c.page!==4)return;
  const card=$('ss-panel').querySelector('.ld-card');if(!card)return;
  card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label','SS選手のカードをタップして獲得');
  const accept=()=>{if(ssCtx===c&&c.page===4)ssNext();};
  card.addEventListener('click',e=>{e.stopPropagation();accept();});
  card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();accept();}});
  card.insertAdjacentHTML('afterend','<p class="tap-card-note">カードをタップして獲得</p>');
};
renderGacha();
