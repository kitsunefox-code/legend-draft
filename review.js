// リクエスト／ABSチャレンジ ── 接戦の終盤、1点がかかった場面でだけ出る。
// 判定が覆れば、その試合の得点が本当に動く(勝敗まで変わる)。
//   リクエストは日本のプロ野球の流儀: 監督がベンチを出て両手で四角を作る → 審判団が集まる →
//   場内アナウンス → リプレー → 責任審判が宣告。対象は塁のアウト/セーフ、捕球、本塁打かファウルか
//   (2018年導入。ボール/ストライクは対象外)。
//   ABSはメジャーの流儀: 打者(捕手・投手)がヘルメットを叩いてチャレンジ → ビデオボードに
//   ゾーンと球の位置 → 球の一部でもゾーンにかかればストライク(2025年導入の仕組みに倣う)。
// 人物は関節つきの人型で動かす。game.js の playDay から rvFindScene / rvStartScene が呼ばれる。
(function(){
const RV_MS = 8000;                 // 決断の持ち時間
const NS = "http://www.w3.org/2000/svg";
let RV = null;

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
  const fielders = (hasFn("lineupOf") ? lineupOf(defT) : []).filter(Boolean);
  let play = window.rvForcePlay || pick(PLAYS);
  if(!batting && play === "abs" && op < 1) play = "first";
  // 守備側が不利を受けた場面は、相手が点を取っていないと成り立たない
  if(!batting && op < 1) play = pick(["first", "steal", "catch"]);
  const runnersNeeded = {abs:3, home:1, steal:1, hr:0, first:0, catch:0}[play];
  const bases = [null, null, null];
  if(play === "abs"){ bases[0] = pick(others); bases[1] = pick(others); bases[2] = pick(others); }
  else if(play === "home"){ bases[rnd() < 0.5 ? 2 : 1] = pick(others); }
  else if(play === "steal"){ bases[0] = pick(others); }
  else { if(rnd() < 0.5) bases[Math.floor(rnd() * 3)] = pick(others); }
  const runners = bases.filter(Boolean).length;
  const inn = rnd() < 0.5 ? 9 : rnd() < 0.6 ? 8 : 7;
  const outs = play === "abs" ? (rnd() < 0.6 ? 2 : 1) : Math.floor(rnd() * 3);
  // 得点が動く幅。本塁打は走者ぶんも
  const delta = play === "hr" ? 1 + runners : 1;
  if(!batting && op < delta) return null;
  const c = {play, kind: play === "abs" ? "abs" : "req", victim:t, opp, batting, game:r, side, my, op, delta,
    inn, top: batT === r.A, outs, bases, batP, pitP, runner: bases[2] || bases[1] || bases[0] || null,
    fielder: pick(fielders.length ? fielders : lineup), wrong: rnd() < 0.5, standalone:true};
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
// 2. 人型 ── 関節つきの棒人間。腰を原点に、胴・頭・腕2本・脚2本。角度は鉛直から時計回り(度)
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
function figSvg(id, p, x, y, sc, facing, col, cap){
  const g = figPath(p);
  const stroke = col || "#e8e6dc", capc = cap || "#1b2a45";
  const lw = 5.2;
  const line = (d, c, w) => '<path d="' + d + '" stroke="' + c + '" stroke-width="' + (w || lw) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  // いちばん低い点(足・手・頭)を地面 y に着ける。開脚や座り込みで腰が自然に下がる
  const low = Math.max(g.legs[0].h.y, g.legs[1].h.y, g.arms[0].h.y, g.arms[1].h.y, g.head.y + FIG.head, 0) + 1.5;
  let props = "";
  if(p.glove){ const h = p.glove === "R" ? g.arms[1].h : g.arms[0].h; props += '<circle cx="' + h.x.toFixed(1) + '" cy="' + h.y.toFixed(1) + '" r="4.2" fill="#b5652e" stroke="#5a2e12" stroke-width="1"/>'; }
  if(typeof p.bat === "number"){ const h = g.arms[0].h; const ex = h.x + Math.sin(deg(p.bat)) * 30, ey = h.y + Math.cos(deg(p.bat)) * 30;
    props += '<line x1="' + h.x.toFixed(1) + '" y1="' + h.y.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '" stroke="#d9b070" stroke-width="3.6" stroke-linecap="round"/>'; }
  return '<g id="' + id + '" transform="translate(' + x.toFixed(1) + ' ' + (y - low * sc).toFixed(1) + ') scale(' + (sc * facing).toFixed(3) + ' ' + sc.toFixed(3) + ')">' +
    line(g.legs[1].d, shade(stroke, .72)) + line(g.arms[1].d, shade(stroke, .72), lw - 1) +
    line(g.torso, stroke, 7) +
    line(g.legs[0].d, stroke) + line(g.arms[0].d, stroke, lw - 1) + props +
    '<circle cx="' + g.head.x.toFixed(1) + '" cy="' + g.head.y.toFixed(1) + '" r="' + FIG.head + '" fill="#e2b48a"/>' +
    '<path d="M' + (g.head.x - 7.5).toFixed(1) + ' ' + (g.head.y - 1).toFixed(1) + ' a7.5 7.5 0 0 1 15 0 z" fill="' + capc + '"/>' +
    '<path d="M' + (g.head.x - 1).toFixed(1) + ' ' + (g.head.y - 1.5).toFixed(1) + ' h11" stroke="' + capc + '" stroke-width="2.4" stroke-linecap="round"/>' +
  '</g>';
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
  slide:   {lean:-42,la:110, lb:10,  ra:-120,rb:-10, lu:92,  lk:-2,  ru:55,  rk:-140},                // 足から滑る。前脚を伸ばし、後ろ脚を折る
  stretch: {lean:38, la:98,  lb:-4,  ra:-60, rb:-30, lu:55,  lk:-35, ru:-35, rk:5, glove:"L"},        // 一塁手のストレッチ
  dive:    {lean:86, la:100, lb:-6,  ra:96,  rb:-4,  lu:-72, lk:-6,  ru:-84, rk:-4, glove:"L"},       // 頭から飛び込む。腕を前へ、脚を後ろへ
  tag:     {lean:42, la:62,  lb:-18, ra:-30, rb:-70, lu:58,  lk:-60, ru:-38, rk:8, glove:"L"},        // グラブを地面へ落としてタッチ
  outA:    {lean:-4, la:20,  lb:-30, ra:165, rb:-5,  lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 拳を上げ
  outB:    {lean:10, la:20,  lb:-30, ra:80,  rb:70,  lu:14,  lk:-2,  ru:-14, rk:-2},                  // 前へ打ち下ろす(ハンマー)
  safe:    {lean:6,  la:95,  lb:0,   ra:-95, rb:0,   lu:28,  lk:-2,  ru:-28, rk:-2},                  // 両腕を横へ
  point:   {lean:4,  la:168, lb:8,   ra:-15, rb:6,   lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 人差し指を上げて回す(本塁打)
  foul:    {lean:0,  la:162, lb:0,   ra:158, rb:0,   lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 両手を上げてファウル
  helmet:  {lean:6,  la:140, lb:92,  ra:-20, rb:-40, lu:8,   lk:-2,  ru:-8,  rk:-2},                  // ヘルメットの上を叩く
  square:  {lean:2,  la:72,  lb:108, ra:78,  rb:104, lu:8,   lk:-2,  ru:-8,  rk:-2},                  // 胸の前で両手の四角(リクエスト)
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
function setFig(id, p, x, y, sc, facing, col, cap){
  const old = document.getElementById(id); if(!old) return;
  const tmp = document.createElementNS(NS, "g"); tmp.innerHTML = figSvg(id, p, x, y, sc, facing, col, cap);
  old.replaceWith(tmp.firstChild);
}
function ball(id, x, y, r, show){ const b = document.getElementById(id); if(!b) return; b.setAttribute("cx", x); b.setAttribute("cy", y); if(r) b.setAttribute("r", r); b.setAttribute("opacity", show === false ? 0 : 1); }
function ballSvg(id){ return '<circle id="' + id + '" cx="0" cy="0" r="4.5" fill="#fff" stroke="#c9463a" stroke-width="1" opacity="0"/>'; }
function shadowSvg(id){ return '<ellipse id="' + id + '" cx="0" cy="0" rx="6" ry="2.2" fill="#000" opacity="0"/>'; }
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
  const home = c.top ? (c.side === "A" ? c.opp : c.victim) : (c.side === "A" ? c.victim : c.opp);
  const away = home === c.victim ? c.opp : c.victim;
  const sc = t => t === c.victim ? c.my : c.op;
  const mgr = c.victim.slots && c.victim.slots.MGR;
  return '<div class="rv-sb"><div class="rv-sb-t' + (away === c.victim ? " me" : "") + '">' + teamEmblem(away, 18) + '<b>' + esc(away.name) + '</b><i>' + sc(away) + '</i></div>' +
    '<div class="rv-sb-mid"><small>' + c.inn + '回' + (c.top ? "表" : "裏") + '</small><span>' + c.outs + '死 ' + esc(basesLabel(c.bases)) + '</span></div>' +
    '<div class="rv-sb-t' + (home === c.victim ? " me" : "") + '">' + teamEmblem(home, 18) + '<b>' + esc(home.name) + '</b><i>' + sc(home) + '</i></div></div>' +
    '<div class="rv-stake"><span>' + esc(c.stake) + '</span>' + (mgr ? '<small>' + esc(c.victim.name) + ' 監督 ' + esc(mgr.name) + '</small>' : '') + '</div>';
}
function rvStart(c){
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
  const c = RV.c;
  $r("rv-call").innerHTML = '<small>審判の判定</small><b>' + esc(c.call) + '</b><span>' + esc(c.callSub) + '</span>';
  $r("rv-call").className = "rv-call show";
  ping(c.kind === "abs" ? 300 : 260, 0.12, 0.08, "sawtooth");
  crowd(0.5, 0.05);
  RV.phase = "ask";
  let left = RV_MS / 1000;
  $r("rv-q").innerHTML = (c.kind === "abs" ? "ヘルメットを叩いてチャレンジする？" : "監督、リクエストを出す？") + ' <i id="rv-timer">' + left + '</i>';
  $r("rv-btns").innerHTML =
    '<button type="button" class="btn rv-go" onclick="rvDecide(true)">' + (c.kind === "abs" ? "チャレンジ！" : "リクエスト！") + '</button>' +
    '<button type="button" class="btn ghost rv-no" onclick="rvDecide(false)">判定を受け入れる</button>' +
    '<div class="rv-tbar"><i style="animation-duration:' + (RV_MS / 1000) + 's"></i></div>';
  RV.tick = setInterval(function(){
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
    RV.timer = setTimeout(function(){ if(RV) SCENES[RV.c.play].reveal(false); }, 400);
    return;
  }
  // 申請の所作: 監督が四角を作る / 打者がヘルメットを叩く
  $r("rv-q").innerHTML = RV.c.kind === "abs" ? esc(RV.c.batP.name) + "がヘルメットを叩いた ── チャレンジ" : esc(RV.c.victim.name) + "の監督がベンチを出た ── リクエスト";
  gesture(RV.c, function(){
    if(!RV) return;
    $r("rv-q").innerHTML = RV.c.kind === "abs" ? "ABSのビデオボードへ……" : "審判団が集まり、リプレー検証へ……";
    if(RV.c.kind !== "abs") announce("ただいまのプレーについて、リクエストにより判定を検証します");
    RV.timer = setTimeout(function(){ if(RV) SCENES[RV.c.play].reveal(true); }, RV.c.kind === "abs" ? 700 : 1400);
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
    g.innerHTML = figSvg("rv-gfig", P.bat, 0, 0, 1, 1, col, "#222");
    svg.appendChild(g);
    const lefty = c.batP && c.batP.bh === "左", bx = lefty ? 92 : 282;
    const old = $r("rv-bat"); if(old) old.setAttribute("opacity", 0);
    let start = 0;
    function f(ts){ if(!RV) return; if(!start) start = ts; const t = Math.min(1, (ts - start) / 700);
      setFig("rv-gfig", lerpP(P.bat, P.helmet, ease(t)), bx, 290, 1.55, lefty ? 1 : -1, col, "#222");
      if(t < 1) RV.raf = requestAnimationFrame(f); else { ping(600, 0.06, 0.06); RV.timer = setTimeout(done, 500); } }
    RV.raf = requestAnimationFrame(f);
  }else{
    // 監督が画面の端から歩いてきて、両手で四角
    g.innerHTML = figSvg("rv-gfig", P.stand, 0, 0, 1, 1, col, "#111");
    svg.appendChild(g);
    const H = Number(svg.getAttribute("viewBox").split(" ")[3]);
    let start = 0;
    function f(ts){ if(!RV) return; if(!start) start = ts; const t = (ts - start);
      if(t < 900){ const p = t / 900; setFig("rv-gfig", run(t / 110, 0.6), -20 + 90 * p, H - 6, 1.05, 1, col, "#111"); }
      else { const q = Math.min(1, (t - 900) / 500); setFig("rv-gfig", lerpP(P.stand, P.square, ease(q)), 70, H - 6, 1.05, 1, col, "#111"); }
      if(t < 1500) RV.raf = requestAnimationFrame(f); else { crowd(0.8, 0.08); RV.timer = setTimeout(done, 600); } }
    RV.raf = requestAnimationFrame(f);
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
  function f(ts){ if(!RV) return; if(!start) start = ts; const t = Math.min(1, (ts - start) / 700);
    const p = t < 0.5 ? lerpP(P.stand, via, ease(t * 2)) : lerpP(via, to, ease((t - 0.5) * 2));
    setFig("rv-ump2", p, 300, H - 6, 1.1, -1, "#2b2b30", "#111");
    if(t < 1) RV.raf = requestAnimationFrame(f); else done(); }
  RV.raf = requestAnimationFrame(f);
}
// ============================================================
// 4. 結末 ── 覆れば得点が動く。得点・士気・ニュースへ
// ============================================================
function rvSettle(go){
  const c = RV.c, v = c.victim;
  const over = go && c.wrong;
  let head, body, cls;
  if(go && over){ head = "判定が覆った！"; body = c.flipText + "。+1点"; cls = "win"; }
  else if(go){ head = "判定どおり"; body = c.holdText + "。士気が少し落ちる"; cls = "lose"; }
  else if(c.wrong){ head = "……実は誤審だった"; body = "覆せた判定を見送った"; cls = "miss"; }
  else { head = "正しい判定だった"; body = "受け入れて正解"; cls = "ok"; }
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
  RV.timer = setTimeout(function(){ if(RV && RV.phase === "done") rvClose(); }, 7000);
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
function stands(y){  // 観客席の帯
  let s = '<rect x="0" y="' + (y - 46) + '" width="360" height="46" fill="#22304a"/>';
  for(let i = 0; i < 3; i++){ s += '<rect x="0" y="' + (y - 42 + i * 14) + '" width="360" height="1.5" fill="#33455f"/>'; }
  for(let i = 0; i < 40; i++){ s += '<circle cx="' + (6 + i * 9) + '" cy="' + (y - 36 + (i % 3) * 12) + '" r="3" fill="' + ["#c9463a","#e8e6dc","#e0a600","#4f8fe8","#6fe3a0"][i % 5] + '" opacity=".55"/>'; }
  return s;
}
function ground(y, h){ return '<rect x="0" y="' + y + '" width="360" height="' + h + '" fill="url(#rvGrass)"/>'; }
function dirt(x, y, w, h){ return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#8a5a34"/>'; }
function lbl(){
  return '<text id="rv-lbl" x="180" y="18" text-anchor="middle" font-family="Noto Sans JP,sans-serif" font-size="10" fill="#cfe0d4" letter-spacing="3"></text>' +
    '<g id="rv-tag"><rect x="8" y="8" width="46" height="15" rx="2" fill="#c9463a"/><circle id="rv-tagdot" cx="16" cy="15.5" r="2.6" fill="#fff"/><text id="rv-tagtx" x="22" y="19" font-family="Oswald,sans-serif" font-weight="700" font-size="10" fill="#fff" letter-spacing="1.5">LIVE</text></g>';
}
function setTag(txt, col){ const t = $r("rv-tagtx"), g = $r("rv-tag"); if(!t || !g) return; t.textContent = txt; g.firstChild.setAttribute("fill", col || "#c9463a"); g.firstChild.setAttribute("width", 14 + txt.length * 7); }
function big(x, y){
  y = 96;   // タイムラインの帯(24〜48)の下に置く
  return '<g id="rv-bigg" opacity="0"><rect x="0" y="' + (y - 44) + '" width="360" height="56" fill="#06110b" opacity=".72"/>' +
    '<text id="rv-big" x="180" y="' + y + '" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="44" fill="#fff" letter-spacing="6" style="paint-order:stroke" stroke="#0b1f16" stroke-width="6"></text></g>';
}
function showBig(txt, ok){ const b = $r("rv-big"), g = $r("rv-bigg"); if(!b || !g) return; b.textContent = txt; b.setAttribute("fill", ok ? "#6fe3a0" : "#ff6b5b"); g.setAttribute("opacity", 1); }
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
  svg.appendChild(g);
}
function flashLine(x1, y1, x2, y2){ return '<line id="rv-flash" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#ffd257" stroke-width="3" opacity="0"/>'; }
function setLbl(t){ const l = $r("rv-lbl"); if(l) l.textContent = t; }
// 先に着いた瞬間で止める再生
function slowReplay(draw, first, second, onDone, focus){
  const flash = $r("rv-flash");
  setLbl("REPLAY ── スロー再生"); setTag("REPLAY", "#2c6bd6");
  if(focus) zoomIn(focus.x, focus.y);
  const from = first - 320, SLOW = 6;
  let start = 0, frozen = false;
  function f1(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = from + (ts - start) / SLOW;
    if(!frozen && t >= first){
      frozen = true; draw(first);
      if(flash) flash.setAttribute("opacity", 1);
      setLbl("REPLAY ── 先に着いた瞬間");
      ping(700, 0.08, 0.07);
      RV.timer = setTimeout(function(){ if(!RV) return; if(flash) flash.setAttribute("opacity", 0); start = 0; RV.raf = requestAnimationFrame(f2); }, 1000);
      return;
    }
    draw(t); RV.raf = requestAnimationFrame(f1);
  }
  function f2(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = first + (ts - start) / SLOW;
    draw(Math.min(t, second));
    if(t < second){ RV.raf = requestAnimationFrame(f2); return; }
    onDone();
  }
  RV.raf = requestAnimationFrame(f1);
}
function realtime(draw, end, onDone){
  let start = 0;
  function f(ts){ if(!RV) return; if(!start) start = ts; const t = ts - start; draw(Math.min(t, end)); if(t < end){ RV.raf = requestAnimationFrame(f); return; } onDone(); }
  RV.timer = setTimeout(function(){ RV.raf = requestAnimationFrame(f); }, 650);
}
function timing(c, a, b){ const safe = c.callOut ? c.wrong : !c.wrong; const gap = rnd1(a, b); return {safe, gap, delta: safe ? gap : -gap}; }
// 審判の宣告(舞台の中の審判)
function umpCall(id, x, y, facing, safe, isHR, sc){
  const to = isHR ? (safe ? P.point : P.foul) : (safe ? P.safe : P.outB), via = safe ? P.stand : P.outA;
  let start = 0;
  function f(ts){ if(!RV) return; if(!start) start = ts; const t = Math.min(1, (ts - start) / 600);
    const p = t < 0.5 ? lerpP(P.stand, via, ease(t * 2)) : lerpP(via, to, ease((t - 0.5) * 2));
    setFig(id, p, x, y, sc || 1, facing, "#2b2b30", "#111");
    if(t < 1) RV.raf = requestAnimationFrame(f); }
  RV.raf = requestAnimationFrame(f);
}
function finishReplay(c, tr, textSafe, textOut, isHR, labA, labB){
  const safe = tr.safe;
  showBig(isHR ? (safe ? "HOME RUN" : "FOUL") : (safe ? "SAFE" : "OUT"), safe === !c.callOut);
  setLbl(safe ? textSafe : textOut); setTag("RESULT", safe === !c.callOut ? "#1f8f5a" : "#8a2c22");
  if(labA && labB) showGap(tr, labA, labB);
  announce("リクエストにより検証した結果、判定は" + (isHR ? (safe ? "本塁打" : "ファウル") : (safe ? "セーフ" : "アウト")) + "とします");
  ping(safe === !c.callOut ? 330 : 990, 0.25, 0.08, "triangle");
  verdictSign(safe, isHR, function(){ RV.timer = setTimeout(function(){ if(RV) rvSettle(true); }, 700); });
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
  const low = Math.max(g.legs[0].h.y, g.legs[1].h.y, g.arms[0].h.y, g.arms[1].h.y, g.head.y + FIG.head, 0) + 1.5;
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

// ---- 一塁のクロスプレー(バックネット裏): 打者走者が本塁から右奥の一塁へ。遊撃手の送球を一塁手が伸びて捕る ----
SCENES.first = (function(){
  const D = DIAMOND.plate, RUNT = 1250, THROW = 420;
  const FROM = {x:176, y:254}, TO = {x:304, y:196};                       // 走者の足元。一塁ベースの手前で止まる
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
    const pr = Math.min(1, t / RUNT);
    const pt = lerpPt(FROM, TO, Math.pow(pr, 0.92));
    moveFig("rv-run", pr < 1 ? run(t / 95) : lerpP(run(t / 95), P.stand, Math.min(1, (t - RUNT) / 250)), pt, 1, runCol(c), "#222");
    const tArr = RUNT + tr.delta;
    if(t >= THROW - 260){ const q = Math.min(1, (t - THROW + 260) / 260); moveFig("rv-ss", q < 0.6 ? lerpP(P.ready, P.wind, ease(q / 0.6)) : lerpP(P.wind, P.release, ease((q - 0.6) / 0.4)), SSP, 1, defCol(c), "#222"); }
    if(t >= THROW){
      const p = Math.min(1, (t - THROW) / (tArr - THROW));
      throwBall(p, {x:SSP.x + 8, y:SSP.y}, GLOVE, 30, 22);
      moveFig("rv-fb", lerpP(P.ready, P.stretch, ease(Math.min(1, p * 1.6))), {x: FBP.x - 10 * Math.min(1, p * 1.6), y: FBP.y + 2}, -1, defCol(c), "#222");
      if(p >= 1) ball("rv-ball", GLOVE.x - 6, GLOVE.y - 22, br(GLOVE.y), true);
    }
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("一塁のクロスプレー");
      realtime(t => draw(t, tr, c), Math.max(RUNT, RUNT + tr.delta) + 300, function(){ umpCall("rv-ump", UMP.x, hipY(UMP), -1, !c.callOut, false, dsc(UMP.y)); ping(440, 0.06, 0.06); RV.timer = setTimeout(rvAsk, 700); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 400); return; }
      const first = Math.min(RUNT, RUNT + tr.delta), second = Math.max(RUNT, RUNT + tr.delta) + 60;
      slowReplay(t => draw(t, tr, c), first, second, function(){ const s = (tr.gap / 1000).toFixed(2); finishReplay(c, tr, "足がベースに " + s + " 秒 早い", "捕球が " + s + " 秒 早い", false, "走者の足", "捕球"); }, {x:D.first.x - 6, y:D.first.y - 8}); },
  };
})();

// ---- 本塁のクロスプレー(バックネット裏): 三塁走者が左奥から手前の本塁へ。外野からの返球を捕手が受けてタッチ ----
SCENES.home = (function(){
  const D = DIAMOND.plate, RUNT = 1300, THROW = 330;
  const FROM = {x:44, y:182}, TO = {x:166, y:256};                        // 三塁 → 本塁の手前
  const CAT = {x:200, y:252}, UMP = {x:238, y:282}, RF = {x:316, y:152};   // 捕手は本塁の三塁側で構え、球審はその後ろ
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
    const pr = Math.min(1, t / RUNT);
    const pt = lerpPt(FROM, TO, Math.pow(pr, 0.9));
    const pose = pr < 0.72 ? run(t / 95) : lerpP(run(t / 95), P.slide, ease((pr - 0.72) / 0.28));
    moveFig("rv-run", pose, pt, 1, runCol(c), "#222");
    const tArr = RUNT + tr.delta;
    if(t >= THROW - 320){ const q = Math.min(1, (t - THROW + 320) / 320); moveFig("rv-rf", q < 0.5 ? lerpP(P.look, P.wind, ease(q / 0.5)) : lerpP(P.wind, P.release, ease((q - 0.5) / 0.5)), RF, -1, defCol(c), "#222"); }
    if(t >= THROW){
      const p = Math.min(1, (t - THROW) / (tArr - THROW));
      throwBall(p, {x:RF.x - 6, y:RF.y}, GLOVE, 44, 18);
      moveFig("rv-cat", p < 1 ? P.crouch : lerpP(P.crouch, P.tag, ease(Math.min(1, (t - tArr) / 140))), CAT, -1, defCol(c), "#222");
      if(p >= 1) ball("rv-ball", GLOVE.x - 14, GLOVE.y - 8, br(GLOVE.y), true);
    }
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("本塁のクロスプレー");
      realtime(t => draw(t, tr, c), Math.max(RUNT, RUNT + tr.delta) + 300, function(){ umpCall("rv-ump", UMP.x, hipY(UMP), -1, !c.callOut, false, dsc(UMP.y)); crowd(0.6, 0.06); RV.timer = setTimeout(rvAsk, 700); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 400); return; }
      const first = Math.min(RUNT, RUNT + tr.delta), second = Math.max(RUNT, RUNT + tr.delta) + 140;
      slowReplay(t => draw(t, tr, c), first, second, function(){ const s = (tr.gap / 1000).toFixed(2); finishReplay(c, tr, "足が本塁に " + s + " 秒 早い", "タッチが " + s + " 秒 早い", false, "走者の足", "タッチ"); }, {x:D.home.x, y:D.home.y - 10}); },
  };
})();

// ---- 二塁の盗塁(センターカメラ): 一塁走者が左奥から手前の二塁へ。奥の捕手が送球し、遊撃手がベース上でタッチ ----
SCENES.steal = (function(){
  const D = DIAMOND.cf, RUNT = 1200, THROW = 240;
  const FROM = {x:46, y:182}, TO = {x:166, y:256};
  const CAT = {x:188, y:134}, BAT = {x:160, y:134}, SS = {x:208, y:250}, UMP = {x:270, y:214}, PIT = {x:118, y:204};
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
    const pr = Math.min(1, t / RUNT);
    const pt = lerpPt(FROM, TO, Math.pow(pr, 0.9));
    const pose = pr < 0.7 ? run(t / 95) : lerpP(run(t / 95), P.slide, ease((pr - 0.7) / 0.3));
    moveFig("rv-run", pose, pt, 1, runCol(c), "#222");
    const tArr = RUNT + tr.delta;
    if(t >= THROW - 200){ const q = Math.min(1, (t - THROW + 200) / 200); moveFig("rv-cat", q < 0.5 ? lerpP(P.crouch, P.wind, ease(q / 0.5)) : lerpP(P.wind, P.release, ease((q - 0.5) / 0.5)), CAT, 1, defCol(c), "#222"); }
    if(t >= THROW){
      const p = Math.min(1, (t - THROW) / (tArr - THROW));
      throwBall(p, {x:CAT.x + 4, y:CAT.y}, GLOVE, 16, 20);
      moveFig("rv-ss", p < 1 ? lerpP(P.ready, P.stretch, p * 0.5) : lerpP(P.stretch, P.tag, ease(Math.min(1, (t - tArr) / 140))), {x: SS.x - 6 * p, y: SS.y}, -1, defCol(c), "#222");
      if(p >= 1) ball("rv-ball", GLOVE.x - 8, GLOVE.y - 8, br(GLOVE.y), true);
    }
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("二塁への盗塁");
      realtime(t => draw(t, tr, c), Math.max(RUNT, RUNT + tr.delta) + 300, function(){ umpCall("rv-ump", UMP.x, hipY(UMP), -1, !c.callOut, false, dsc(UMP.y)); ping(440, 0.06, 0.06); RV.timer = setTimeout(rvAsk, 700); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 400); return; }
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
    const pb = Math.min(1, t / FALL);
    const bx = FROM.x + (LAND.x - FROM.x) * pb, by = FROM.y + (LAND.y - 6 - FROM.y) * (pb * pb);
    const tArr = FALL + tr.delta;
    const pg = t < DIVE ? 0 : Math.min(1, (t - DIVE) / (tArr - DIVE));
    const fx = 20 + (LAND.x - 42 - 20) * pg;
    const pose = pg < 0.7 ? run(t / 90) : lerpP(run(t / 90), P.dive, ease((pg - 0.7) / 0.3));
    setFig("rv-of", pose, fx, G - (pg > 0.7 ? 9 * (pg - 0.7) / 0.3 : 0), 1, 1, teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), "#222");
    if(!tr.safe && pg >= 1) ball("rv-ball", LAND.x + 4, G - 5, 4.5, true);
    else ball("rv-ball", bx, Math.min(LAND.y - 4, by), 4.5, true);
    ball("rv-sh", bx, G + 3, 0, true);
  }
  return {
    play(c){ const tr = timing(c, 25, 75); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("外野への浅い飛球");
      realtime(t => draw(t, tr, c), Math.max(FALL, FALL + tr.delta) + 300, function(){ umpCall("rv-ump", 272, G, -1, !c.callOut, false); ping(440, 0.06, 0.06); RV.timer = setTimeout(rvAsk, 700); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 400); return; }
      const first = Math.min(FALL, FALL + tr.delta), second = Math.max(FALL, FALL + tr.delta) + 80;
      slowReplay(t => draw(t, tr, c), first, second, function(){ finishReplay(c, tr, "グラブより " + (tr.gap / 1000).toFixed(2) + " 秒 早く地面に", "地面まで " + Math.round(tr.gap * 0.09) + "cm で捕球", false, "地面", "グラブ"); }, {x:LAND.x, y:LAND.y - 8}); },
  };
})();

// ---- ポール際: 高い打球がポールの内か外か。外野手は壁で見上げ、審判はポールを見る ----
SCENES.hr = (function(){
  const G = 264, POLE = 262, WALL = 178, FLY = 1500;
  function stage(c){
    return stageOpen(300, "#0b1626") + stands(120) +
      '<rect x="0" y="' + WALL + '" width="360" height="' + (G - WALL) + '" fill="#1f3d2e"/><rect x="0" y="' + WALL + '" width="360" height="4" fill="#e0a600"/>' +
      ground(G, 64) +
      '<rect x="' + (POLE - 3) + '" y="40" width="6" height="' + (WALL - 40) + '" fill="#ffd257"/><rect x="' + POLE + '" y="40" width="26" height="' + (WALL - 40) + '" fill="#ffd257" opacity=".22"/>' +
      '<text x="' + (POLE + 13) + '" y="34" text-anchor="middle" font-family="Oswald" font-size="9" fill="#ffd257" letter-spacing="2">FOUL POLE</text>' +
      figSvg("rv-of", P.look, POLE - 40, G, 1, 1, teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), "#222") +
      figSvg("rv-ump", P.look, 60, G, 0.9, 1, "#2b2b30", "#111") +
      ballSvg("rv-ball") + flashLine(POLE - 40, 60, POLE + 40, 60) + big(120, 110) + lbl() + '</svg>';
  }
  // 真実: fair なら打球はポールの内側(左)を通って壁を越える。差は数十センチ = 数px
  function truthOf(c){ const fair = c.callOut ? c.wrong : !c.wrong; const px = rnd1(4, 14); return {safe:fair, gap:px, x: fair ? POLE - px : POLE + px}; }
  function draw(t, tr, c){
    const p = Math.min(1, t / FLY);
    const x = -10 + (tr.x + 10) * p, y = 250 - 330 * p + 260 * p * p;   // 高い放物線。壁の上で落ちてくる
    ball("rv-ball", x, y, 5 - p * 1.5, true);
    setFig("rv-of", lerpP(P.look, P.leap, ease(Math.max(0, (p - 0.75) / 0.25))), POLE - 40, G - (p > 0.85 ? 16 * Math.sin((p - 0.85) / 0.15 * Math.PI) : 0), 1, 1, teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), "#222");
    setFig("rv-ump", Object.assign({}, P.look, {headx: 20 + 30 * p}), 60, G, 0.9, 1, "#2b2b30", "#111");
  }
  return {
    play(c){ const tr = truthOf(c); RV.truth = tr; $r("rv-stage").innerHTML = stage(c); setLbl("ポール際の大飛球");
      realtime(t => draw(t, tr, c), FLY + 350, function(){ umpCall("rv-ump", 60, G, 1, !c.callOut, true); crowd(0.9, 0.08); RV.timer = setTimeout(rvAsk, 700); }); },
    reveal(go){ const tr = RV.truth, c = RV.c;
      if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 400); return; }
      // ポールの真上でコマ送り
      slowReplay(t => draw(t, tr, c), FLY * 0.86, FLY, function(){
        const cm = Math.round(tr.gap * 6);
        const m = document.createElementNS(NS, "g"); m.innerHTML = '<line x1="' + POLE + '" y1="70" x2="' + tr.x + '" y2="70" stroke="#ffd257" stroke-width="2"/><text x="' + ((POLE + tr.x) / 2) + '" y="62" text-anchor="middle" font-family="Oswald,Noto Sans JP,sans-serif" font-weight="700" font-size="12" fill="#ffd257" style="paint-order:stroke" stroke="#0b1626" stroke-width="4">' + cm + 'cm</text>';
        $r("rv-svg").appendChild(m);
        finishReplay(c, tr, "ポールの内側 " + cm + "cm を通過", "ポールの外側 " + cm + "cm", true);
      }, {x:POLE, y:76}); },
  };
})();

