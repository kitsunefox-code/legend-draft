// リクエスト／ABSチャレンジ ── 生中継の試合で際どい判定が出たとき、不利を受けた人間の球団の監督が
// ビデオ判定(リクエスト)かロボット審判(ABS)を申請できる。目で見て判断する腕試し。
// 覆れば打席はやり直し(得点は変えず、そのイニングの残りを作り直す)で+1点、外れれば士気が落ちる。
// game.js の buildGameScript / liveStep / liveSkip を包んで差し込む。
(function(){
const RV_MS = 7000;       // 決断の持ち時間
const RV_EDGE = 11;       // ゾーンの縁から何px以内を「際どい」とするか
let RV = null;            // 進行中のチャレンジ

function rnd1(a, b){ return a + rnd() * (b - a); }
function hasFn(n){ return typeof window[n] === "function"; }
function ping(freq, dur, vol, type){ if(!window.sndOn) return; const x = ac(); if(x) tone(x.currentTime, freq, dur, vol, type || "square"); }

// ---------- 半イニングのやり直し(genHalf と同じ規則で、途中の状況から) ----------
function rvHalfFrom(bat, pitInfo, target, startIdx, inn, top, init){
  const order = LINEUP_KEYS.map(k=>bat.slots[k]).filter(Boolean);
  const ev = [];
  let idx = startIdx, outs = init.outs, bases = init.bases.slice(), runs = init.runs, guard = 16;
  while(outs < 3 && guard-- > 0){
    const b = order[idx % order.length]; idx++;
    const need = target - runs;
    const prevBases = bases.slice();
    const outsBefore = outs;
    const key = chooseOutcome(b, pitInfo.p, pitInfo.key, need, outs, bases);
    const r = rollOutcomeFit(key, bases, outs, b, pitInfo.p, need);
    bases = r.bases; outs += r.outsAdd; runs += r.runs;
    const onBefore = [!!prevBases[0], !!prevBases[1], !!prevBases[2]];
    for(const q of genPitchSeq(key, b, pitInfo.p)){
      ev.push({t:"pitch", inn, top, outs:outsBefore, on:onBefore,
        bat:b.name, batNo:b.no, batP:b, pit:pitInfo.p.name, pitP:pitInfo.p, pitRole:pitInfo.label,
        b:q.b, s:q.s, type:q.type, kmh:q.kmh, zone:q.zone, res:q.res});
    }
    ev.push({t:"pa", text:r.text, cls:r.cls, runs:r.runs,
      inn, top, outs, on:[!!bases[0], !!bases[1], !!bases[2]],
      bat:b.name, batNo:b.no, batP:b, pit:pitInfo.p.name, pitP:pitInfo.p, pitRole:pitInfo.label,
      sit:`${inn}回${top?"表":"裏"}　${outs}死　${basesLabel(bases)}`});
    if(runs >= target && outs >= 3) break;
  }
  return ev;
}

// ---------- 際どい場面を一つ選び、台本に差し込む ----------
const EDGE_ZONES = ["外角いっぱい","内角ぎりぎり","低めいっぱい","高めいっぱい"];
function rvPick(script, g){
  if(!state.opts || state.opts.review === false) return null;
  const cands = [];
  for(let i = 0; i < script.length; i++){
    const e = script[i];
    if(e.t !== "pa" || !e.key || e.walkoff || !e.batT || !e.pitInfo) continue;
    const batT = e.batT, defT = batT === g.A ? g.B : g.A;
    let kind, victim, flip, sub = null;
    if(e.key === "K"){ kind = "abs"; victim = batT; flip = "BB"; }
    else if(e.key === "BB"){ kind = "abs"; victim = defT; flip = "K"; }
    else if(e.key === "GO" && e.outsAdd === 1 && e.runs === 0){ kind = "req"; victim = batT; flip = "1B"; sub = "first"; }
    else if(e.key === "FO" && e.outsAdd === 1 && e.runs === 0){ kind = "req"; victim = batT; flip = "1B"; sub = "catch"; }
    else if(e.key === "1B" && e.runs === 0){ kind = "req"; victim = defT; sub = rnd() < 0.5 ? "first" : "catch"; flip = sub === "first" ? "GO" : "FO"; }
    else continue;
    if(!victim) continue;
    if(window.rvForce && window.rvForce !== kind) continue;   // 動作確認用
    if(window.rvForceSub && sub && window.rvForceSub !== sub) continue;
    // 覆したあとの結果が、そのイニングの得点(もう決まっている)と矛盾しないこと
    const need = e.target - e.preRuns;
    let r = null;
    for(let k = 0; k < 6; k++){
      const t = simOutcome(flip, e.preBases, e.preOuts, e.batP, e.pitInfo.p);
      if((flip === "GO" || flip === "FO") && t.outsAdd !== 1) continue;   // 判定が覆っただけなので併殺にはしない
      if(t.runs > need) continue;
      if(e.preOuts + t.outsAdd >= 3 && need - t.runs > 0) continue;
      r = t; break;
    }
    if(!r) continue;
    cands.push({i, kind, victim, flip, sub, res:r, opp: victim === batT ? defT : batT, w: (e.inn >= 7 ? 4 : e.inn >= 4 ? 2 : 1) * (victim.cpu ? 0.35 : 1)});
  }
  if(!cands.length) return null;
  const total = cands.reduce((s, c) => s + c.w, 0);
  let x = rnd() * total;
  for(const c of cands){ x -= c.w; if(x <= 0) return c; }
  return cands[cands.length - 1];
}
function rvInsert(script, g){
  const c = rvPick(script, g);
  if(!c) return;
  const pa = script[c.i];
  const bat = pa.bat, pit = pa.pit;
  const defT = pa.batT === g.A ? g.B : g.A;
  c.pa = pa;
  c.wrong = rnd() < 0.5;              // 審判が間違っている確率。見て判断できるかが勝負
  // 直前の投球を「見逃し」の際どい球にして、実況の言葉も合わせる
  const last = script[c.i - 1] && script[c.i - 1].t === "pitch" ? script[c.i - 1] : null;
  if(c.kind === "abs"){
    c.zone = pick1(EDGE_ZONES);
    if(last){ last.zone = c.zone; last.res = c.flip === "BB" ? "見逃し三振" : "ボール（四球）"; c.type = last.type; c.kmh = last.kmh; }
    if(c.flip === "BB"){
      c.call = "ストライク！"; c.callSub = "見逃し三振"; c.callIsStrike = true;
      pa.text = `${bat}、${c.zone}の${c.type || "球"}を見送る…… 判定はストライク、三振！ ${bat}が首を振る`;
      c.flipText = `ABSの判定はボール。四球で出塁！ ${bat}が胸をなで下ろす`;
      c.holdText = `ABSの判定もストライク。三振は変わらず`;
    }else{
      c.call = "ボール"; c.callSub = "四球"; c.callIsStrike = false;
      pa.text = `${bat}、${c.zone}の${c.type || "球"}を見送って四球。${pit}が判定に首をかしげる`;
      c.flipText = `ABSの判定はストライク！ 判定が覆って${bat}は三振`;
      c.holdText = `ABSの判定もボール。四球は変わらず`;
    }
  }else if(c.sub === "catch"){
    if(c.flip === "1B"){
      c.call = "アウト！"; c.callSub = "捕球の判定"; c.callOut = true;
      pa.text = `${bat}、${pick1(["ライト","レフト","センター"])}前に落ちるかという当たり…… 外野手が滑り込んで判定はアウト！ 捕ったか、ワンバウンドか`;
      c.flipText = `リプレー検証の結果、ワンバウンド！ 判定が覆って${bat}はヒット`;
      c.holdText = `リプレー検証の結果も直接捕球。判定どおり`;
    }else{
      c.call = "セーフ！"; c.callSub = "捕球の判定"; c.callOut = false;
      pa.text = `${bat}の浅い飛球に外野手が飛び込む…… 判定はワンバウンドでヒット。${defT.name}ベンチがグラブを指さす`;
      c.flipText = `リプレー検証の結果、直接捕球！ 判定が覆って${bat}はアウト`;
      c.holdText = `リプレー検証の結果もワンバウンド。ヒットは変わらず`;
    }
  }else{
    if(c.flip === "1B"){
      c.call = "アウト！"; c.callSub = "一塁の判定"; c.callOut = true;
      pa.text = `${bat}、${pick1(["ショート","サード","セカンド"])}へのゴロで一塁へ全力疾走…… 判定はアウト！ 際どいタイミング`;
      c.flipText = `リプレー検証の結果、セーフ！ 判定が覆って${bat}は内野安打`;
      c.holdText = `リプレー検証の結果もアウト。判定どおり`;
    }else{
      c.call = "セーフ！"; c.callSub = "一塁の判定"; c.callOut = false;
      pa.text = `${bat}、内野へのゴロで一塁へ頭から…… 判定はセーフ！ 内野安打に${defT.name}ベンチが抗議`;
      c.flipText = `リプレー検証の結果、アウト！ 判定が覆って${bat}は一塁で憤死`;
      c.holdText = `リプレー検証の結果もセーフ。判定どおり`;
    }
  }
  pa.cls = pa.cls || "";
  script.splice(c.i + 1, 0, {t:"review", cand:c});
}

// ---------- 中継のない日の「いい場面」 ----------
// 接戦の試合(2点差以内)の終盤に、人間の球団へ判定の場面を出す。首位攻防・終盤戦・連勝連敗中ほど出やすい
function rvFindScene(rolled){
  if(state.day < 5 || !state.opts || state.opts.review === false || !state.parts) return null;
  const s = (typeof standingsSorted === "function") ? standingsSorted() : state.parts.slice();
  const rem = state.schedule ? state.schedule.length - state.day : 99;
  for(const r of rolled){
    for(const side of ["A","B"]){
      const t = r[side], opp = side === "A" ? r.B : r.A;
      if(!t || t.cpu) continue;
      const my = side === "A" ? r.rA : r.rB, op = side === "A" ? r.rB : r.rA;
      if(Math.abs(my - op) > 2) continue;
      if(t.rvCool && state.day < t.rvCool) continue;
      let p = state.skipping ? 0.10 : 0.22;
      if(rem <= 30) p += 0.08;
      if(s.indexOf(t) <= 1 && s.indexOf(opp) <= 1) p += 0.12;
      if(Math.abs(t.stk || 0) >= 4) p += 0.05;
      if(rnd() > p) continue;
      t.rvCool = state.day + 12;
      return rvBuildScene(r, side, t, opp, my, op);
    }
  }
  return null;
}
function rvPickFrom(arr){ return arr.length ? arr[Math.floor(rnd() * arr.length)] : null; }
function rvBuildScene(r, side, t, opp, my, op){
  const kind = rnd() < 0.5 ? "abs" : "req";
  const batting = rnd() < 0.5;                       // 人間の球団が攻撃側か
  const batT = batting ? t : opp, defT = batting ? opp : t;
  const lineup = (typeof lineupOf === "function") ? lineupOf(batT).filter(Boolean) : Object.values(batT.slots).filter(p => p && p.cat === "B");
  const batP = rvPickFrom(lineup) || Object.values(batT.slots).find(p => p && p.cat === "B");
  const pitP = defT.slots.CL || defT.slots.RP1 || defT.slots.SP1 || Object.values(defT.slots).find(p => p && p.cat === "P");
  if(!batP || !pitP) return null;
  const inn = rnd() < 0.5 ? 9 : rnd() < 0.6 ? 8 : 7;
  const top = (batT === r.A);                        // Aが先攻
  const preOuts = Math.floor(rnd() * 3);
  const others = lineup.filter(p => p !== batP);
  const preBases = [rnd() < 0.45 ? rvPickFrom(others) : null, rnd() < 0.35 ? rvPickFrom(others) : null, rnd() < 0.25 ? rvPickFrom(others) : null];
  const c = {kind, victim:t, standalone:true, game:r, side, my, op, opp, wrong: rnd() < 0.5,
    pa:{inn, top, preOuts, preBases, bat:batP.name, batP, pit:pitP.name, pitP, batT}};
  const bat = batP.name, pit = pitP.name;
  if(kind === "abs"){
    const pt = (typeof pickPitchType === "function") ? pickPitchType(pitP) : {name:"ストレート", kmh:145};
    c.zone = pick1(EDGE_ZONES); c.type = pt.name; c.kmh = pt.kmh;
    if(batting){ c.flip = "BB"; c.call = "ストライク！"; c.callSub = "見逃し三振"; c.callIsStrike = true;
      c.flipText = `ABSの判定はボール。四球で出塁！ ${bat}が胸をなで下ろす`; c.holdText = `ABSの判定もストライク。三振は変わらず`; }
    else { c.flip = "K"; c.call = "ボール"; c.callSub = "四球"; c.callIsStrike = false;
      c.flipText = `ABSの判定はストライク！ 判定が覆って${bat}は三振`; c.holdText = `ABSの判定もボール。四球は変わらず`; }
  }else{
    const canSteal = !!preBases[0] && !preBases[1];
    const subs = ["first", "catch"].concat(canSteal ? ["steal"] : []);
    c.sub = window.rvForceSub && subs.indexOf(window.rvForceSub) >= 0 ? window.rvForceSub : rvPickFrom(subs);
    const runner = preBases[0] ? preBases[0].name : bat;
    if(c.sub === "steal"){
      c.runner = runner;
      if(batting){ c.call = "アウト！"; c.callSub = "二塁の盗塁"; c.callOut = true;
        c.flipText = `リプレー検証の結果、セーフ！ 判定が覆って${runner}は二塁へ`; c.holdText = `リプレー検証の結果もアウト。盗塁失敗は変わらず`; }
      else { c.call = "セーフ！"; c.callSub = "二塁の盗塁"; c.callOut = false;
        c.flipText = `リプレー検証の結果、アウト！ 判定が覆って${runner}は二塁で憤死`; c.holdText = `リプレー検証の結果もセーフ。盗塁は変わらず`; }
    }else if(c.sub === "catch"){
      if(batting){ c.call = "アウト！"; c.callSub = "捕球の判定"; c.callOut = true;
        c.flipText = `リプレー検証の結果、ワンバウンド！ 判定が覆って${bat}はヒット`; c.holdText = `リプレー検証の結果も直接捕球。判定どおり`; }
      else { c.call = "セーフ！"; c.callSub = "捕球の判定"; c.callOut = false;
        c.flipText = `リプレー検証の結果、直接捕球！ 判定が覆って${bat}はアウト`; c.holdText = `リプレー検証の結果もワンバウンド。ヒットは変わらず`; }
    }else{
      if(batting){ c.call = "アウト！"; c.callSub = "一塁の判定"; c.callOut = true;
        c.flipText = `リプレー検証の結果、セーフ！ 判定が覆って${bat}は内野安打`; c.holdText = `リプレー検証の結果もアウト。判定どおり`; }
      else { c.call = "セーフ！"; c.callSub = "一塁の判定"; c.callOut = false;
        c.flipText = `リプレー検証の結果、アウト！ 判定が覆って${bat}は一塁で憤死`; c.holdText = `リプレー検証の結果もセーフ。判定どおり`; }
    }
  }
  return c;
}
function rvStartScene(c){
  c.resume = !!state.playing;
  stopTimer();
  const sp = $r("s-play"), sk = $r("s-skip"); if(sp) sp.disabled = true; if(sk) sk.disabled = true;
  if(hasFn("telop")) try{ telop(`【${c.kind === "abs" ? "ABSチャレンジ" : "リクエスト"}】${c.victim.name}、${c.pa.inn}回の際どい判定`); }catch(e){}
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

// ---------- game.js への差し込み ----------
const _buildGameScript = buildGameScript;
buildGameScript = function(g){
  const built = _buildGameScript(g);
  try{ if(g && g.A && g.B && state.parts) rvInsert(built.script, g); }catch(e){ console.warn("review", e); }
  return built;
};
const _liveStep = liveStep;
liveStep = function(){
  const c = liveCtx; if(!c) return;
  const e = c.script[c.i];
  if(e && e.t === "review"){
    c.i++;
    if(c.timer){ clearTimeout(c.timer); } c.timer = null;
    rvStart(e.cand);
    return;
  }
  _liveStep();
};
const _liveSkip = liveSkip;
liveSkip = function(){ if(RV) rvAbort(); _liveSkip(); };

// ---------- 画面 ----------
function rvBox(){
  let bg = document.getElementById("rv-bg");
  if(bg) return bg;
  bg = document.createElement("div"); bg.id = "rv-bg";
  bg.innerHTML = '<div id="rv">' +
    '<div class="rv-head"><span class="rv-k" id="rv-k"></span><span class="rv-sit" id="rv-sit"></span></div>' +
    '<div class="rv-who" id="rv-who"></div>' +
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
function $r(id){ return document.getElementById(id); }

function rvStart(c){
  const pa = c.pa;
  const mgr = c.victim.slots && c.victim.slots.MGR;
  RV = {c, phase:"pitch", t0:0, raf:0, timer:0, tick:0, decided:null};
  const bg = rvBox();
  $r("rv-k").textContent = c.kind === "abs" ? "ABSチャレンジ" : "リクエスト";
  $r("rv-sit").textContent = `${pa.inn}回${pa.top ? "表" : "裏"}　${pa.preOuts}死　${basesLabel(pa.preBases)}`;
  $r("rv-who").innerHTML = teamEmblem(c.victim, 22) + '<span>' + esc(c.victim.name) + ' の監督' + (mgr ? '　<b>' + esc(mgr.name) + '</b>' : '') + (c.standalone && c.opp ? '　<small>vs ' + esc(c.opp.name) + (state.schedule ? '・' + esc(dateLabel(state.day)) : '') + '</small>' : '') + '</span>';
  $r("rv-call").innerHTML = ""; $r("rv-call").className = "rv-call";
  $r("rv-q").innerHTML = ""; $r("rv-btns").innerHTML = ""; $r("rv-verdict").innerHTML = ""; $r("rv-foot").innerHTML = "";
  $r("rv-verdict").className = "rv-verdict";
  bg.className = "show " + (c.kind === "abs" ? "abs" : "req");
  const btn = document.getElementById("lv-btn"); if(btn) btn.disabled = true;
  if(c.kind === "abs") absPlay(c); else reqPlay(c);
}
function rvAbort(){
  if(!RV) return;
  cancelAnimationFrame(RV.raf); clearTimeout(RV.timer); clearInterval(RV.tick);
  RV = null;
  const bg = document.getElementById("rv-bg"); if(bg) bg.className = "";
  const btn = document.getElementById("lv-btn"); if(btn) btn.disabled = false;
}
// 判定が出たら、監督に問う
function rvAsk(){
  const c = RV.c;
  $r("rv-call").innerHTML = '<small>審判の判定</small><b>' + esc(c.call) + '</b><span>' + esc(c.callSub) + '</span>';
  $r("rv-call").className = "rv-call show";
  ping(c.kind === "abs" ? 300 : 260, 0.12, 0.08, "sawtooth");
  RV.phase = "ask";
  if(c.victim.cpu){
    // CPUの監督: 本当に誤審なら7割で申請、そうでなくても1割5分は当たって砕ける
    $r("rv-q").innerHTML = esc(c.victim.name) + "の監督が判断中……";
    RV.timer = setTimeout(function(){ if(!RV) return; window.rvDecide(c.wrong ? rnd() < 0.72 : rnd() < 0.15, false); }, 1500);
    return;
  }
  let left = RV_MS / 1000;
  $r("rv-q").innerHTML = (c.kind === "abs" ? "ロボット審判に問う？" : "ビデオ判定を求める？") + ' <i id="rv-timer">' + left + '</i>';
  $r("rv-btns").innerHTML =
    '<button type="button" class="btn rv-go" onclick="rvDecide(true)">' + (c.kind === "abs" ? "ABSチャレンジ！" : "リクエスト！") + '</button>' +
    '<button type="button" class="btn ghost rv-no" onclick="rvDecide(false)">判定を受け入れる</button>';
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
  RV.phase = "reveal"; RV.decided = go;
  $r("rv-btns").innerHTML = "";
  $r("rv-q").innerHTML = go ? (RV.c.kind === "abs" ? "ABSが判定中……" : "リプレー検証中……") : (auto ? "時間切れ。判定を受け入れた" : "判定を受け入れた");
  if(hasFn("seTap") && !auto) seTap();
  if(RV.c.victim.cpu && go) $r("rv-q").innerHTML = esc(RV.c.victim.name) + "が" + (RV.c.kind === "abs" ? "ABSチャレンジ！" : "リクエスト！");
  if(RV.c.kind === "abs") absReveal(go); else reqReveal(go);
};
// 結末を書き、得点と士気に反映して、中継へ戻す
function rvSettle(go){
  const c = RV.c, v = c.victim;
  const over = go && c.wrong;
  let head, body, cls;
  if(go && over){ head = "判定が覆った！"; body = c.flipText + (c.standalone ? "。+1点" : "。打席はやり直し。+1点"); cls = "win"; }
  else if(go){ head = "判定どおり"; body = c.holdText + "。チームの士気が少し落ちる"; cls = "lose"; }
  else if(c.wrong){ head = "……実は誤審だった"; body = "覆せたのに見送った。判定はそのまま"; cls = "miss"; }
  else { head = "正しい判定だった"; body = "受け入れて正解。無駄なチャレンジをしなかった"; cls = "ok"; }
  $r("rv-verdict").innerHTML = '<b>' + esc(head) + '</b><span>' + esc(body) + '</span>';
  $r("rv-verdict").className = "rv-verdict show " + cls;
  $r("rv-q").innerHTML = "";
  const day = state.schedule ? dateLabel(Math.max(0, Math.min(state.day, state.schedule.length) - 1)) : "";
  if(c.standalone){
    const t = c.victim, won = c.my > c.op, tie = c.my === c.op;
    const sc = `${t.name} ${c.my}-${c.op} ${c.opp.name}`;
    body += (go && over) ? (won ? `。流れを引き寄せ、${sc} で勝利` : tie ? `。試合は ${sc} の引き分け` : `。それでも試合は ${sc} で落とした`)
          : (won ? `。試合は ${sc} で勝利` : tie ? `。試合は ${sc} の引き分け` : `。試合は ${sc} で敗れた`);
    $r("rv-verdict").innerHTML = '<b>' + esc(head) + '</b><span>' + esc(body) + '</span>';
  }
  if(go && over){
    if(!c.standalone) rvApply(c);
    addPts(v, 1, c.kind === "abs" ? "ABSチャレンジ成功" : "リクエスト成功");
    moodSet(v, 0.8, 7, "判定を覆した勢い");
    v.rvWin = (v.rvWin || 0) + 1;
    if(c.opp && typeof mascotAb === "function" && mascotAb(v, "trick")) moodSet(c.opp, -1, 7, v.mascot.name + "のいたずら");
    state.news.unshift({mo:day, txt:`【覆った】${v.name}の${c.kind === "abs" ? "ABSチャレンジ" : "リクエスト"}が成功。${c.pa.bat}の打席がやり直しに`});
    if(hasFn("seWin")) seWin();
  }else if(go){
    moodSet(v, -0.8, 5, "リクエスト失敗");
    v.rvLose = (v.rvLose || 0) + 1;
    state.news.unshift({mo:day, txt:`【空振り】${v.name}の${c.kind === "abs" ? "ABSチャレンジ" : "リクエスト"}は判定どおり。ベンチが静まる`});
    ping(160, 0.35, 0.09, "sawtooth");
  }
  if(hasFn("renderNews")) try{ renderNews(); }catch(e){}
  $r("rv-foot").innerHTML = '<button type="button" class="btn" onclick="rvClose()">中継へ戻る</button>';
  RV.phase = "done";
  RV.timer = setTimeout(function(){ if(RV && RV.phase === "done") rvClose(); }, c.victim.cpu ? 3200 : 6500);
}
window.rvClose = function(){
  if(!RV) return;
  const scene = RV.c.standalone ? RV.c : null;
  rvAbort();
  if(scene){ rvSceneClose(scene); return; }
  const c = liveCtx; if(!c) return;
  if(c.i >= c.script.length){ liveFinish(); return; }
  c.timer = setTimeout(liveStep, 500);
};
// 覆ったら: その打席のあとから半イニングの終わりまでを作り直す(得点は変えない)
function rvApply(c){
  const lc = liveCtx; if(!lc) return;
  const s = lc.script, pa = c.pa;
  const i = s.indexOf(pa); if(i < 0) return;
  let j = i + 2; while(j < s.length && s[j].t !== "end") j++;
  const r = c.res;
  const outs = pa.preOuts + r.outsAdd, runs = pa.preRuns + r.runs;
  const flipEv = {t:"pa", text:c.flipText + (r.runs ? `！ ${r.runs}点が入る` : ""), cls: r.runs ? "run" : (c.flip === "1B" ? "hit" : ""), runs:r.runs,
    inn:pa.inn, top:pa.top, outs, on:[!!r.bases[0], !!r.bases[1], !!r.bases[2]],
    bat:pa.bat, batNo:pa.batNo, batP:pa.batP, pit:pa.pit, pitP:pa.pitP, pitRole:pa.pitRole,
    sit:`${pa.inn}回${pa.top?"表":"裏"}　${outs}死　${basesLabel(r.bases)}`, flipped:true};
  const rest = rvHalfFrom(pa.batT, pa.pitInfo, pa.target, pa.idx, pa.inn, pa.top, {outs, bases:r.bases, runs});
  s.splice(i + 2, j - (i + 2), flipEv, ...rest);
}

// ---------- ABS: 捕手の目線。球の縁がゾーンにかかるかどうか(規則どおり「一部でもかかればストライク」) ----------
const ZB = {x:118, y:104, w:124, h:146};   // 基準のゾーン。高さは打者で少し変わる
const BALL_R = 10;
const CM_PER_PX = 43.2 / 124;              // ゾーン幅=本塁の幅17インチ
function absTruth(c){
  const h = Math.round(ZB.h * (0.92 + rnd() * 0.16));
  const Z = {x:ZB.x, y:ZB.y + Math.round((ZB.h - h) / 2), w:ZB.w, h};
  // 審判の判定がストライクなら、正しいときは球の縁がゾーンにかかる。間違いならかからない
  const inside = c.callIsStrike ? !c.wrong : c.wrong;
  const pen = inside ? rnd1(2, 11) : -rnd1(2, 11);        // 球の縁がゾーンの線を越えた深さ(px)。負なら外
  const off = BALL_R - pen;                                 // 中心は線の外側にこれだけ
  const side = c.zone.indexOf("外角") >= 0 ? "R" : c.zone.indexOf("内角") >= 0 ? "L" : c.zone.indexOf("低め") >= 0 ? "B" : "T";
  let px, py;
  if(side === "L"){ px = Z.x - off; py = rnd1(Z.y + 34, Z.y + Z.h - 34); }
  else if(side === "R"){ px = Z.x + Z.w + off; py = rnd1(Z.y + 34, Z.y + Z.h - 34); }
  else if(side === "T"){ py = Z.y - off; px = rnd1(Z.x + 30, Z.x + Z.w - 30); }
  else { py = Z.y + Z.h + off; px = rnd1(Z.x + 30, Z.x + Z.w - 30); }
  return {px, py, inside, pen, Z, side};
}
function absStage(c, tr){
  const Z = tr.Z;
  const lefty = c.pa.batP && c.pa.batP.bh === "左";
  const bx = lefty ? 292 : 68;              // 左打者は捕手から見て右側に立つ
  const batter = '<g class="rv-batter" opacity=".55" transform="translate(' + bx + ' 0)' + (lefty ? ' scale(-1 1) translate(-0 0)' : '') + '">' +
    '<circle cx="0" cy="92" r="14" fill="#1b2a45"/><path d="M-16 106 h32 l6 70 h-44 z" fill="#1b2a45"/><path d="M-22 176 h44 v70 h-44 z" fill="#25355a"/>' +
    '<path d="M14 118 l26 -44" stroke="#c9a15a" stroke-width="7" stroke-linecap="round"/></g>';
  const grid = [1, 2].map(k => '<line x1="' + (Z.x + Z.w * k / 3) + '" y1="' + Z.y + '" x2="' + (Z.x + Z.w * k / 3) + '" y2="' + (Z.y + Z.h) + '" stroke="#e8f0ea" stroke-opacity=".18"/>' +
    '<line x1="' + Z.x + '" y1="' + (Z.y + Z.h * k / 3) + '" x2="' + (Z.x + Z.w) + '" y2="' + (Z.y + Z.h * k / 3) + '" stroke="#e8f0ea" stroke-opacity=".18"/>').join("");
  return '<svg viewBox="0 0 360 300" class="rv-svg" id="rv-svg">' +
    '<defs><radialGradient id="rvBall" cx="40%" cy="35%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#e8e6dc"/><stop offset="1" stop-color="#9a978a"/></radialGradient>' +
    '<linearGradient id="rvGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a2a"/><stop offset="1" stop-color="#0c2419"/></linearGradient></defs>' +
    '<rect width="360" height="300" fill="url(#rvGround)"/>' +
    '<path d="M0 300 L60 200 L300 200 L360 300 Z" fill="#3a2a1a" opacity=".9"/>' +
    '<path d="M150 262 L210 262 L210 274 L180 288 L150 274 Z" fill="#f4f1e6" stroke="#222" stroke-width="1"/>' +
    batter +
    '<rect x="' + Z.x + '" y="' + Z.y + '" width="' + Z.w + '" height="' + Z.h + '" fill="rgba(255,255,255,.04)" stroke="#e8f0ea" stroke-width="1.6" stroke-dasharray="6 5" id="rv-zone"/>' + grid +
    '<g id="rv-trail"></g>' +
    '<circle id="rv-ball" cx="180" cy="26" r="2.5" fill="url(#rvBall)" stroke="#c9463a" stroke-width=".8" opacity="0"/>' +
    '<circle id="rv-ring" cx="0" cy="0" r="0" fill="none" stroke="#ffd257" stroke-width="2" opacity="0"/>' +
    '<g id="rv-measure" opacity="0"></g>' +
    '<text id="rv-big" x="180" y="60" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="36" fill="#fff" opacity="0" style="paint-order:stroke" stroke="#0b1f16" stroke-width="6"></text>' +
    '<text x="10" y="292" text-anchor="start" font-family="Noto Sans JP,sans-serif" font-size="10" fill="#cfe0d4" letter-spacing="2" id="rv-cap">' + esc((c.kmh ? c.kmh + "km/h " : "") + (c.type || "") + (c.zone ? "　" + c.zone : "")) + '</text>' +
    '</svg>';
}
function absPlay(c){
  const tr = absTruth(c); RV.truth = tr;
  $r("rv-stage").innerHTML = absStage(c, tr);
  const ball = $r("rv-ball"), ring = $r("rv-ring"), trail = $r("rv-trail");
  const sx = 180, sy = 26, ex = tr.px, ey = tr.py, bend = (rnd() < 0.5 ? -1 : 1) * rnd1(10, 26);
  const DUR = 560;
  let start = 0, lastGhost = 0;
  function frame(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = Math.min(1, (ts - start) / DUR);
    const p = Math.pow(t, 1.55);                  // 近づくほど速く見える
    const x = sx + (ex - sx) * p + Math.sin(p * Math.PI) * bend;
    const y = sy + (ey - sy) * p;
    ball.setAttribute("cx", x); ball.setAttribute("cy", y); ball.setAttribute("r", 2.5 + 7.5 * p); ball.setAttribute("opacity", 1);
    if(ts - lastGhost > 45){                       // 軌跡。薄い残像を置いていく
      lastGhost = ts;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", x); g.setAttribute("cy", y); g.setAttribute("r", 2 + 6 * p); g.setAttribute("fill", "#fff"); g.setAttribute("fill-opacity", ".12");
      trail.appendChild(g);
    }
    if(t < 1){ RV.raf = requestAnimationFrame(frame); return; }
    ring.setAttribute("cx", ex); ring.setAttribute("cy", ey); ring.setAttribute("r", 14); ring.setAttribute("opacity", .9);
    ping(520, 0.05, 0.06);
    // 捕球の瞬間だけ見せて消す。見えたかどうかが勝負
    RV.timer = setTimeout(function(){
      if(!RV) return;
      ball.style.transition = "opacity .45s"; ring.style.transition = "opacity .45s"; trail.style.transition = "opacity .45s";
      ball.setAttribute("opacity", 0); ring.setAttribute("opacity", 0); trail.setAttribute("opacity", 0);
      rvAsk();
    }, 480);
  }
  RV.timer = setTimeout(function(){ RV.raf = requestAnimationFrame(frame); }, 700);
}
// ABSの図: ゾーンと球を重ね、縁との差をセンチで
function absMark(tr, loud){
  const ball = $r("rv-ball"), ring = $r("rv-ring"), zone = $r("rv-zone"), m = $r("rv-measure");
  ball.style.transition = ""; ring.style.transition = "";
  ball.setAttribute("cx", tr.px); ball.setAttribute("cy", tr.py); ball.setAttribute("r", BALL_R); ball.setAttribute("opacity", 1);
  ring.setAttribute("cx", tr.px); ring.setAttribute("cy", tr.py); ring.setAttribute("r", loud ? 17 : 14); ring.setAttribute("opacity", loud ? 1 : .6);
  ring.setAttribute("stroke", tr.inside ? "#6fe3a0" : "#ff6b5b");
  zone.setAttribute("stroke", tr.inside ? "#6fe3a0" : "#ff6b5b"); zone.setAttribute("stroke-dasharray", ""); zone.setAttribute("stroke-width", 2.4);
  const Z = tr.Z, cm = (Math.abs(tr.pen) * CM_PER_PX).toFixed(1);
  // 縁と球の縁の間の線
  let x1, y1, x2, y2, lx, ly;
  if(tr.side === "L"){ x1 = Z.x; y1 = tr.py; x2 = tr.px + BALL_R; y2 = tr.py; lx = Z.x + 8; ly = tr.py - 14; }
  else if(tr.side === "R"){ x1 = Z.x + Z.w; y1 = tr.py; x2 = tr.px - BALL_R; y2 = tr.py; lx = Z.x + Z.w - 8; ly = tr.py - 14; }
  else if(tr.side === "T"){ x1 = tr.px; y1 = Z.y; x2 = tr.px; y2 = tr.py + BALL_R; lx = tr.px; ly = Z.y + 22; }
  else { x1 = tr.px; y1 = Z.y + Z.h; x2 = tr.px; y2 = tr.py - BALL_R; lx = tr.px; ly = Z.y + Z.h - 12; }
  const anchor = tr.side === "L" ? "start" : tr.side === "R" ? "end" : "middle";
  m.innerHTML = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#ffd257" stroke-width="2"/>' +
    '<text x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '" font-family="Oswald,Noto Sans JP,sans-serif" font-weight="700" font-size="13" fill="#ffd257" style="paint-order:stroke" stroke="#0b1f16" stroke-width="4">' +
    (tr.inside ? cm + "cm かかった" : cm + "cm 外れ") + '</text>';
  m.setAttribute("opacity", 1);
}
function absReveal(go){
  const c = RV.c, tr = RV.truth;
  const ball = $r("rv-ball"), big = $r("rv-big"), trail = $r("rv-trail");
  if(!go){ RV.timer = setTimeout(function(){ if(!RV) return; absMark(tr, false); rvSettle(false); }, 500); return; }
  // ゆっくり再生: 最後の三割をコマ送りで
  const sx = 180, sy = 26, ex = tr.px, ey = tr.py;
  const DUR = 1500; let start = 0, k = 0;
  ball.style.transition = ""; trail.style.transition = ""; trail.innerHTML = ""; trail.setAttribute("opacity", 1);
  ball.setAttribute("opacity", 1);
  function frame(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = Math.min(1, (ts - start) / DUR);
    const p = 0.68 + 0.32 * t;
    const x = sx + (ex - sx) * p, y = sy + (ey - sy) * p;
    ball.setAttribute("cx", x); ball.setAttribute("cy", y); ball.setAttribute("r", 2.5 + 7.5 * p);
    if(Math.floor(t * 8) > k){
      k = Math.floor(t * 8);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      g.setAttribute("cx", x); g.setAttribute("cy", y); g.setAttribute("r", 2.5 + 7.5 * p); g.setAttribute("fill", "none"); g.setAttribute("stroke", "#fff"); g.setAttribute("stroke-opacity", ".35");
      trail.appendChild(g);
    }
    if(t < 1){ RV.raf = requestAnimationFrame(frame); return; }
    absMark(tr, true);
    big.textContent = tr.inside ? "STRIKE" : "BALL"; big.setAttribute("fill", tr.inside ? "#6fe3a0" : "#ff6b5b"); big.setAttribute("opacity", 1);
    ping(tr.inside === c.callIsStrike ? 330 : 990, 0.25, 0.08, "triangle");
    RV.timer = setTimeout(function(){ if(RV) rvSettle(true); }, 1000);
  }
  RV.raf = requestAnimationFrame(frame);
}

// ---------- リクエスト ----------
// 三つの場面: 一塁のクロスプレー / 二塁の盗塁 / 外野の捕球かワンバウンドか
function reqPlay(c){
  if(c.sub === "steal") return stealPlay(c);
  if(c.sub === "catch") return catchPlay(c);
  return firstPlay(c);
}
function reqReveal(go){
  const c = RV.c;
  if(c.sub === "steal") return stealReveal(go);
  if(c.sub === "catch") return catchReveal(go);
  return firstReveal(go);
}
function teamColor(t, d){ return (t && t.color) || d; }
function svgOpen(h){ return '<svg viewBox="0 0 360 ' + h + '" class="rv-svg" id="rv-svg"><defs><linearGradient id="rvGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b4a33"/><stop offset="1" stop-color="#123424"/></linearGradient></defs><rect width="360" height="' + h + '" fill="url(#rvGrass)"/>'; }
function bigText(x, y){ return '<text id="rv-big" x="' + x + '" y="' + y + '" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="40" fill="#fff" opacity="0" style="paint-order:stroke" stroke="#0b1f16" stroke-width="6"></text>'; }
function lblText(){ return '<text id="rv-lbl" x="180" y="18" text-anchor="middle" font-family="Noto Sans JP,sans-serif" font-size="10" fill="#9fbfa8" letter-spacing="3"></text>'; }
function setPos(el, from, to, p){ el.setAttribute("cx", from.x + (to.x - from.x) * p); el.setAttribute("cy", from.y + (to.y - from.y) * p); }
function showBig(txt, ok){ const big = $r("rv-big"); big.textContent = txt; big.setAttribute("fill", ok ? "#6fe3a0" : "#ff6b5b"); big.setAttribute("opacity", 1); }
// 差(ms)。審判が正しければコール通り、間違いなら逆
function timingTruth(c, gapMin, gapMax){
  const safe = c.callOut ? c.wrong : !c.wrong;
  const gap = rnd1(gapMin, gapMax);
  return {safe, gap, delta: safe ? gap : -gap};   // delta>0: 守備の方が遅い
}
// ゆっくり再生の共通部: 先に着いた瞬間で止め、続きを見せて結論
function slowReplay(draw, first, second, onDone){
  const flash = $r("rv-flash"), lbl = $r("rv-lbl");
  if(lbl) lbl.textContent = "REPLAY ── スロー再生";
  const from = first - 300, SLOW = 6;
  let start = 0, frozen = false;
  function f1(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = from + (ts - start) / SLOW;
    if(!frozen && t >= first){
      frozen = true; draw(first);
      if(flash) flash.setAttribute("opacity", 1);
      ping(700, 0.08, 0.07);
      RV.timer = setTimeout(function(){ if(!RV) return; if(flash) flash.setAttribute("opacity", 0); start = 0; RV.raf = requestAnimationFrame(f2); }, 900);
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

// ---- 一塁のクロスプレー ----
const HOME = {x:64, y:222}, FIRST = {x:292, y:96}, FIELDER = {x:132, y:52};
const RUN = 1150, THROW_AT = 380;
function firstStage(c){
  const col = teamColor(c.pa.batT, "#e0a600");
  return svgOpen(260) +
    '<path d="M20 250 Q180 -40 340 250 Z" fill="#6b4a2c" opacity=".55"/>' +
    '<path d="M64 222 L292 96" stroke="#f4f1e6" stroke-width="2" stroke-opacity=".8"/>' +
    '<path d="M180 20 L292 96" stroke="#f4f1e6" stroke-width="1" stroke-opacity=".35" stroke-dasharray="4 4"/>' +
    '<path d="M152 214 L64 222 L72 234 Z" fill="#f4f1e6" opacity=".9"/>' +
    '<rect x="' + (FIRST.x - 9) + '" y="' + (FIRST.y - 9) + '" width="18" height="18" fill="#f4f1e6" stroke="#222" transform="rotate(30 ' + FIRST.x + ' ' + FIRST.y + ')"/>' +
    '<g><circle cx="' + (FIRST.x + 14) + '" cy="' + (FIRST.y - 6) + '" r="9" fill="#e8e6dc" stroke="#333"/><circle cx="' + (FIRST.x + 6) + '" cy="' + (FIRST.y + 2) + '" r="5" fill="#7a4a2a" stroke="#222"/></g>' +
    '<circle cx="' + FIELDER.x + '" cy="' + FIELDER.y + '" r="9" fill="#e8e6dc" stroke="#333"/>' +
    '<circle id="rv-runner" cx="' + HOME.x + '" cy="' + HOME.y + '" r="10" fill="' + col + '" stroke="#111" stroke-width="1.5"/>' +
    '<circle id="rv-throw" cx="' + FIELDER.x + '" cy="' + FIELDER.y + '" r="4" fill="#fff" stroke="#c9463a" stroke-width=".8" opacity="0"/>' +
    '<line id="rv-flash" x1="' + (FIRST.x - 40) + '" y1="' + FIRST.y + '" x2="' + (FIRST.x + 40) + '" y2="' + FIRST.y + '" stroke="#ffd257" stroke-width="3" opacity="0"/>' +
    bigText(292, 212) + lblText() + '</svg>';
}
function firstDraw(t, tr){
  const runner = $r("rv-runner"), th = $r("rv-throw");
  setPos(runner, HOME, FIRST, Math.pow(Math.min(1, t / RUN), 0.92));
  const tArr = RUN + tr.delta;
  if(t >= THROW_AT){
    const pt = Math.min(1, (t - THROW_AT) / (tArr - THROW_AT));
    th.setAttribute("opacity", 1);
    setPos(th, FIELDER, {x:FIRST.x + 6, y:FIRST.y + 2}, pt);
    th.setAttribute("r", 4 + 2 * Math.sin(pt * Math.PI));
  }
}
function firstPlay(c){
  const tr = timingTruth(c, 45, 110); RV.truth = tr;
  $r("rv-stage").innerHTML = firstStage(c);
  $r("rv-lbl").textContent = "一塁のクロスプレー";
  const end = Math.max(RUN, RUN + tr.delta) + 80;
  let start = 0;
  function frame(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = ts - start;
    firstDraw(Math.min(t, end), tr);
    if(t < end){ RV.raf = requestAnimationFrame(frame); return; }
    ping(440, 0.06, 0.06);
    RV.timer = setTimeout(rvAsk, 350);
  }
  RV.timer = setTimeout(function(){ RV.raf = requestAnimationFrame(frame); }, 600);
}
function firstReveal(go){
  const tr = RV.truth;
  if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 500); return; }
  const first = Math.min(RUN, RUN + tr.delta), second = Math.max(RUN, RUN + tr.delta);
  slowReplay(t => firstDraw(t, tr), first, second, function(){
    const sec = (tr.gap / 1000).toFixed(2);
    showBig(tr.safe ? "SAFE" : "OUT", tr.safe);
    $r("rv-lbl").textContent = tr.safe ? ("足が " + sec + " 秒 早い") : ("捕球が " + sec + " 秒 早い");
    ping(tr.safe === !RV.c.callOut ? 330 : 990, 0.25, 0.08, "triangle");
    RV.timer = setTimeout(function(){ if(RV) rvSettle(true); }, 900);
  });
}

// ---- 二塁の盗塁: 走者のスライディングと捕手からの送球、タッチが先か ----
const SB_FROM = {x:330, y:214}, SB_BASE = {x:180, y:104}, SB_CATCHER = {x:180, y:262}, SB_GLOVE = {x:190, y:112};
const SB_RUN = 1150, SB_THROW_AT = 300;
function stealStage(c){
  const col = teamColor(c.pa.batT, "#e0a600");
  return svgOpen(280) +
    '<path d="M10 270 Q180 -60 350 270 Z" fill="#6b4a2c" opacity=".55"/>' +
    '<path d="M330 214 L180 104 L30 214" stroke="#f4f1e6" stroke-width="2" stroke-opacity=".8" fill="none"/>' +
    '<rect x="' + (SB_BASE.x - 9) + '" y="' + (SB_BASE.y - 9) + '" width="18" height="18" fill="#f4f1e6" stroke="#222" transform="rotate(45 ' + SB_BASE.x + ' ' + SB_BASE.y + ')"/>' +
    '<circle cx="' + (SB_BASE.x + 22) + '" cy="' + (SB_BASE.y - 14) + '" r="9" fill="#e8e6dc" stroke="#333"/>' +
    '<circle id="rv-glove" cx="' + (SB_BASE.x + 14) + '" cy="' + (SB_BASE.y - 4) + '" r="5" fill="#7a4a2a" stroke="#222"/>' +
    '<circle cx="' + SB_CATCHER.x + '" cy="' + SB_CATCHER.y + '" r="9" fill="#e8e6dc" stroke="#333"/>' +
    '<circle id="rv-runner" cx="' + SB_FROM.x + '" cy="' + SB_FROM.y + '" r="10" fill="' + col + '" stroke="#111" stroke-width="1.5"/>' +
    '<circle id="rv-throw" cx="' + SB_CATCHER.x + '" cy="' + SB_CATCHER.y + '" r="4" fill="#fff" stroke="#c9463a" stroke-width=".8" opacity="0"/>' +
    '<line id="rv-flash" x1="' + (SB_BASE.x - 40) + '" y1="' + SB_BASE.y + '" x2="' + (SB_BASE.x + 40) + '" y2="' + SB_BASE.y + '" stroke="#ffd257" stroke-width="3" opacity="0"/>' +
    bigText(180, 250) + lblText() + '</svg>';
}
function stealDraw(t, tr){
  const runner = $r("rv-runner"), th = $r("rv-throw"), gl = $r("rv-glove");
  const pr = Math.min(1, t / SB_RUN);
  setPos(runner, SB_FROM, {x:SB_BASE.x + 6, y:SB_BASE.y + 6}, Math.pow(pr, 1.1));   // 滑り込む
  const tArr = SB_RUN + tr.delta;
  if(t >= SB_THROW_AT){
    const pt = Math.min(1, (t - SB_THROW_AT) / (tArr - SB_THROW_AT));
    th.setAttribute("opacity", 1);
    setPos(th, SB_CATCHER, SB_GLOVE, pt);
    th.setAttribute("r", 4 + 2 * Math.sin(pt * Math.PI));
    if(pt >= 1){ setPos(gl, SB_GLOVE, {x:SB_BASE.x + 6, y:SB_BASE.y + 6}, Math.min(1, (t - tArr) / 120)); }   // タッチ
  }
}
function stealPlay(c){
  const tr = timingTruth(c, 40, 100); RV.truth = tr;
  $r("rv-stage").innerHTML = stealStage(c);
  $r("rv-lbl").textContent = "二塁への盗塁";
  const end = Math.max(SB_RUN, SB_RUN + tr.delta) + 160;
  let start = 0;
  function frame(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = ts - start;
    stealDraw(Math.min(t, end), tr);
    if(t < end){ RV.raf = requestAnimationFrame(frame); return; }
    ping(440, 0.06, 0.06);
    RV.timer = setTimeout(rvAsk, 350);
  }
  RV.timer = setTimeout(function(){ RV.raf = requestAnimationFrame(frame); }, 600);
}
function stealReveal(go){
  const tr = RV.truth;
  if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 500); return; }
  const first = Math.min(SB_RUN, SB_RUN + tr.delta), second = Math.max(SB_RUN, SB_RUN + tr.delta) + 120;
  slowReplay(t => stealDraw(t, tr), first, second, function(){
    const sec = (tr.gap / 1000).toFixed(2);
    showBig(tr.safe ? "SAFE" : "OUT", tr.safe);
    $r("rv-lbl").textContent = tr.safe ? ("手がベースに " + sec + " 秒 早い") : ("タッチが " + sec + " 秒 早い");
    ping(tr.safe === !RV.c.callOut ? 330 : 990, 0.25, 0.08, "triangle");
    RV.timer = setTimeout(function(){ if(RV) rvSettle(true); }, 900);
  });
}

// ---- 外野の捕球かワンバウンドか: 横から。落ちてくる球とグラブ、どちらが先か ----
const CT_FROM = {x:40, y:40}, CT_LAND = {x:210, y:196}, CT_GLOVE0 = {x:296, y:170}, CT_GLOVE1 = {x:214, y:190};
const CT_FALL = 1100, CT_DIVE_AT = 450;
function catchStage(c){
  const col = teamColor(c.pa.batT === c.victim ? (c.opp || c.pa.batT) : c.victim, "#2f6fd6");
  return svgOpen(240) +
    '<rect x="0" y="196" width="360" height="44" fill="#2a6a3e"/><line x1="0" y1="196" x2="360" y2="196" stroke="#6fe3a0" stroke-opacity=".5"/>' +
    '<g id="rv-fielder"><circle cx="' + (CT_GLOVE0.x + 14) + '" cy="' + (CT_GLOVE0.y - 22) + '" r="10" fill="' + col + '" stroke="#111" stroke-width="1.5"/><path d="M' + (CT_GLOVE0.x + 6) + ' ' + (CT_GLOVE0.y - 10) + ' l18 4 l4 30 l-24 2 z" fill="' + col + '" opacity=".85"/></g>' +
    '<circle id="rv-glove" cx="' + CT_GLOVE0.x + '" cy="' + CT_GLOVE0.y + '" r="7" fill="#7a4a2a" stroke="#222"/>' +
    '<circle id="rv-runner" cx="' + CT_FROM.x + '" cy="' + CT_FROM.y + '" r="5" fill="#fff" stroke="#c9463a" stroke-width=".8"/>' +
    '<line id="rv-flash" x1="' + (CT_LAND.x - 40) + '" y1="196" x2="' + (CT_LAND.x + 40) + '" y2="196" stroke="#ffd257" stroke-width="3" opacity="0"/>' +
    bigText(90, 150) + lblText() + '</svg>';
}
function catchDraw(t, tr){
  const ball = $r("rv-runner"), gl = $r("rv-glove"), fd = $r("rv-fielder");
  const pb = Math.min(1, t / CT_FALL);
  // 放物線。地面に着いたら止まる
  const x = CT_FROM.x + (CT_LAND.x - CT_FROM.x) * pb;
  const y = CT_FROM.y + (CT_LAND.y - CT_FROM.y) * (pb * pb);
  ball.setAttribute("cx", x); ball.setAttribute("cy", Math.min(CT_LAND.y, y));
  const tArr = CT_FALL + tr.delta;
  if(t >= CT_DIVE_AT){
    const pg = Math.min(1, (t - CT_DIVE_AT) / (tArr - CT_DIVE_AT));
    setPos(gl, CT_GLOVE0, CT_GLOVE1, pg);
    fd.setAttribute("transform", "translate(" + ((CT_GLOVE1.x - CT_GLOVE0.x) * pg) + " " + ((CT_GLOVE1.y - CT_GLOVE0.y) * pg) + ")");
    if(pg >= 1 && tr.safe === false){ ball.setAttribute("cx", CT_GLOVE1.x); ball.setAttribute("cy", CT_GLOVE1.y - 4); }   // 捕った
  }
}
function catchPlay(c){
  // safe = ヒット(ワンバウンド)。delta>0 はグラブが遅い
  const tr = timingTruth(c, 40, 110); RV.truth = tr;
  $r("rv-stage").innerHTML = catchStage(c);
  $r("rv-lbl").textContent = "外野への浅い飛球";
  const end = Math.max(CT_FALL, CT_FALL + tr.delta) + 120;
  let start = 0;
  function frame(ts){
    if(!RV) return;
    if(!start) start = ts;
    const t = ts - start;
    catchDraw(Math.min(t, end), tr);
    if(t < end){ RV.raf = requestAnimationFrame(frame); return; }
    ping(440, 0.06, 0.06);
    RV.timer = setTimeout(rvAsk, 350);
  }
  RV.timer = setTimeout(function(){ RV.raf = requestAnimationFrame(frame); }, 600);
}
function catchReveal(go){
  const tr = RV.truth;
  if(!go){ RV.timer = setTimeout(function(){ if(RV) rvSettle(false); }, 500); return; }
  const first = Math.min(CT_FALL, CT_FALL + tr.delta), second = Math.max(CT_FALL, CT_FALL + tr.delta) + 100;
  slowReplay(t => catchDraw(t, tr), first, second, function(){
    const cm = Math.round(tr.gap * 0.09);
    showBig(tr.safe ? "HIT" : "OUT", tr.safe);
    $r("rv-lbl").textContent = tr.safe ? ("グラブより " + (tr.gap / 1000).toFixed(2) + " 秒 早く地面に") : ("地面まで " + cm + "cm で捕球");
    ping(tr.safe === !RV.c.callOut ? 330 : 990, 0.25, 0.08, "triangle");
    RV.timer = setTimeout(function(){ if(RV) rvSettle(true); }, 900);
  });
}
})();
