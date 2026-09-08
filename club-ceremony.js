/* Home ground and manager appointments have their own ceremonies. */
const ldPlayerField=ldField,ldPlayerActions=ldActions,ldPlayerPull=gachaPull,ldPlayerCard=gachaCardHtml,ldClubRender=renderGacha;
// 監督の異名。寸評の「」があればそれを、なければ実績から
function ldEpithet(p){
  const m = (p.desc||'').match(/「([^」]{2,14})」/);
  if(m) return esc(m[1]);
  const pen = p.pennants||0, jp = p.japan||0;
  if(jp >= 5) return (p.mlb?'世界一':'日本一') + jp + '回の名将';
  if(pen >= 3) return 'リーグ制覇' + pen + '回の勝負師';
  if(pen >= 1) return '優勝経験を持つ指揮官';
  return '叩き上げの野球人';
}
function ldManagerHeadline(p){
  const pen = p.pennants||0;
  if(pen >= 5) return '名将、来る。';
  if(pen >= 1) return '勝てる男が、来た。';
  return '新監督、就任。';
}
// 球場の見出し。癖を一言で
function ldParkTagline(pk){
  if(pk.hr >= 1.12 && pk.run >= 1.06) return '打球が夜空に消える、打者の楽園。';
  if(pk.hr <= 0.9 && pk.run <= 0.96) return '広い外野が打球を呑み込む、投手の要塞。';
  if(pk.run >= 1.06) return '点の取り合いが日常になる、熱い箱。';
  if(pk.run <= 0.96) return '一点の重みが違う、守りの城。';
  return '勝負を分けるのは、ここで過ごす一年。';
}
// 儀式の段階。引く前は必ず「idle」。前の人の「complete」を持ち越さない
function ldCeremonyStage(G,x){
  if(x&&x.open)return 'complete';
  if(!G||!G.pulls)return 'idle';
  return G.ceremony==='lights'?'lights':'approach';
}
function ldReduced(){return typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function ldRankTint(rank){return (typeof ldRankColor!=='undefined'&&ldRankColor[rank])||'#e0a600';}
// 小さな効果音(game.js の tone を借りる)
function ldSe(list){if(typeof sndOn==='undefined'||!sndOn||typeof ac!=='function')return;const c=ac();if(!c)return;const t=c.currentTime;list.forEach(([f,dt,dur,vol,type])=>tone(t+dt,f,dur||0.08,vol||0.08,type||'triangle'));}
function seMapTick(){ldSe([[1200,0,0.04,0.05,'square']]);}
function seMapLock(){ldSe([[660,0,0.12,0.09],[990,0.09,0.18,0.09],[1320,0.18,0.3,0.07]]);}
function seNameTick(){ldSe([[520,0,0.05,0.05,'square']]);}
function seSealBreak(){if(typeof seCrack==='function')seCrack();}

// ============================================================
// 球場: 世界地図の上で候補地が点灯 → 本拠地でロック → その街へ降りる → 入場 → 照明
// ============================================================
const MAP_MS = 4200;   // タップから地図が消えるまで(探索1.3秒→ロック0.5秒→降下2秒→着地)
const TIME_MS = 2700;  // 昔の球場: 着地後にタイムスリップする時間
// 昔の球場は、その球場を象徴する年へ飛ぶ(事実に基づく一行)
const PARK_ERA = {
  korakuen:{y:1959,n:'天覧試合。長嶋茂雄のサヨナラ本塁打が飛んだ年'},
  osaka:{y:1959,n:'南海ホークス、杉浦忠の4連投4連勝で日本一の年'},
  nishinomiya:{y:1967,n:'阪急ブレーブス、球団初のリーグ優勝の年'},
  kawasaki:{y:1988,n:'「10.19」ロッテ対近鉄ダブルヘッダーの年'},
  heiwadai:{y:1958,n:'西鉄ライオンズ、3連敗から4連勝で日本一の年(稲尾和久)'},
  fujiidera:{y:1989,n:'近鉄バファローズ、9年ぶりのリーグ優勝の年'},
  tokyostadium:{y:1962,n:'開場。「光の球場」と呼ばれた年'},
  nagoya:{y:1974,n:'中日ドラゴンズ、巨人のV10を阻んでリーグ優勝の年'},
  'hiroshima-old':{y:1975,n:'広島カープ、球団創設26年目の初優勝。赤ヘル元年'},
  nissei:{y:1979,n:'近鉄バファローズ、球団創設30年目で初のリーグ優勝の年'},
  polo:{y:1951,n:'ボビー・トムソン「世界中に響いた一発」の年'},
};
function ldParkEra(pk){return (pk&&PARK_ERA[pk.id])||null;}
function ldWareki(y){
  if(y>=2019)return '令和'+(y-2018===1?'元':y-2018)+'年';
  if(y>=1989)return '平成'+(y-1988===1?'元':y-1988)+'年';
  if(y>=1926)return '昭和'+(y-1925===1?'元':y-1925)+'年';
  if(y>=1912)return '大正'+(y-1911===1?'元':y-1911)+'年';
  return '明治'+(y-1867)+'年';
}
function seTimeTick(){ldSe([[300,0,0.05,0.06,'square'],[600,0.01,0.03,0.03,'triangle']]);}
// 着地したら、西暦が逆回転してその年へ。地図の上に重ねる
function ldTimeSlip(G,pk,section){
  const era=ldParkEra(pk);if(!era||!section)return;
  const el=document.createElement('div');el.className='gc-time';
  const alive=()=>state.gacha===G&&G.ceremony==='approach'&&el.isConnected;
  const from=new Date().getFullYear(),to=era.y;
  el.innerHTML='<div class="gc-time-vortex"></div><div class="gc-time-grain"></div><div class="gc-time-body"><small>TIME SLIP</small><b class="gc-time-year">'+from+'</b><span class="gc-time-wareki">&nbsp;</span><p class="gc-time-note">時を、遡る。</p></div>';
  section.appendChild(el);
  const yearEl=el.querySelector('.gc-time-year'),wareki=el.querySelector('.gc-time-wareki'),note=el.querySelector('.gc-time-note');
  const steps=40,dur=1900;
  for(let i=1;i<=steps;i++){
    const p=i/steps,e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,y=Math.round(from-(from-to)*e);
    ldDelay(()=>{if(!alive())return;yearEl.textContent=y;if(i%2===0)seTimeTick();
      if(i===steps){el.classList.add('gc-time-arrived');wareki.textContent=pk.cat==='MLB'?String(to)+'年':String(to)+'年 ── '+ldWareki(to);note.textContent=era.n;seMapLock();}
    },200+dur*p);
  }
  ldDelay(()=>{if(alive())el.classList.add('gc-time-out');},TIME_MS-450);
}
const PARK_CITY = {
  escon:'北海道・北広島', jingu:'東京・神宮外苑', hama:'神奈川・横浜', zozo:'千葉・幕張', paypay:'福岡・百道浜',
  mazda:'広島', tokyodome:'東京・水道橋', beluna:'埼玉・所沢', kyocera:'大阪・大正', koshien:'兵庫・西宮',
  rakuten:'宮城・仙台', vantelin:'愛知・名古屋', korakuen:'東京・後楽園', osaka:'大阪・難波', nishinomiya:'兵庫・西宮北口',
  kawasaki:'神奈川・川崎', heiwadai:'福岡・大濠', fujiidera:'大阪・藤井寺', coors:'コロラド・デンバー', fenway:'ボストン',
  wrigley:'シカゴ', yankee:'ニューヨーク・ブロンクス', oracle:'サンフランシスコ', petco:'サンディエゴ', bocchan:'愛媛・松山',
  muscat:'岡山・倉敷', alpen:'富山', cellular:'沖縄・那覇', tokyostadium:'東京・南千住', nagoya:'愛知・名古屋',
  'hiroshima-old':'広島・基町', nissei:'大阪・森ノ宮', dodger:'ロサンゼルス', gabp:'オハイオ・シンシナティ', tropicana:'フロリダ・セントピーターズバーグ',
  polo:'ニューヨーク・マンハッタン', sunmarine:'宮崎', kitakyushu:'福岡・北九州', ishikawa:'石川・金沢', komachi:'秋田',
  hardoff:'新潟', kusanagi:'静岡', obihiro:'北海道・帯広', abira:'北海道・安平',
};
function ldParkRegion(pk){
  const g=PARK_GEO[pk.id];if(!g)return '';
  const lat=g[0],lng=g[1];
  return lng<0?'アメリカ':lat<27?'日本・沖縄':lng<131.5?'日本・九州':lng<134.5?'日本・中国／四国':lng<136.5?'日本・関西':lng<138.5?'日本・中部':lat<37.5?'日本・関東':lat<41?'日本・東北':'日本・北海道';
}
// 地図の土台。ピンは拡大される箱の外に置き、拡大しても同じ大きさに見せる
function ldWorldMap(pk){
  const xy=parkMapXY(pk);if(!xy)return '';
  const others=PARKS.filter(p=>p.id!==pk.id&&PARK_GEO[p.id]);
  const dots=others.map(p=>{const q=parkMapXY(p);return '<i style="left:'+q.x.toFixed(2)+'%;top:'+q.y.toFixed(2)+'%"></i>';}).join('');
  return '<div class="gc-map" style="--px:'+xy.x.toFixed(2)+'%;--py:'+xy.y.toFixed(2)+'%">'+
    '<div class="gc-map-box"><img class="gc-map-img" src="worldmap.webp" alt="" decoding="async"><div class="gc-map-grid"></div><div class="gc-map-dots">'+dots+'</div></div>'+
    '<div class="gc-map-pin"><i></i><i class="r2"></i><b></b></div>'+
    '<div class="gc-map-cap"><small>本拠地を探しています</small><b>&nbsp;</b><span>&nbsp;</span></div>'+
    '<div class="gc-map-credit">地図: NASA Blue Marble (Public domain)</div>'+
  '</div>';
}
// 地図の進行。候補地を巡るルーレット → 決定地でロック → その地点を中央へ寄せながら降下
function ldMapRun(G,pk){
  const map=document.querySelector('.gc-map'),box=map&&map.querySelector('.gc-map-box'),pin=map&&map.querySelector('.gc-map-pin');
  if(!map||!box||!pin)return;
  const alive=()=>state.gacha===G&&G.ceremony==='approach'&&map.isConnected;
  const cap=map.querySelector('.gc-map-cap'),capSmall=cap.querySelector('small'),capB=cap.querySelector('b'),capSpan=cap.querySelector('span');
  const mapRect=map.getBoundingClientRect();
  const place=(q)=>{const r=box.getBoundingClientRect();return {x:r.left-mapRect.left+r.width*q.x/100,y:r.top-mapRect.top+r.height*q.y/100};};
  const moveTo=(q)=>{const s=place(q);pin.style.left=s.x.toFixed(1)+'px';pin.style.top=s.y.toFixed(1)+'px';};
  const dest=parkMapXY(pk);
  // 候補地: 決定地と離れた球場を混ぜて、最後に決定地で止まる
  const pool=PARKS.filter(p=>p.id!==pk.id&&PARK_GEO[p.id]).sort(()=>rnd()-0.5).slice(0,7).map(parkMapXY);
  const steps=pool.concat([dest]);
  const gaps=[0,110,110,120,140,170,220,300];   // だんだん遅くなる
  let t=120;
  map.classList.add('map-search');moveTo(steps[0]);
  steps.forEach((q,i)=>{t+=gaps[i]||0;ldDelay(()=>{if(!alive())return;moveTo(q);seMapTick();if(i===steps.length-1)lock();},t);});
  function lock(){
    map.classList.remove('map-search');map.classList.add('map-lock');seMapLock();
    capSmall.textContent=ldParkRegion(pk);capB.textContent=PARK_CITY[pk.id]||'';capSpan.textContent='本拠地を確認';
    ldDelay(()=>{if(!alive())return;
      // ピンを画面の中央へ寄せつつ拡大。原点をピンに置けば、平行移動ぶんだけピンが動く
      const r=box.getBoundingClientRect(),s=place(dest);
      const cx=mapRect.width/2,cy=mapRect.height*0.44,dx=cx-s.x,dy=cy-s.y;
      box.style.transformOrigin=dest.x.toFixed(2)+'% '+dest.y.toFixed(2)+'%';
      map.classList.add('map-dive');
      box.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px) scale(7)';
      pin.style.left=cx.toFixed(1)+'px';pin.style.top=cy.toFixed(1)+'px';
      capSpan.textContent='降下中……';
    },520);
    ldDelay(()=>{if(!alive())return;capSpan.textContent=ldParkEra(pk)?'着地 ── 時を遡る':'着地';map.classList.add('map-land');if(ldParkEra(pk))ldTimeSlip(G,pk,map.parentNode);},2250);
  }
}
function ldParkPhoto(pk){const source=PARK_PHOTO[pk.id];return source?ldPlayerPhoto({pu:source.u}).src:'';}
function ldParkStage(x){
  const G=state.gacha,done=!!x?.open,phase=ldCeremonyStage(G,x),pk=x?.park;
  const photo=pk&&ldParkPhoto(pk),credit=pk&&PARK_PHOTO[pk.id];
  const mapHtml=(pk&&phase==='approach'&&!G.mapDone)?ldWorldMap(pk):'';
  const tint=x?ldRankTint(x.rank):'#e0a600';
  const era=ldParkEra(pk);
  return '<section class="home-ceremony home-'+phase+(mapHtml?' home-mapping':'')+(era?' home-retro':'')+'" style="--rk:'+tint+'" aria-label="本拠地の決定">'+mapHtml+'<img class="home-panorama" src="'+(photo||'stadium.webp')+'" alt="'+(done&&photo?esc(pk.name):'')+'" onerror="this.src=\'stadium.webp\';this.onerror=null;this.closest(\'section\').classList.add(\'home-fallback\')"><img class="home-tunnel" src="stadium-entry.webp" alt=""><div class="home-shade"></div><div class="home-light" aria-hidden="true"></div><div class="home-lamps" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="home-content">'+(done?'<span class="home-eyebrow">'+esc(gachaTeam().name)+' の本拠地　<b class="home-grade">球場の格 '+parkRank(pk)+'</b></span><h2>'+esc(pk.name)+'</h2>'+(era?'<p class="home-era"><b>'+era.y+'年'+(pk.cat==='MLB'?'':'・'+ldWareki(era.y))+'</b>'+esc(era.n)+'</p>':'')+'<p class="home-tagline">'+ldParkTagline(pk)+'</p><p class="home-type">'+esc(PARK_CITY[pk.id]||'')+'　'+esc(pk.cat)+' / '+esc(pk.type)+'</p><div class="home-traits">'+parkTraitChips(pk)+'</div><div class="home-facts"><span><small>本塁打</small><b>'+(pk.hr>=1.12?'出やすい':pk.hr<=.9?'出にくい':'標準')+'</b></span><span><small>球場の傾向</small><b>'+(pk.run>=1.06?'打者有利':pk.run<=.96?'投手有利':'バランス型')+'</b></span></div><p class="home-note">'+esc(pk.note||'')+'</p>':'<span class="home-eyebrow">本拠地を決める</span><h2>'+(phase==='idle'?'ここから、<br>球団の歴史が始まる。':phase==='approach'?'スタンドの、その先へ。':'照明が、灯る。')+'</h2><p class="home-type">'+(phase==='idle'?'まだ誰もいない球場へ。':'まもなく、あなたのホームが決まります。')+'</p>')+'</div><button type="button" class="ceremony-tap-surface" aria-label="'+(done?'本拠地を確認して次へ':'タップして球場へ入る')+'" onclick="ldCeremonyTap()"></button><div class="ceremony-tap-note">'+(done?(ldDemo?'タップして別の球場へ':'タップして次へ'):phase==='idle'?'タップして球場に入る':'')+'</div>'+(done?'<div class="home-credit">'+(credit?'<a href="'+esc(credit.u)+'" target="_blank" rel="noopener">写真：'+esc(credit.a)+' / '+esc(credit.l)+'</a>':'<span>球場イメージ</span>')+'<span class="home-image-fallback">球場イメージ</span></div>':'')+'</section>';
}