// ---- ABS: 中継のセンターカメラ(誤審集の映像に合わせる)。
//   手前の左下に投手の背中。奥の中央に捕手が正面で構え、その肩ごしに球審。打者は横(右打者は三塁側=画面の右)。
//   背景はバックネット裏の広告ボードと観客席。左上にカウント、右下に球速。
//   ゾーンの線は引かない。打者の膝〜胸の高さとベースの幅、ミットの位置で判断してもらう。
//   宣告のあとは球審が立ち上がって拳を上げ、打者が振り返る(誤審集の定番の絵)。
SCENES.abs = (function(){
  const CAT = {x:186, y:290, sc:1.55};             // 捕手の足元(奥・中央)
  const ZB = {x:166, y:222, w:40, h:48};           // ゾーン(描かない): 打者の膝〜胸 × ベースの幅
  const R = 5;                                     // 奥での球の大きさ
  const CM = 43.2 / ZB.w;
  const MITT0 = {x:194, y:250};                    // 構えたミットの位置
  const PIT = {x:92, y:312, sc:1.55};               // 投手の足元(手前・左下、一塁側にずれたカメラ)
  function truthOf(c){
    const h = Math.round(ZB.h * (0.92 + rnd() * 0.16));
    const Z = {x:ZB.x, y:ZB.y + Math.round((ZB.h - h) / 2), w:ZB.w, h};
    const inside = c.callIsStrike ? !c.wrong : c.wrong;
    const pen = inside ? rnd1(1.0, 5.0) : -rnd1(1.0, 5.0);   // 球の縁が線を越える深さ(px)
    const off = R - pen;
    const side = c.zone.indexOf("外角") >= 0 ? "R" : c.zone.indexOf("内角") >= 0 ? "L" : c.zone.indexOf("低め") >= 0 ? "B" : "T";
    const lefty = c.batP && c.batP.bh === "左";
    const sideX = (side === "L") ? (lefty ? "L" : "R") : (lefty ? "R" : "L");   // 内角は打者のいる側。センターから見て右打者は右
    let px, py;
    if(side === "L" || side === "R"){ px = sideX === "L" ? Z.x - off : Z.x + Z.w + off; py = rnd1(Z.y + 12, Z.y + Z.h - 12); }
    else if(side === "T"){ py = Z.y - off; px = rnd1(Z.x + 11, Z.x + Z.w - 11); }
    else { py = Z.y + Z.h + off; px = rnd1(Z.x + 11, Z.x + Z.w - 11); }
    return {px, py, inside, pen, Z, side:(side === "L" || side === "R") ? sideX : side};
  }
  // 投手の背中(手前)。ph: 0=セット 1=足を上げる 2=腕を上げて踏み出す 3=リリース 4=フォロースルー
  const PK = [
    {lift:0,  stride:0,  arm:0,   bend:0,  glove:0},
    {lift:1,  stride:0,  arm:0.2, bend:-0.1, glove:0.2},
    {lift:0.3,stride:0.7,arm:0.8, bend:0.1, glove:0.6},
    {lift:0,  stride:1,  arm:1,   bend:0.5, glove:1},
    {lift:0,  stride:1,  arm:0.4, bend:1,   glove:1},
  ];
  function lerpK(a, b, t){ const o = {}; for(const k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; }
  function pitcherBack(id, x, y, sc, col, k, rhp){
    const s = v => (v * sc).toFixed(1);
    const f = rhp ? 1 : -1;                                   // 右投手は投げる腕が画面の右
    const P = (dx, dy) => (x + dx * f * sc).toFixed(1) + " " + (y + dy * sc).toFixed(1);
    const dark = shade(col, .8);
    const hipY = -30 + k.bend * 6, shY = -58 + k.bend * 14, headY = -70 + k.bend * 20;
    const kick = k.lift;                                      // 上げる脚(グラブ側=画面の左)
    const leadFoot = {x: -10 - k.stride * 14, y: 0};          // 踏み出した足(前へ=画面では少し上へ)
    return '<g id="' + id + '">' +
      // 軸足
      '<path d="M' + P(8, hipY) + ' L' + P(9, -14) + ' L' + P(10 + k.bend * 10, 0 - k.bend * 12) + '" stroke="' + col + '" stroke-width="' + s(6) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      // 上げる脚 / 踏み出す脚
      '<path d="M' + P(-8, hipY) + ' L' + P(-14 - kick * 4, hipY + 12 - kick * 22) + ' L' + P(leadFoot.x - kick * 2, kick > 0.3 ? hipY + 18 - kick * 12 : -6 - k.stride * 8) + '" stroke="' + dark + '" stroke-width="' + s(6) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      // 胴(背中)と背番号
      '<path d="M' + P(-13, shY) + ' L' + P(13, shY) + ' L' + P(10, hipY) + ' L' + P(-10, hipY) + ' Z" fill="' + col + '"/>' +
      '<rect x="' + (x - 6 * sc).toFixed(1) + '" y="' + (y + (shY + 6) * sc).toFixed(1) + '" width="' + s(12) + '" height="' + s(9) + '" fill="#fff" opacity=".85"/>' +
      // グラブの腕(画面の左)
      '<path d="M' + P(-12, shY + 3) + ' L' + P(-20 + k.glove * 4, shY + 14 - k.glove * 26) + ' L' + P(-14 + k.glove * 6, shY + 2 - k.glove * 14) + '" stroke="' + dark + '" stroke-width="' + s(4.6) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + (x + (-14 + k.glove * 6) * f * sc).toFixed(1) + '" cy="' + (y + (shY + 2 - k.glove * 14) * sc).toFixed(1) + '" r="' + s(5) + '" fill="#8a4a1e" stroke="#4a2410"/>' +
      // 頭と帽子
      '<circle cx="' + (x).toFixed(1) + '" cy="' + (y + headY * sc).toFixed(1) + '" r="' + s(7.5) + '" fill="#e2b48a"/>' +
      '<path d="M' + P(-8, headY - 1) + ' a8 8 0 0 1 16 0 z" fill="#1b2a45"/>' +
      // 投げる腕(画面の右): 上げて→前へ振る
      '<path d="M' + P(12, shY + 3) + ' L' + P(20 + k.arm * 2, shY + 10 - k.arm * 28) + ' L' + P(16 + k.arm * 4 - k.bend * 30, shY - 2 - k.arm * 34 + k.bend * 52) + '" stroke="' + col + '" stroke-width="' + s(4.6) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</g>';
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
    return '<g id="' + id + '">' +
      '<path d="M' + P(-7, -22) + ' L' + P(-22, -14) + ' L' + P(-17, 0) + '" stroke="' + col + '" stroke-width="' + s(5.2) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M' + P(7, -22) + ' L' + P(22, -14) + ' L' + P(17, 0) + '" stroke="' + col + '" stroke-width="' + s(5.2) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M' + P(-9, -42) + ' L' + P(9, -42) + ' L' + P(7, -20) + ' L' + P(-7, -20) + ' Z" fill="' + col + '"/>' +
      '<path d="M' + P(-9, -40) + ' L' + P(-16, -28) + '" stroke="' + dark + '" stroke-width="' + s(4) + '" stroke-linecap="round"/>' +
      '<circle cx="' + (x).toFixed(1) + '" cy="' + (y - 52 * sc).toFixed(1) + '" r="' + s(7) + '" fill="#e2b48a"/>' +
      '<path d="M' + P(-7, -56) + ' a7 7 0 0 1 14 0" fill="#222"/>' +
      '<path d="M' + P(-6.5, -52) + ' l13 0 M' + P(-5, -48) + ' l10 0 M' + P(0, -58) + ' l0 12" stroke="#1a1a1a" stroke-width="' + s(1.2) + '" opacity=".85"/>' +
      '<path d="M' + sh.x.toFixed(1) + ' ' + sh.y.toFixed(1) + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L' + hx.toFixed(1) + ' ' + hy.toFixed(1) + '" stroke="' + col + '" stroke-width="' + s(4.4) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
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
    const lefty = c.batP && c.batP.bh === "左", rhp = !(c.pitP && c.pitP.th === "左");
    const bx = lefty ? 92 : 282;                    // センターから見て右打者は右(三塁側)
    const defCol = teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), batCol = teamCol(c.batting ? c.victim : c.opp, "#e0a600");
    return stageOpen(300, "#0b1626") + stands(120) + boards() +
      '<rect x="0" y="178" width="360" height="122" fill="url(#rvGrass)"/>' +
      '<ellipse cx="186" cy="280" rx="130" ry="26" fill="#8a5a34"/>' +
      '<path d="M0 300 Q120 268 240 300 Z" fill="#7a4d2a"/>' +
      '<line x1="20" y1="296" x2="134" y2="282" stroke="#f4f1e6" stroke-opacity=".5" stroke-width="1.4"/><line x1="352" y1="296" x2="238" y2="282" stroke="#f4f1e6" stroke-opacity=".5" stroke-width="1.4"/>' +
      '<path d="M166 286 l20 -9 l20 9 v5 h-40 z" fill="#f4f1e6" stroke="#333" stroke-width=".8"/>' +
      '<rect x="110" y="270" width="40" height="22" fill="none" stroke="#f4f1e6" stroke-opacity=".55" stroke-width="1.2"/><rect x="222" y="270" width="40" height="22" fill="none" stroke="#f4f1e6" stroke-opacity=".55" stroke-width="1.2"/>' +
      umpFront(CAT.x + (lefty ? -18 : 18), CAT.y - 8, 1.45, 0, 0) +
      catcherFront("rv-cat", CAT.x, CAT.y, CAT.sc, defCol, MITT0) +
      figSvg("rv-bat", P.bat, bx, 290, 1.55, lefty ? 1 : -1, batCol, "#222") +
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
    const tr = truthOf(c); RV.truth = tr;
    $r("rv-stage").innerHTML = stage(c, tr);
    setLbl("満塁 フルカウント　" + c.zone);
    const lefty = c.batP && c.batP.bh === "左", rhp = !(c.pitP && c.pitP.th === "左");
    const defCol = teamCol(c.batting ? c.opp : c.victim, "#4f8fe8"), batCol = teamCol(c.batting ? c.victim : c.opp, "#e0a600");
    const trail = $r("rv-trail");
    const rel = {x: PIT.x + (rhp ? 34 : -34), y: 206};      // リリース(投手の腕の先)
    const drawPit = k => { const o = $r("rv-pit"); if(o) o.outerHTML = pitcherBack("rv-pit", PIT.x, PIT.y, PIT.sc, defCol, k, rhp); };
    const drawCat = m => { const o = $r("rv-cat"); if(o) o.outerHTML = catcherFront("rv-cat", CAT.x, CAT.y, CAT.sc, defCol, m); };
    const drawUmp = (up, fist) => { const o = $r("rv-ump"); if(o) o.outerHTML = umpFront(CAT.x + (lefty ? -18 : 18), CAT.y - 8, 1.45, up, fist); };
    let start = 0, lastGhost = 0;
    function f(ts){
      if(!RV) return;
      if(!start) start = ts;
      const t = ts - start;
      // 0-1000: 投球動作(セット→足上げ→踏み出し→リリース)。1000-1550: 球の飛行。捕手は的を示す
      if(t < 1000){
        const q = t / 1000;
        const k = q < 0.35 ? lerpK(PK[0], PK[1], ease(q / 0.35)) : q < 0.75 ? lerpK(PK[1], PK[2], ease((q - 0.35) / 0.4)) : lerpK(PK[2], PK[3], ease((q - 0.75) / 0.25));
        drawPit(k);
        const m = {x: MITT0.x + (tr.px - MITT0.x) * q * 0.5, y: MITT0.y + (tr.py - MITT0.y) * q * 0.5}; drawCat(m);
      }else{
        const p = Math.min(1, (t - 1000) / 550);
        drawPit(lerpK(PK[3], PK[4], Math.min(1, p * 1.6)));
        const x = rel.x + (tr.px - rel.x) * p, y = rel.y + (tr.py - rel.y) * p - Math.sin(p * Math.PI) * 14;
        const r = 7 - (7 - R) * p;
        const m = {x: MITT0.x + (tr.px - MITT0.x) * Math.min(1, 0.5 + p * 0.5), y: MITT0.y + (tr.py - MITT0.y) * Math.min(1, 0.5 + p * 0.5)}; drawCat(m);
        ball("rv-ball", x, y, r, true);
        if(ts - lastGhost > 40 && p < 1){ lastGhost = ts; const g = document.createElementNS(NS, "circle"); g.setAttribute("cx", x); g.setAttribute("cy", y); g.setAttribute("r", r * 0.8); g.setAttribute("fill", "#fff"); g.setAttribute("fill-opacity", ".12"); trail.appendChild(g); }
      }
      if(t < 1550){ RV.raf = requestAnimationFrame(f); return; }
      ping(520, 0.05, 0.06);
      RV.timer = setTimeout(function(){
        if(!RV) return;
        trail.style.transition = "opacity .4s"; trail.setAttribute("opacity", 0);
        // 宣告: ストライクなら球審が立ち上がって拳を上げ、打者が振り返る。ボールなら球審はそのまま、投手が首をかしげる
        setLbl(c.callIsStrike ? "球審「ストライク！」 打者が振り返る" : "球審「ボール」 投手が首をかしげる");
        let s2 = 0;
        function u(ts2){ if(!RV) return; if(!s2) s2 = ts2; const q = Math.min(1, (ts2 - s2) / 450);
          if(c.callIsStrike){ drawUmp(ease(q), ease(q)); setFig("rv-bat", lerpP(P.bat, {lean:0, la:20, lb:-40, ra:10, rb:-30, lu:8, lk:-2, ru:-8, rk:-2, bat:20, headx:-34}, ease(q)), lefty ? 92 : 282, 290, 1.55, lefty ? 1 : -1, batCol, "#222"); }
          else { drawPit(lerpK(PK[4], PK[0], ease(q))); }
          if(q < 1) RV.raf = requestAnimationFrame(u); }
        RV.raf = requestAnimationFrame(u);
        RV.timer = setTimeout(rvAsk, 800);
      }, 420);
    }
    RV.timer = setTimeout(function(){ RV.raf = requestAnimationFrame(f); }, 400);
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
    if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 400); return; }
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
      if(t < 1500){ RV.raf = requestAnimationFrame(f); return; }
      scan.setAttribute("opacity", 0);
      res.setAttribute("opacity", 1);
      ping(tr.inside === c.callIsStrike ? 330 : 990, 0.25, 0.08, "triangle");
      crowd(0.8, 0.07);
      RV.timer = setTimeout(function(){ if(RV) rvSettle(true); }, 1100);
    }
    RV.raf = requestAnimationFrame(f);
  }
  return {play, reveal};
})();
})();
