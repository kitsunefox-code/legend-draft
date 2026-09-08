// Capsule palette follows the selected club; light treatment follows rarity.
const ldMlbColors={
  'ヤンキース':'#253b60','レッドソックス':'#bd3039','ジャイアンツ':'#ef7034','ブレーブス':'#bf3046',
  'パイレーツ':'#ffc72c','フィリーズ':'#e64050','アスレチックス':'#168563','パドレス':'#b89b50',
  'マリナーズ':'#169d9a','カージナルス':'#ce3246','タイガース':'#f47735','エンゼルス':'#c52b41',
  'ドジャース':'#287ad0','セネタース':'#b13c4a','アメリカンズ':'#bd3039','ダイヤモンドバックス':'#bb4655',
  'メッツ':'#ec793a','アストロズ':'#ed813b','レッズ':'#cf3444','レンジャーズ':'#397bd1',
  'オリオールズ':'#e57434','ロイヤルズ':'#438cdb','ツインズ':'#b52f45','ホワイトソックス':'#aab2bb',
  'インディアンス':'#c3444c','ガーディアンズ':'#c3444c','エクスポズ':'#3686c5','カブス':'#2c76c6',
  'マーリンズ':'#37b6d7','ナショナルズ':'#c5424d','ロッキーズ':'#8861bf','ブルージェイズ':'#3889d4',
  'ブルワーズ':'#c3a465','ブラウンズ':'#ad743a','レイズ':'#74b6dc'
};
function ldCapsuleColor(p){return p?(p.mlb?ldMlbColors[p.team]:FR_ACCENT[p.fr])||'#9caeba':'#9caeba';}
gachaCapHtml=function(x,i,big){
  const G=state.gacha,ready=!!G.pulls&&G.phase!=='drop',pos=ldPositions[x.d.key]||x.d.label;
  const rank=G.pulls?x.rank:'B',special=rank==='S'||rank==='SS',club=G.pulls&&x.p?x.p.team:'';
  return '<button type="button" class="gc-cap ld-capsule ld-club-capsule cap-'+rank+' '+(big?'big':'')+'" style="--capsule-club:'+ldCapsuleColor(x.p)+'" aria-label="'+esc(pos+(club?'・'+club:'')+(special?'・'+rank+'ランク':'')+(ready?'のカプセルを開封':'のガチャを開始'))+'" onclick="'+(ready?'gachaReveal('+i+')':'gachaPull()')+'"><img src="capsule.webp" alt="" draggable="false"><span class="ld-cap-tint" aria-hidden="true"></span><span class="ld-cap-gloss" aria-hidden="true"></span><span class="ld-cap-number">'+String(i+1).padStart(2,'0')+'</span>'+(special?'<span class="ld-cap-tier">'+rank+'</span>':'')+'<span class="gc-cap-l">'+esc(pos)+'</span><small>'+(special?rank==='SS'?'伝説の輝き':'白銀の輝き':ready?'タップで開封':'準備完了')+'</small></button>';
};
function ldCapsuleHero(x){
  const layer='<img src="capsule.webp" alt=""><span class="ld-cap-tint" aria-hidden="true"></span><span class="ld-cap-gloss" aria-hidden="true"></span>';
  return '<div class="ld-reveal-capsule cap-'+x.rank+'" style="--capsule-club:'+ldCapsuleColor(x.p)+'"><div class="ld-shell-art"><div class="ld-shell-half shell-upper">'+layer+'</div><div class="ld-shell-half shell-lower">'+layer+'</div><i class="ld-shell-seam" aria-hidden="true"></i></div><span class="ld-shell-label">'+esc(ldPositions[x.d.key]||x.d.label)+'</span></div>';
}
const ldClubReveal=gachaReveal;
gachaReveal=function(i){
  if(ldBusy)return;
  ldClubReveal(i);
  const x=state.gacha?.pulls?.[i],overlay=document.querySelector('.ld-reveal');
  if(overlay&&x?.p){
    overlay.style.setProperty('--capsule-club',ldCapsuleColor(x.p));
    if(x.rank==='S'&&x.p.cat!=='M'){
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!reduced)ldDelay(()=>{if(document.querySelector('.ld-reveal')===overlay&&!overlay.classList.contains('revealed')){overlay.classList.add('ld-shell-opening');seCrack();}},1950);
    }
  }
};
renderGacha();
