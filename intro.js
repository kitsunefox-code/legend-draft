// 開幕前の球団紹介 ── 編成が終わったら、開幕の幕の前に全球団を一つずつ見せる。
// 監督・マスコット・本拠地・戦力・役・スタメン・ローテ・救援・控えを一枚に。
// シーズン中も順位表の球団を開いたところから見直せる。
(function(){
function $i(id){ return document.getElementById(id); }
function box(){
  let bg = $i("intro-bg");
  if(bg) return bg;
  bg = document.createElement("div"); bg.id = "intro-bg";
  bg.innerHTML = '<div id="intro"></div>';
  document.body.appendChild(bg);
  return bg;
}
function chip(p, pos, no){
  if(!p) return '<div class="in-chip empty"><span class="in-pos">' + esc(pos || "") + '</span><i class="in-face"></i><b>空き</b></div>';
  const r = prank(p);
  return '<div class="in-chip r-' + r + '">' +
    '<span class="in-pos">' + esc(pos || "") + (no ? '<em>' + no + '</em>' : '') + '</span>' +
    '<span class="in-rk">' + rankIcon(p, 16) + '</span>' +
    '<span class="in-face">' + faceThumb(p, 44, 54) + '</span>' +
    '<b>' + esc(p.name) + (typeof nameTags === 'function' ? nameTags(p) : '') + '</b>' +
    '<small>' + (p.cat === "P" ? esc(String(p.year)) + '年 ' + (p.role === "CL" || p.role === "RP" ? (p.sv ? p.sv + 'S' : (p.hld||0) + 'H') : (p.w||0) + '勝') + ' 防' + Number(p.era||0).toFixed(2) : esc(String(p.year)) + '年 ' + avg3(p.avg||0) + ' ' + (p.hr||0) + '本') + '</small>' +
  '</div>';
}
function posLabel(key){ const d = SLOT_DEFS.find(x => x.key === key); return d ? d.label : key; }
function teamHtml(t, idx, total, mode){
  const m = t.slots.MGR, pk = t.park, ms = t.mascot;
  const odds = powerOdds(); const me = odds.find(x => x.t === t); const ty = me ? powerType(me.pw) : null; const rankNo = me ? odds.indexOf(me) + 1 : 0;
  const yaku = (typeof orderYaku === "function") ? orderYaku(t) : [];
  const pph = (typeof PARK_PHOTO !== "undefined") && pk && PARK_PHOTO[pk.id];
  const mph = (typeof MASCOT_PHOTO !== "undefined") && ms && MASCOT_PHOTO[ms.id];
  const ab = ms && typeof MASCOT_ABILITY !== "undefined" ? MASCOT_ABILITY[ms.ab] : null;
  const order = orderKeys(t), rot = rotKeys(t);
  const rps = RP_KEYS.map(k => t.slots[k]).filter(Boolean), cl = t.slots.CL;
  const bench = benchOf(t);
  return '<header class="in-head" style="--tc:' + (t.color || "#22456b") + '">' +
      '<div class="in-emblem">' + teamEmblem(t, 56) + '</div>' +
      '<div class="in-title"><small>' + (mode === "pre" ? "球団紹介　" + (idx + 1) + " / " + total : "球団紹介") + '</small><h2>' + esc(t.name) + '</h2>' +
      (ty ? '<div class="in-power ' + ty.k + '"><b>' + esc(ty.label) + '</b><span>優勝確率 ' + Math.round(me.p * 100) + '%・' + total + '球団中' + rankNo + '番手</span></div>' : '') +
      '</div></header>' +
    '<section class="in-trio">' +
      '<div class="in-card mgr">' + (m ? faceThumb(m, 52, 64) : '<i class="in-face"></i>') + '<div><small>監督</small><b>' + (m ? esc(m.name) : "未定") + '</b>' + (m ? '<span>' + rankIcon(m, 14) + ' 優勝' + (m.pennants||0) + '回・日本一' + (m.japan||0) + '回</span>' : '') + '</div></div>' +
      '<div class="in-card mascot r-' + (ms ? ms.rank : "C") + '">' + (mph ? '<img class="in-mph" src="assets/mascot/' + ms.id + '.jpg" alt="" decoding="async" onerror="this.remove()">' : '<i class="in-face"></i>') + '<div><small>マスコット</small><b>' + (ms ? esc(ms.name) : "なし") + '</b>' + (ab ? '<span class="in-ab"><i>' + ab.icon + '</i>' + esc(ab.name) + '</span><em>' + esc(ab.desc) + '</em>' : '') + '</div></div>' +
      '<div class="in-card park">' + (pph ? '<img class="in-pph" src="assets/park/thumb/' + pk.id + '.jpg" alt="" decoding="async" onerror="this.remove()">' : '<i class="in-face wide"></i>') + '<div><small>本拠地</small><b>' + (pk ? esc(pk.name) : "未定") + '</b>' + (pk ? '<span>' + esc(pk.type) + '・本塁打' + (pk.hr >= 1.12 ? "出やすい" : pk.hr <= 0.9 ? "出にくい" : "標準") + '</span>' : '') + '</div></div>' +
    '</section>' +
    (yaku.length ? '<div class="in-yaku"><span class="in-k">役</span>' + yaku.map(y => '<span class="yk-chip">' + esc(y.label) + '<b>+' + y.pts + '</b></span>').join("") + '</div>' : '') +
    (typeof teamLinks === "function" && teamLinks(t).length ? '<div class="in-yaku in-links"><span class="in-k">絆</span>' + teamLinks(t).slice(0, 6).map(g => '<span class="yk-chip lk' + (g.hidden ? ' hid' : '') + '">' + esc(g.label) + '<b>+' + g.lv + '</b></span>').join("") + '</div>' : '') +
    '<section class="in-sec"><h3>スタメン</h3><div class="in-grid nine">' + order.map((k, i) => chip(t.slots[k], posLabel(k), i + 1)).join("") + '</div></section>' +
    '<div class="in-two">' +
    '<section class="in-sec"><h3>先発</h3><div class="in-grid five">' + rot.map((k, i) => chip(t.slots[k], "第" + (i + 1), 0)).join("") + '</div></section>' +
    '<section class="in-sec"><h3>救援</h3><div class="in-grid five">' + rps.map(p => chip(p, "中継", 0)).join("") + chip(cl, "抑え", 0) + '</div></section>' +
    '</div>' +
    (bench.length ? '<section class="in-sec in-bench"><h3>控え</h3><div class="in-grid five">' + bench.map(p => chip(p, "控", 0)).join("") + '</div></section>' : '') +
    '<footer class="in-foot">' +
      (mode === "pre"
        ? (idx > 0 ? '<button type="button" class="btn ghost" onclick="introStep(-1)">前の球団</button>' : '<span></span>') +
          '<button type="button" class="btn primary" onclick="introStep(1)">' + (idx + 1 >= total ? "開幕へ" : "次の球団へ") + '</button>'
        : '<span></span><button type="button" class="btn primary" onclick="introClose()">閉じる</button>') +
    '</footer>';
}
let ctx = null;
function render(){
  const bg = box();
  const t = state.parts[ctx.i];
  $i("intro").innerHTML = teamHtml(t, ctx.i, state.parts.length, ctx.mode);
  $i("intro").scrollTop = 0;
  bg.classList.add("show");
  document.body.classList.add("intro-open");
}
// 開幕前: 全球団を順に。終わったら done()
window.showTeamIntro = function(done){
  ctx = {i:0, mode:"pre", done};
  render();
  if(typeof seTap === "function") seTap();
};
// シーズン中: 一球団だけ
window.showTeamIntroOf = function(idx){
  ctx = {i:idx, mode:"one", done:null};
  render();
};
window.introStep = function(d){
  if(!ctx) return;
  if(typeof seTap === "function") seTap();
  const n = ctx.i + d;
  if(n >= state.parts.length){ const done = ctx.done; window.introClose(); if(done) done(); return; }
  ctx.i = Math.max(0, n);
  render();
};
window.introClose = function(){
  const bg = $i("intro-bg"); if(bg) bg.classList.remove("show");
  document.body.classList.remove("intro-open");
  ctx = null;
};
})();