// ============================================================
// 監督: 封筒が届く → 封蝋がランクの色に光る → 開封 → 契約書 → 候補者の名前が巡る → 署名 → 契約成立
// ============================================================
function ldManagerStage(x){
  const G=state.gacha,done=!!x?.open,p=x?.p,phase=ldCeremonyStage(G,x);
  const tint=x?ldRankTint(x.rank):'#e0a600';
  const paper='<article class="manager-document"><header><span>監督就任に関する契約書</span><b>'+esc(gachaTeam().name)+'</b></header><p class="manager-clause">本球団は、次の監督にチームの指揮を委ねる。</p><div class="manager-signature">'+(done?'<em class="manager-epithet">'+ldEpithet(p)+'</em>':'<em class="manager-epithet manager-epithet-wait">&nbsp;</em>')+'<small>就任監督</small><strong>'+(done?esc(p.name):'────────')+'</strong></div>'+(done?'<div class="manager-record"><span>通算勝利 <b>'+(p.wins??'—')+'</b></span><span>リーグ優勝 <b>'+(p.pennants??'—')+'</b></span><span>'+(p.mlb?'世界一':'日本一')+' <b>'+(p.japan??'—')+'</b></span></div><p class="manager-desc">'+esc(p.desc||'')+'</p><div class="manager-seal">契約成立</div>':'<p class="manager-status">就任の署名を確認しています…</p>')+'<footer><span>契約先</span><b>'+esc(gachaTeam().name)+'</b></footer></article>';
  const heading=done?ldManagerHeadline(p):phase==='idle'?'一通の封筒が、届いた。':phase==='approach'?'封を、切る。':'契約書が、姿を見せる。';
  return '<section class="manager-ceremony manager-'+phase+'" style="--rk:'+tint+'"><div class="manager-heading"><span>球団人事</span><h2>'+heading+'</h2><p>'+esc(gachaTeam().name)+' の指揮を託す。</p></div><div class="manager-mail"><div class="manager-letter">'+paper+'</div><img class="mail-closed" src="envelope-closed.webp" alt=""><img class="mail-open" src="envelope-open.webp" alt=""><div class="mail-seal" aria-hidden="true"></div><button type="button" class="ceremony-tap-surface" aria-label="'+(done?'契約を確認して次へ':'封筒をタップして開封')+'" onclick="ldCeremonyTap()"></button><div class="ceremony-tap-note">'+(done?(ldDemo?'タップして次の契約へ':'タップして次へ'):phase==='idle'?'封筒をタップして開ける':'')+'</div></div>'+(done?'<div class="manager-appointed">'+cardHtml(p,x.rank,{size:(typeof innerWidth==='number'&&innerWidth<=700)?'s':'l',pos:'監督',onclick:'cardPop(0)'})+'</div>':'')+'</section>';
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
  if(scene){
    scene.classList.remove(kind==='K'?'home-approach':'manager-approach');scene.classList.add((kind==='K'?'home-':'manager-')+phase);
    const line=scene.querySelector(kind==='K'?'.home-content h2':'.manager-heading h2');if(line)line.textContent=kind==='K'?'照明が、灯る。':'契約書が、姿を見せる。';
  }else renderGacha();
  if(kind==='M'){
    // 契約書が持ち上がったら、候補者の名前が巡ってから本人の署名
    const reduced=ldReduced();
    ldDelay(()=>ldNameRoulette(G,()=>ldWriteSignature(G)),reduced?0:1150);
  }
  seWin();
}
// 就任監督の欄で、他の監督の名前が次々に浮かんでは消える。最後に本人へ
function ldNameRoulette(G,then){
  if(state.gacha!==G||G.ceremony!=='lights')return then();
  const real=G.pulls?.[0]?.p,slot=document.querySelector('.manager-signature strong'),status=document.querySelector('.manager-status');
  if(!real||!slot||ldReduced())return then();
  const pool=(typeof POOL!=='undefined'?POOL:[]).filter(p=>p.cat==='M'&&p.name!==real.name&&!(typeof nameTaken==='function'&&nameTaken(p))).sort(()=>rnd()-0.5).slice(0,7);
  if(!pool.length)return then();
  if(status)status.textContent='候補者を、絞り込んでいる。';
  slot.classList.add('name-roulette');
  const gaps=[0,90,90,100,120,150,200];let t=0;
  pool.forEach((p,i)=>{t+=gaps[i]||0;ldDelay(()=>{if(state.gacha!==G||G.ceremony!=='lights')return;slot.textContent=p.name;seNameTick();},t);});
  ldDelay(()=>{if(state.gacha!==G||G.ceremony!=='lights')return;slot.classList.remove('name-roulette');slot.textContent='';then();},t+260);
}
function ldWriteSignature(G){
  if(state.gacha!==G||G.ceremony!=='lights')return;
  const name=G.pulls?.[0]?.p?.name,signature=document.querySelector('.manager-signature strong');
  if(!name||!signature)return;
  signature.classList.add('ink-signature');
  signature.innerHTML=Array.from(name).map((letter,i)=>'<span style="--stroke:'+i+'">'+esc(letter)+'</span>').join('');
  const status=document.querySelector('.manager-status');if(status)status.textContent='新監督の署名が、記されていく。';
  ldSe([[440,0,0.5,0.03,'sine']]);
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
  x.open=true;G.revealed=1;G.ceremony='complete';G.ceremonyDoneAt=Date.now();G.phase='caps';G.mapDone=true;ldBusy=false;seRollStop();seFanfare();renderGacha();
  document.querySelector('.ceremony-tap-surface')?.focus();
}
gachaPull=function(auto){
  const G=state.gacha,kind=gachaRound().k;if(auto||!['K','M'].includes(kind))return ldPlayerPull(auto);
  if(!G||G.pulls||ldBusy)return;
  G.ceremony='approach';G.mapDone=false;ldOriginalPull();ldBusy=true;seRollStop();
  const reduced=ldReduced();
  if(kind==='K'){
    if(reduced){G.mapDone=true;}
    else{
      seWhoosh();
      const pk=G.pulls?.[0]?.park;
      ldDelay(()=>{if(state.gacha===G&&G.ceremony==='approach')ldMapRun(G,pk);},60);
      // 地図が終わったら外し、入場(トンネル)を始める
      ldDelay(()=>{if(state.gacha!==G)return;G.mapDone=true;document.querySelectorAll('.gc-map,.gc-time').forEach(m=>m.remove());const s=document.querySelector('.home-ceremony');if(s)s.classList.remove('home-mapping');seWhoosh();},MAP_MS+(ldParkEra(pk)?TIME_MS:0));
    }
    const mapMs=reduced?0:MAP_MS+(ldParkEra(G.pulls?.[0]?.park)?TIME_MS:0);
    ldDelay(()=>ldCeremonyPhase(G,'lights'),reduced?60:mapMs+1900);
    ldDelay(()=>{if(state.gacha===G)ldCeremonyFinish();},reduced?160:mapMs+3500);
  }else{
    G.mapDone=true;
    if(!reduced){ldDelay(seSealBreak,800);}
    const nameMs=Array.from(G.pulls[0].p.name).length*250;   // 署名は1文字0.25秒
    ldDelay(()=>ldCeremonyPhase(G,'lights'),reduced?60:1900);
    ldDelay(()=>{if(state.gacha===G)ldCeremonyFinish();},reduced?160:1900+1150+1010+nameMs+700);
  }
};
renderGacha=function(){
  const G=state.gacha;if(!G)return;
  // 演出の途中(接近・署名中)に描き直すと動きが途切れるので、差し替えない
  if(G.pulls&&!G.pulls[0]?.open&&(G.ceremony==='approach'||G.ceremony==='lights')&&document.querySelector('.home-approach,.manager-approach,.home-lights,.manager-lights'))return;
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
