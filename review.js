// リクエスト／ABSチャレンジ ── 接戦の終盤、1点がかかった場面でだけ出る。
// 判定が覆れば、その試合の得点が本当に動く(勝敗まで変わる)。
//   リクエストは日本のプロ野球の流儀: 監督がベンチを出て両手で四角を作る → 審判団が集まる →
//   場内アナウンス → リプレー → 責任審判が宣告。対象は塁のアウト/セーフ、捕球、本塁打かファウルか
//   (2018年導入。ボール/ストライクは対象外)。
//   ABSはメジャーの流儀: 打者(捕手・投手)がヘルメットを叩いてチャレンジ → ビデオボードに
//   ゾーンと球の位置 → 球の一部でもゾーンにかかればストライク(2026年MLB導入の仕組みに倣う)。
// 人物は関節つきの人型で動かす。game.js の playDay から rvFindScene / rvStartScene が呼ばれる。
(function(){
const RV_MS = 8000;                 // 決断の持ち時間
const NS = "http://www.w3.org/2000/svg";
let RV = null;

function rvFrame(fn){const owner=RV;return window.requestAnimationFrame(ts=>{if(RV===owner && RV) fn(ts);});}
function rvLater(fn,ms){const owner=RV;return window.setTimeout(()=>{if(RV===owner && RV) fn();},ms);}
function rvEvery(fn,ms){const owner=RV;const id=window.setInterval(()=>{if(RV!==owner || !RV){window.clearInterval(id);return;} fn();},ms);return id;}

function rnd1(a, b){ return a + rnd() * (b - a); }
function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }
function hasFn(n){ return typeof window[n] === "function"; }
function ping(freq, dur, vol, type){ if(!window.sndOn) return; try{ const x = ac(); if(x) tone(x.currentTime, freq, dur, vol, type || "square"); }catch(e){} }
function crowd(dur, vol){ if(!window.sndOn) return; try{ const x = ac(); if(x) noiseBurst(x.currentTime, dur || 0.6, 4200, vol || 0.07); }catch(e){} }
function $r(id){ return document.getElementById(id); }
function clampN(v, a, b){ return Math.max(a, Math.min(b, v)); }
function ease(t){ return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

// ============================================================
// 1. 場面の抽選 ── 接戦(2点差以内)の終盤に、人間の球団へ。
//    覆れば得点が動く場面だけを作る(押し出し・本塁・ポール際・一塁二塁のクロスプレー・捕球)
// ============================================================
function rvFindScene(rolled){
  if(state.day < 5 || !state.opts || state.opts.review === false || !state.parts) return null;
  const s = hasFn("standingsSorted") ? standingsSorted() : state.parts.slice();
  const rem = state.schedule ? state.schedule.length - state.day : 99;
  for(const r of rolled){
    for(const side of ["A","B"]){
      const t = r[side], opp = side === "A" ? r.B : r.A;
      if(!t || t.cpu) continue;
      const my = side === "A" ? r.rA : r.rB, op = side === "A" ? r.rB : r.rA;
      if(Math.abs(my - op) > 2) continue;
      if(t.rvCool && state.day < t.rvCool) continue;
      let p = state.skipping ? 0.08 : 0.20;
      if(rem <= 30) p += 0.08;
      if(s.indexOf(t) <= 1 && s.indexOf(opp) <= 1) p += 0.12;
      if(Math.abs(my - op) <= 1) p += 0.06;
      if(rnd() > p) continue;
      const c = rvBuildScene(r, side, t, opp, my, op);
      if(!c) continue;
      t.rvCool = state.day + 14;
      return c;
    }
  }
  return null;
}
const PLAYS = ["first", "home", "steal", "catch", "hr", "abs"];
function rvBuildScene(r, side, t, opp, my, op){
  const batting = rnd() < 0.55;                       // 人間の球団が攻撃側か
  const batT = batting ? t : opp, defT = batting ? opp : t;
  const lineup = hasFn("lineupOf") ? lineupOf(batT).filter(Boolean) : Object.values(batT.slots).filter(p => p && p.cat === "B");
  if(lineup.length < 3) return null;
  const batP = pick(lineup);
  const pitP = defT.slots.CL || defT.slots.RP1 || defT.slots.SP1 || Object.values(defT.slots).find(p => p && p.cat === "P");
  if(!pitP) return null;
  const others = lineup.filter(p => p !== batP);
  const fielders = ["C","B1","B2","B3","SS","OF1","OF2","OF3"].map(k => defT.slots[k]).filter(Boolean);
  let play = window.rvForcePlay || pick(PLAYS);
  if(!batting && play === "abs" && op < 1) play = "first";
  // 守備側が不利を受けた場面は、相手が点を取っていないと成り立たない
  if(!batting && op < 1) play = pick(["first", "steal", "catch"]);
  const bases = [null, null, null], pool = others.slice();
  const takeRunner = () => pool.splice(Math.floor(rnd() * pool.length), 1)[0];
  if(play === "abs" && pool.length<3) return null;
  if(play === "abs") for(let i=0;i<3;i++) bases[i] = takeRunner();
  else if(["home","first","catch"].includes(play)) bases[2] = takeRunner();
  else if(play === "steal") bases[0] = takeRunner();
  else if(rnd() < 0.5) bases[Math.floor(rnd()*3)] = takeRunner();
  const runners = bases.filter(Boolean).length;
  const inn = rnd() < 0.5 ? 9 : rnd() < 0.6 ? 8 : 7;
  const outs = ["abs","first","catch"].includes(play) ? 2 : play === "steal" ? 1 : Math.floor(rnd() * 3);
  // 得点が動く幅。本塁打は走者ぶんも
  const delta = play === "hr" ? 1 + runners : 1;
  if(!batting && op < delta) return null;
  const c = {play, kind: play === "abs" ? "abs" : "req", victim:t, opp, batting, game:r, side, my, op, delta,
    inn, top: batT === r.A, outs, bases, batP, pitP, runner: bases[2] || bases[1] || bases[0] || null,
    fielder: defT.slots[{first:"B1",home:"C",steal:"SS",catch:"OF2",hr:"OF3"}[play]] || fielders[0], wrong: rnd() < 0.5, standalone:true};
  c.lefty = batP.bh === "左" || (batP.bh === "両" && pitP.th !== "左");
  c.pa = {inn, top:c.top, preOuts:outs, preBases:bases, bat:batP.name, batP, pit:pitP.name, pitP, batT};
  const bat = batP.name, run = c.runner ? c.runner.name : bat;
  if(play === "abs"){
    const pt = hasFn("pickPitchType") ? pickPitchType(pitP) : {name:"ストレート", kmh:148};
    c.type = pt.name; c.kmh = pt.kmh; c.zone = pick(["外角いっぱい","内角ぎりぎり","低めいっぱい","高めいっぱい"]);
    if(batting){ c.callIsStrike = true; c.call = "ストライク！"; c.callSub = "見逃し三振"; c.flipText = `ABSの判定はボール。押し出しの四球で1点`; c.holdText = `ABSの判定もストライク。三振でチェンジ`; c.stake = "覆れば押し出しで1点"; }
    else { c.callIsStrike = false; c.call = "ボール"; c.callSub = "押し出しの四球"; c.flipText = `ABSの判定はストライク！ 押し出しは取り消し、三振でチェンジ`; c.holdText = `ABSの判定もボール。押し出しの1点は変わらず`; c.stake = "覆れば相手の1点が消える"; }
  }else if(play === "hr"){
    if(batting){ c.callOut = true; c.call = "ファウル"; c.callSub = "ポール際の打球"; c.flipText = `検証の結果、本塁打！ ${bat}の${delta}ラン`; c.holdText = `検証の結果もファウル。打ち直し`; c.stake = `覆れば本塁打で${delta}点`; }
    else { c.callOut = false; c.call = "ホームラン"; c.callSub = "ポール際の打球"; c.flipText = `検証の結果、ファウル！ ${bat}の本塁打は取り消し`; c.holdText = `検証の結果も本塁打。判定どおり`; c.stake = `覆れば相手の${delta}点が消える`; }
  }else if(play === "home"){
    if(batting){ c.callOut = true; c.call = "アウト！"; c.callSub = "本塁のクロスプレー"; c.flipText = `検証の結果、セーフ！ ${run}が生還して1点`; c.holdText = `検証の結果もアウト。本塁憤死`; c.stake = "覆れば1点"; }
    else { c.callOut = false; c.call = "セーフ！"; c.callSub = "本塁のクロスプレー"; c.flipText = `検証の結果、アウト！ ${run}は本塁で憤死、1点取り消し`; c.holdText = `検証の結果もセーフ。1点は変わらず`; c.stake = "覆れば相手の1点が消える"; }
  }else if(play === "steal"){
    if(batting){ c.callOut = true; c.call = "アウト！"; c.callSub = "二塁の盗塁"; c.flipText = `検証の結果、セーフ！ ${run}が二塁へ、続く打者のヒットで1点`; c.holdText = `検証の結果もアウト。盗塁失敗`; c.stake = "覆れば走者が生き、1点につながる"; }
    else { c.callOut = false; c.call = "セーフ！"; c.callSub = "二塁の盗塁"; c.flipText = `検証の結果、アウト！ ${run}は二塁で憤死、その後の1点は消える`; c.holdText = `検証の結果もセーフ。走者は二塁へ`; c.stake = "覆れば相手の1点が消える"; }
  }else if(play === "catch"){
    if(batting){ c.callOut = true; c.call = "アウト！"; c.callSub = "捕球の判定"; c.flipText = `検証の結果、ワンバウンド！ ${bat}のヒットで1点`; c.holdText = `検証の結果も直接捕球。アウト`; c.stake = "覆ればヒットで1点"; }
    else { c.callOut = false; c.call = "ヒット"; c.callSub = "捕球の判定"; c.flipText = `検証の結果、直接捕球！ ヒットは取り消し、1点も消える`; c.holdText = `検証の結果もワンバウンド。ヒット`; c.stake = "覆れば相手の1点が消える"; }
  }else{
    if(batting){ c.callOut = true; c.call = "アウト！"; c.callSub = "一塁のクロスプレー"; c.flipText = `検証の結果、セーフ！ ${bat}の内野安打で1点`; c.holdText = `検証の結果もアウト。判定どおり`; c.stake = "覆れば内野安打で1点"; }
    else { c.callOut = false; c.call = "セーフ！"; c.callSub = "一塁のクロスプレー"; c.flipText = `検証の結果、アウト！ ${bat}は一塁で憤死、1点は消える`; c.holdText = `検証の結果もセーフ。1点は変わらず`; c.stake = "覆れば相手の1点が消える"; }
  }
  return c;
}
function rvStartScene(c){
  c.resume = !!state.playing;
  stopTimer();
  const sp = $r("s-play"), sk = $r("s-skip"); if(sp) sp.disabled = true; if(sk) sk.disabled = true;
  rvStart(c);
}
function rvSceneClose(c){
  const sp = $r("s-play"), sk = $r("s-skip"); if(sp) sp.disabled = false; if(sk) sk.disabled = false;
  const day = state.pendingDay; state.pendingDay = null;
  if(day) finishDay(day);
  if(hasFn("renderLive")) renderLive();
  if(c.resume) startTimer();
}
window.rvFindScene = rvFindScene; window.rvStartScene = rvStartScene; window.rvBuildScene = rvBuildScene;

// ============================================================
// 2. 人型 ── 関節つきの人物。腰を原点に、胴・頭・腕2本・脚2本。角度は鉛直から時計回り(度)
// ============================================================
const FIG = {torso:24, head:7, ua:11, la:11, ul:14, ll:14};
function deg(a){ return a * Math.PI / 180; }
function figPath(p){
  // p: {lean, la, lb, ra, rb, lu, lk, ru, rk, headx}
  const hipx = 0, hipy = 0;
  const sh = {x: hipx + Math.sin(deg(p.lean)) * FIG.torso, y: hipy - Math.cos(deg(p.lean)) * FIG.torso};
  const head = {x: sh.x + Math.sin(deg(p.lean + (p.headx || 0))) * (FIG.head + 3), y: sh.y - Math.cos(deg(p.lean + (p.headx || 0))) * (FIG.head + 3)};
  const limb = (ox, oy, a1, len1, a2, len2) => {
    const e = {x: ox + Math.sin(deg(a1)) * len1, y: oy + Math.cos(deg(a1)) * len1};
    const h = {x: e.x + Math.sin(deg(a1 + a2)) * len2, y: e.y + Math.cos(deg(a1 + a2)) * len2};
    return {e, h, d: "M" + ox.toFixed(1) + " " + oy.toFixed(1) + " L" + e.x.toFixed(1) + " " + e.y.toFixed(1) + " L" + h.x.toFixed(1) + " " + h.y.toFixed(1)};
  };
  const L1 = limb(sh.x, sh.y, p.la, FIG.ua, p.lb, FIG.la), R1 = limb(sh.x, sh.y, p.ra, FIG.ua, p.rb, FIG.la);
  const L2 = limb(hipx, hipy, p.lu, FIG.ul, p.lk, FIG.ll), R2 = limb(hipx, hipy, p.ru, FIG.ul, p.rk, FIG.ll);
  return {sh, head, arms:[L1, R1], legs:[L2, R2], torso:"M" + hipx + " " + hipy + " L" + sh.x.toFixed(1) + " " + sh.y.toFixed(1)};
}
// 図形にする。col=ユニ色, skin=肌, back=遠い側の手足は少し暗く
function figLow(g){ return Math.max(g.legs[0].h.y, g.legs[1].h.y, 0) + 4.6; }
function figPoint(p, x, y, sc, facing, part){
  const g = figPath(p), q = part === "glove" ? g.arms[p.glove === "R" ? 1 : 0].h : part === "hand" ? g.arms[1].h : g.legs[part === "rear" ? 1 : 0].h;
  const foot = part === "toe" || part === "rear";
  return {x:x+(q.x+(foot?8.6:0))*sc*facing, y:y+(q.y+(foot?3:0)-figLow(g))*sc};
}
function anchorFig(p, at, sc, facing, part){
  const q = figPoint(p,0,0,sc,facing,part);
  return {x:at.x-q.x,y:at.y-q.y};
}
function figSvg(id, p, x, y, sc, facing, col, cap){
  const g = figPath(p), low=figLow(g), shirt=col||"#e8e6dc", capc=cap||"#142235";
  const ump = id.includes("ump"), catcher = id.includes("cat"), pants = ump ? "#555a61" : "#e5e2d8", skin="#c98f68";
  const line=(d,c,w)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const leg=(a,back)=>line(a.d,back?shade(pants,.74):pants,7.8)+line(`M${a.h.x-2} ${a.h.y+1} l7 0 l2 2`,"#151c23",3.2)+line(`M${a.h.x} ${a.h.y+3} h6`,"#bbb9ad",.8);
  const arm=(a,back)=>line(a.d,back?shade(skin,.78):skin,4.7)+line(`M${g.sh.x} ${g.sh.y} L${g.sh.x+(a.e.x-g.sh.x)*.66} ${g.sh.y+(a.e.y-g.sh.y)*.66}`,back?shade(shirt,.72):shirt,7.8)+`<circle cx="${a.h.x}" cy="${a.h.y}" r="2.8" fill="${skin}"/>`;
  const nx=Math.cos(deg(p.lean)),ny=Math.sin(deg(p.lean));
  const torso=`M${-6*nx} ${-6*ny} L${g.sh.x-9*nx} ${g.sh.y-9*ny} Q${g.sh.x} ${g.sh.y-4} ${g.sh.x+9*nx} ${g.sh.y+9*ny} L${6*nx} ${6*ny} Z`;
  const def=RV&&(RV.c.batting?RV.c.opp:RV.c.victim);
  const slot={"rv-fb":"B1","rv-ss":"SS","rv-cat":"C","rv-rf":"OF3"}[id];
  const number = RV && (id.includes("run") ? (RV.c.play === "first" ? RV.c.batP : RV.c.runner) : id.includes("bat") ? RV.c.batP : id.includes("pit") ? RV.c.pitP : slot ? def.slots[slot] : RV.c.fielder);
  let gear="";
  if(p.glove&&!ump){const h=g.arms[p.glove==="R"?1:0].h; gear+=`<g transform="translate(${h.x} ${h.y})"><path d="M-4 3 Q-7-2-3-6 L0-4 L4-6 Q8 0 3 5 Z" fill="#a56938" stroke="#4e301e" stroke-width="1"/><path d="M-3-2 Q0 4 4-2 M-3-4 L2 3 M0-4 L4 1" fill="none" stroke="#dfae6f" stroke-width=".7"/></g>`;}
  if(typeof p.bat==="number"){const h=g.arms[p.batHand==="R"?1:0].h,ex=h.x+Math.sin(deg(p.bat))*34,ey=h.y+Math.cos(deg(p.bat))*34;gear+=line(`M${h.x} ${h.y} L${ex} ${ey}`,"#b9935e",3.5)+line(`M${h.x} ${h.y} l${(ex-h.x)*.25} ${(ey-h.y)*.25}`,"#282a29",2.2);}
  if(p.gesture==="review")gear+=line(`M${g.sh.x-4} ${g.sh.y+11} v-3 h3 m2 0 h3 v3 m0 3 v3 h-3 m-2 0 h-3 v-3`,skin,1.4);
  if(p.signal==="hr")gear+=line(`M${g.arms[0].h.x} ${g.arms[0].h.y} l1 -5`,skin,1.8);
  if(catcher) gear+=line(g.torso,"#202a33",10)+line(`M${g.sh.x-3} ${g.sh.y+3} L-3 -2`,"#66717b",1.4)+g.legs.map(a=>line(`M${a.e.x} ${a.e.y} L${a.h.x} ${a.h.y}`,"#26333e",6)).join("");
  return `<g id="${id}" data-ground-x="${x}" data-ground-y="${y}"><ellipse cx="${x}" cy="${y+1}" rx="${14*sc}" ry="${3*sc}" fill="#09130e" opacity=".24"/><g transform="translate(${x} ${y-low*sc}) scale(${sc*facing} ${sc})">${leg(g.legs[1],true)}${arm(g.arms[1],true)}<path d="${torso}" fill="${shirt}" stroke="${shade(shirt,.64)}" stroke-width=".6"/>${line(g.torso,"#ffffff",.65)}${line(`M${-6*nx} ${-6*ny} L${6*nx} ${6*ny}`,"#252a2d",2)}${!ump&&!catcher?`<text x="${g.sh.x*.58}" y="${g.sh.y*.58+2}" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" font-weight="bold" fill="#f6f1df" paint-order="stroke" stroke="#23303c" stroke-width=".5">${esc(String(number?.no??""))}</text>`:""}${leg(g.legs[0],false)}${arm(g.arms[0],false)}${gear}<path d="M${g.head.x-4.8} ${g.head.y-3} Q${g.head.x+4} ${g.head.y-7} ${g.head.x+5.2} ${g.head.y-1} l2 2 l-2 1 q-1 7-6 4 Z" fill="${skin}"/><path d="M${g.head.x-5.8} ${g.head.y-1} q-1-9 7-7 q5 1 5 7 Z" fill="${capc}"/>${line(`M${g.head.x+2} ${g.head.y-1} h8`,capc,2)}${line(`M${g.head.x+3.3} ${g.head.y+1} h1`,"#28302f",.9)}${catcher?line(`M${g.head.x-4} ${g.head.y} h10 m-9 3 h8 m-4-7 v12`,"#adb0a6",1):""}</g></g>`;
}
function shade(hex, k){
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if(!m) return hex;
  const n = parseInt(m[1], 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return "rgb(" + Math.round(r * k) + "," + Math.round(g * k) + "," + Math.round(b * k) + ")";
}
// ポーズの辞書。角度は鉛直(真下)から時計回り(度)。前が+x。腕は肩から、脚は腰から。
//   a1=上腕/太もも、a2=肘/膝の相対角(マイナス=後ろへ折れる)。glove="L"で前の手にグラブ、bat=バットの角度
// 野球の実際の動作に合わせる:
//   走り: 腕は肘90度で脚と逆に振る / スライディング: 片脚を前へ伸ばし、もう片脚を折って座る(フィギュア4)、上体は後ろへ
//   一塁手: 後ろ足をベースに残して前脚を大きく踏み出し、グラブを送球へ伸ばす / 捕手のタッチ: 低く構え、グラブを走者の手前の地面へ
//   投球: 前脚を高く上げ(ワインドアップ)→踏み出して腕を振り下ろす(リリース)→上体が倒れる(フォロースルー)
//   審判: アウトは拳を上げてから前へ打ち下ろす / セーフは両腕を横に広げる / 本塁打は人差し指を上げて回す / ファウルは両手を上げる
const P = {
  stand:   {lean:2,  la:10,  lb:8,   ra:-10, rb:8,   lu:6,   lk:-2,  ru:-6,  rk:-2},
  ready:   {lean:22, la:45,  lb:-60, ra:35,  rb:-60, lu:28,  lk:-45, ru:-24, rk:-25, glove:"L"},       // 中腰、手は膝の前
  crouch:  {lean:30, la:70,  lb:-30, ra:35,  rb:-90, lu:95,  lk:-125,ru:85,  rk:-120, glove:"L"},      // 捕手の構え。グラブを前へ
  slide:   {lean:-42,la:110, lb:10,  ra:-120,rb:-10, lu:76,  lk:0,   ru:115, rk:-145},                // 足から滑る。前脚を伸ばし、後ろ脚を折る
  stretch: {lean:38, la:98,  lb:-4,  ra:-60, rb:-30, lu:55,  lk:-35, ru:-35, rk:5, glove:"L"},        // 一塁手のストレッチ
  dive:    {lean:86, la:100, lb:-6,  ra:96,  rb:-4,  lu:-72, lk:-6,  ru:-84, rk:-4, glove:"L"},       // 頭から飛び込む。腕を前へ、脚を後ろへ
  tag:     {lean:70, la:62,  lb:-18, ra:-30, rb:-70, lu:85,  lk:-120, ru:-85, rk:120, glove:"L"},        // グラブを地面へ落としてタッチ
  outA:    {lean:-4, la:20,  lb:-30, ra:165, rb:-5,  lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 拳を上げ
  outB:    {lean:10, la:20,  lb:-30, ra:80,  rb:70,  lu:14,  lk:-2,  ru:-14, rk:-2},                  // 前へ打ち下ろす(ハンマー)
  safe:    {lean:6,  la:95,  lb:0,   ra:-95, rb:0,   lu:28,  lk:-2,  ru:-28, rk:-2},                  // 両腕を横へ
  point:   {signal:"hr",lean:4,  la:168, lb:8,   ra:-15, rb:6,   lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 人差し指を上げて回す(本塁打)
  foul:    {lean:0,  la:162, lb:0,   ra:-162,rb:0,   lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 両手を上げてファウル
  batRest: {lean:4,  la:24,  lb:-14, ra:14,  rb:6,   lu:8,   lk:-2,  ru:-8,  rk:-2, bat:12, batHand:"R"}, // バットを下ろし、後ろの手で脇に
  helmet:  {lean:6,  la:140, lb:92,  ra:14,  rb:6,   lu:8,   lk:-2,  ru:-8,  rk:-2, bat:12, batHand:"R"}, // 後ろの手にバット、前の手でヘルメットの上を叩く
  square:  {gesture:"review",lean:2,  la:60,  lb:-100,ra:-60, rb:100, lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 胸の前で両手の四角(リクエスト)
  bat:     {lean:12, la:-40, lb:-70, ra:-30, rb:-80, lu:16,  lk:-4,  ru:-20, rk:-4, bat:-155},        // 構え。手は後ろの肩の高さ、バットは立てる
  swing:   {lean:-6, la:82,  lb:8,   ra:70,  rb:18,  lu:34,  lk:-10, ru:-36, rk:-4, bat:100},         // インパクト。両腕を伸ばしバットは前へ
  wind:    {lean:-10,la:30,  lb:-100,ra:22,  rb:-100,lu:78,  lk:-105,ru:2,   rk:0, glove:"L"},        // 前脚を高く上げ、両手は胸の前
  release: {lean:36, la:-40, lb:-60, ra:118, rb:-6,  lu:58,  lk:-16, ru:-48, rk:8, glove:"L"},        // 踏み出して腕を振る
  follow:  {lean:62, la:-30, lb:-40, ra:20,  rb:-24, lu:56,  lk:-10, ru:-64, rk:40, glove:"L"},       // 振り切って上体が倒れる
  look:    {lean:-6, la:15,  lb:6,   ra:-15, rb:6,   lu:8,   lk:-2,  ru:-8,  rk:-2, headx:28, glove:"L"},
  leap:    {lean:4,  la:170, lb:2,   ra:162, rb:2,   lu:40,  lk:-80, ru:12,  rk:-60, glove:"L"},      // 跳ぶ。腕を上げ、膝を畳む
};
function run(t, amp){ // 走り。t=位相。脚と逆に腕を振り、肘は90度。前へ振り出す脚の膝は曲がる
  const a = amp || 1, s = Math.sin(t), c = Math.sin(t + Math.PI);
  return {lean:14 * a, la:-42 * s * a - 6, lb:88, ra:-42 * c * a - 6, rb:88,
          lu:48 * s * a + 4, lk:-12 - 25 * Math.max(0, s) * a - 70 * Math.max(0, Math.cos(t)) * a, ru:48 * c * a + 4, rk:-12 - 25 * Math.max(0, c) * a - 70 * Math.max(0, -Math.cos(t)) * a};
}
function lerpP(a, b, t){
  const o = {};
  const keys = Object.keys(a).concat(Object.keys(b).filter(k => !(k in a)));
  keys.forEach(k => {
    const x = a[k], y = b[k];
    if(typeof x === "number" && typeof y === "number") o[k] = x + (y - x) * t;
    else if(typeof x === "number" && y === undefined) o[k] = t < 0.5 ? x : undefined;
    else if(x === undefined && typeof y === "number") o[k] = t < 0.5 ? undefined : y;
    else o[k] = t < 0.5 ? x : y;
  });
  return o;
}
const FIG_LAST = {};
function setFig(id, p, x, y, sc, facing, col, cap){
  const old = document.getElementById(id); if(!old) return;
  const html = figSvg(id, p, x, y, sc, facing, col, cap);
  if(FIG_LAST[id] === html && old.__rvHtml === html) return;      // 前のコマと同じ絵は触らない
  const tmp = document.createElementNS(NS, "g"); tmp.innerHTML = html;
  const el = tmp.firstChild; el.__rvHtml = html; FIG_LAST[id] = html;
  old.replaceWith(el);
}
function ball(id, x, y, r, show){ const b = document.getElementById(id); if(!b) return; b.setAttribute("cx", x); b.setAttribute("cy", y); if(r) b.setAttribute("r", r); b.setAttribute("opacity", show === false ? 0 : 1); }
function ballSvg(id){ return '<circle id="' + id + '" cx="0" cy="0" r="4.5" fill="#fff" stroke="#c9463a" stroke-width=".5" opacity="0"/>'; }
function shadowSvg(id){ return '<ellipse id="' + id + '" cx="0" cy="0" rx="3.5" ry="1.2" fill="#142219" fill-opacity=".24" opacity="0"/>'; }
function teamCol(t, d){ return (t && t.color) || d; }

// ============================================================
// 3. 画面
// ============================================================
function rvBox(){
  let bg = $r("rv-bg");
  if(bg) return bg;
  bg = document.createElement("div"); bg.id = "rv-bg";
  bg.innerHTML = '<div id="rv">' +
    '<div class="rv-head"><span class="rv-k" id="rv-k"></span><span class="rv-sit" id="rv-sit"></span></div>' +
    '<div class="rv-board" id="rv-board"></div>' +
    '<div class="rv-stage" id="rv-stage"></div>' +
    '<div class="rv-call" id="rv-call"></div>' +
    '<div class="rv-q" id="rv-q"></div>' +
    '<div class="rv-btns" id="rv-btns"></div>' +
    '<div class="rv-verdict" id="rv-verdict"></div>' +
    '<div class="rv-foot" id="rv-foot"></div>' +
    '</div>';
  document.body.appendChild(bg);
  return bg;
}
function boardHtml(c){
  const home = c.game.B, away = c.game.A;
  const sc = t => t === c.victim ? c.my : c.op;
  const mgr = c.victim.slots && c.victim.slots.MGR;
  const actor = ["home","steal"].includes(c.play) ? c.runner : c.batP;
  const opponent = c.play === "abs" ? c.pitP : c.fielder;
  const matchup='<div class="rv-matchup"><span>'+(["home","steal"].includes(c.play)?"走者 ":"打者 ")+esc(actor?.name||"")+'</span><span>'+(c.play==="abs"?"投手 ":"守備 ")+esc(opponent?.name||"")+'</span></div>';
  return '<div class="rv-sb"><div class="rv-sb-t' + (away === c.victim ? " me" : "") + '">' + teamEmblem(away, 18) + '<b>' + esc(away.name) + '</b><i>' + sc(away) + '</i></div>' +
    '<div class="rv-sb-mid"><small>' + (c.resolved ? '試合終了' : c.inn + '回' + (c.top ? '表' : '裏')) + '</small><span>' + (c.resolved ? '最終スコア' : c.outs + '死 ' + esc(basesLabel(c.bases))) + '</span></div>' +
    '<div class="rv-sb-t' + (home === c.victim ? " me" : "") + '">' + teamEmblem(home, 18) + '<b>' + esc(home.name) + '</b><i>' + sc(home) + '</i></div></div>' +
    '<div class="rv-stake"><span>' + esc(c.resolved ? "判定確定" : c.stake) + '</span>' + (mgr ? '<small>' + esc(c.victim.name) + ' 監督 ' + esc(mgr.name) + '</small>' : '') + '</div>'+matchup;
}
function rvStart(c){
  if(RV) rvAbort();
  RV = {c, phase:"play", raf:0, timer:0, tick:0};
  const bg = rvBox();
  $r("rv-k").textContent = c.kind === "abs" ? "ABSチャレンジ" : "リクエスト";
  $r("rv-sit").textContent = (state.schedule ? dateLabel(state.day) + "　" : "") + esc(c.victim.name) + " × " + esc(c.opp.name);
  $r("rv-board").innerHTML = boardHtml(c);
  $r("rv-call").innerHTML = ""; $r("rv-call").className = "rv-call";
  $r("rv-q").innerHTML = ""; $r("rv-btns").innerHTML = ""; $r("rv-verdict").innerHTML = ""; $r("rv-foot").innerHTML = "";
  $r("rv-verdict").className = "rv-verdict";
  const ann = $r("rv-ann"); if(ann){ ann.className = ""; ann.innerHTML = ""; }
  bg.className = "show " + (c.kind === "abs" ? "abs" : "req");
  if(hasFn("telop")) try{ telop("【" + (c.kind === "abs" ? "ABS" : "リクエスト") + "】" + c.victim.name + "、" + c.inn + "回の際どい判定"); }catch(e){}
  SCENES[c.play].play(c);
}
function rvAbort(){
  if(!RV) return;
  cancelAnimationFrame(RV.raf); clearTimeout(RV.timer); clearInterval(RV.tick);
  RV = null;
  const bg = $r("rv-bg"); if(bg) bg.className = "";
}
// 審判の宣告のあと、監督(ABSは打者)に問う
function rvAsk(){
  if(!RV || RV.phase !== "play") return;
  const c = RV.c;
  $r("rv-call").innerHTML = '<small>当初の判定</small><b>' + esc(c.call) + '</b><span>' + esc(c.callSub) + '</span>';
  $r("rv-call").className = "rv-call show";
  ping(c.kind === "abs" ? 300 : 260, 0.12, 0.08, "sawtooth");
  crowd(0.5, 0.05);
  RV.phase = "ask";
  let left = RV_MS / 1000;
  $r("rv-q").innerHTML = (c.kind === "abs" ? (c.batting ? "打者がチャレンジする？" : "投手がチャレンジする？") : "監督、リクエストを出す？") + ' <i id="rv-timer">' + left + '</i>';
  $r("rv-btns").innerHTML =
    '<button type="button" class="btn rv-go" onclick="rvDecide(true)">' + (c.kind === "abs" ? "チャレンジ！" : "リクエスト！") + '</button>' +
    '<button type="button" class="btn ghost rv-no" onclick="rvDecide(false)">判定を受け入れる</button>' +
    '<div class="rv-tbar"><i style="animation-duration:' + (RV_MS / 1000) + 's"></i></div>';
  RV.tick = rvEvery(function(){
    if(!RV) return;
    left -= 1;
    const t = $r("rv-timer"); if(t) t.textContent = Math.max(0, left);
    if(left <= 2 && left > 0) ping(880, 0.05, 0.05);
    if(left <= 0){ clearInterval(RV.tick); rvDecide(false, true); }
  }, 1000);
}
window.rvDecide = function(go, auto){
  if(!RV || RV.phase !== "ask") return;
  clearInterval(RV.tick);
  RV.phase = "reveal";
  $r("rv-btns").innerHTML = "";
  if(hasFn("seTap") && !auto) seTap();
  if(!go){
    $r("rv-q").innerHTML = auto ? "時間切れ。判定を受け入れた" : "判定を受け入れた";
    RV.timer = rvLater(function(){ if(RV) SCENES[RV.c.play].reveal(false); }, 400);
    return;
  }
  // 申請の所作: 監督が四角を作る / 打者がヘルメットを叩く
  $r("rv-q").innerHTML = RV.c.kind === "abs" ? esc(RV.c.batting ? RV.c.batP.name : RV.c.pitP.name) + (RV.c.batting ? "がヘルメット" : "が帽子") + "を叩いた ── チャレンジ" : esc(RV.c.victim.name) + "の監督がベンチを出た ── リクエスト";
  gesture(RV.c, function(){
    if(!RV) return;
    $r("rv-q").innerHTML = RV.c.kind === "abs" ? "ABSのビデオボードへ……" : "審判団が集まり、リプレー検証へ……";
    if(RV.c.kind !== "abs") announce("ただいまのプレーについて、リクエストにより判定を検証します");
    RV.timer = rvLater(function(){ if(RV) SCENES[RV.c.play].reveal(true); }, RV.c.kind === "abs" ? 450 : 850);
  });
};
// 場内アナウンスの帯
function announce(txt){
  let a = $r("rv-ann");
  if(!a){ a = document.createElement("div"); a.id = "rv-ann"; $r("rv").insertBefore(a, $r("rv-call")); }
  a.innerHTML = '<i>場内</i>' + esc(txt);
  a.className = "show";
}
// 申請の所作を舞台の上に重ねる
function gesture(c, done){
  const svg = $r("rv-svg"); if(!svg){ done(); return; }
  const g = document.createElementNS(NS, "g"); g.setAttribute("id", "rv-gest");
  const col = teamCol(c.victim, "#e0a600");
  if(c.kind === "abs"){
    if(!c.batting && SCENES.abs.challengePitcher){SCENES.abs.challengePitcher(c,done);return;}
    const lefty=c.lefty, bx=c.batting?(lefty?116:258):92, by=c.batting?290:312, sc=c.batting?1.8:1.55;
    const initial=c.batting?P.bat:P.stand, facing=c.batting?(lefty?1:-1):1;
    g.innerHTML=figSvg("rv-gfig",initial,bx,by,sc,facing,col,"#192a37");svg.appendChild(g);
    const old=$r(c.batting?"rv-bat":"rv-pit");if(old)old.setAttribute("opacity",0);
    let start=0;
    function f(ts){if(!start)start=ts;const t=ts-start;
      // 見逃しなのでバットは振らない: まず下ろして後ろの手に持ち替え、それから前の手でヘルメットを叩く
      const pose = !c.batting ? lerpP(initial,P.helmet,ease(Math.min(1,t/430)))
        : t<300 ? lerpP(initial,P.batRest,ease(t/300)) : lerpP(P.batRest,P.helmet,ease(Math.min(1,(t-300)/350)));
      // Two small taps, then hold the challenge gesture.
      if(t>650)pose.la+=Math.sin(Math.min(1,(t-650)/300)*Math.PI*4)*4;
      setFig("rv-gfig",pose,bx,by,sc,facing,col,"#192a37");
      if(t<950)RV.raf=rvFrame(f);else RV.timer=rvLater(done,180);
    }
    RV.raf=rvFrame(f);
  }else{
    // 監督が画面の端から歩いてきて、両手で四角
    g.innerHTML = figSvg("rv-gfig", P.stand, 0, 0, 1, 1, col, "#111");
    svg.appendChild(g);
    const H = Number(svg.getAttribute("viewBox").split(" ")[3]);
    let start = 0;
    function f(ts){ if(!RV) return; if(!start) start = ts; const t = (ts - start);
      if(t < 700){ const p = ease(t / 700); setFig("rv-gfig", run(t / 105, 0.6), -20 + 90 * p, H - 6, 1.05, 1, col, "#111"); }
      else { const q = Math.min(1, (t - 700) / 420); setFig("rv-gfig", lerpP(P.stand, P.square, ease(q)), 70, H - 6, 1.05, 1, col, "#111"); }
      if(t < 1120) RV.raf = rvFrame(f); else {
        const meet=document.createElementNS(NS,"g");meet.id="rv-conference";
        meet.innerHTML=figSvg("rv-meet-ump1",P.stand,203,H-18,.85,1,"#2b2b30","#111")+figSvg("rv-meet-ump2",{...P.stand,la:55,lb:-60},232,H-12,.9,-1,"#2b2b30","#111");
        g.appendChild(meet);announce("審判団が集まり、判定と検証する映像を確認しています");
        crowd(.6,.035); RV.timer=rvLater(done,380);
      } }
    RV.raf = rvFrame(f);
  }
}
// 責任審判の宣告。ジェスチャーつき
function verdictSign(safe, isHR, done){
  const svg = $r("rv-svg"); if(!svg){ done(); return; }
  const gest = $r("rv-gest"); if(gest) gest.remove();
  const H = Number(svg.getAttribute("viewBox").split(" ")[3]);
  const g = document.createElementNS(NS, "g"); g.setAttribute("id", "rv-ump2"); svg.appendChild(g);
  const to = isHR ? (safe ? P.point : P.foul) : (safe ? P.safe : P.outB);
  const via = safe ? P.stand : P.outA;
  let start = 0;
  function f(ts){ if(!RV) return; if(!start) start = ts; const t = Math.min(1, (ts - start) / 560);
    const p = t < 0.5 ? lerpP(P.stand, via, ease(t * 2)) : lerpP(via, to, ease((t - 0.5) * 2));
    if(isHR&&safe){p.la+=Math.sin(t*Math.PI*4)*9;}
    setFig("rv-ump2", p, 300, H - 6, 1.1, -1, "#2b2b30", "#111");
    if(t < 1) RV.raf = rvFrame(f); else done(); }
  RV.raf = rvFrame(f);
}
// ============================================================
// 4. 結末 ── 覆れば得点が動く。得点・士気・ニュースへ
// ============================================================
function rvSettle(go){
  if(!RV || RV.phase === "done") return;
  const c = RV.c, v = c.victim;
  const over = go && c.wrong;
  c.resolved = true;
  let head, body, cls;
  if(go && over){ head = "判定が覆った！"; body = c.flipText + "。采配ポイント +1"; cls = "win"; }
  else if(go){ head = "判定どおり"; body = c.holdText + "。士気が少し落ちる"; cls = "lose"; }
  else { head = "判定を受け入れた"; body = "映像検証を行わず、当初の判定で試合を再開"; cls = "ok"; }
  // 得点を動かす(その日の結果はまだ確定していない)
  const r = c.game;
  if(over){
    if(c.batting){ if(c.side === "A") r.rA += c.delta; else r.rB += c.delta; c.my += c.delta; }
    else { if(c.side === "A") r.rB = Math.max(0, r.rB - c.delta); else r.rA = Math.max(0, r.rA - c.delta); c.op = Math.max(0, c.op - c.delta); }
  }
  const won = c.my > c.op, tie = c.my === c.op;
  const sc = `${v.name} ${c.my}-${c.op} ${c.opp.name}`;
  body += over ? (won ? `。${sc} で勝利！` : tie ? `。${sc} の引き分けに持ち込んだ` : `。それでも ${sc} で及ばず`)
               : (won ? `。試合は ${sc} で勝利` : tie ? `。試合は ${sc} の引き分け` : `。試合は ${sc} で敗れた`);
  $r("rv-verdict").innerHTML = '<b>' + esc(head) + '</b><span>' + esc(body) + '</span>';
  $r("rv-verdict").className = "rv-verdict show " + cls;
  $r("rv-q").innerHTML = "";
  $r("rv-board").innerHTML = boardHtml(c);
  const day = state.schedule ? dateLabel(Math.max(0, Math.min(state.day, state.schedule.length) - 1)) : "";
  const label = c.kind === "abs" ? "ABSチャレンジ" : "リクエスト";
  if(go && over){
    addPts(v, 1, label + "成功");
    moodSet(v, 0.8, 7, "判定を覆した勢い");
    v.rvWin = (v.rvWin || 0) + 1;
    if(hasFn("mascotAb") && mascotAb(v, "trick")) moodSet(c.opp, -1, 7, v.mascot.name + "のいたずら");
    state.news.unshift({mo:day, txt:`【覆った】${v.name}の${label}が成功。${c.flipText}（${sc}）`});
    if(hasFn("seWin")) seWin(); crowd(1.2, 0.1);
  }else if(go){
    moodSet(v, -0.8, 5, label + "失敗");
    v.rvLose = (v.rvLose || 0) + 1;
    state.news.unshift({mo:day, txt:`【空振り】${v.name}の${label}は判定どおり。ベンチが静まる`});
    ping(160, 0.35, 0.09, "sawtooth");
  }
  if(hasFn("renderNews")) try{ renderNews(); }catch(e){}
  $r("rv-foot").innerHTML = '<button type="button" class="btn" onclick="rvClose()">試合へ戻る</button>';
  RV.phase = "done";
  RV.timer = rvLater(function(){ if(RV && RV.phase === "done") rvClose(); }, 7000);
}
window.rvClose = function(){
  if(!RV) return;
  const c = RV.c;
  rvAbort();
  const a = $r("rv-ann"); if(a) a.className = "";
  rvSceneClose(c);
};

// ============================================================
// 5. 舞台 ── どれも横からの絵。人が走り、滑り、伸び、飛び込む
// ============================================================
function stageOpen(h, sky){
  return '<svg viewBox="0 0 360 ' + h + '" class="rv-svg" id="rv-svg"><defs>' +
    '<linearGradient id="rvSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (sky || "#0d1c2e") + '"/><stop offset="1" stop-color="#1b3b2f"/></linearGradient>' +
    '<linearGradient id="rvGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7a48"/><stop offset="1" stop-color="#1f5b35"/></linearGradient></defs>' +
    '<rect width="360" height="' + h + '" fill="url(#rvSky)"/>';
}
function stands(y){
  let s=`<rect x="0" y="28" width="360" height="${y-28}" fill="#172b35"/>`;
  for(let row=0;row<6;row++){
    const cy=y-8-row*13;
    s+=`<path d="M0 ${cy+5} H360" stroke="#4a5b60" opacity=".38"/>`;
    for(let i=0;i<49;i++){const x=i*7.7+(row%2)*3.2, tone=["#c4b9a5","#687a88","#8a5652","#819083","#c6c2ae"][(i*7+row*13)%5];
      s+=`<path d="M${x-2} ${cy+3} v-3 q2-3 4 0 v3" fill="${tone}" opacity=".58"/><circle cx="${x}" cy="${cy-3}" r="1.4" fill="#b79a80" opacity=".65"/>`;
    }
  }
  s+=`<path d="M56 30 L76 ${y} M284 30 L264 ${y}" stroke="#18252c" stroke-width="13"/><rect y="${y-6}" width="360" height="6" fill="#203c3a"/>`;
  return s;
}
function ground(y, h){ return '<rect x="0" y="' + y + '" width="360" height="' + h + '" fill="url(#rvGrass)"/>'; }
function dirt(x, y, w, h){ return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#8a5a34"/>'; }
function lbl(){
  return '<text id="rv-lbl" x="350" y="18" text-anchor="end" font-family="Noto Sans JP,sans-serif" font-size="10" fill="#cfe0d4" letter-spacing=".3"></text>' +
    '<g id="rv-tag"><rect x="8" y="8" width="46" height="15" rx="2" fill="#c9463a"/><circle id="rv-tagdot" cx="16" cy="15.5" r="2.6" fill="#fff"/><text id="rv-tagtx" x="22" y="19" font-family="Oswald,sans-serif" font-weight="700" font-size="10" fill="#fff" letter-spacing="1.5">LIVE</text></g>';
}
function setTag(txt, col){ const t = $r("rv-tagtx"), g = $r("rv-tag"); if(!t || !g) return; t.textContent = txt; g.firstChild.setAttribute("fill", col || "#c9463a"); g.firstChild.setAttribute("width", 14 + txt.length * 7); }
function big(x, y){
  y = 96;   // タイムラインの帯(24〜48)の下に置く
  return '<g id="rv-bigg" opacity="0"><rect x="0" y="' + (y - 44) + '" width="360" height="56" fill="#06110b" opacity=".72"/>' +
    '<text id="rv-big" x="180" y="' + y + '" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="44" fill="#fff" letter-spacing="6" style="paint-order:stroke" stroke="#0b1f16" stroke-width="6"></text></g>';
}
function showBig(txt, ok){ const b = $r("rv-big"), g = $r("rv-bigg"); if(!b || !g) return; b.textContent = txt; b.setAttribute("fill", ok ? "#6fe3a0" : "#ff6b5b"); g.setAttribute("opacity", 1); fadeIn(g, 240); b.classList.add("rv-pop"); }
// SVG の要素を溶け込むように出す(style の opacity を CSS transition で)
function fadeIn(el, ms){ if(!el) return; el.style.opacity = "0"; el.style.transition = "opacity " + (ms || 250) + "ms ease-out"; requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.style.opacity = "1"; }); }); }
// 差のタイムライン: 「走者の足」と「捕球」の2点を秒差つきで示す
function showGap(tr, labA, labB){
  const svg = $r("rv-svg"); if(!svg) return;
  const gap = tr.gap, safe = tr.safe;                       // safe=走者が先
  const x0 = 64, x1 = 296, mid = 180, half = Math.min(60, 24 + gap * 0.5);
  const xr = safe ? mid - half : mid + half, xb = safe ? mid + half : mid - half;   // 早い方を左に
  const g = document.createElementNS(NS, "g"); g.setAttribute("id", "rv-gap");
  g.innerHTML = '<rect x="0" y="24" width="360" height="24" fill="#06110b" opacity=".72"/>' +
    '<line x1="' + x0 + '" y1="36" x2="' + x1 + '" y2="36" stroke="#3e6b52" stroke-width="2"/>' +
    '<line x1="' + Math.min(xr, xb) + '" y1="36" x2="' + Math.max(xr, xb) + '" y2="36" stroke="#ffd257" stroke-width="3"/>' +
    '<circle cx="' + xr + '" cy="36" r="5" fill="#e0a600" stroke="#fff" stroke-width="1.2"/><text x="' + xr + '" y="' + (safe ? 30 : 46) + '" text-anchor="middle" font-family="Noto Sans JP,sans-serif" font-size="8" fill="#ffd257">' + esc(labA) + '</text>' +
    '<circle cx="' + xb + '" cy="36" r="5" fill="#4f8fe8" stroke="#fff" stroke-width="1.2"/><text x="' + xb + '" y="' + (safe ? 46 : 30) + '" text-anchor="middle" font-family="Noto Sans JP,sans-serif" font-size="8" fill="#9fc4ff">' + esc(labB) + '</text>' +
    '<text x="' + (x1 + 8) + '" y="40" font-family="Oswald,sans-serif" font-weight="700" font-size="13" fill="#ffd257">' + (gap / 1000).toFixed(2) + 's</text>';
  fadeIn(g, 260);
  svg.appendChild(g);
}
// 拡大の丸窓: 舞台の中身を <use> で写し、際どい場所を2.4倍で見せる(以後の動きも映る)
function zoomIn(fx, fy){
  const svg = $r("rv-svg"); if(!svg || $r("rv-zoom")) return;
  let world = $r("rv-world");
  if(!world){
    world = document.createElementNS(NS, "g"); world.setAttribute("id", "rv-world");
    const keep = [];
    Array.from(svg.childNodes).forEach(n => { if(n.nodeType !== 1) return; if(n.tagName === "defs" || (n.tagName === "rect" && !n.id && keep.length === 0)){ keep.push(n); return; } if(["rv-lbl","rv-tag","rv-bigg","rv-gap"].indexOf(n.id) >= 0) return; world.appendChild(n); });
    svg.insertBefore(world, $r("rv-lbl") || null);
    ["rv-bigg","rv-lbl","rv-tag","rv-gap"].forEach(id => { const n = $r(id); if(n) svg.appendChild(n); });   // 文字の帯は舞台より手前に
  }
  const k = 2.4, R = 56, zx = fx > 180 ? 82 : 278, zy = 174;
  const g = document.createElementNS(NS, "g"); g.setAttribute("id", "rv-zoom");
  g.innerHTML = '<clipPath id="rvZc"><circle cx="' + zx + '" cy="' + zy + '" r="' + R + '"/></clipPath>' +
    '<g clip-path="url(#rvZc)"><rect x="' + (zx - R) + '" y="' + (zy - R) + '" width="' + (R * 2) + '" height="' + (R * 2) + '" fill="#0c2419"/>' +
    '<use href="#rv-world" transform="translate(' + (zx - fx * k).toFixed(1) + ' ' + (zy - fy * k).toFixed(1) + ') scale(' + k + ')"/></g>' +
    '<circle cx="' + zx + '" cy="' + zy + '" r="' + R + '" fill="none" stroke="#ffd257" stroke-width="3"/>' +
    '<circle cx="' + fx + '" cy="' + fy + '" r="14" fill="none" stroke="#ffd257" stroke-width="1.6" stroke-dasharray="3 3"/>' +
    '<line x1="' + fx + '" y1="' + fy + '" x2="' + (zx + (fx > zx ? R : -R) * 0.7) + '" y2="' + (zy + R * 0.7) + '" stroke="#ffd257" stroke-width="1.2" stroke-dasharray="3 3"/>' +
    '<text x="' + zx + '" y="' + (zy - R - 6) + '" text-anchor="middle" font-family="Oswald,sans-serif" font-size="9" fill="#ffd257" letter-spacing="2">CLOSE-UP ×2.4</text>';
  fadeIn(g, 320);
  svg.appendChild(g);
}
function flashLine(x1, y1, x2, y2){ return '<line id="rv-flash" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#ffd257" stroke-width="3" opacity="0"/>'; }
function setLbl(t){ const l = $r("rv-lbl"); if(l) l.textContent = t; }
// 先に着いた瞬間で止める再生
function slowReplay(draw, first, second, onDone, focus){
  const flash = $r("rv-flash");
  setLbl("REPLAY ── スロー再生"); setTag("REPLAY", "#2c6bd6");
  if(focus) zoomIn(focus.x, focus.y);
  const from = first - 300;
  const gest=$r("rv-gest");if(gest)gest.remove();
  let start = 0, frozen = false, t = from, last = 0;
  const slowAt = x => 3 + 6 * ease((x - from) / (first - from));      // 接触に近づくほど遅く
  function f1(ts){
    if(!RV) return;
    if(!start){ start = ts; last = ts; }
    t += (ts - last) / slowAt(t); last = ts;
    if(!frozen && t >= first){
      frozen = true; draw(first);
      if(flash) flash.setAttribute("opacity", 1);
      setLbl(RV.c.play==="hr"?"REPLAY ── ポール通過の瞬間":"REPLAY ── 最初の接触");
      ping(700, 0.08, 0.07);
      RV.timer = rvLater(function(){ if(!RV) return; if(flash) flash.setAttribute("opacity", 0); start = 0; RV.raf = rvFrame(f2); }, 700);
      return;
    }
    draw(t); RV.raf = rvFrame(f1);
  }
  function f2(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t2 = first + (ts - start) / 7;
    draw(Math.min(t2, second));
    if(t2 < second){ RV.raf = rvFrame(f2); return; }
    onDone();
  }
  RV.raf = rvFrame(f1);
}
function realtime(draw, end, onDone){
  let start = 0;
  function f(ts){ if(!RV) return; if(!start) start = ts; const t = ts - start; draw(Math.min(t, end)); if(t < end){ RV.raf = rvFrame(f); return; } onDone(); }
  RV.timer = rvLater(function(){ RV.raf = rvFrame(f); }, 260);
}
function timing(c, a, b){ const safe = c.callOut ? c.wrong : !c.wrong; const gap = rnd1(a, b); return {safe, gap, delta: safe ? gap : -gap}; }
// 審判の宣告(舞台の中の審判)
function umpCall(id, x, y, facing, safe, isHR, sc){
  const to = isHR ? (safe ? P.point : P.foul) : (safe ? P.safe : P.outB), via = safe ? P.stand : P.outA;
  let start = 0;
  function f(ts){ if(!RV) return; if(!start) start = ts; const t = Math.min(1, (ts - start) / 600);
    const p = t < 0.5 ? lerpP(P.stand, via, ease(t * 2)) : lerpP(via, to, ease((t - 0.5) * 2));
    if(isHR&&safe){p.la+=Math.sin(t*Math.PI*4)*9;}
    setFig(id, p, x, y, sc || 1, facing, "#2b2b30", "#111");
    if(t < 1) RV.raf = rvFrame(f); }
  RV.raf = rvFrame(f);
}
function finishReplay(c, tr, textSafe, textOut, isHR, labA, labB){
  const safe = tr.safe;
  showBig(isHR ? (safe ? "HOME RUN" : "FOUL") : c.play === "catch" ? (safe ? "ワンバウンド" : "直接捕球") : (safe ? "SAFE" : "OUT"), safe);
  setLbl(safe ? textSafe : textOut); setTag("RESULT", "#31586a");
  if(labA && labB) showGap(tr, labA, labB);
  announce("リクエストにより検証した結果、判定は" + (isHR ? (safe ? "本塁打" : "ファウル") : c.play === "catch" ? (safe ? "ワンバウンド、ヒット" : "直接捕球、アウト") : (safe ? "セーフ" : "アウト")) + "とします");
  ping(safe === !c.callOut ? 330 : 990, 0.25, 0.08, "triangle");
  verdictSign(safe, isHR, function(){ RV.timer = rvLater(function(){ if(RV) rvSettle(true); }, 420); });
}

// ---- 内野の構図: 野球ゲームの定番(パワプロ/プロスピ)に合わせる ----
// plate = バックネット裏カメラ: 手前が本塁、右奥が一塁、正面奥が二塁、左奥が三塁
// cf    = センターカメラ:       手前が二塁、左奥が一塁、正面奥が本塁、右奥が三塁
// 走者はどちらの構図でも「左から右」「奥から手前」へ動くのが正しい向き
const DIAMOND = {
  plate: {home:{x:180,y:258}, first:{x:324,y:180}, second:{x:180,y:132}, third:{x:36,y:180}, mound:{x:180,y:178}},
  cf:    {second:{x:180,y:258}, first:{x:36,y:180}, home:{x:180,y:132}, third:{x:324,y:180}, mound:{x:180,y:208}},
};
function dsc(y){ return 0.5 + 0.55 * Math.max(0, Math.min(1, (y - 125) / 135)); }      // 奥行き: 手前ほど大きい
function br(y){ return 2.6 + 2.6 * Math.max(0, Math.min(1, (y - 125) / 135)); }          // 球の大きさ
function hipY(pt){ return pt.y; }                                                        // 足元(地面)の y をそのまま渡す
function figAt(id, pose, pt, facing, col, cap){ return figSvg(id, pose, pt.x, hipY(pt), dsc(pt.y), facing, col, cap); }
function moveFig(id, pose, pt, facing, col, cap, lift){ setFig(id, pose, pt.x, hipY(pt) - (lift || 0), dsc(pt.y), facing, col, cap); }
// 前の腕(la/lb)を、図の座標系の目標点へ届かせる。届かなければ精一杯伸ばす
function reachArm(pose, tx, ty, x, y, sc, facing){
  const g = figPath(pose);
  const low = figLow(g);
  const lx = (tx - x) / (sc * facing), ly = (ty - (y - low * sc)) / sc;      // 目標を図の座標へ
  const dx = lx - g.sh.x, dy = ly - g.sh.y;
  const L = FIG.ua, d = Math.max(0.5, Math.min(2 * L - 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dx, dy) * 180 / Math.PI;                            // 鉛直から時計回り
  const alpha = Math.acos(d / (2 * L)) * 180 / Math.PI;                       // 肘の張り
  return Object.assign({}, pose, {la: base + alpha, lb: -2 * alpha});
}
function lerpPt(a, b, t){ return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t}; }
// 送球: 地面の点 from→to をなぞる影と、放物線を描く球。gh=捕る高さ
function throwBall(pt, from, to, arc, gh){
  const gx = from.x + (to.x - from.x) * pt, gy = from.y + (to.y - from.y) * pt;
  ball("rv-ball", gx, gy - Math.sin(pt * Math.PI) * arc - gh * pt, br(gy), true);
  ball("rv-sh", gx, gy, 0, true);
}
function diamondSvg(cam){
  const D = DIAMOND[cam];
  const near = cam === "plate" ? D.home : D.second, far = cam === "plate" ? D.second : D.home;
  const left = cam === "plate" ? D.third : D.first, right = cam === "plate" ? D.first : D.third;
  const off = (p, k) => ({x: 180 + (p.x - 180) * k, y: 195 + (p.y - 195) * k});
  const poly = pts => pts.map(p => p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" L");
  const home = D.home;
  let s = '<rect x="0" y="120" width="360" height="180" fill="url(#rvGrass)"/>';
  s += '<rect x="0" y="120" width="360" height="5" fill="#254a6e"/>';                                   // 外野フェンス
  s += '<path d="M' + poly([near, right, far, left].map(p => off(p, 1.15))) + ' Z" fill="#8a5a34"/>';    // 内野の土
  s += '<path d="M' + poly([near, right, far, left].map(p => off(p, 0.78))) + ' Z" fill="url(#rvGrass)"/>';
  s += '<ellipse cx="' + D.mound.x + '" cy="' + D.mound.y + '" rx="' + (cam === "plate" ? 15 : 20) + '" ry="' + (cam === "plate" ? 4.5 : 6) + '" fill="#8a5a34"/>';
  // 本塁まわりの土とファウルライン(本塁から一塁・三塁の先へ)
  const hr = cam === "plate" ? [34, 10] : [14, 4];
  s += '<ellipse cx="' + home.x + '" cy="' + home.y + '" rx="' + hr[0] + '" ry="' + hr[1] + '" fill="#8a5a34"/>';
  const fl = (b) => { const dx = b.x - home.x, dy = b.y - home.y; const k = dx > 0 ? (360 - home.x) / dx : (0 - home.x) / dx; return '<line x1="' + home.x + '" y1="' + home.y + '" x2="' + (home.x + dx * k).toFixed(1) + '" y2="' + (home.y + dy * k).toFixed(1) + '" stroke="#f4f1e6" stroke-opacity=".75" stroke-width="1.6"/>'; };
  s += fl(D.first) + fl(D.third);
  // ベース(奥行きで小さく)と本塁
  const bag = (p) => { const w = Math.max(5.5, 8 * dsc(p.y)), h = w * 0.48; return '<path d="M' + (p.x - w) + ' ' + p.y + ' l' + w + ' -' + h + ' l' + w + ' ' + h + ' l-' + w + ' ' + h + ' z" fill="#f4f1e6" stroke="#333" stroke-width=".6"/>'; };
  s += bag(D.first) + bag(D.second) + bag(D.third);
  if(cam === "plate"){
    s += '<path d="M170 254 h20 v5 l-10 6 l-10 -6 z" fill="#f4f1e6" stroke="#333"/>';
    s += '<rect x="146" y="250" width="18" height="16" fill="none" stroke="#f4f1e6" stroke-opacity=".7"/><rect x="196" y="250" width="18" height="16" fill="none" stroke="#f4f1e6" stroke-opacity=".7"/>';
  }else{
    s += '<path d="M175 135 l5 -4 l5 4 v3 h-10 z" fill="#f4f1e6" stroke="#333" stroke-width=".6"/>';
  }
  return s;
}
// 画面の左下: いま見ている構図と、走者の進む向き
function camTag(cam, txt){
  return '<text x="10" y="292" font-family="Noto Sans JP,sans-serif" font-size="9" fill="#cfe0d4" letter-spacing="1.5" opacity=".8">' + esc(txt) + '</text>';
}
const SCENES = {};


// Contact coordinates, not separate visual guesses, drive the ball and the verdict.
function measuredThrow(q, from, to, arc){
  q=clampN(q,0,1);
  ball("rv-ball",from.x+(to.x-from.x)*q,from.y+(to.y-from.y)*q-Math.sin(Math.PI*q)*arc,3.2,true);
  ball("rv-sh",from.x+(to.x-from.x)*q,from.y+(to.y-from.y)*q+20,0,q<1);
}
function throwPose(t, release){
  if(t<release-330) return P.ready;
  if(t<release-110) return lerpP(P.ready,P.wind,ease((t-release+330)/220));
  if(t<release) return lerpP(P.wind,P.release,ease((t-release+110)/110));
  return lerpP(P.release,P.follow,ease((t-release)/280));
}
function runnerPose(t, arrival, slide){
  const contact=slide?P.slide:{...P.stand,lean:20,la:-45,lb:90,ra:45,rb:90,lu:32,lk:-12,ru:-38,rk:-50};
  if(t<arrival-230) return run(t/92);
  if(t<=arrival) return lerpP(run((arrival-230)/92),contact,ease((t-arrival+230)/230));
  return slide?contact:lerpP(contact,run(t/92),ease((t-arrival)/210));
}
function drawRunner(id,t,arrival,from,target,sliding,col){
  const q=Math.max(0,t/arrival), pose=runnerPose(t,arrival,sliding);
  // The leading cleat reaches the actual near edge of the base at arrival.
  const foot=q<=1?lerpPt(from,target,q):{x:target.x+(t-arrival)*(sliding?.018:.085),y:target.y-(sliding?0:(t-arrival)*.035)};
  const sc=dsc(foot.y), pos=anchorFig(pose,foot,sc,1,"toe");
  setFig(id,pose,pos.x,pos.y,sc,1,col,"#192a37");
  const el=$r(id); if(el){el.dataset.toeX=foot.x;el.dataset.toeY=foot.y;}
}
function drawTag(id,t,arrival,runnerArrival,runnerTarget,at,col){
  const received=arrival-190, sc=dsc(at.y);
  const start=figPoint(P.crouch,at.x,at.y,sc,-1,"glove");
  // A tag must touch the runner, not merely beat the runner into the glove.
  const runnerX=runnerTarget.x+(arrival-runnerArrival)*(arrival>runnerArrival?.018:(runnerTarget.x-103)/runnerArrival);
  const shin={x:runnerX-8,y:runnerTarget.y-4+(arrival<runnerArrival?(arrival-runnerArrival)*(runnerTarget.y-216)/runnerArrival:0)};
  // First outside contact of glove and shin, rather than their centers crossing.
  const dx=start.x-shin.x,dy=start.y-shin.y,d=Math.hypot(dx,dy),radius=(5.4+3.9)*sc;
  const touch={x:shin.x+dx/d*radius,y:shin.y+dy/d*radius};
  const q=ease((t-received)/190), desired=lerpPt(start,touch,q);
  let pose=lerpP(P.crouch,P.tag,q);
  pose=reachArm(pose,desired.x,desired.y,at.x,at.y,sc,-1);
  setFig(id,pose,at.x,at.y,sc,-1,col,"#192a37");
  const glove=figPoint(pose,at.x,at.y,sc,-1,"glove");
  const el=$r(id);if(el){el.dataset.gloveX=glove.x;el.dataset.gloveY=glove.y;el.dataset.tagX=touch.x;el.dataset.tagY=touch.y;el.dataset.shinX=shin.x;el.dataset.shinY=shin.y;el.dataset.contactRadius=radius;}
  return {start,glove,received};
}
// ---- 一塁のクロスプレー(バックネット裏): 打者走者が本塁から右奥の一塁へ。遊撃手の送球を一塁手が伸びて捕る ----
SCENES.first = (function(){
  const D = DIAMOND.plate, RUNT = 1550, THROW = 850;
  const FROM = {x:238, y:225}, TO = {x:320, y:180.8};                       // 走者の足元。一塁ベースの手前で止まる
  const FBP = {x:340, y:170}, SSP = {x:108, y:164}, UMP = {x:340, y:230};
  const GLOVE = {x:320, y:178};
  const runCol = c => teamCol(c.batting ? c.victim : c.opp, "#e0a600"), defCol = c => teamCol(c.batting ? c.opp : c.victim, "#4f8fe8");
  function stage(c){
    return stageOpen(300) + stands(120) + diamondSvg("plate") +
      figAt("rv-ss", P.ready, SSP, 1, defCol(c), "#222") +
      figAt("rv-pit", P.look, {x:D.mound.x, y:D.mound.y + 2}, 1, defCol(c), "#222") +
      figAt("rv-fb", P.ready, FBP, -1, defCol(c), "#222") +
      figAt("rv-ump", P.ready, UMP, -1, "#2b2b30", "#111") +
      figAt("rv-run", P.stand, FROM, 1, runCol(c), "#222") +
      shadowSvg("rv-sh") + ballSvg("rv-ball") + flashLine(D.first.x - 26, D.first.y + 6, D.first.x + 26, D.first.y + 6) + big(100, 70) + lbl() +
      camTag("plate", "バックネット裏カメラ　本塁 → 一塁") + '</svg>';
  }
  function draw(t, tr, c){
    drawRunner("rv-run",t,RUNT,FROM,TO,false,runCol(c));
    const tArr=RUNT+tr.delta, sc=dsc(D.first.y), base={x:D.first.x+2,y:D.first.y};
    const pose=lerpP(P.ready,P.stretch,ease((t-THROW+120)/540));
    const at=anchorFig(pose,base,sc,-1,"rear");
    setFig("rv-fb",pose,at.x,at.y,sc,-1,defCol(c),"#192a37");
    const final=anchorFig(P.stretch,base,sc,-1,"rear"), glove=figPoint(P.stretch,final.x,final.y,sc,-1,"glove");
    const f=$r("rv-fb");f.dataset.gloveX=glove.x;f.dataset.gloveY=glove.y;f.dataset.baseX=base.x;f.dataset.baseY=base.y;
    moveFig("rv-ss",throwPose(t,THROW),SSP,1,defCol(c),"#192a37");
    if(t<THROW){ball("rv-ball",0,0,3,false);ball("rv-sh",0,0,0,false);return;}
    const release=figPoint(P.release,SSP.x,SSP.y,dsc(SSP.y),1,"hand");
    measuredThrow((t-THROW)/(tArr-THROW),release,glove,9);
    if(t>=tArr) ball("rv-ball",glove.x,glove.y,2.4,false);
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("一塁のクロスプレー");
      realtime(t => draw(t, tr, c), Math.max(RUNT, RUNT + tr.delta) + 300, function(){ umpCall("rv-ump", UMP.x, hipY(UMP), -1, !c.callOut, false, dsc(UMP.y)); ping(440, 0.06, 0.06); RV.timer = rvLater(rvAsk, 420); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = rvLater(function(){ if(RV) rvSettle(false); }, 400); return; }
      const first = Math.min(RUNT, RUNT + tr.delta), second = Math.max(RUNT, RUNT + tr.delta) + 60;
      slowReplay(t => draw(t, tr, c), first, second, function(){ const s = (tr.gap / 1000).toFixed(2); finishReplay(c, tr, "足がベースに " + s + " 秒 早い", "捕球が " + s + " 秒 早い", false, "走者の足", "捕球"); }, {x:D.first.x - 6, y:D.first.y - 8}); },
  };
})();

// ---- 本塁のクロスプレー(バックネット裏): 三塁走者が左奥から手前の本塁へ。外野からの返球を捕手が受けてタッチ ----
SCENES.home = (function(){
  const D = DIAMOND.plate, RUNT = 1850, THROW = 900;
  const FROM = {x:103, y:216}, TO = {x:170, y:257};                        // 三塁 → 本塁の手前
  const CAT = {x:205, y:262}, UMP = {x:238, y:282}, RF = {x:316, y:152};   // 捕手は本塁の三塁側で構え、球審はその後ろ
  const GLOVE = {x:190, y:250};
  const runCol = c => teamCol(c.batting ? c.victim : c.opp, "#e0a600"), defCol = c => teamCol(c.batting ? c.opp : c.victim, "#4f8fe8");
  function stage(c){
    return stageOpen(300) + stands(120) + diamondSvg("plate") +
      figAt("rv-rf", P.look, RF, -1, defCol(c), "#222") +
      figAt("rv-pit", P.look, {x:D.mound.x, y:D.mound.y + 2}, -1, defCol(c), "#222") +
      figAt("rv-run", P.stand, FROM, 1, runCol(c), "#222") +
      figAt("rv-cat", P.crouch, CAT, -1, defCol(c), "#222") +
      figAt("rv-ump", P.ready, UMP, -1, "#2b2b30", "#111") +
      shadowSvg("rv-sh") + ballSvg("rv-ball") + flashLine(D.home.x - 32, D.home.y + 12, D.home.x + 32, D.home.y + 12) + big(180, 70) + lbl() +
      camTag("plate", "バックネット裏カメラ　三塁 → 本塁") + '</svg>';
  }
  function draw(t, tr, c){
    drawRunner("rv-run",t,RUNT,FROM,TO,true,runCol(c));
    const tag=drawTag("rv-cat",t,RUNT+tr.delta,RUNT,TO,CAT,defCol(c));
    moveFig("rv-rf",throwPose(t,THROW),RF,-1,defCol(c),"#192a37");
    if(t<THROW){ball("rv-ball",0,0,3,false);ball("rv-sh",0,0,0,false);return;}
    const release=figPoint(P.release,RF.x,RF.y,dsc(RF.y),-1,"hand");
    if(t<tag.received) measuredThrow((t-THROW)/(tag.received-THROW),release,tag.start,14);
    else {ball("rv-ball",tag.glove.x,tag.glove.y,2.3,false);ball("rv-sh",0,0,0,false);}
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("本塁のクロスプレー");
      realtime(t => draw(t, tr, c), Math.max(RUNT, RUNT + tr.delta) + 300, function(){ umpCall("rv-ump", UMP.x, hipY(UMP), -1, !c.callOut, false, dsc(UMP.y)); crowd(0.6, 0.06); RV.timer = rvLater(rvAsk, 420); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = rvLater(function(){ if(RV) rvSettle(false); }, 400); return; }
      const first = Math.min(RUNT, RUNT + tr.delta), second = Math.max(RUNT, RUNT + tr.delta) + 140;
      slowReplay(t => draw(t, tr, c), first, second, function(){ const s = (tr.gap / 1000).toFixed(2); finishReplay(c, tr, "足が本塁に " + s + " 秒 早い", "タッチが " + s + " 秒 早い", false, "走者の足", "タッチ"); }, {x:D.home.x, y:D.home.y - 10}); },
  };
})();

// ---- 二塁の盗塁(センターカメラ): 一塁走者が左奥から手前の二塁へ。奥の捕手が送球し、遊撃手がベース上でタッチ ----
SCENES.steal = (function(){
  const D = DIAMOND.cf, RUNT = 1750, THROW = 650;
  const FROM = {x:103, y:216}, TO = {x:172, y:258};
  const CAT = {x:188, y:134}, BAT = {x:160, y:134}, SS = {x:205, y:262}, UMP = {x:270, y:214}, PIT = {x:118, y:204};
  const GLOVE = {x:196, y:246};
  const runCol = c => teamCol(c.batting ? c.victim : c.opp, "#e0a600"), defCol = c => teamCol(c.batting ? c.opp : c.victim, "#4f8fe8");
  function stage(c){
    return stageOpen(300) + stands(120) + diamondSvg("cf") +
      figAt("rv-bat", P.bat, BAT, 1, runCol(c), "#222") +
      figAt("rv-cat", P.crouch, CAT, 1, defCol(c), "#222") +
      figAt("rv-pit", P.crouch, PIT, 1, defCol(c), "#222") +
      figAt("rv-ump", P.ready, UMP, -1, "#2b2b30", "#111") +
      figAt("rv-run", P.stand, FROM, 1, runCol(c), "#222") +
      figAt("rv-ss", P.ready, SS, -1, defCol(c), "#222") +
      shadowSvg("rv-sh") + ballSvg("rv-ball") + flashLine(D.second.x - 32, D.second.y + 12, D.second.x + 32, D.second.y + 12) + big(180, 70) + lbl() +
      camTag("cf", "センターカメラ　一塁 → 二塁") + '</svg>';
  }
  function draw(t, tr, c){
    drawRunner("rv-run",t,RUNT,FROM,TO,true,runCol(c));
    const tag=drawTag("rv-ss",t,RUNT+tr.delta,RUNT,TO,SS,defCol(c));
    moveFig("rv-cat",throwPose(t,THROW),CAT,1,defCol(c),"#192a37");
    if(t<THROW){ball("rv-ball",0,0,3,false);ball("rv-sh",0,0,0,false);return;}
    const release=figPoint(P.release,CAT.x,CAT.y,dsc(CAT.y),1,"hand");
    if(t<tag.received) measuredThrow((t-THROW)/(tag.received-THROW),release,tag.start,11);
    else {ball("rv-ball",tag.glove.x,tag.glove.y,2.3,false);ball("rv-sh",0,0,0,false);}
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("二塁への盗塁");
      realtime(t => draw(t, tr, c), Math.max(RUNT, RUNT + tr.delta) + 300, function(){ umpCall("rv-ump", UMP.x, hipY(UMP), -1, !c.callOut, false, dsc(UMP.y)); ping(440, 0.06, 0.06); RV.timer = rvLater(rvAsk, 420); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = rvLater(function(){ if(RV) rvSettle(false); }, 400); return; }
      const first = Math.min(RUNT, RUNT + tr.delta), second = Math.max(RUNT, RUNT + tr.delta) + 140;
      slowReplay(t => draw(t, tr, c), first, second, function(){ const s = (tr.gap / 1000).toFixed(2); finishReplay(c, tr, "足がベースに " + s + " 秒 早い", "タッチが " + s + " 秒 早い", false, "走者の足", "タッチ"); }, {x:D.second.x, y:D.second.y - 10}); },
  };
})();

// ---- 外野の捕球: 落ちてくる飛球に外野手が走って飛び込む。グラブが先か、地面が先か ----
SCENES.catch = (function(){
  const G = 264, LAND = {x:150, y:G}, FROM = {x:330, y:30}, FALL = 1200, DIVE = 520;
  function stage(c){
    return stageOpen(280) + stands(150) + ground(150, 130) +
      '<rect x="0" y="120" width="360" height="30" fill="#254a6e"/><text x="180" y="140" text-anchor="middle" font-family="Oswald" font-size="12" fill="#cfe0d4" letter-spacing="4" opacity=".6">OUTFIELD</text>' +
      figSvg("rv-ump", P.look, 272, G, 0.9, -1, "#2b2b30", "#111") +
      figSvg("rv-of", P.ready, 20, G, 1, 1, teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), "#222") +
      shadowSvg("rv-sh") + ballSvg("rv-ball") + flashLine(LAND.x - 34, G + 4, LAND.x + 34, G + 4) + big(270, 100) + lbl() + '</svg>';
  }
  function draw(t, tr, c){
    const tCatch=FALL+tr.delta, col=teamCol(c.batting?c.opp:c.victim,"#4f8fe8");
    const trajectory = tm => {
      const q=Math.min(1,tm/FALL);
      return {x:FROM.x+(LAND.x-FROM.x)*q,y:tm<=FALL?FROM.y+(G-4-FROM.y)*q*q:G-4-8*Math.sin(Math.min(1,(tm-FALL)/160)*Math.PI)};
    };
    const contact=trajectory(tCatch), q=clampN((t-DIVE)/(tCatch-DIVE),0,1), dive=ease((q-.6)/.4);
    const pose=lerpP(run(t/92),{...P.dive,headx:-20},dive);
    const targetPos=anchorFig(pose,contact,1,1,"glove");
    const at={x:20+(targetPos.x-20)*q,y:G+(targetPos.y-G)*dive};
    setFig("rv-of",pose,at.x,at.y,1,1,col,"#192a37");
    const glove=figPoint(pose,at.x,at.y,1,1,"glove"), b=t>=tCatch?glove:trajectory(t);
    ball("rv-ball",b.x,b.y,3.5,t<tCatch);
    ball("rv-sh",b.x,G+1,0,t<tCatch);
    const el=$r("rv-of");el.dataset.gloveX=glove.x;el.dataset.gloveY=glove.y;
    el.dataset.contactX=contact.x;el.dataset.contactY=contact.y;
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("外野への浅い飛球");
      realtime(t => draw(t, tr, c), Math.max(FALL, FALL + tr.delta) + 300, function(){ umpCall("rv-ump", 272, G, -1, !c.callOut, false); ping(440, 0.06, 0.06); RV.timer = rvLater(rvAsk, 420); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = rvLater(function(){ if(RV) rvSettle(false); }, 400); return; }
      const first = Math.min(FALL, FALL + tr.delta), second = Math.max(FALL, FALL + tr.delta) + 80;
      slowReplay(t => draw(t, tr, c), first, second, function(){ finishReplay(c, tr, "グラブより " + (tr.gap / 1000).toFixed(2) + " 秒 早く地面に", "地面に触れる " + (tr.gap / 1000).toFixed(2) + " 秒前に捕球", false, "地面", "グラブ"); }, {x:LAND.x, y:LAND.y - 8}); },
  };
})();

// ---- ポール際: 高い打球がポールの内か外か。外野手は壁で見上げ、審判はポールを見る ----
SCENES.hr = (function(){
  const G = 264, POLE = 262, WALL = 178, FLY = 1500;
  function stage(c){
    return stageOpen(300, "#0b1626") + stands(120) +
      '<rect x="0" y="' + WALL + '" width="360" height="' + (G - WALL) + '" fill="#1f3d2e"/><rect x="0" y="' + WALL + '" width="360" height="4" fill="#e0a600"/>' +
      ground(G, 64) +
      '<rect x="' + (POLE - 3) + '" y="40" width="6" height="' + (WALL - 40) + '" fill="#ffd257"/><rect x="' + (POLE-29) + '" y="40" width="26" height="' + (WALL - 40) + '" fill="#ffd257" opacity=".22"/>' +
      '<text x="' + (POLE + 13) + '" y="34" text-anchor="middle" font-family="Oswald" font-size="9" fill="#ffd257" letter-spacing="2">FOUL POLE</text>' +
      figSvg("rv-of", P.look, POLE - 40, G, 1, 1, teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), "#222") +
      figSvg("rv-ump", P.look, 60, G, 0.9, 1, "#2b2b30", "#111") +
      ballSvg("rv-ball") + flashLine(POLE - 40, 60, POLE + 40, 60) + big(120, 110) + lbl() + '</svg>';
  }
  // 真実: fair なら打球はポールの内側(左)を通って壁を越える。差は数十センチ = 数px
  function truthOf(c){ const fair = c.callOut ? c.wrong : !c.wrong; const px = rnd1(5, 10); return {safe:fair, gap:px, x: fair ? POLE - px : POLE + px}; }
  function draw(t, tr, c){
    const p = Math.min(1, t / FLY);
    const x = -10 + (tr.x + 10) * p, y = 240 - 500 * p + 350 * p * p;   // 高い放物線。壁の上で落ちてくる
    ball("rv-ball", x, y, 5 - p * 1.5, true);
    setFig("rv-of", lerpP(P.look, P.leap, ease(Math.max(0, (p - 0.75) / 0.25))), POLE - 40, G - (p > 0.85 ? 16 * Math.sin((p - 0.85) / 0.15 * Math.PI) : 0), 1, 1, teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), "#222");
    setFig("rv-ump", Object.assign({}, P.look, {headx: 20 + 30 * p}), 60, G, 0.9, 1, "#2b2b30", "#111");
  }
  return {
    play(c){ const tr = truthOf(c); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("ポール際の大飛球");
      realtime(t => draw(t, tr, c), FLY + 350, function(){ umpCall("rv-ump", 60, G, 1, !c.callOut, true); crowd(0.9, 0.08); RV.timer = rvLater(rvAsk, 420); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = rvLater(function(){ if(RV) rvSettle(false); }, 400); return; }
      // ポールの真上でコマ送り
      slowReplay(t => draw(t, tr, c), FLY, FLY + 90, function(){
        
        const m = document.createElementNS(NS, "g"); m.innerHTML = '<line x1="' + POLE + '" y1="90" x2="' + tr.x + '" y2="90" stroke="#ffd257" stroke-width="2"/><text x="' + ((POLE + tr.x) / 2) + '" y="62" text-anchor="middle" font-family="Oswald,Noto Sans JP,sans-serif" font-weight="700" font-size="12" fill="#ffd257" style="paint-order:stroke" stroke="#0b1626" stroke-width="4">' + (tr.safe ? 'フェア側' : 'ファウル側') + '</text>';
        $r("rv-svg").appendChild(m);
        finishReplay(c, tr, "ポールのフェア側を通過", "ポールのファウル側を通過", true);
      }, {x:POLE, y:90}); },
  };
})();

// ---- ABS: 中継のセンターカメラ(誤審集の映像に合わせる)。
//   手前の左下に投手の背中。奥の中央に捕手が正面で構え、その肩ごしに球審。打者は横(右打者は三塁側=画面の右)。
//   背景はバックネット裏の広告ボードと観客席。左上にカウント、右下に球速。
//   ゾーンの線は引かない。打者の膝〜胸の高さとベースの幅、ミットの位置で判断してもらう。
//   宣告のあとは球審が立ち上がって拳を上げ、打者が振り返る(誤審集の定番の絵)。
SCENES.abs = (function(){
  const CAT = {x:186, y:290, sc:1.55};             // 捕手の足元(奥・中央)
  const ZB = {x:171, y:219, w:30, h:33};           // ゾーン(描かない): 打者の膝〜胸 × ベースの幅
  const R = 3.65 / 43.18 * ZB.w;                                     // 奥での球の大きさ
  const CM = 43.18 / ZB.w;
  const MITT0 = {x:194, y:250};                    // 構えたミットの位置
  const PIT = {x:92, y:312, sc:1.55};               // 投手の足元(手前・左下、一塁側にずれたカメラ)
  function truthOf(c){
    // MLB 2026: midpoint of plate; width 17 inches; top 53.5%, bottom 27% of height.
    // Legacy data has no measured height: a fixed 180 cm model is used, never a random zone.
    const height=clampN(Number(c.batP.heightCm)||180,150,220), scale=ZB.w/43.18;
    const Z = {x:ZB.x, y:286-height*.535*scale, w:ZB.w, h:height*(.535-.27)*scale};
    const inside = c.callIsStrike ? !c.wrong : c.wrong;
    const pen = inside ? rnd1(.35, 1.3) : -rnd1(.35, 1.3);   // 球の縁が線を越える深さ(px)
    const off = R - pen;
    const side = c.zone.indexOf("外角") >= 0 ? "R" : c.zone.indexOf("内角") >= 0 ? "L" : c.zone.indexOf("低め") >= 0 ? "B" : "T";
    const lefty = c.lefty;
    const sideX = (side === "L") ? (lefty ? "L" : "R") : (lefty ? "R" : "L");   // 内角は打者のいる側。センターから見て右打者は右
    let px, py;
    if(side === "L" || side === "R"){ px = sideX === "L" ? Z.x - off : Z.x + Z.w + off; py = rnd1(Z.y + 12, Z.y + Z.h - 12); }
    else if(side === "T"){ py = Z.y - off; px = rnd1(Z.x + 11, Z.x + Z.w - 11); }
    else { py = Z.y + Z.h + off; px = rnd1(Z.x + 11, Z.x + Z.w - 11); }
    return {px, py, inside, pen, Z, side:(side === "L" || side === "R") ? sideX : side};
  }
  // 投手の背中(手前)。ph: 0=セット 1=足を上げる 2=腕を上げて踏み出す 3=リリース 4=フォロースルー
  // Feet, pelvis, shoulders, elbow and hand share one interpolated skeleton.
  const keys=["hx","hy","sx","sy","nx","ny","kx","ky","fx","fy","bkx","bky","bfx","bfy","ex","ey","tx","ty","gx","gy","gex","gey"];
  const PK = [
    [0,-32,0,-58,0,-72,-11,-16,-12,0,10,-16,12,0,19,-47,1,-57,-2,-57,-18,-46],
    [3,-34,3,-60,3,-74,-5,-48,-13,-27,11,-17,14,0,20,-48,2,-59,-2,-59,-17,-47],
    [8,-33,4,-60,2,-74,-6,-28,-4,-11,15,-16,18,0,29,-49,32,-28,-21,-60,-15,-48],
    [10,-33,10,-60,9,-74,-6,-25,8,-14,21,-18,27,-2,30,-65,29,-85,-22,-62,-13,-50],
    [12,-32,15,-55,14,-69,-6,-25,8,-14,24,-17,30,-4,30,-65,27,-81,-3,-46,-10,-48],
    [14,-30,23,-43,27,-55,-6,-25,8,-14,33,-28,44,-44,12,-32,-9,-34,-2,-42,1,-35],
    [12,-31,17,-48,19,-62,-6,-25,8,-14,28,-21,34,-23,7,-34,-10,-38,-3,-45,0,-36]
  ].map(a=>Object.fromEntries(keys.map((k,i)=>[k,a[i]])));
  const KT=[0,460,750,1020,1130,1410,1700];
  const RELEASE=1130;
  function lerpK(a,b,t){const o={};for(const k of keys)o[k]=a[k]+(b[k]-a[k])*t;return o;}
  function pitching(t){
    for(let i=1;i<KT.length;i++)if(t<=KT[i])return lerpK(PK[i-1],PK[i],ease((t-KT[i-1])/(KT[i]-KT[i-1])));
    return PK[PK.length-1];
  }
  function pitchOffset(k,rhp){return rhp?0:24*clampN((k.fx+12)/20,0,1);}
  function pitchHand(k,rhp){return{x:PIT.x+(pitchOffset(k,rhp)+k.tx*(rhp?1:-1))*PIT.sc,y:PIT.y+k.ty*PIT.sc};}
  function pitcherBack(id,x,y,sc,col,k,rhp){
    x+=pitchOffset(k,rhp)*sc;
    const f=rhp?1:-1, pt=(a,b)=>`${a} ${b}`, skin="#c58b65", pants="#e2e2d9";
    const line=(d,c,w)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const num=RV&&RV.c.pitP.no;
    const throwArm=`M${pt(k.sx+9,k.sy+2)} L${pt(k.ex,k.ey)} L${pt(k.tx,k.ty)}`;
    return `<g id="${id}" data-hand-x="${x+k.tx*sc*f}" data-hand-y="${y+k.ty*sc}" transform="translate(${x} ${y}) scale(${sc*f} ${sc})">
      <ellipse cx="0" cy="0" rx="25" ry="3" fill="#101710" opacity=".23"/>
      ${line(`M${k.hx+6} ${k.hy} L${k.bkx} ${k.bky} L${k.bfx} ${k.bfy}`,shade(pants,.73),9)}
      ${line(`M${k.bfx-3} ${k.bfy} h8`,"#18202a",4)}
      ${line(`M${k.hx-6} ${k.hy} L${k.kx} ${k.ky} L${k.fx} ${k.fy}`,pants,9)}
      ${line(`M${k.fx-3} ${k.fy} h8`,"#18202a",4)}
      ${line(`M${k.sx-9} ${k.sy+2} L${k.gex} ${k.gey} L${k.gx} ${k.gy}`,shade(col,.72),7)}
      <path d="M${k.hx-10} ${k.hy} L${k.sx-14} ${k.sy+1} Q${k.sx} ${k.sy-7} ${k.sx+14} ${k.sy+1} L${k.hx+10} ${k.hy} Z" fill="${col}" stroke="${shade(col,.65)}" stroke-width=".7"/>
      ${line(`M${k.hx-9} ${k.hy} h18`,"#232b2d",2)}
      <text x="${k.sx}" y="${k.sy+18}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="15" fill="#f0efe3" paint-order="stroke" stroke="#223143" stroke-width=".7" transform="translate(${k.sx} 0) scale(${f} 1) translate(${-k.sx} 0)">${esc(String(num??""))}</text>
      ${line(throwArm,skin,5.7)}${line(`M${k.sx+9} ${k.sy+2} L${k.ex} ${k.ey}`,col,8)}
      <circle cx="${k.tx}" cy="${k.ty}" r="3" fill="${skin}"/>
      <path d="M${k.gx-5} ${k.gy+3} q-4-9 3-10 l3 2 l3-2 q6 9-2 12z" fill="#8d5932" stroke="#54371f"/>
      <path d="M${k.gx-3} ${k.gy-3} l6 4 m-5-7 l4 8" stroke="#c39562" stroke-width=".7"/>
      <ellipse cx="${k.nx}" cy="${k.ny}" rx="6.5" ry="7.5" fill="${skin}"/>
      <path d="M${k.nx-7} ${k.ny+1} v-5 q7-10 14 0 v5z" fill="#192b3d"/>
      ${line(`M${k.nx-4} ${k.ny+1} h8`,"#73808a",.8)}
    </g>`;
  }
  // 正面向きの捕手: 脚を開いてしゃがみ、ミットを構える
  function catcherFront(id, x, y, sc, col, mitt){
    const s = v => (v * sc).toFixed(1);
    const P = (dx, dy) => (x + dx * sc).toFixed(1) + " " + (y + dy * sc).toFixed(1);
    const dark = shade(col, .72);
    const sh = {x: x + 9 * sc, y: y - 40 * sc};
    const dx = mitt.x - sh.x, dy = mitt.y - sh.y, d = Math.hypot(dx, dy), L = 13 * sc;
    const reach = Math.min(d, 2 * L - 0.1), ang = Math.atan2(dy, dx), bend = Math.acos(reach / (2 * L));
    const ex = sh.x + Math.cos(ang - bend) * L, ey = sh.y + Math.sin(ang - bend) * L;
    const hx = sh.x + Math.cos(ang) * reach, hy = sh.y + Math.sin(ang) * reach;
    return '<g id="' + id + '" data-mitt-x="' + hx + '" data-mitt-y="' + hy + '">' +
      '<path d="M' + P(-7, -22) + ' L' + P(-22, -14) + ' L' + P(-17, 0) + '" stroke="' + col + '" stroke-width="' + s(8) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M' + P(7, -22) + ' L' + P(22, -14) + ' L' + P(17, 0) + '" stroke="' + col + '" stroke-width="' + s(8) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M' + P(-9, -42) + ' L' + P(9, -42) + ' L' + P(7, -20) + ' L' + P(-7, -20) + ' Z" fill="' + col + '"/>' +
      '<path d="M' + P(-9, -40) + ' L' + P(-16, -28) + '" stroke="' + dark + '" stroke-width="' + s(4) + '" stroke-linecap="round"/>' +
      '<circle cx="' + (x).toFixed(1) + '" cy="' + (y - 52 * sc).toFixed(1) + '" r="' + s(7) + '" fill="#e2b48a"/>' +
      '<path d="M' + P(-7, -56) + ' a7 7 0 0 1 14 0" fill="#222"/>' +
      '<path d="M' + P(-6.5, -52) + ' l13 0 M' + P(-5, -48) + ' l10 0 M' + P(0, -58) + ' l0 12" stroke="#1a1a1a" stroke-width="' + s(1.2) + '" opacity=".85"/>' +
      '<path d="M' + P(-11,-40) + ' Q' + P(0,-45) + ' ' + P(11,-40) + ' L' + P(9,-22) + ' Q' + P(0,-18) + ' ' + P(-9,-22) + ' Z" fill="#263743" stroke="#72808a" stroke-width=".7"/>' +
      '<path d="M' + P(-8,-35) + ' L' + P(8,-35) + ' M' + P(-8,-30) + ' L' + P(8,-30) + ' M' + P(-7,-25) + ' L' + P(7,-25) + '" stroke="#657480" stroke-width="1"/>' +
      '<path d="M' + P(-22,-13) + ' L' + P(-17,-1) + ' M' + P(22,-13) + ' L' + P(17,-1) + '" stroke="#293b4a" stroke-width="' + s(6) + '" stroke-linecap="round"/>' +
      '<path d="M' + sh.x.toFixed(1) + ' ' + sh.y.toFixed(1) + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L' + hx.toFixed(1) + ' ' + hy.toFixed(1) + '" stroke="' + col + '" stroke-width="' + s(6) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="' + s(7.5) + '" fill="#8a4a1e" stroke="#4a2410" stroke-width="1.2"/>' +
      '<circle cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="' + s(4.5) + '" fill="#a65f2a"/>' +
      '</g>';
  }
  // 球審: 捕手の肩ごし(正面)。up=立ち上がり具合(0〜1)、fist=拳を上げる(0〜1)
  function umpFront(x, y, sc, up, fist){
    const P = (dx, dy) => (x + dx * sc).toFixed(1) + " " + (y + dy * sc - up * 16 * sc).toFixed(1);
    const rise = up * 16 * sc;
    return '<g id="rv-ump">' +
      '<path d="M' + P(-20, -30) + ' L' + P(-18, -58) + ' Q' + P(0, -66) + ' ' + P(18, -58) + ' L' + P(20, -30) + ' Z" fill="#2b2b30"/>' +
      (fist > 0 ? '<path d="M' + P(16, -56) + ' L' + P(24, -64 - fist * 6) + ' L' + P(20, -74 - fist * 8) + '" stroke="#2b2b30" stroke-width="' + (5 * sc).toFixed(1) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + (x + 20 * sc).toFixed(1) + '" cy="' + (y + (-74 - fist * 8) * sc - rise).toFixed(1) + '" r="' + (3.4 * sc).toFixed(1) + '" fill="#e2b48a"/>' : '') +
      '<circle cx="' + (x).toFixed(1) + '" cy="' + (y - 70 * sc - rise).toFixed(1) + '" r="' + (7.5 * sc).toFixed(1) + '" fill="#e2b48a"/>' +
      '<path d="M' + P(-7.5, -74) + ' a7.5 7.5 0 0 1 15 0" fill="#111"/>' +
      '<path d="M' + P(-7, -70) + ' l14 0 M' + P(-5.5, -66) + ' l11 0 M' + P(0, -76) + ' l0 12" stroke="#111" stroke-width="' + (1.2 * sc).toFixed(1) + '" opacity=".8"/>' +
      '</g>';
  }
  function boards(){  // バックネット裏の広告ボード(架空)
    const ads = [["#1c3d6e", "#ffffff", "LEGEND DRAFT"], ["#e8e6dc", "#c9463a", "球史"], ["#1f5b35", "#ffd257", "KUSAYAKYU NAVI"], ["#c9463a", "#ffffff", "ABS"]];
    let s = '<rect x="0" y="120" width="360" height="52" fill="#182433"/>';
    ads.forEach((a, i) => { const x = i * 90; s += '<rect x="' + (x + 3) + '" y="124" width="84" height="44" fill="' + a[0] + '"/><text x="' + (x + 45) + '" y="150" text-anchor="middle" font-family="Oswald,Noto Sans JP,sans-serif" font-weight="700" font-size="' + (a[2].length > 8 ? 9 : 14) + '" fill="' + a[1] + '" letter-spacing="1">' + a[2] + '</text>'; });
    s += '<rect x="0" y="172" width="360" height="6" fill="#3a4a5e"/>';
    return s;
  }
  function stage(c, tr){
    const lefty = c.lefty, rhp = !(c.pitP && c.pitP.th === "左");
    const bx = lefty ? 116 : 258;                    // センターから見て右打者は右(三塁側)
    const defCol = teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), batCol = teamCol(c.batting ? c.victim : c.opp, "#e0a600");
    return stageOpen(300, "#0b1626") + stands(120) + boards() +
      '<rect x="0" y="178" width="360" height="122" fill="url(#rvGrass)"/>' +
      '<ellipse cx="186" cy="280" rx="130" ry="26" fill="#8a5a34"/>' +
      '<path d="M0 300 Q120 268 240 300 Z" fill="#7a4d2a"/>' +
      '<line x1="20" y1="296" x2="134" y2="282" stroke="#f4f1e6" stroke-opacity=".5" stroke-width="1.4"/><line x1="352" y1="296" x2="238" y2="282" stroke="#f4f1e6" stroke-opacity=".5" stroke-width="1.4"/>' +
      '<path d="M171 286 l15 -7 l15 7 v5 h-30 z" fill="#f4f1e6" stroke="#333" stroke-width=".8"/>' +
      '<rect x="110" y="270" width="40" height="22" fill="none" stroke="#f4f1e6" stroke-opacity=".55" stroke-width="1.2"/><rect x="222" y="270" width="40" height="22" fill="none" stroke="#f4f1e6" stroke-opacity=".55" stroke-width="1.2"/>' +
      umpFront(CAT.x + (lefty ? -18 : 18), CAT.y - 8, 1.45, 0, 0) +
      catcherFront("rv-cat", CAT.x, CAT.y, CAT.sc, defCol, MITT0) +
      figSvg("rv-bat", P.bat, bx, 290, 1.8, lefty ? 1 : -1, batCol, "#222") +
      '<g id="rv-trail"></g>' + ballSvg("rv-ball") +
      pitcherBack("rv-pit", PIT.x, PIT.y, PIT.sc, defCol, PK[0], rhp) +
      '<g id="rv-measure" opacity="0"></g>' + big(180, 60) +
      // 左上: カウント(中継のスコア表示)
      '<g transform="translate(8 28)"><rect width="104" height="15" rx="2" fill="#06110b" opacity=".8"/><text x="6" y="11" font-family="Oswald,sans-serif" font-weight="700" font-size="9.5" fill="#6fe3a0" letter-spacing="1">B ●●●</text><text x="44" y="11" font-family="Oswald,sans-serif" font-weight="700" font-size="9.5" fill="#ffd257" letter-spacing="1">S ●●</text><text x="74" y="11" font-family="Oswald,sans-serif" font-weight="700" font-size="9.5" fill="#ff6b5b" letter-spacing="1">O ' + "●".repeat(c.outs) + "○".repeat(3 - c.outs) + '</text></g>' +
      // 右下: 球速と球種
      '<g transform="translate(246 278)"><rect width="106" height="16" rx="2" fill="#06110b" opacity=".8"/><text id="rv-cap" x="53" y="11.5" text-anchor="middle" font-family="Oswald,Noto Sans JP,sans-serif" font-weight="700" font-size="9.5" fill="#fff" letter-spacing="1">' + esc((c.kmh ? c.kmh + "km/h " : "") + (c.type || "")) + '</text></g>' +
      lbl() + '<text x="10" y="292" font-family="Noto Sans JP,sans-serif" font-size="9" fill="#cfe0d4" letter-spacing="1.5" opacity=".8">センターカメラ</text></svg>';
  }
  function play(c){
    const tr=truthOf(c); RV.truth=tr;
    $r("rv-stage").innerHTML=stage(c,tr);
    setLbl("満塁　フルカウント");
    const lefty=c.lefty,rhp=!(c.pitP&&c.pitP.th==="左");
    const defCol=teamCol(c.batting?c.opp:c.victim,"#4f8fe8");
    const rel=pitchHand(PK[4],rhp), flight=16800/(clampN(c.kmh||148,90,175)/3.6);
    const received=RELEASE+flight+25, mitt={x:tr.px,y:tr.py+2};
    const drawPit=k=>{const el=$r("rv-pit");if(el)el.outerHTML=pitcherBack("rv-pit",PIT.x,PIT.y,PIT.sc,defCol,k,rhp);};
    const drawCat=m=>{const el=$r("rv-cat");if(el)el.outerHTML=catcherFront("rv-cat",CAT.x,CAT.y,CAT.sc,defCol,m);};
    let start=0;
    function f(ts){
      if(!start)start=ts;
      const t=ts-start,k=pitching(t);drawPit(k);
      const follow=ease((t-RELEASE-110)/(flight-110));
      drawCat(lerpPt(MITT0,mitt,follow));
      const hand=pitchHand(k,rhp);
      if(t<RELEASE)ball("rv-ball",hand.x,hand.y,3.5,t>KT[2]);
      else if(t<RELEASE+flight){
        const q=(t-RELEASE)/flight;
        // Late break varies by pitch type; endpoint is exactly the plate measurement.
        const bend=/カーブ|スライダー|フォーク|チェンジ/.test(c.type)?10:3;
        const x=rel.x+(tr.px-rel.x)*q+Math.sin(Math.PI*q)*bend*(rhp?-1:1);
        const y=rel.y+(tr.py-rel.y)*q-8*Math.sin(Math.PI*q);
        ball("rv-ball",x,y,3.5+(R-3.5)*q,true);
      }else{
        const q=clampN((t-RELEASE-flight)/25,0,1);
        ball("rv-ball",tr.px,tr.py+2*q,R,t<received);
      }
      if(t<received){RV.raf=rvFrame(f);return;}
      drawCat(mitt);$r("rv-cap").textContent=(c.kmh||148)+" km/h　"+(c.type||"");
      crowd(.045,.018);ping(155,.045,.025,"triangle");
      RV.timer=rvLater(()=>{
        const u=$r("rv-ump");if(u)u.outerHTML=umpFront(CAT.x+(lefty?-18:18),CAT.y-8,1.45,c.callIsStrike?1:0,c.callIsStrike?1:0);
        setLbl(c.callIsStrike?"球審の判定：ストライク":"球審の判定：ボール");
        RV.timer=rvLater(rvAsk,380);
      },280);
    }
    $r("rv-cap").textContent="投球を見極める";
    RV.timer=rvLater(()=>{RV.raf=rvFrame(f);},450);
  }
  // ビデオボードの図: ゾーンを大きく、球を重ね、縁との差(メジャーの球場表示に倣う)
  function board(tr){
    const Z = tr.Z, scale = 2.8, ox = 180 - (Z.x + Z.w / 2) * scale, oy = 156 - (Z.y + Z.h / 2) * scale;
    const zx = Z.x * scale + ox, zy = Z.y * scale + oy, zw = Z.w * scale, zh = Z.h * scale;
    const bx = tr.px * scale + ox, by = tr.py * scale + oy, br = R * scale;
    const col = tr.inside ? "#6fe3a0" : "#ff6b5b";
    const cm = (Math.abs(tr.pen) * CM).toFixed(1);
    let mx1, my1, mx2, my2, lx, ly, anchor = "middle";
    if(tr.side === "L"){ mx1 = zx; my1 = by; mx2 = bx + br; my2 = by; lx = zx + 10; ly = by - 16; anchor = "start"; }
    else if(tr.side === "R"){ mx1 = zx + zw; my1 = by; mx2 = bx - br; my2 = by; lx = zx + zw - 10; ly = by - 16; anchor = "end"; }
    else if(tr.side === "T"){ mx1 = bx; my1 = zy; mx2 = bx; my2 = by + br; lx = bx; ly = zy + 26; }
    else { mx1 = bx; my1 = zy + zh; mx2 = bx; my2 = by - br; lx = bx; ly = zy + zh - 14; }
    const grid = [1, 2].map(k => '<line x1="' + (zx + zw * k / 3) + '" y1="' + zy + '" x2="' + (zx + zw * k / 3) + '" y2="' + (zy + zh) + '" stroke="#fff" stroke-opacity=".15"/><line x1="' + zx + '" y1="' + (zy + zh * k / 3) + '" x2="' + (zx + zw) + '" y2="' + (zy + zh * k / 3) + '" stroke="#fff" stroke-opacity=".15"/>').join("");
    return '<g id="rv-abs" opacity="0"><rect x="0" y="0" width="360" height="300" fill="#05070c" opacity=".92"/>' +
      '<text x="180" y="30" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="14" fill="#fff" letter-spacing="6">ABS CHALLENGE</text>' +
      '<text x="180" y="44" text-anchor="middle" font-family="Noto Sans JP,sans-serif" font-size="9" fill="#9fbfa8" letter-spacing="2">球場ビデオボード</text>' +
      '<rect x="' + zx + '" y="' + zy + '" width="' + zw + '" height="' + zh + '" fill="rgba(255,255,255,.04)" stroke="' + col + '" stroke-width="3"/>' + grid +
      '<circle cx="' + bx + '" cy="' + by + '" r="' + br + '" fill="url(#rvBallG)" stroke="' + col + '" stroke-width="2"/>' +
      '<line x1="' + mx1 + '" y1="' + my1 + '" x2="' + mx2 + '" y2="' + my2 + '" stroke="#ffd257" stroke-width="2"/>' +
      '<text x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '" font-family="Oswald,Noto Sans JP,sans-serif" font-weight="700" font-size="14" fill="#ffd257" style="paint-order:stroke" stroke="#05070c" stroke-width="4">' + (tr.inside ? cm + "cm かかった" : cm + "cm 外れ") + '</text>' +
      '<text id="rv-absres" x="180" y="272" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="40" fill="' + col + '" opacity="0" style="paint-order:stroke" stroke="#05070c" stroke-width="6">' + (tr.inside ? "STRIKE" : "BALL") + '</text>' +
      '<text x="180" y="290" text-anchor="middle" font-family="Noto Sans JP,sans-serif" font-size="10" fill="#cfe0d4">球の一部でもゾーンにかかればストライク</text>' +
      '<line id="rv-scan" x1="0" y1="' + zy + '" x2="360" y2="' + zy + '" stroke="#6fe3a0" stroke-width="2" opacity=".8"/></g>';
  }
  function reveal(go){
    const c = RV.c, tr = RV.truth;
    if(!go){ RV.timer = rvLater(function(){ if(RV) rvSettle(false); }, 400); return; }
    const svg = $r("rv-svg");
    const defs = svg.querySelector("defs"); defs.insertAdjacentHTML("beforeend", '<radialGradient id="rvBallG" cx="40%" cy="35%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#e8e6dc"/><stop offset="1" stop-color="#9a978a"/></radialGradient>');
    const g = document.createElementNS(NS, "g"); g.innerHTML = board(tr); svg.appendChild(g.firstChild);
    setLbl(""); setTag("ABS", "#2c6bd6");
    const panel = $r("rv-abs"), scan = $r("rv-scan"), res = $r("rv-absres");
    const Z = tr.Z, scale = 2.8, oy = 156 - (Z.y + Z.h / 2) * scale, zy = Z.y * scale + oy, zh = Z.h * scale;
    let start = 0;
    function f(ts){
      if(!RV) return;
      if(!start) start = ts;
      const t = ts - start;
      panel.setAttribute("opacity", Math.min(1, t / 300));
      const q = Math.min(1, t / 1400);
      scan.setAttribute("y1", zy + zh * q); scan.setAttribute("y2", zy + zh * q);
      if(t < 1500){ RV.raf = rvFrame(f); return; }
      scan.setAttribute("opacity", 0);
      res.setAttribute("opacity", 1);
      ping(tr.inside === c.callIsStrike ? 330 : 990, 0.25, 0.08, "triangle");
      crowd(0.8, 0.07);
      RV.timer = rvLater(function(){ if(RV) rvSettle(true); }, 800);
    }
    RV.raf = rvFrame(f);
  }
  function challengePitcher(c,done){
    const rhp=c.pitP.th!=="左",col=teamCol(c.victim,"#4f8fe8");
    const initial=PK[6],raised={...PK[6],sx:10,sy:-57,nx:10,ny:-71,ex:28,ey:-62,tx:12,ty:-78};
    let start=0;
    function f(ts){if(!start)start=ts;const t=ts-start,k=lerpK(initial,raised,ease(t/430));
      if(t>430)k.ty+=Math.sin(Math.min(1,(t-430)/450)*Math.PI*4)*1.8;
      const old=$r("rv-pit");if(old)old.outerHTML=pitcherBack("rv-pit",PIT.x,PIT.y,PIT.sc,col,k,rhp);
      if(t<950)RV.raf=rvFrame(f);else RV.timer=rvLater(done,180);
    }
    RV.raf=rvFrame(f);
  }
  return {play, reveal, challengePitcher};

})();
})();
