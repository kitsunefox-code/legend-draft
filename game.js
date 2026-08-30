"use strict";
// ============================================================
// レジェンドドラフト 〜歴代最強ペナント〜 (リアル編成版)
// ロースター: 監督1 / スタメン野手9(捕一二三遊外×3指) / 控え3 / 先発3 / 中継2 / 抑え1
// ============================================================

const FRANCHISES = ["巨人","阪神","中日","ヤクルト","広島","DeNA","ソフトバンク","西武","ロッテ","日本ハム","オリックス","近鉄","楽天","その他"];
const COLORS = ["#a72c18","#22456b","#2c5c34","#9a7714","#4a3568","#7a4b21"];
const MONTHS = ["4月","5月","6月","7月","8月","9月","10月"];

const SLOT_DEFS = [
  {key:"MGR", grp:"MGR", label:"監督"},
  {key:"C",   grp:"捕",  label:"捕"},
  {key:"B1",  grp:"一",  label:"一"},
  {key:"B2",  grp:"二",  label:"二"},
  {key:"B3",  grp:"三",  label:"三"},
  {key:"SS",  grp:"遊",  label:"遊"},
  {key:"OF1", grp:"外",  label:"左"},
  {key:"OF2", grp:"外",  label:"中"},
  {key:"OF3", grp:"外",  label:"右"},
  {key:"DH",  grp:"DH",  label:"指"},
  {key:"BN1", grp:"BN",  label:"控"},
  {key:"BN2", grp:"BN",  label:"控"},
  {key:"BN3", grp:"BN",  label:"控"},
  {key:"SP1", grp:"SP",  label:"先発"},
  {key:"SP2", grp:"SP",  label:"先発"},
  {key:"SP3", grp:"SP",  label:"先発"},
  {key:"SP4", grp:"SP",  label:"先発"},
  {key:"RP1", grp:"RP",  label:"中継"},
  {key:"RP2", grp:"RP",  label:"中継"},
  {key:"CL",  grp:"CL",  label:"抑え"},
];
const LINEUP_KEYS = ["C","B1","B2","B3","SS","OF1","OF2","OF3","DH"];
const BENCH_KEYS = ["BN1","BN2","BN3"];
const SP_KEYS = ["SP1","SP2","SP3","SP4"];
const RP_KEYS = ["RP1","RP2"];

// ---------- utils ----------
const $ = id => document.getElementById(id);
const rnd = () => Math.random();
const gauss = () => (rnd()+rnd()+rnd()+rnd()-2)/1.2;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const avg3 = v => v.toFixed(3).replace(/^0/,"");
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
function decadeOf(y){ return y<1950 ? "1930-40年代" : Math.floor(y/10)*10 + "年代"; }

// ---------- 能力値 ----------
function batterOvr(b){
  const score = (b.avg-0.250)*400 + b.hr*0.55 + b.rbi*0.12 + b.sb*0.25;
  return clamp(Math.round(60 + score*0.38), 68, 99);
}
function eraComp(era){ return Math.min(27, Math.max(0, 3.6-era)*9); }
function pitcherOvr(p){
  let score;
  if(p.role === "CL"){
    score = Math.min(40, p.sv*0.85) + eraComp(p.era) + Math.min(12, p.so*0.05) + p.w*1.2;
  }else if(p.role === "RP"){
    const rv = (p.hld||0) + (p.sv||0)*0.8 + p.w*2;
    score = Math.min(42, rv*0.8) + eraComp(p.era) + Math.min(12, p.so*0.06);
  }else{
    const winNorm = p.year<1950?30 : p.year<1965?28 : p.year<1980?22 : p.year<1995?18 : 15;
    const kNorm   = p.year<1970?320 : p.year<1995?250 : 220;
    score = Math.min(45,(p.w/winNorm)*38) + Math.min(25,(p.so/kNorm)*20) + eraComp(p.era) + Math.min(40,(p.sv||0)*0.85);
  }
  return clamp(Math.round(58 + score*0.44), 68, 99);
}
function mgrOvr(m){
  return clamp(Math.round(66 + m.pennants*1.0 + m.japan*1.5 + m.wins/200), 72, 99);
}
function rankOf(o){ return o>=94?"SS":o>=89?"S":o>=84?"A":o>=79?"B":"C"; }
// ランク章(画像)。読み込めない環境でも文字にフォールバックする
function rankIcon(o, size){
  const r = rankOf(o);
  const px = size || 26;
  return `<img class="rk-ic" src="assets/rank/${r.toLowerCase()}.png" alt="${r}" width="${px}" height="${px}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rank rank-${r}',textContent:'${r}'}))">`;
}
// 球団エンブレム(30種)
const EMBLEM_COUNT = 30;
function emblemSrc(i){ return "assets/emblem/em" + String(((i||0)%EMBLEM_COUNT)+1).padStart(2,"0") + ".png"; }
function teamEmblem(t, size){
  const px = size || 22;
  if(t.emblem === undefined) return `<span style="color:${t.color}">●</span>`;
  return `<img class="tm-em" src="${emblemSrc(t.emblem)}" width="${px}" height="${px}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'●',style:'color:${t.color}'}))">`;
}

// ---------- 年俸(コスト) ----------
const MIN_COST = 2;
function costOf(ovr, cat, isMlb){
  let c = Math.max(MIN_COST, Math.round(Math.pow(Math.max(1, ovr-68), 1.55) / 8));
  if(cat === "M") c = Math.max(1, Math.round(c*0.6));
  if(isMlb) c = Math.round(c*1.2);
  return c;
}
// 育成力: 安い監督ほど若手・伏兵を覚醒させやすい
function devMult(t){
  const m = t.slots.MGR;
  if(!m) return 1;
  return clamp(1 + (88 - m.ovr)*0.04, 0.6, 1.6);
}
function devStars(m){
  const d = clamp(1 + (88 - m.ovr)*0.04, 0.6, 1.6);
  return d>=1.3?"★★★":d>=1.1?"★★":d>=0.9?"★":"─";
}

function prepPlayer(p, idPrefix, i){
  p.id = idPrefix + i;
  p.decade = decadeOf(p.year);
  if(p.cat === "M"){ p.ovr = mgrOvr(p); }
  else if(p.cat === "P"){ p.ovr = pitcherOvr(p); }
  else {
    p.ovr = batterOvr(p);
    if(p.twoWay){
      p.pitOvr = pitcherOvr({role:"SP", year:p.year, w:p.twoWay.w, era:p.twoWay.era, so:p.twoWay.so, sv:0});
      p.ovr = Math.max(p.ovr, Math.round((p.ovr + p.pitOvr)/2) + 4); // 二刀流の総合価値
    }
  }
  p.cost = costOf(p.ovr, p.cat, !!p.mlb);
  return p;
}
const PLAYERS = DB.map((p,i)=>prepPlayer(p,"N",i));
const MLB_STARS = MLB_DB.map((p,i)=>prepPlayer(p,"M",i));

// ---------- 適格判定 ----------
function eligibleGrp(p, grp){
  switch(grp){
    case "MGR": return p.cat === "M";
    case "DH": case "BN": return p.cat === "B";
    case "SP": return p.cat === "P" && p.role === "SP";
    case "RP": return p.cat === "P" && (p.role === "RP" || p.role === "CL");
    case "CL": return p.cat === "P" && (p.role === "CL" || p.role === "RP");
    default: return p.cat === "B" && p.pos.includes(grp);
  }
}
function ovrFor(p, grp){
  if((grp==="SP"||grp==="RP"||grp==="CL") && p.twoWay) return p.pitOvr;
  return p.ovr;
}
function roleLabel(p){
  if(p.cat==="M") return "監督";
  if(p.cat==="P") return p.role==="SP"?"先発":p.role==="RP"?"中継":"抑え";
  return p.pos + (p.twoWay ? "/投" : "");
}

// ---------- 状態 ----------
const state = {
  parts: [], eras: new Set(), taken: new Set(),
  order: [], round: 1, turnPtr: 0, currentIdx: -1, modalPlayer: null,
  pairGames: 0, schedule: [], day: 0, monthsCompleted: -1,
  playing: false, timer: null, finished: false, resumeAfterEvent: false,
  lastScores: [], news: [], seasonStats: null,
  opts: {trade:true, mlb:true},
  budget: 130,
  eventQueue: [], eventCtx: null, mlbPool: [],
};
function budgetLeft(t){ return state.budget - t.spent; }

function show(id){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); $(id).classList.add("active"); }

// ============================================================
// 設定画面
// ============================================================
function goSetup(){
  show("scr-setup");
  if(!$("p-list").children.length){ addPlayer(); addPlayer(); addPlayer(); }
  if(!$("era-chips").children.length){
    const decades = [...new Set(PLAYERS.map(p=>p.decade))].sort();
    decades.forEach(d=>{
      const c = document.createElement("span");
      c.className="chip"; c.textContent=d;
      c.onclick=()=>{ c.classList.toggle("on"); };
      c.dataset.era=d;
      $("era-chips").appendChild(c);
    });
  }
}
function addPlayer(){
  const list = $("p-list");
  if(list.children.length>=6) return;
  const i = list.children.length;
  const row = document.createElement("div");
  row.className="p-row";
  const em = freeEmblem();
  row.dataset.em = em;
  row.innerHTML = `<span class="idx" style="background:${COLORS[i]}">${i+1}</span>
    <button class="em-btn" title="球団アイコンを選ぶ" onclick="pickEmblem(this.parentNode)"><img src="${emblemSrc(em)}" alt=""></button>
    <input type="text" value="参加者${i+1}" maxlength="10">
    <select><option value="">縛りなし</option>${FRANCHISES.map(f=>`<option>${f}</option>`).join("")}</select>
    <button class="btn ghost sm" onclick="this.parentNode.remove();renumber()">✕</button>`;
  list.appendChild(row);
}
// まだ誰も使っていないアイコン番号を返す
function freeEmblem(){
  const used = new Set([...$("p-list").children].map(r=>Number(r.dataset.em)));
  for(let i=0;i<EMBLEM_COUNT;i++) if(!used.has(i)) return i;
  return Math.floor(rnd()*EMBLEM_COUNT);
}
// アイコン選択(30種のグリッドから1つ)
function pickEmblem(row){
  const cur = Number(row.dataset.em) || 0;
  const used = new Set([...$("p-list").children].filter(r=>r!==row).map(r=>Number(r.dataset.em)));
  state.emRow = row;
  $("modal").innerHTML =
    '<h2><span class="kicker">球団アイコン</span>エンブレムを選ぶ</h2>' +
    '<div class="sub">他の球団が使っている絵柄は選べません。</div>' +
    '<div id="em-grid">' +
      Array.from({length: EMBLEM_COUNT}, function(_, i){
        if(used.has(i)) return "";
        return '<div class="em-cell' + (i===cur?" on":"") + '" onclick="chooseEmblem(' + i + ')">' +
               '<img src="' + emblemSrc(i) + '" alt=""></div>';
      }).join("") +
    '</div>' +
    '<div style="text-align:right;margin-top:14px;"><button class="btn ghost sm" onclick="closeModal()">閉じる</button></div>';
  $("modal-bg").classList.add("show");
}
function chooseEmblem(i){
  const row = state.emRow;
  if(row){
    row.dataset.em = i;
    row.querySelector(".em-btn img").src = emblemSrc(i);
  }
  state.emRow = null;
  seTap();
  closeModal();
}
function renumber(){
  [...$("p-list").children].forEach((row,i)=>{
    const idx = row.querySelector(".idx"); idx.textContent=i+1; idx.style.background=COLORS[i];
  });
}

// ============================================================
// ドラフト
// ============================================================
let emblemPool = null;
function nextEmblem(){
  if(!emblemPool || !emblemPool.length) emblemPool = shuffle(Array.from({length:EMBLEM_COUNT}, (_,i)=>i));
  return emblemPool.pop();
}
function newTeam(name, fr, cpu, color, emblem){
  return {name, fr, cpu, color, emblem: (emblem !== undefined && emblem !== null) ? emblem : nextEmblem(), slots:{}, spent:0, W:0,L:0,T:0,RS:0,RA:0,
          hist:[0], watch:new Set(), order:LINEUP_KEYS.slice(), rot:SP_KEYS.slice(), rotIdx:0,
          saihai: cpu ? 0 : SAIHAI_MAX};
}
function startDraft(){
  const rows = [...$("p-list").children];
  if(rows.length<2){ alert("参加者は2人以上必要です"); return; }
  emblemPool = null;
  emblemPool = shuffle(Array.from({length:EMBLEM_COUNT}, (_,i)=>i))
    .filter(i => !rows.some(r => Number(r.dataset.em) === i));   // 選ばれた分はCPUに回さない
  state.parts = rows.map((row,i)=>newTeam(
    row.querySelector("input").value.trim() || `参加者${i+1}`,
    row.querySelector("select").value, false, COLORS[i],
    row.dataset.em !== undefined ? Number(row.dataset.em) : undefined));
  state.eras = new Set([...$("era-chips").children].filter(c=>c.classList.contains("on")).map(c=>c.dataset.era));
  state.opts.trade = $("opt-trade").checked;
  state.opts.mlb = $("opt-mlb").checked && MLB_STARS.length > 0;
  state.budget = Number($("opt-budget").value) || 140;
  state.rankCap = Number($("opt-rank").value) || 0; // 0=縛りなし
  state.opts.party = $("opt-party") ? $("opt-party").checked : false;
  state.opts.saihai = $("opt-saihai") ? $("opt-saihai").checked : false;
  state.opts.park = $("opt-park") ? $("opt-park").checked : false;
  state.opts.injury = $("opt-injury") ? $("opt-injury").checked : false;

  if($("opt-cpu").checked){
    const cpuNames = ["CPU猛牛","CPU荒鷲","CPU海豚"];
    let k=0;
    while(state.parts.length<4) state.parts.push(newTeam(cpuNames[k++], "", true, COLORS[state.parts.length]));
  }
  // プール枯渇チェック
  const n = state.parts.length;
  const pool = PLAYERS.filter(p=>poolOK(p));
  const needs = [
    ["監督", n, pool.filter(p=>p.cat==="M").length],
    ["捕手", n, pool.filter(p=>eligibleGrp(p,"捕")).length],
    ["一塁", n, pool.filter(p=>eligibleGrp(p,"一")).length],
    ["二塁", n, pool.filter(p=>eligibleGrp(p,"二")).length],
    ["三塁", n, pool.filter(p=>eligibleGrp(p,"三")).length],
    ["遊撃", n, pool.filter(p=>eligibleGrp(p,"遊")).length],
    ["外野", n*3, pool.filter(p=>eligibleGrp(p,"外")).length],
    ["野手全体", n*12, pool.filter(p=>p.cat==="B").length],
    ["先発", n*3, pool.filter(p=>eligibleGrp(p,"SP")).length],
    ["救援(中継ぎ・抑え)", n*3, pool.filter(p=>p.cat==="P"&&(p.role==="RP"||p.role==="CL")).length],
  ];
  const lack = needs.filter(([,need,have])=>have<need);
  if(lack.length){
    alert("縛りがきつすぎて選手が足りません！\n" + lack.map(([nm,need,have])=>`・${nm}: ${have}/${need}人`).join("\n") + "\n年代の選択を増やしてください。");
    return;
  }

  state.taken = new Set(); state.round=1; state.turnPtr=0;
  state.partBidDone = {M:false, P:false, B:false};
  state.bid = null;
  cheapCache = {size:-1, map:null};
  state.order = shuffle(state.parts.map((_,i)=>i));
  $("f-fr").innerHTML = `<option value="">全球団</option>` + FRANCHISES.map(f=>`<option>${f}</option>`).join("");
  const decades=[...new Set(PLAYERS.map(p=>p.decade))].sort();
  $("f-era").innerHTML = `<option value="">全年代</option>` + decades.map(d=>`<option>${d}</option>`).join("");
  if(state.opts.park){ startParkDraft(); return; }
  state.parts.forEach(t=>{ if(!t.park) t.park = PARKS.find(x=>x.id==="fujiidera"); });  // 球場なしなら癖のない球場
  show("scr-draft");
  nextTurn(true);
}

// ---- 本拠地ドラフト ----
// 選手より先に球場を決める。狭い箱を取れば大砲を、広い外野を取れば投手と機動力を
// 集めることになり、以後の指名の方針がここで決まる
function startParkDraft(){
  state.parkCtx = {order: shuffle(state.parts.slice()), idx: 0};
  renderParkDraft();
  $("park-bg").classList.add("show");
}
function renderParkDraft(){
  const c = state.parkCtx;
  if(!c) return;
  if(c.idx >= c.order.length){ finishParkDraft(); return; }
  const t = c.order[c.idx];
  const taken = new Set(state.parts.map(x=>x.park && x.park.id).filter(Boolean));
  const bar = c.order.map(function(x, i){
    return '<span class="pk-step' + (i === c.idx ? " now" : (x.park ? " done" : "")) + '">' +
      teamEmblem(x, 15) + esc(x.name) + (x.park ? '<i>' + esc(x.park.name) + '</i>' : '') + '</span>';
  }).join("");
  const CATS = [["NPB","NPB 現行"],["歴史","記憶の中の球場"],["MLB","MLB"],["地方","地方球場"]];
  const card = function(pk){
    const used = taken.has(pk.id);
    const owner = state.parts.find(x=>x.park && x.park.id === pk.id);
    const meter = (v, lo, hi) => {
      const pct = clamp((v - lo) / (hi - lo), 0, 1) * 100;
      return '<span class="pk-bar"><i style="width:' + pct.toFixed(0) + '%"></i></span>';
    };
    return '<div class="pk-card' + (used ? " used" : "") + '"' +
      (used || t.cpu ? '' : ' onclick="parkChoose(&quot;' + pk.id + '&quot;)"') + '>' +
      '<div class="pk-h"><b>' + esc(pk.name) + '</b><span>' + esc(pk.type) + '</span></div>' +
      '<div class="pk-m"><span class="pk-lb">本塁打</span>' + meter(pk.hr, 0.78, 1.24) +
        '<span class="pk-v">' + (pk.hr >= 1.12 ? "出やすい" : pk.hr <= 0.90 ? "出にくい" : "標準") + '</span></div>' +
      '<div class="pk-m"><span class="pk-lb">総得点</span>' + meter(pk.run, 0.90, 1.16) +
        '<span class="pk-v">' + (pk.run >= 1.06 ? "打高" : pk.run <= 0.96 ? "投高" : "標準") + '</span></div>' +
      '<div class="pk-n">' + esc(pk.note) + '</div>' +
      '<div class="pk-f"><span class="pk-g">向く: ' + esc(pk.good) + '</span>' +
        '<span class="pk-b">不向き: ' + esc(pk.bad) + '</span></div>' +
      (used ? '<div class="pk-used">' + esc(owner ? owner.name + " の本拠地" : "選択済み") + '</div>' : '') +
    '</div>';
  };
  const cards = CATS.map(function(c){
    const list = PARKS.filter(function(pk){ return pk.cat === c[0]; });
    if(!list.length) return "";
    return '<div class="pk-cat">' + esc(c[1]) + '</div>' +
           '<div class="pk-grid">' + list.map(card).join("") + '</div>';
  }).join("");
  $("park-panel").innerHTML =
    '<h2><span class="kicker">第一面</span>本拠地ドラフト</h2>' +
    '<div class="sub">選手より先に本拠地を決めます。球場の癖はこの一年、全試合につきまといます。' +
    '狭い箱なら大砲を、広い外野なら投手と足を集めることになります。</div>' +
    '<div class="pk-bar-row">' + bar + '</div>' +
    '<div class="pk-turn">' + teamEmblem(t, 22) + '<b>' + esc(t.name) + '</b>' +
      (t.cpu ? '<span class="pk-cpu">選択中…</span>' : '<span class="pk-you">本拠地を選んでください</span>') + '</div>' +
    cards;
  if(t.cpu) setTimeout(cpuParkPick, 700);
}
function cpuParkPick(){
  const c = state.parkCtx;
  if(!c) return;
  const t = c.order[c.idx];
  if(!t || !t.cpu) return;
  const taken = new Set(state.parts.map(x=>x.park && x.park.id).filter(Boolean));
  const free = PARKS.filter(pk=>!taken.has(pk.id));
  if(!free.length){ finishParkDraft(); return; }
  parkChoose(pick1(free).id);
}
function parkChoose(id){
  const c = state.parkCtx;
  if(!c) return;
  const pk = PARKS.find(x=>x.id === id);
  if(!pk) return;
  if(state.parts.some(x=>x.park && x.park.id === id)) return;
  const t = c.order[c.idx];
  t.park = pk;
  seWin();
  c.idx++;
  renderParkDraft();
}
function finishParkDraft(){
  state.parkCtx = null;
  $("park-bg").classList.remove("show");
  show("scr-draft");
  nextTurn(true);
}


function eraOK(p){ return state.eras.size===0 || state.eras.has(p.decade); }
function rankOK(p){ return !state.rankCap || p.ovr <= state.rankCap; }
function poolOK(p){ return eraOK(p) && rankOK(p); }
function openSlots(t){ return SLOT_DEFS.filter(d=>!t.slots[d.key]); }
function rosterFull(t){ return SLOT_DEFS.every(d=>t.slots[d.key]); }

// ---- 3部制ドラフト: 監督 → 投手 → 野手 ----
const PHASE_GRPS = {
  M: ["MGR"],
  P: ["SP","RP","CL"],
  B: ["捕","一","二","三","遊","外","DH","BN"],
};
const PHASE_NAME = {M:"監督ドラフト", P:"投手ドラフト", B:"野手ドラフト"};
function phaseDone(t, ph){
  return !openSlots(t).some(d=>PHASE_GRPS[ph].includes(d.grp));
}
function currentPhase(){
  for(const ph of ["M","P","B"]){
    if(state.parts.some(t=>!phaseDone(t, ph))) return ph;
  }
  return null;
}
// 残り各枠の確保見積もり: ライバルとの取り合いを考慮し、
// 「そのポジションの全チーム需要数」番目に安い選手の値段で見積もる(キャッシュ付き)
let cheapCache = {size:-1, map:null};
function grpReserveMap(){
  if(cheapCache.size === state.taken.size) return cheapCache.map;
  const avail = PLAYERS.filter(p=>!state.taken.has(p.id) && poolOK(p));
  // ポジションごとの残り需要(全チーム合計)
  const demand = {};
  for(const t of state.parts) for(const d of openSlots(t)) demand[d.grp] = (demand[d.grp]||0)+1;
  const map = {};
  for(const d of SLOT_DEFS){
    if(map[d.grp] !== undefined) continue;
    const costs = avail.filter(p=>eligibleGrp(p,d.grp)).map(p=>p.cost).sort((a,b)=>a-b);
    const k = Math.min(demand[d.grp]||1, costs.length-1); // 需要数+1番目の安値で安全側に見積もる
    map[d.grp] = costs.length ? costs[k] : MIN_COST;
  }
  cheapCache = {size: state.taken.size, map};
  return map;
}
function affordable(t,p){
  const cheap = grpReserveMap();
  const open = openSlots(t).slice();
  // この選手が埋める枠を除外(二刀流はDH+先発の2枠)
  if(p.cat==="B" && p.twoWay){
    const dh = open.findIndex(d=>d.grp==="DH"); if(dh>=0) open.splice(dh,1);
    const sp = open.findIndex(d=>d.grp==="SP"); if(sp>=0) open.splice(sp,1);
  }else{
    const i = open.findIndex(d=>eligibleGrp(p,d.grp)); if(i>=0) open.splice(i,1);
  }
  const reserve = open.reduce((s,d)=>s+cheap[d.grp], 0);
  return p.cost <= budgetLeft(t) - reserve;
}
function canTake(t,p,ignoreCost=false){
  if(state.taken.has(p.id)) return false;
  if(!ignoreCost && !affordable(t,p)) return false;
  const ph = currentPhase();
  // 二刀流は投手ドラフト中に指名(指名打者+先発の2枠を確保)
  if(p.cat==="B" && p.twoWay){
    if(ph==="M") return false;
    return !t.slots.DH && SP_KEYS.some(k=>!t.slots[k]);
  }
  const phaseSlots = openSlots(t).filter(d=>!ph || PHASE_GRPS[ph].includes(d.grp));
  return phaseSlots.some(d=>eligibleGrp(p,d.grp));
}
function assign(t,p){
  if(p.cat==="B" && p.twoWay){
    t.slots.DH = p;
    t.slots[SP_KEYS.find(k=>!t.slots[k])] = p;
    return;
  }
  const d = openSlots(t).find(d=>eligibleGrp(p,d.grp));
  if(d) t.slots[d.key] = p;
}
function validPool(t, respectFr=true){
  let pool = PLAYERS.filter(p=>!state.taken.has(p.id) && poolOK(p) && canTake(t,p));
  let over = false;
  if(!pool.length){ // 資金難で候補ゼロ→特例で予算超過を許可(最安値の選手を拾えるように)
    pool = PLAYERS.filter(p=>!state.taken.has(p.id) && poolOK(p) && canTake(t,p,true));
    over = true;
  }
  if(respectFr && t.fr){
    const sub = pool.filter(p=>p.fr===t.fr);
    if(sub.length) return {pool:sub, lifted:false, over};
    return {pool, lifted:true, over};
  }
  return {pool, lifted:false, over};
}
function currentTeam(){ return state.parts[state.currentIdx]; }

function nextTurn(first=false){
  if(state.parts.every(rosterFull)){ startSeason(); return; }
  const ph = currentPhase();
  // 各部の第1巡はNPB式の入札抽選
  if(ph && !state.partBidDone[ph]){
    startBidRound(ph, state.parts.map((t,i)=>phaseDone(t,ph)?-1:i).filter(i=>i>=0));
    return;
  }
  if(!first) state.turnPtr++;
  for(;;){
    if(state.turnPtr >= state.order.length){ state.turnPtr=0; state.round++; state.order.reverse(); }
    const idx = state.order[state.turnPtr];
    if(!phaseDone(state.parts[idx], ph)){ state.currentIdx = idx; break; }
    state.turnPtr++;
  }
  renderDraft();
  const t = currentTeam();
  if(t.cpu) setTimeout(()=>{ cpuPick(t); }, 300);
}

function renderDraft(){
  if(state.bulk) return;              // 一括自動指名の最中は描画しない
  const t = currentTeam();
  const {lifted, over} = validPool(t);
  const ph = currentPhase();
  const open = openSlots(t).filter(d=>!ph || PHASE_GRPS[ph].includes(d.grp));
  const bidding = state.bid && state.bid.stage === "collect";
  $("d-who").innerHTML = `${teamEmblem(t,26)} ${esc(t.name)} の${bidding?"入札":"指名"}`;
  const openLabels = [...new Set(open.map(d=>d.label))].join("・");
  if(bidding){
    const miss = state.bidMiss;
    const lost = t.lostTo ? `｜<span style="color:#ff8f7a">${esc(t.lostTo)}を逃した</span>` : "";
    $("d-round").innerHTML = `<b style="color:#e2b13c">【${PART_LABEL[state.bid.part]}ドラフト・${miss?"外れ1位":"第1巡"} 入札】</b>選択希望選手を1人選ぶ（重複したら抽選）${lost}｜<b style="color:#e2b13c">残りコスト ${budgetLeft(t)}pt</b>` +
      (t.fr ? `｜${t.fr}縛り${lifted?"（該当選手なし→今回は解除）":""}` : "");
  }else{
    $("d-round").innerHTML = `<b style="color:#e2b13c">【${PHASE_NAME[ph]||"ドラフト"}】</b>第${state.round}巡｜<b style="color:#e2b13c">残りコスト ${budgetLeft(t)}pt</b>｜この部の残り枠: ${openLabels}` +
      (t.fr ? `｜${t.fr}縛り${lifted?"（該当選手なし→今回は解除）":""}` : "") +
      (over ? `｜<span style="color:#ff8f7a">予算不足のため特例で超過契約を許可</span>` : "");
  }
  renderRecs();
  renderWatchRow();
  renderPool();
  renderRosters();
}

// ---- おすすめピック ----
function recommendFor(t){
  const {pool} = validPool(t);
  if(!pool.length) return [];
  const ph = currentPhase();
  const recs = [], used = new Set();
  const add = (label, p) => { if(p && !used.has(p.id)){ used.add(p.id); recs.push({label, p}); } };
  if(ph === "M"){
    add("名将・采配重視", pool.slice().sort((a,b)=>b.ovr-a.ovr)[0]);
    add("育成重視・格安", pool.slice().sort((a,b)=>a.ovr-b.ovr || a.cost-b.cost)[0]);
    add("バランス型", pool.slice().sort((a,b)=>Math.abs(a.ovr-85)-Math.abs(b.ovr-85))[0]);
    return recs.slice(0,3);
  }
  add("即戦力", pool.slice().sort((a,b)=>b.ovr-a.ovr)[0]);
  add("コスパ良", pool.filter(p=>p.ovr>=76).sort((a,b)=>(b.ovr-68)/b.cost-(a.ovr-68)/a.cost)[0]);
  // 残り僅少ポジション
  let scg=null, sc=Infinity;
  for(const d of openSlots(t).filter(d=>PHASE_GRPS[ph].includes(d.grp))){
    if(d.grp==="DH"||d.grp==="BN") continue;
    const c = pool.filter(p=>eligibleGrp(p,d.grp)).length;
    if(c>0 && c<sc){ sc=c; scg=d; }
  }
  if(scg && sc<12) add(`残りわずか・${scg.label}`, pool.filter(p=>eligibleGrp(p,scg.grp)).sort((a,b)=>ovrFor(b,scg.grp)-ovrFor(a,scg.grp))[0]);
  add("覚醒候補・格安", pool.filter(p=>p.cost<=4).sort((a,b)=>b.ovr-a.ovr)[0]);
  return recs.slice(0,4);
}
function renderRecs(){
  const t = currentTeam();
  const el = $("recs");
  if(!t || t.cpu){ el.innerHTML=""; $("recs-wrap").style.display="none"; return; }
  $("recs-wrap").style.display="";
  const recs = recommendFor(t);
  el.innerHTML = recs.map(r=>`
    <div class="pcard rec" onclick="openModal('${r.p.id}')">
      <div class="rec-label">${r.label}</div>
      <div class="pc-row">
        ${avatarBox(r.p, 36)}
        <div class="pc-main">
          <div class="nm">${esc(r.p.name)}${titleBadge(r.p)}</div>
          <div class="meta">${roleLabel(r.p)}・${esc(r.p.team)}・${r.p.year}年 <span style="float:right;color:var(--gold)">${r.p.cost}pt</span></div>
          <div class="meta">${statShort(r.p)}<span style="float:right;">${rankIcon(r.p.ovr, 22)}</span></div>
        </div>
      </div>
    </div>`).join("");
}

function filterMatchesSlot(p, f){
  if(!f) return true;
  if(f==="B") return p.cat==="B";
  if(f==="SP"||f==="RP"||f==="CL") return eligibleGrp(p,f);
  if(f==="MGR") return p.cat==="M";
  return p.cat==="B" && p.pos.includes(f);
}
function renderPool(){
  const t = currentTeam(); if(!t) return;
  const fSlot=$("f-slot").value, fFr=$("f-fr").value, fEra=$("f-era").value, sort=$("f-sort").value;
  const q = ($("f-name").value||"").trim();
  const {pool} = validPool(t);
  let list = pool.filter(p=>filterMatchesSlot(p,fSlot) && (!fFr || p.fr===fFr) && (!fEra || p.decade===fEra) &&
    (!q || p.name.includes(q)));
  if(sort==="ovr") list.sort((a,b)=>b.ovr-a.ovr);
  else if(sort==="year") list.sort((a,b)=>a.year-b.year);
  else if(sort==="cost") list.sort((a,b)=>a.cost-b.cost || b.ovr-a.ovr);
  else list.sort((a,b)=>a.name.localeCompare(b.name,"ja"));
  const LIMIT = 140;
  const shown = list.slice(0, LIMIT);
  $("pool-count").textContent = list.length > LIMIT
    ? `${list.length}名中 ${LIMIT}名を表示（絞り込み・検索で全員に到達できます）`
    : `${list.length}名`;
  $("pool").innerHTML = shown.map(p=>`
    <div class="pcard spine-${p.cat==="M"?"M":p.twoWay?"W":p.cat}" onclick="openModal('${p.id}')">
      <span class="rank-wrap">${rankIcon(p.ovr, 30)}</span>
      ${t.cpu?"":`<span class="wstar ${t.watch.has(p.id)?"on":""}" onclick="event.stopPropagation();toggleWatch('${p.id}')">★</span>`}
      <div class="pc-row">
        ${avatarBox(p)}
        <div class="pc-main">
          <div class="nm">${esc(p.name)}${titleBadge(p)}</div>
          <div class="meta"><span class="pos-badge pos-${p.cat==="M"?"M":p.twoWay?"W":p.cat}">${roleLabel(p)}</span>${handMark(p)}${esc(p.team)}・${p.year}年</div>
          <div class="meta">${statShort(p)}<span style="float:right;color:var(--gold)">${p.cost}pt</span></div>
        </div>
      </div>
    </div>`).join("");
}
// ---- 注目リスト(チームごとの☆。手番が来たらワンタップで呼び出し) ----
function toggleWatch(pid){
  const t = currentTeam();
  if(!t || t.cpu) return;
  if(t.watch.has(pid)) t.watch.delete(pid); else t.watch.add(pid);
  renderWatchRow();
  renderPool();
  if(state.modalPlayer && state.modalPlayer.id === pid) updateWatchBtn();
}
function renderWatchRow(){
  const el = $("watch-row");
  if(!el) return;
  const t = currentTeam();
  if(!t || t.cpu){ el.innerHTML=""; return; }
  const items = [...t.watch].map(id=>findPlayer(id)).filter(p=>p && !state.taken.has(p.id));
  el.innerHTML = items.length ? `<span class="wlabel">★注目リスト</span>` + items.map(p=>
    `<span class="wchip" onclick="openModal('${p.id}')">${esc(p.name)} <span class="sub" style="font-weight:normal;">${p.cost}pt</span></span>`
  ).join("") : "";
}
function updateWatchBtn(){
  const b = $("m-watch");
  if(!b) return;
  const t = currentTeam(), p = state.modalPlayer;
  const usable = $("scr-draft").classList.contains("active") && t && !t.cpu && p && !p.mlb;
  b.style.display = usable ? "" : "none";
  if(usable) b.textContent = t.watch.has(p.id) ? "★ リストから外す" : "☆ リストに入れる";
}
function watchFromModal(){
  if(state.modalPlayer) toggleWatch(state.modalPlayer.id);
}

// 投打(利き腕)の一目表示: 投手=左腕/右腕、野手=左打/右打/両打
function handMark(p){
  if(p.cat==="M") return "";
  if(p.cat==="P") return p.th ? `<span class="hand${p.th==="左"?" lh":""}">${p.th==="左"?"左腕":"右腕"}</span>` : "";
  return p.bh ? `<span class="hand${p.bh!=="右"?" lh":""}">${p.bh}打</span>` : "";
}
// タイトルホルダーの印: 「三冠」印=三冠王 / ★n=主要タイトル獲得数
function titleBadge(p){
  if(p.cat==="M") return "";
  if(p.tc) return ` <span class="seal">三冠</span>${p.titles?`<span class="tbadge">★${p.titles}</span>`:""}`;
  if(p.titles) return ` <span class="tbadge">★${p.titles}</span>`;
  return "";
}
function statShort(p){
  if(p.cat==="M") return `優勝${p.pennants}回・日本一${p.japan}回`;
  if(p.cat==="P"){
    if(p.role==="CL") return `${p.sv}S 防${p.era.toFixed(2)}`;
    if(p.role==="RP") return (p.hld?`${p.hld}H `:`${p.sv}S `)+`防${p.era.toFixed(2)}`;
    return `${p.w}勝 防${p.era.toFixed(2)}`;
  }
  return `${avg3(p.avg)} ${p.hr}本 ${p.rbi}打点`;
}

function renderRosters(){
  $("d-rosters").innerHTML = state.parts.map((t,i)=>{
    const secs = [["首脳陣",["MGR"]],["スタメン",LINEUP_KEYS],["控え",BENCH_KEYS],["投手",["SP1","SP2","SP3","SP4","RP1","RP2","CL"]]];
    let html = "";
    for(const [sec,keys] of secs){
      html += `<div class="sec">${sec}</div>`;
      for(const k of keys){
        const d = SLOT_DEFS.find(x=>x.key===k);
        const p = t.slots[k];
        html += `<div class="slot ${p?"":"empty"}" onclick="slotFilter('${d.grp}')"><span class="sl">${d.label}</span>${
          p ? `<b>${esc(p.name)}</b>${titleBadge(p)} <span style="opacity:.6">('${String(p.year).slice(2)}・${p.cost}pt)</span>${p.awakened?" <span class='seal g'>覚</span>":""}${p.traded?" <span class='seal b'>交</span>":""}${p.joined!==undefined?" <span class='seal b'>米</span>":""}` : "<span style='color:#a72c1866'>─ 空き ─</span>"}</div>`;
      }
    }
    return `<div class="roster-box ${i===state.currentIdx?"turn":""}">
      <h4>${teamEmblem(t,20)} ${esc(t.name)} <span class="tag" style="color:var(--gold)">残${budgetLeft(t)}pt</span>${t.fr?` <span class="tag">${t.fr}縛り</span>`:""}</h4>${html}</div>`;
  }).join("");
}
function slotFilter(grp){
  const map = {"MGR":"MGR","捕":"捕","一":"一","二":"二","三":"三","遊":"遊","外":"外","DH":"B","BN":"B","SP":"SP","RP":"RP","CL":"CL"};
  if($("f-slot").querySelector(`option[value="MGR"]`)===null){
    const o=document.createElement("option"); o.value="MGR"; o.textContent="監督"; $("f-slot").appendChild(o);
  }
  $("f-slot").value = map[grp] ?? "";
  renderPool();
}

// ---- モーダル ----
function findPlayer(id){ return PLAYERS.find(x=>x.id===id) || MLB_STARS.find(x=>x.id===id); }
function openModal(id){
  const p = findPlayer(id); if(!p) return;
  state.modalPlayer = p;
  $("m-name").innerHTML = `<span class="m-av">${avatarBox(p, 52)}</span>${esc(p.name)} <span style="font-size:14px;color:var(--sub)">（${p.year}年・${esc(p.team)}）</span>`;
  $("m-tags").innerHTML = `<span class="tag">${roleLabel(p)}</span>` +
    ((p.th||p.bh)?`<span class="tag">${p.th||"？"}投${p.bh||"？"}打</span>`:"") +
    `<span class="tag">${p.decade}</span>` +
    (p.mlb?`<span class="tag">MLB</span>`:`<span class="tag">系譜：${p.fr}</span>`) + `<span class="tag">能力 ${rankOf(p.ovr)}</span>` +
    `<span class="tag" style="color:var(--gold)">コスト ${p.cost}pt</span>` +
    (p.tc?`<span class="tag" style="color:var(--red);border-color:var(--red);">三冠王</span>`:"") +
    (p.titles?`<span class="tag">主要タイトル ${p.titles}回</span>`:"");
  let s;
  if(p.cat==="M"){
    s = `リーグ優勝 ${p.pennants}回 ／ 日本一 ${p.japan}回 ／ 監督通算 ${p.wins}勝<br>` +
        `采配補正 ${((p.ovr-85)*0.10>=0?"+":"")}${((p.ovr-85)*0.10).toFixed(1)} ／ 育成力 ${devStars(p)}` +
        `<span style="font-size:12px;color:var(--sub)">（育成力が高いほど開幕時に選手が覚醒しやすい）</span>`;
  }else if(p.cat==="P"){
    s = `${p.w}勝 ／ 防御率 ${p.era.toFixed(2)} ／ ${p.so}奪三振` + (p.sv?` ／ ${p.sv}セーブ`:"") + (p.hld?` ／ ${p.hld}ホールド`:"");
  }else{
    s = `打率 ${avg3(p.avg)} ／ ${p.hr}本塁打 ／ ${p.rbi}打点` + (p.sb>=10?` ／ ${p.sb}盗塁`:"");
    if(p.twoWay) s += `<br>投手として：${p.twoWay.w}勝 ／ 防御率 ${p.twoWay.era.toFixed(2)} ／ ${p.twoWay.so}奪三振`;
  }
  $("m-stats").innerHTML = `${p.year}年${p.cat==="M"?"":"（キャリアハイ）"}<br>${s}`;
  $("m-desc").textContent = p.desc;
  const t = currentTeam();
  const canPick = $("scr-draft").classList.contains("active") && t && !t.cpu && !p.mlb &&
    (canTake(t,p) || (validPool(t).over && canTake(t,p,true)));
  $("m-pick").style.display = canPick ? "" : "none";
  $("m-pick").textContent = (state.bid && state.bid.stage==="collect") ? "この選手に入札する" : "この選手を指名";
  updateWatchBtn();
  $("modal-bg").classList.add("show");
}
function closeModal(){ $("modal-bg").classList.remove("show"); }
function pickFromModal(){
  const t = currentTeam(), p = state.modalPlayer;
  if(!t || t.cpu) return;
  if(!canTake(t,p) && !(validPool(t).over && canTake(t,p,true))) return;
  closeModal();
  if(state.bid && state.bid.stage === "collect"){ registerBid(p); return; }
  doPick(t,p);
}
function assignPick(t,p){
  state.taken.add(p.id);
  t.spent += p.cost;
  assign(t,p);
}
function announceLine(kicker, html){
  const el = $("d-announce");
  if(!el) return;
  el.innerHTML = `<span class="an-k">${kicker}</span>${html}`;
  el.classList.remove("flash");
  void el.offsetWidth; // アニメーション再トリガー
  el.classList.add("flash");
}
function pickAnnounce(t, p, label){
  announceLine("指名", `${label} ―― ${esc(t.name)}、<b>${esc(p.name)}</b>（${roleLabel(p)}・${esc(p.team)} '${String(p.year).slice(2)}）`);
}
function doPick(t,p){
  assignPick(t,p);
  seTap();
  pickAnnounce(t, p, "ウェーバー指名");
  nextTurn();
}

// ---- CPU / おまかせ ----
function bestPickFor(t){
  const {pool, over} = validPool(t);
  if(!pool.length) return null;
  if(over){ // 予算超過の特例時は最安値優先
    return pool.slice().sort((a,b)=>a.cost-b.cost || b.ovr-a.ovr)[0];
  }
  const open = openSlots(t);
  const grps = [...new Set(open.map(d=>d.grp))];
  // 希少ポジション優先
  let scarce = null, scarceCount = Infinity;
  for(const g of grps){
    const cands = pool.filter(p=>eligibleGrp(p,g) || (g==="DH"&&p.twoWay));
    if(cands.length && cands.length < scarceCount){ scarceCount = cands.length; scarce = {g, cands}; }
  }
  let cands;
  if(scarce && scarceCount < 10){
    cands = scarce.cands.slice().sort((a,b)=>ovrFor(b,scarce.g)-ovrFor(a,scarce.g));
  }else{
    cands = pool.slice().sort((a,b)=>b.ovr-a.ovr);
  }
  // 予算ペース配分: 残り予算に対して高すぎる選手は避ける(序盤の使いすぎ防止)
  const perSlot = budgetLeft(t) / Math.max(1, openSlots(t).length);
  const paced = cands.filter(p=>p.cost <= perSlot*2.4);
  if(paced.length) cands = paced;
  const top = cands.slice(0, Math.min(4,cands.length));
  return top[Math.floor(rnd()*top.length)];
}
function cpuPick(t){
  if(state.parts.every(rosterFull) || rosterFull(t) || currentTeam()!==t) return;
  const p = bestPickFor(t);
  if(!p){ nextTurn(); return; }
  doPick(t,p);
}
function autoPick(){
  const t = currentTeam();
  if(!t || t.cpu) return;
  const p = bestPickFor(t);
  if(!p) return;
  if(state.bid && state.bid.stage === "collect"){ registerBid(p); return; }
  doPick(t,p);
}
function autoAll(){
  state.bulk = true;
  try{ autoAllInner(); } finally { state.bulk = false; }
  if(!state.parts.every(rosterFull)) renderDraft();
}
function autoAllInner(){
  let guard = 500;
  while(!state.parts.every(rosterFull) && guard-->0){
    const ph = currentPhase();
    if(ph && !state.partBidDone[ph]){
      // 入札途中でも残りをCPUロジックで埋めて即時解決
      const carried = (state.bid && state.bid.part===ph && state.bid.stage==="collect") ? state.bid : null;
      const bids = carried ? {...carried.bids} : {};
      const pending = carried ? carried.pending : state.parts.map((t,i)=>phaseDone(t,ph)?-1:i).filter(i=>i>=0);
      for(const i of pending){
        if(bids[i] === undefined){ state.currentIdx = i; const p = bestPickFor(state.parts[i]); if(p) bids[i] = p; }
      }
      quietResolveFromBids(ph, bids);
      state.partBidDone[ph] = true;
      state.bid = null;
      $("curtain-bg").classList.remove("show");
      $("event-bg").classList.remove("show");
      continue;
    }
    if(state.currentIdx < 0 || rosterFull(currentTeam())){ nextTurn(true); continue; }
    const t = currentTeam();
    const p = bestPickFor(t);
    if(!p){ nextTurn(); continue; }
    doPick(t,p);
  }
  if(state.parts.every(rosterFull)) startSeason();
}

// ============================================================
// 入札抽選ドラフト(各部の第1巡はNPB式: 入札 → 重複したら抽選くじ)
// ============================================================
const PART_LABEL = {M:"監督", P:"投手", B:"野手"};
function startBidRound(part, teamIdxs){
  state.bid = {part, pending:teamIdxs, bids:{}, ptr:0, stage:"collect", losers:[]};
  if(state.partBidDone && !state.bidMiss) state.parts.forEach(function(t){ t.lostTo = null; });
  if(state.bidMiss){
    const nm = teamIdxs.map(function(i){ return state.parts[i].name; }).join("・");
    announceLine("外れ1位", `${nm} が外れ1位指名へ。悔しさを胸に、次の1人を選ぶ`);
  }else{
    announceLine("入札", `${PART_LABEL[part]}ドラフト第1巡 ―― 各球団、選択希望選手の入札に入ります`);
  }
  bidShowNext();
}
function curtain(title, sub, btnLabel, cb){
  $("c-title").textContent = title;
  $("c-sub").innerHTML = sub;
  const b = $("c-btn");
  b.textContent = btnLabel;
  b.onclick = ()=>{ $("curtain-bg").classList.remove("show"); cb(); };
  $("curtain-bg").classList.add("show");
}
function bidShowNext(){
  const bid = state.bid;
  while(bid.ptr < bid.pending.length){
    const idx = bid.pending[bid.ptr];
    const t = state.parts[idx];
    if(t.cpu){
      state.currentIdx = idx;
      const p = bestPickFor(t);
      if(p) bid.bids[idx] = p;
      bid.ptr++;
      continue;
    }
    state.currentIdx = idx;
    const miss = state.bidMiss;
    curtain(miss ? `${t.name} の外れ1位指名` : `${t.name} の入札`,
      miss
        ? `${t.lostTo ? `<b>${esc(t.lostTo)}</b>の交渉権を逃しました。<br>` : ""}気持ちを切り替えて、次の1人を選んでください。`
        : `他の人に画面が見えないように端末を受け取ってください。<br>選択希望選手が重複した場合は<b>抽選</b>になります。`,
      miss ? "外れ1位を指名する" : "入札をはじめる", ()=>{ renderDraft(); });
    return;
  }
  resolveBids();
}
function registerBid(p){
  const bid = state.bid;
  bid.bids[bid.pending[bid.ptr]] = p;
  bid.ptr++;
  seTap();
  const remainHuman = bid.pending.slice(bid.ptr).some(i=>!state.parts[i].cpu);
  curtain("入札を受理しました",
    remainHuman ? "端末を伏せて、次の方へお回しください。" : "全球団の入札が出揃いました。",
    remainHuman ? "次の球団へ" : "選択希望選手を発表する",
    ()=>{ bidShowNext(); });
}
function resolveBids(){
  const bid = state.bid;
  bid.stage = "reveal";
  const groups = {};
  for(const [idx, p] of Object.entries(bid.bids)){
    (groups[p.id] = groups[p.id] || []).push(Number(idx));
  }
  bid.groups = groups;
  const rows = Object.entries(groups).map(([pid, idxs])=>{
    const p = findPlayer(pid);
    const dup = idxs.length > 1;
    return idxs.map(i=>{
      const t = state.parts[i];
      return `<tr><td style="width:32%;"><span style="color:${t.color}">●</span> ${esc(t.name)}</td>
        <td class="bp">${esc(p.name)}${titleBadge(p)} <span class="sub">（${roleLabel(p)}・${esc(p.team)}）</span></td>
        <td style="width:16%;">${dup ? '<span class="dup">重複 ─ 抽選</span>' : '単独'}</td></tr>`;
    }).join("");
  }).join("");
  const anyDup = Object.values(groups).some(g=>g.length>1);
  $("event-panel").innerHTML = `
    <h2><span class="kicker">運命の瞬間</span>${PART_LABEL[bid.part]}ドラフト第1巡 ── 選択希望選手 発表</h2>
    <table class="bid-table">${rows}</table>
    <div style="margin-top:16px;text-align:right;">
      <button class="btn" onclick="revealProceed()">${anyDup ? "抽選会場へ" : "交渉権確定"}</button>
    </div>`;
  $("event-bg").classList.add("show");
}
function revealProceed(){
  const bid = state.bid;
  bid.queue = Object.entries(bid.groups).map(([pid, idxs])=>({p:findPlayer(pid), idxs}));
  bid.qi = 0;
  nextBidResolution();
}
function nextBidResolution(){
  const bid = state.bid;
  while(bid.qi < bid.queue.length){
    const g = bid.queue[bid.qi];
    if(g.idxs.length === 1){
      const t = state.parts[g.idxs[0]];
      assignPick(t, g.p);
      pickAnnounce(t, g.p, "第1巡・単独指名");
      bid.qi++;
      continue;
    }
    startLottery(g);
    return;
  }
  finishBidRound();
}
function lotteryHeat(n){
  if(n >= 5) return {k:"大混戦", cls:"heat5", msg:n+"球団が競合！ 会場がどよめく"};
  if(n === 4) return {k:"4球団競合", cls:"heat4", msg:"4球団が名乗りを上げた。ざわめきが止まらない"};
  if(n === 3) return {k:"3球団競合", cls:"heat3", msg:"3球団が競合。抽選の行方に注目が集まる"};
  return {k:"抽選", cls:"heat2", msg:"2球団が競合。運命の抽選へ"};
}
function startLottery(g){
  const bid = state.bid;
  const order = shuffle(g.idxs);
  const winner = order[Math.floor(rnd()*order.length)];
  bid.lot = {g, order, winner, drawn:0, opened:false};
  const heat = lotteryHeat(g.idxs.length);
  const p = g.p;
  $("event-panel").innerHTML =
    '<h2><span class="kicker">' + heat.k + '</span>' + esc(p.name) + ' ── 交渉権抽選</h2>' +
    '<div class="lot-hero ' + heat.cls + '">' +
      '<div class="lh-av">' + avatarBox(p, 46) + '</div>' +
      '<div class="lh-main">' +
        '<div class="lh-n">' + esc(p.name) + titleBadge(p) + '</div>' +
        '<div class="lh-s">' + roleLabel(p) + '　' + esc(p.team) + '　' + p.year + '年　' + statShort(p) + '</div>' +
      '</div>' +
      '<div class="lh-c">' + g.idxs.length + '<span>球団</span></div>' +
    '</div>' +
    '<div class="sub lot-msg">' + heat.msg + ' ―― 各球団、封筒から抽選券を引いてください（まだ開けないこと）</div>' +
    '<div class="kuji-row">' +
    order.map(function(idx,i){
      const t = state.parts[idx];
      const luck = lotLuckLabel(t);
      return '<div class="kuji" id="kuji-' + i + '" onclick="kujiDraw(' + i + ')">' +
        '<div class="env">' +
          '<div class="slip ' + (idx===winner?"win":"") + '"><span class="sl-t">' + (idx===winner?"当":"外") + '</span></div>' +
          '<div class="env-front">選択希望選手</div>' +
        '</div>' +
        '<div class="t-name"><span style="color:' + t.color + '">●</span> ' + esc(t.name) + '</div>' +
        (luck ? '<div class="t-luck">' + luck + '</div>' : '') +
      '</div>';
    }).join("") +
    '</div>' +
    '<div class="kuji-result" id="kuji-result"></div>' +
    '<div style="text-align:right;">' +
      '<button class="btn" id="kuji-open" style="display:none;" onclick="kujiOpenAll()">一斉に開封する</button>' +
      '<button class="btn" id="kuji-next" style="display:none;" onclick="lotteryDone()">交渉権確定</button>' +
    '</div>';
  $("event-bg").classList.add("show");
}
function lotLuckLabel(t){
  const l = t.lotLose || 0;
  if(l >= 3) return "抽選" + l + "連敗中";
  if(l === 2) return "2度続けて涙";
  if((t.lotWin||0) >= 2) return "くじ運" + t.lotWin + "連勝";
  return "";
}
// 第1段階: 封筒から引く(中身は伏せたまま)
function kujiDraw(i){
  const lot = state.bid && state.bid.lot;
  if(!lot || lot.opened) return;
  const el = $("kuji-"+i);
  if(!el || el.classList.contains("drawn") || el.classList.contains("drawing")) return;
  el.classList.add("drawing");
  seTap();
  lot.drawn++;
  setTimeout(function(){
    el.classList.remove("drawing");
    el.classList.add("drawn");
    if(lot.drawn >= lot.order.length){
      const b = $("kuji-open");
      if(b){ b.style.display = ""; }
      const m = document.querySelector(".lot-msg");
      if(m) m.textContent = "全球団が引き終えました。息を合わせて、一斉に開封します";
    }
  }, 340);
}
// 第2段階: 全員同時に開封(ドラムロール→無音→開封)
function kujiOpenAll(){
  const lot = state.bid && state.bid.lot;
  if(!lot || lot.opened) return;
  lot.opened = true;
  const ob = $("kuji-open"); if(ob) ob.style.display = "none";
  const m = document.querySelector(".lot-msg");
  const n = lot.order.length;
  const roll = 900 + n * 220;   // 競合が多いほど長く溜める
  if(m) m.textContent = "――― 運命の瞬間 ―――";
  seRollStart();
  setTimeout(function(){
    seRollStop();                 // 一拍の無音を置く
    setTimeout(function(){
      lot.order.forEach(function(idx, i){
        const el = $("kuji-"+i);
        if(el) el.classList.add("opened");
      });
      const wt = state.parts[lot.winner];
      seWin();
      if(m) m.textContent = "";
      $("kuji-result").innerHTML =
        '<span class="kr-win">交渉権獲得</span><span style="color:' + wt.color + '">●</span> ' + esc(wt.name) +
        (n >= 4 ? '　<span class="kr-note">' + n + '球団競合を制した</span>' : '');
      const losers = lot.order.filter(function(x){ return x !== lot.winner; })
        .map(function(x){ return state.parts[x]; });
      const cry = losers.filter(function(t){ return (t.lotLose||0) >= 2; });
      if(cry.length){
        $("kuji-result").innerHTML += '<div class="kr-cry">' + esc(cry[0].name) + 'は' + ((cry[0].lotLose||0)+1) + '度続けて抽選を外した…</div>';
      }
      setTimeout(function(){ const b = $("kuji-next"); if(b) b.style.display = ""; }, 700);
    }, 700);
  }, roll);
}
function lotteryDone(){
  seRollStop();
  const bid = state.bid;
  const lot = bid.lot;
  const wt = state.parts[lot.winner];
  wt.lotWin = (wt.lotWin||0) + 1;
  wt.lotLose = 0;
  assignPick(wt, lot.g.p);
  pickAnnounce(wt, lot.g.p, '第1巡・' + lot.g.idxs.length + '球団競合の抽選を制し');
  for(const idx of lot.g.idxs){
    if(idx !== lot.winner){
      const t = state.parts[idx];
      t.lotLose = (t.lotLose||0) + 1;
      t.lotWin = 0;
      t.lostTo = lot.g.p.name;
      bid.losers.push(idx);
    }
  }
  bid.qi++;
  nextBidResolution();
}
function finishBidRound(){
  const bid = state.bid;
  $("event-bg").classList.remove("show");
  if(bid.losers.length){
    state.bidMiss = true;
    startBidRound(bid.part, bid.losers);
    return;
  }
  state.bidMiss = false;
  state.partBidDone[bid.part] = true;
  state.bid = null;
  announceLine("実況", `${PART_LABEL[bid.part]}ドラフト第1巡、全球団の交渉権が確定。2巡目以降はウェーバー方式で進行します`);
  nextTurn(true);
}
// 「全員おまかせ」用: 入札→抽選をまとめて即時解決
function quietResolveFromBids(part, bids){
  let guard = 25;
  let cur = bids;
  for(;;){
    const groups = {};
    for(const [i, p] of Object.entries(cur)) (groups[p.id] = groups[p.id] || []).push(Number(i));
    const losers = [];
    for(const [pid, idxs] of Object.entries(groups)){
      const winner = idxs[Math.floor(rnd()*idxs.length)];
      const p = findPlayer(pid);
      if(p && !state.taken.has(p.id)) assignPick(state.parts[winner], p);
      for(const i of idxs) if(i !== winner) losers.push(i);
    }
    if(!losers.length || guard--<=0) break;
    cur = {};
    for(const i of losers){ state.currentIdx = i; const p = bestPickFor(state.parts[i]); if(p) cur[i] = p; }
    if(!Object.keys(cur).length) break;
  }
}

// ============================================================
// チーム力
// ============================================================
function mgrBonus(t){
  const m = t.slots.MGR;
  if(!m) return 0;
  if(t.mgrRest) return -1.0; // 監督休養中はヘッドコーチ代行
  return (m.ovr-85)*0.10;
}
function morale(t){ return (t.mood && state.day < t.mood.until) ? t.mood.val : 0; }
function moodSet(t, val, days, label){ t.mood = {until: state.day + days, val, label}; }
function fw(p){ return (p && p.form ? p.form : 0) * 1.3; } // 調子の波
// 離脱中の選手は数えない。抜けた枠は控えが埋め、控えも尽きれば戦力が落ちる
function teamAtt(t){
  let s = 0;
  const line = activeLineup(t);
  for(const p of line) s += p.ovr + fw(p);
  if(line.length < 9) s += (line.length ? s/line.length : 70) * (9 - line.length) * 0.72;
  const restBench = benchOf(t).filter(p=>!isOut(p) && line.indexOf(p) < 0);
  for(const p of restBench) s += (p.ovr + fw(p)) * 0.25;
  return s/9.75 + mgrBonus(t) + morale(t);
}
function teamDef(t){
  const sub = (keys, grp, div) => {
    const ps = keys.map(k=>t.slots[k]).filter(p=>p && !isOut(p));
    if(!ps.length) return 66;                       // 総崩れ
    const v = ps.reduce((a,p)=>a+ovrFor(p,grp)+fw(p),0) / ps.length;
    return v - (keys.length - ps.length) * 2.4;     // 頭数が足りない分の目減り
  };
  const sp = sub(SP_KEYS, "SP");
  const rp = sub(RP_KEYS, "RP");
  const cl = isOut(t.slots.CL) ? sub(RP_KEYS, "CL") - 3 : ovrFor(t.slots.CL,"CL") + fw(t.slots.CL);
  return sp*0.60 + rp*0.25 + cl*0.15 + mgrBonus(t) + morale(t);
}
// 調子の波: 約2週間ごとに引き直し
function rollForms(){
  for(const t of state.parts){
    for(const d of SLOT_DEFS){
      if(d.key==="MGR") continue;
      const p = t.slots[d.key];
      if(!p) continue;
      const r = rnd();
      p.form = r<0.08 ? 2 : r<0.30 ? 1 : r<0.70 ? 0 : r<0.92 ? -1 : -2;
    }
  }
}
// 故障中のバッジ。復帰までの日数を出す
function injBadge(p){
  if(!p || !p.inj) return "";
  const left = Math.max(0, p.inj.until - state.day);
  return '<span class="inj-b" title="' + esc(p.inj.label) + '">離脱 あと' + left + '日</span>';
}
function formIcon(p){
  const f = p && p.form ? p.form : 0;
  if(f===2) return `<span class="form f2">▲▲</span>`;
  if(f===1) return `<span class="form f1">▲</span>`;
  if(f===-1) return `<span class="form fm1">▽</span>`;
  if(f===-2) return `<span class="form fm2">▽▽</span>`;
  return `<span class="form f0">─</span>`;
}

// ============================================================
// ペナントレース
// ============================================================
// 開幕時の覚醒判定: 安い(ランクが低い)選手ほど化ける可能性がある。育成型監督で確率アップ
function rollAwakenings(){
  const woke = [];
  for(const t of state.parts){
    const mult = devMult(t);
    const done = new Set();
    for(const d of SLOT_DEFS){
      if(d.key==="MGR") continue;
      const p = t.slots[d.key];
      if(!p || done.has(p.id)) continue;
      done.add(p.id);
      const r = rankOf(p.ovr);
      const base = r==="C"?0.20 : r==="B"?0.11 : r==="A"?0.04 : r==="S"?0.01 : 0;
      if(rnd() < base*mult){
        const up = 3 + Math.floor(rnd()*5);
        p.ovr = Math.min(99, p.ovr + up);
        if(p.pitOvr) p.pitOvr = Math.min(99, p.pitOvr + up - 1);
        p.awakened = true;
        woke.push({t, p, up});
      }
    }
  }
  woke.forEach((w, i)=>{
    const m = w.t.slots.MGR;
    const txt = `【覚醒】${w.p.name}（${w.t.name}）がキャンプで大化け！` + (m?` ${m.name}監督の育成が実を結ぶ`:"");
    state.news.unshift({mo:"4月", txt});
    if(i < 2) telop(txt);
  });
  return woke.length;
}

// ---- 日程表(総当たりカレンダー方式) ----
// NPBにならい3連戦を単位に組む。同一カードが3日続き、カードの切れ目に移動日が入る。
// [a,b] の b がホーム(aが表の攻撃=ビジター)。3連戦ごとにホームを入れ替える
function buildSchedule(n, cycles){
  const ids = [...Array(n).keys()];
  if(n % 2) ids.push(-1);          // 奇数なら1球団が休み
  const m = ids.length;
  const rounds = [];
  const arr = ids.slice();
  for(let r=0; r<m-1; r++){
    const games = [];
    for(let i=0; i<m/2; i++){
      const a = arr[i], b = arr[m-1-i];
      if(a !== -1 && b !== -1) games.push([a, b]);
    }
    rounds.push(games);
    arr.splice(1, 0, arr.pop());
  }
  const days = [];
  const series = Math.max(1, Math.round(cycles / 3));   // 3連戦を何巡ぶん組むか
  for(let c=0; c<series; c++){
    for(let ri=0; ri<rounds.length; ri++){
      // 巡ごとにホームとビジターを入れ替える
      const card = rounds[ri].map(([a,b]) => (c % 2 === 0 ? [a,b] : [b,a]));
      for(let g=0; g<3; g++) days.push(card);
      days.push([]);                                    // カードの切れ目は移動日
    }
  }
  return days;
}
function monthOfDay(d){ return Math.min(6, Math.floor(d*7/state.schedule.length)); }
function dateLabel(d){
  const total = state.schedule.length;
  const start = new Date(2026, 3, 1).getTime();
  const dt = new Date(start + (total<=1 ? 0 : d/(total-1)) * 190*86400000);
  return (dt.getMonth()+1) + "月" + dt.getDate() + "日";
}

function startSeason(){
  const n = state.parts.length;
  state.pairGames = clamp(Math.round(143/(n-1)), 8, 143); // NPBと同じ143試合基準
  state.schedule = buildSchedule(n, state.pairGames);
  // 実際に組まれた試合数(移動日ぶん日程は伸びる)
  state.gamesPer = state.schedule.reduce((a,d)=>a+d.length, 0) * 2 / n;
  state.day = 0; state.news = []; state.lastScores = [];
  state.partyLog = []; state.choiceCount = 0;
  state.playing = false; state.timer = null; state.finished = false;
  state.monthsCompleted = -1; state.resumeAfterEvent = false;
  state.eventQueue = [];
  initEngagement();
  state.scored = false; state.scoreBoard = null; state.predicted = false;
  // 月例ルーレット(毎月末)
  [0,2,4].forEach(function(m){ state.eventQueue.push({after:m, type:"roulette", no:m}); });  // 2か月に1回
  if(state.opts.trade) state.eventQueue.push({after:2, type:"trade"});
  if(state.opts.mlb) state.eventQueue.push({after:3, type:"mlb"});
  const wokeCount = rollAwakenings();
  initSeasonStats();
  rollForms();
  state.rosterTab = 0;
  show("scr-season");
  renderTeamStrip();
  renderStandings("standings");
  renderLeaders();
  renderRosterLive();
  renderPartyLog();
  renderChart();
  renderNews();
  $("s-date").textContent = "開幕前";
  $("s-play").textContent = "プレイボール";
  $("s-play").disabled = false; $("s-skip").disabled = false;
  if($("s-games")) $("s-games").innerHTML = "";
  const ev = [];
  if(wokeCount) ev.push(`キャンプで${wokeCount}人が覚醒`);
  if(state.opts.trade) ev.push("6月末にトレードタイム");
  if(state.opts.mlb) ev.push("7月末にMLBスター補強（最下位チームから指名）");
  $("s-note").textContent = `${n}球団・各チーム${Math.round(state.gamesPer)}試合を自動でシミュレート。3連戦制、カードの切れ目は移動日。` + (ev.length ? ev.join("、")+"。" : "");
}

// ---- 自動進行 ----
function speedMs(){ return Number($("s-speed").value) || 220; }
function startTimer(){
  if(state.timer) clearInterval(state.timer);
  state.playing = true;
  state.timer = setInterval(tick, speedMs());
  $("s-play").textContent = "一時停止";
}
function stopTimer(){
  if(state.timer) clearInterval(state.timer);
  state.timer = null; state.playing = false;
  $("s-play").textContent = state.finished ? (state.seriesDone ? "結果発表へ" : "日本シリーズへ") : "再開";
}
function changeSpeed(){ if(state.playing) startTimer(); }
function togglePlay(){
  if(state.finished){
    if(!state.seriesDone){ startSeries(); return; }
    showResult(); return;
  }
  if(state.playing) stopTimer(); else startTimer();
}
function checkClinch(){
  if(state.clinchedTeam || state.day < state.schedule.length*0.4) return null;
  const s = standingsSorted();
  if(s.length < 2) return null;
  const rem = state.schedule.length - state.day;
  const gb = ((s[0].W - s[1].W) + (s[1].L - s[0].L)) / 2;
  if(gb > rem){
    state.clinchedTeam = s[0];
    const txt = `【優勝決定】${s[0].name}がリーグ制覇を確定！`;
    state.news.unshift({mo: dateLabel(state.day-1), txt});
    telop(txt);
    return s[0];
  }
  return null;
}

// ============================================================
// 故障者リスト ── 離脱中は出場せず、成績も積み上がらない
// ============================================================
const INJURIES = [
  {label:"右手首の炎症",   min:6,  max:14},
  {label:"左脇腹の肉離れ", min:14, max:32},
  {label:"右膝の違和感",   min:5,  max:12},
  {label:"死球による骨折", min:24, max:52},
  {label:"腰痛",           min:8,  max:20},
  {label:"右肘の張り",     min:10, max:26},
  {label:"ハムストリング", min:12, max:28},
  {label:"自打球の打撲",   min:4,  max:10},
];
// 選手を離脱させる。日数は部位ごとの幅から引く
function injurePlayer(t, p, forced){
  if(!p || p.inj) return null;
  const k = forced || pick1(INJURIES);
  const days = k.min + Math.floor(rnd() * (k.max - k.min + 1));
  const back = Math.min(state.schedule.length, state.day + days);
  p.inj = {label:k.label, until:back, days};
  p.injMissed = (p.injMissed || 0);
  return p.inj;
}
function isOut(p){ return !!(p && p.inj); }
// 離脱者を除いた実働のスタメン。抜けた枠は控えが埋める
function activeLineup(t){
  const out = [];
  const bench = benchOf(t).filter(p=>!isOut(p));
  let bi = 0;
  for(const k of orderKeys(t)){
    const p = t.slots[k];
    if(!p) continue;
    if(isOut(p)){
      if(bi < bench.length) out.push(bench[bi++]);   // 控えが穴を埋める
    }else out.push(p);
  }
  return out;
}
function activePitchers(t){
  return [...rotKeys(t), ...RP_KEYS, "CL"].map(k=>t.slots[k]).filter(p=>p && !isOut(p));
}
// 毎日1つ進める。復帰日を迎えた選手は戻る
function advanceInjuries(){
  for(const t of state.parts){
    for(const k of Object.keys(t.slots)){
      const p = t.slots[k];
      if(!p || !p.inj) continue;
      p.injMissed = (p.injMissed || 0) + 1;
      if(state.day >= p.inj.until){
        const lab = p.inj.label;
        p.inj = null;
        p.form = Math.max(-1, (p.form || 0) - 1);      // 復帰直後は本調子ではない
        partyNews("復", "good", `【復帰】${p.name}（${t.name}）が${lab}から復帰。一軍に登録された`, null, t);
      }
    }
  }
}
// 離脱の抽選。1日あたり全体で数%
function rollInjury(){
  if(!state.opts.injury) return;
  if(state.day < 4) return;
  if(rnd() > 0.055) return;
  const t = pick1(state.parts);
  const cands = [...lineupOf(t), ...pitchersOf(t)].filter(p=>!isOut(p));
  if(cands.length < 12) return;                        // 手薄なチームは狙わない
  const p = pick1(cands);
  const inj = injurePlayer(t, p);
  if(!inj) return;
  partyNews("傷", "bad",
    `【離脱】${p.name}（${t.name}）が${inj.label}で登録抹消。復帰まで約${inj.days}日の見込み`, null, t);
  renderRosterLive();
}
// 離脱ぶんを差し引いた出場率。成績の按分に使う
function playRate(p){
  const total = (state.schedule && state.schedule.length) || 1;
  return clamp(1 - (p.injMissed || 0) / total, 0, 1);
}

// ============================================================
// 本拠地球場 ── ドラフトで1つ選ぶ。得点と本塁打の出方が変わる
// ============================================================
// run は実際のパークファクター(NPBは2025年時点の5年平均、MLBは近年の得点指数)を
// そのまま使う。hr は各球場の寸法と癖から起こした値。1.00が平均
const PARKS = [
  // ---- NPB 現行 ----
  {id:"escon", cat:"NPB", name:"エスコンフィールド北海道", type:"開閉屋根・天然芝", hr:1.14, run:1.15,
   note:"2023年開業。両翼97m・中堅121m。開場時は本塁からバックネットまでが規定の60フィートに満たず、改修せず使用が認められた。NPBで最も打者有利",
   good:"打線全般", bad:"投手陣"},
  {id:"jingu", cat:"NPB", name:"明治神宮野球場", type:"屋外・人工芝", hr:1.15, run:1.13,
   note:"1926年開場。両翼97.5m・中堅120m と狭く、風も打球を運ぶ。打ち合いになりやすい球場の代表",
   good:"長距離砲", bad:"技巧派の投手"},
  {id:"hama", cat:"NPB", name:"横浜スタジアム", type:"屋外・人工芝", hr:1.10, run:1.10,
   note:"1978年開場。両翼94m・中堅118m。左右が狭く、スタンドが近いぶん本塁打も歓声もよく出る",
   good:"引っ張る打者", bad:"制球の甘い投手"},
  {id:"zozo", cat:"NPB", name:"ZOZOマリンスタジアム", type:"屋外・人工芝", hr:1.08, run:1.10,
   note:"海からの強風で日によって別の球場になる。2019年のホームランラグーン設置で本塁打が急増し、パークファクターは0.87から1.2台へ跳ね上がった",
   good:"風を読む打者", bad:"計算の立たない投手"},
  {id:"paypay", cat:"NPB", name:"福岡PayPayドーム", type:"屋内・人工芝", hr:0.98, run:1.01,
   note:"両翼100m・中堅122m。屋内で条件が一定。ホームランテラス設置後もおおむね中立",
   good:"総合力", bad:"特になし"},
  {id:"mazda", cat:"NPB", name:"MAZDA Zoom-Zoomスタジアム広島", type:"屋外・天然芝", hr:0.99, run:1.00,
   note:"2009年開業。左右非対称で、右翼が浅く左翼が深い。天然芝の広い外野を守る力が要る",
   good:"左の引っ張り・外野守備", bad:"右の大砲"},
  {id:"tokyodome", cat:"NPB", name:"東京ドーム", type:"屋内・人工芝", hr:1.06, run:0.98,
   note:"1988年開場、日本初の屋根付き球場。両翼100m・中堅122mだがフェンスが低く、本塁打はよく出る",
   good:"長距離砲", bad:"フライボール投手"},
  {id:"beluna", cat:"NPB", name:"ベルーナドーム", type:"屋根つき・人工芝", hr:0.96, run:0.96,
   note:"屋根はあるが側面が開いており、外気がそのまま入る。夏は酷暑、春秋は冷え込む",
   good:"体力のあるチーム", bad:"暑さに弱い助っ人"},
  {id:"kyocera", cat:"NPB", name:"京セラドーム大阪", type:"屋内・人工芝", hr:0.92, run:0.94,
   note:"両翼100m・中堅122m。フェンスが高く本塁打が伸びない。屋内で風の影響は皆無",
   good:"制球の良い投手", bad:"一発頼みの打線"},
  {id:"koshien", cat:"NPB", name:"阪神甲子園球場", type:"屋外・天然芝", hr:0.90, run:0.94,
   note:"1924年開場。両翼95m・中堅118m。海からの浜風が右翼へ吹き、左打者の大飛球を押し戻す。1947年に設置されたラッキーゾーンは1991年に撤去された",
   good:"右打ちの巧打者・機動力", bad:"左の大砲"},
  {id:"rakuten", cat:"NPB", name:"楽天モバイルパーク宮城", type:"屋外・人工芝", hr:0.90, run:0.91,
   note:"仙台の冷たい風で打球が伸びない。屋外の東北という条件が投手を助ける",
   good:"先発投手", bad:"打線全般"},
  {id:"vantelin", cat:"NPB", name:"バンテリンドーム ナゴヤ", type:"屋内・人工芝", hr:0.78, run:0.84,
   note:"両翼100m・中堅122m。フェンスが高く外野が広い、NPBで最も投手有利な球場。10年間ずっと投手天国であり続けている",
   good:"投手陣すべて・守備", bad:"本塁打を狙う打者"},

  // ---- 記憶の中の球場 ----
  {id:"korakuen", cat:"歴史", name:"後楽園球場", type:"屋外・人工芝／1937-1987", hr:1.28, run:1.14,
   note:"開場時の両翼はわずか78m。のちに広げられてもなお狭く、本塁打がとにかく出た。巨人と日拓・日本ハムの本拠地",
   good:"打線全般", bad:"投手の精神"},
  {id:"osaka", cat:"歴史", name:"大阪球場", type:"屋外・人工芝／1950-1998", hr:1.26, run:1.12,
   note:"両翼84mという極端な狭さ。南海ホークスの本拠地で、スタンドが急勾配に迫り、観客の声が直接届いた",
   good:"引っ張る打者", bad:"抑え投手の心臓"},
  {id:"nishinomiya", cat:"歴史", name:"阪急西宮球場", type:"屋外・天然芝／1937-2002", hr:1.10, run:1.05,
   note:"阪急ブレーブスの本拠地。ラッキーゾーンを設けて本塁打を出やすくした。1971年のオールスターで江夏豊が9連続奪三振を達成した舞台",
   good:"長距離砲", bad:"変化球投手"},
  {id:"kawasaki", cat:"歴史", name:"川崎球場", type:"屋外・人工芝／1952-2000", hr:1.12, run:1.06,
   note:"ロッテの本拠地。狭く古びた球場で、閑古鳥が名物にすらなっていた。1988年10月19日、近鉄の優勝がかかったダブルヘッダーの舞台",
   good:"打線全般", bad:"投手陣"},
  {id:"heiwadai", cat:"歴史", name:"平和台野球場", type:"屋外・天然芝／1949-1997", hr:0.94, run:0.97,
   note:"西鉄ライオンズ黄金期の本拠地。天然芝の広い外野。1969年に始まる黒い霧事件でチームは崩壊し、球団は身売りに至った",
   good:"守備・機動力", bad:"一発頼みの打線"},
  {id:"fujiidera", cat:"歴史", name:"藤井寺球場", type:"屋外・天然芝／1928-2005", hr:1.02, run:1.00,
   note:"近鉄バファローズの本拠地。長らく照明が無く、ナイターが開催できない時期が続いた。癖のない造りで実力がそのまま出る",
   good:"地力のあるチーム", bad:"奇策"},

  // ---- MLB ----
  {id:"coors", cat:"MLB", name:"クアーズ・フィールド", type:"屋外・天然芝／デンバー", hr:1.24, run:1.28,
   note:"標高1580mの高地にあり、空気が薄く打球がどこまでも伸びる。得点はリーグ平均より約28%多く、MLBで群を抜いて打者有利",
   good:"打線全般", bad:"投手陣すべて"},
  {id:"fenway", cat:"MLB", name:"フェンウェイ・パーク", type:"屋外・天然芝／ボストン", hr:1.06, run:1.08,
   note:"1912年開場、MLB最古の現役球場。左翼にそびえる高さ11.3mの壁「グリーンモンスター」が、平凡な飛球を二塁打に、痛烈な当たりを単打に変える",
   good:"右打ちの二塁打製造機", bad:"左翼手"},
  {id:"wrigley", cat:"MLB", name:"リグレー・フィールド", type:"屋外・天然芝／シカゴ", hr:1.05, run:1.05,
   note:"1914年開場。外野の壁を覆うツタが名物。ミシガン湖からの風向き次第で打者天国にも投手天国にもなる。1945年からのヤギの呪いが解けたのは2016年",
   good:"風を読む打者", bad:"計算の立たない投手"},
  {id:"yankee", cat:"MLB", name:"ヤンキー・スタジアム", type:"屋外・天然芝／ニューヨーク", hr:1.14, run:1.04,
   note:"右翼までが99mと短く、左打者の流し打ちがそのままスタンドへ届く。ベーブ・ルースのために造られたと言われる形",
   good:"左の長距離砲", bad:"右投手"},
  {id:"oracle", cat:"MLB", name:"オラクル・パーク", type:"屋外・天然芝／サンフランシスコ", hr:0.79, run:0.93,
   note:"右中間が極端に深く、湾から流れ込む重い海風が打球を殺す。本塁打指数79はMLB屈指の低さ",
   good:"三塁打を打てる俊足・投手陣", bad:"本塁打を狙う打者"},
  {id:"petco", cat:"MLB", name:"ペトコ・パーク", type:"屋外・天然芝／サンディエゴ", hr:0.77, run:0.94,
   note:"広い外野と海沿いの湿った空気で本塁打が出ない。本塁打指数77はMLBで最も低い部類",
   good:"先発投手・外野守備", bad:"打線全般"},

  // ---- 地方球場 ----
  {id:"bocchan", cat:"地方", name:"松山坊っちゃんスタジアム", type:"屋外・天然芝／愛媛", hr:0.96, run:0.98,
   note:"1999年開業。両翼99.1m・中堅122mの本格的な造り。地方開催の定番で、満員の観客が近い",
   good:"総合力", bad:"特になし"},
  {id:"muscat", cat:"地方", name:"倉敷マスカットスタジアム", type:"屋外・天然芝／岡山", hr:0.98, run:0.99,
   note:"1995年開業。中堅122mの広い外野。地方開催では珍しく規格が大きく、守備範囲が問われる",
   good:"外野守備", bad:"打球の上がらない打者"},
  {id:"alpen", cat:"地方", name:"富山市民球場アルペンスタジアム", type:"屋外・天然芝／富山", hr:1.00, run:1.00,
   note:"1992年開業。立山連峰を背に建つ。癖のない造りだが、地方開催特有の慣れない環境が両軍に等しくのしかかる",
   good:"地力のあるチーム", bad:"神経質な選手"},
  {id:"cellular", cat:"地方", name:"沖縄セルラースタジアム那覇", type:"屋外・天然芝／沖縄", hr:1.08, run:1.04,
   note:"2010年に全面改築。南国の湿った暖かい空気で打球がよく飛ぶ。キャンプ地としても知られる",
   good:"長距離砲", bad:"暑さに弱い投手"},
];
function parkOf(t){ return t.park || PARKS[0]; }
// ホーム球場の係数。ビジター側にも同じ条件がかかる
function parkRunFactor(home){ return parkOf(home).run; }
function parkHrFactor(home){ return parkOf(home).hr; }

// ============================================================
// 監督の采配 ── シーズンに数回だけ、勝負どころで試合に介入できる
// ============================================================
const SAIHAI_MAX = 4;   // 1球団あたりのシーズン使用回数

// 1点差で負けている試合だけが対象。勝ち試合に使っても意味がないため
function findSaihai(rolled){
  if(state.day < 6) return null;
  for(const r of rolled){
    for(const side of ["A","B"]){
      const t = r[side];
      if(t.cpu || (t.saihai||0) <= 0) continue;
      const my = side === "A" ? r.rA : r.rB;
      const op = side === "A" ? r.rB : r.rA;
      if(op - my !== 1) continue;              // 1点差の負けのみ
      if(rnd() > 0.68) continue;               // 年10回前後。4回しか使えないので取捨が生まれる
      const card = pickSaihaiCard(t);
      if(!card) continue;
      return {game:r, side, t, card};
    }
  }
  return null;
}
function pickSaihaiCard(t){
  const ok = SAIHAI_CARDS.filter(c => c.need(t));
  return ok.length ? pick1(ok) : null;
}
// 打力・投手力から成功率を出す。80を並の目安とする
function saihaiRate(base, ovr, form){
  return clamp(base + (ovr - 80) * 0.011 + (form || 0) * 0.02, 0.10, 0.66);
}
const SAIHAI_CARDS = [
  {
    id: "daida",
    title: "九回裏　二死一・二塁",
    lead: "一打逆転の好機。ここで誰に託すか",
    need: t => benchOf(t).length > 0 && lineupOf(t).length > 0,
    opts: t => {
      const bench = benchOf(t).slice().sort((a,b)=>b.ovr-a.ovr)[0];
      const now = lineupOf(t).slice().sort((a,b)=>(a.form||0)-(b.form||0))[0];
      return [
        {label:"代打の切り札を送る", p:bench, note:"控えで最も打てる男に懸ける",
         rate:saihaiRate(0.30, bench.ovr, bench.form),
         win:`代打の${bench.name}が起死回生の一打`, lose:`代打の${bench.name}は力なく倒れた`},
        {label:"このまま打たせる", p:now, note:"信じて任せる。決まれば本人が生き返る",
         rate:saihaiRate(0.24, now.ovr, now.form), boost:true,
         win:`${now.name}が値千金の一打`, lose:`${now.name}は打ち取られた`},
      ];
    },
  },
  {
    id: "squeeze",
    title: "九回裏　一死三塁",
    lead: "同点の走者が三塁に。決めにいくか、つなぐか",
    need: t => lineupOf(t).length >= 2,
    opts: t => {
      const fast = lineupOf(t).slice().sort((a,b)=>(b.sb||0)-(a.sb||0))[0];
      const big  = lineupOf(t).slice().sort((a,b)=>(b.hr||0)-(a.hr||0))[0];
      return [
        {label:"スクイズ", p:fast, note:"確実に1点を取りにいく",
         rate:saihaiRate(0.34, fast.ovr, fast.form),
         win:`${fast.name}のスクイズが決まった`, lose:`スクイズを外され${fast.name}が三本間で憤死`},
        {label:"強攻", p:big, note:"一発が出れば試合をひっくり返せる",
         rate:saihaiRate(0.22, big.ovr, big.form), boost:true,
         win:`${big.name}が振り抜いた打球がスタンドへ`, lose:`${big.name}は詰まらされ内野フライ`},
      ];
    },
  },
  {
    id: "ace",
    title: "八回　1点差のマウンド",
    lead: "ここを抑えれば流れは変わる。誰を送るか",
    need: t => pitchersOf(t).length >= 2,
    opts: t => {
      const ace = rotKeys(t).map(k=>t.slots[k]).filter(Boolean)
        .sort((a,b)=>ovrFor(b,"SP")-ovrFor(a,"SP"))[0];
      const cl  = t.slots.CL || pitchersOf(t)[0];
      return [
        {label:"エースを中0日でつぎ込む", p:ace, note:"無理をさせる。以後の調子は落ちる",
         rate:saihaiRate(0.36, ovrFor(ace,"SP"), ace.form), tire:true,
         win:`${ace.name}が中0日の火消しに成功`, lose:`${ace.name}は疲れの見える球を痛打された`},
        {label:"抑えを1イニング早く", p:cl, note:"守護神の回跨ぎに懸ける",
         rate:saihaiRate(0.32, ovrFor(cl,"CL"), cl.form),
         win:`${cl.name}が2イニングを封じ込めた`, lose:`${cl.name}が二死から捕まった`},
      ];
    },
  },
  {
    id: "keien",
    title: "九回　二死二・三塁で相手の主砲",
    lead: "歩かせて満塁で次と勝負するか、真っ向から挑むか",
    need: t => pitchersOf(t).length >= 1,
    opts: t => {
      const cl = t.slots.CL || pitchersOf(t)[0];
      return [
        {label:"申告敬遠で満塁策", p:cl, note:"逃げ道を断って次打者に懸ける",
         rate:saihaiRate(0.33, ovrFor(cl,"CL"), cl.form),
         win:`${cl.name}が満塁から次打者を打ち取った`, lose:`満塁策が裏目、押し出しで万事休す`},
        {label:"主砲と勝負", p:cl, note:"抑えれば球場が沸く。正面からいく",
         rate:saihaiRate(0.27, ovrFor(cl,"CL"), cl.form), boost:true,
         win:`${cl.name}が真っ向勝負を制した`, lose:`${cl.name}が相手の主砲に力負けした`},
      ];
    },
  },
];

function startSaihai(cand){
  const wasPlaying = state.playing;
  stopTimer();
  state.saihaiCtx = Object.assign({}, cand, {resume: wasPlaying, opts: cand.card.opts(cand.t), done:null});
  $("s-play").disabled = true; $("s-skip").disabled = true;
  renderSaihai();
  $("saihai-bg").classList.add("show");
  seTap();
}
function renderSaihai(){
  const c = state.saihaiCtx;
  if(!c) return;
  const t = c.t, g = c.game;
  const my = c.side === "A" ? g.rA : g.rB;
  const op = c.side === "A" ? g.rB : g.rA;
  const foe = c.side === "A" ? g.B : g.A;
  const s = standingsSorted();
  const rank = s.indexOf(t) + 1;
  const gb = rank === 1 ? "首位" : "首位と" + gameBehind(s[0], t) + "ゲーム差";
  const left = state.schedule.length - state.day;

  if(c.done){
    const d = c.done;
    $("saihai-panel").innerHTML =
      '<h2><span class="kicker">采配</span>' + esc(c.card.title) + '</h2>' +
      '<div class="sh-result ' + (d.ok ? "ok" : "ng") + '">' +
        '<div class="sh-cap">' + (d.ok ? "成功" : "失敗") + '</div>' +
        '<div class="sh-big">' + esc(d.text) + '</div>' +
        '<div class="sh-score">' + esc(t.name) + '　' + d.my + ' － ' + d.op + '　' + esc(foe.name) + '</div>' +
        '<div class="sh-msg">' + esc(d.msg) + '</div>' +
      '</div>' +
      '<div class="sh-foot"><span class="sh-left">残り采配 ' + (t.saihai||0) + ' 回</span>' +
        '<button class="btn" onclick="closeSaihai()">試合を再開する</button></div>';
    return;
  }
  $("saihai-panel").innerHTML =
    '<h2><span class="kicker">采配</span>' + esc(c.card.title) + '</h2>' +
    '<div class="sh-sit">' +
      '<div class="sh-team">' + teamEmblem(t, 22) + '<b>' + esc(t.name) + '</b>' +
        '<span class="sh-vs">対 ' + esc(foe.name) + '</span></div>' +
      '<div class="sh-board"><span class="sh-n">' + my + '</span><i>－</i><span class="sh-n op">' + op + '</span></div>' +
      '<div class="sh-ctx">' + esc(dateLabel(state.day)) + '　' + rank + '位・' + gb + '　残り' + left + '試合</div>' +
    '</div>' +
    '<div class="sh-lead">' + esc(c.card.lead) + '</div>' +
    '<div class="sh-opts">' + c.opts.map(function(o, i){
      return '<button class="sh-opt" onclick="saihaiChoose(' + i + ')">' +
        '<div class="sh-o-h">' + esc(o.label) + '<span class="sh-rate">' + Math.round(o.rate*100) + '%</span></div>' +
        '<div class="sh-o-p">' + avatarBox(o.p, 34) + '<div>' +
          '<div class="sh-o-n">' + esc(o.p.name) + rankIcon(o.p.ovr, 15) + formIcon(o.p) + '</div>' +
          '<div class="sh-o-note">' + esc(o.note) + '</div>' +
        '</div></div></button>';
    }).join("") + '</div>' +
    '<div class="sh-foot">' +
      '<span class="sh-left">采配は残り <b>' + (t.saihai||0) + '</b> 回。使えばここで1回消費します</span>' +
      '<button class="btn ghost sm" onclick="saihaiPass()">采配しない</button>' +
    '</div>';
}
function gameBehind(top, t){
  const v = ((top.W - top.L) - (t.W - t.L)) / 2;
  return (Math.round(v*10)/10).toFixed(1);
}
function saihaiChoose(i){
  const c = state.saihaiCtx;
  if(!c || c.done) return;
  const o = c.opts[i], t = c.t, g = c.game;
  t.saihai = Math.max(0, (t.saihai||0) - 1);
  const ok = rnd() < o.rate;
  let my = c.side === "A" ? g.rA : g.rB;
  let op = c.side === "A" ? g.rB : g.rA;
  let msg;
  if(ok){
    my = op + 1;                                   // 1点差を引っくり返す
    if(c.side === "A") g.rA = my; else g.rB = my;
    if(o.boost && o.p) o.p.form = 2;               // 信じて任せた男は生き返る
    msg = t.name + "が" + o.label + "で試合をひっくり返した";
  }else{
    if(o.tire && o.p) o.p.form = Math.max(-2, (o.p.form||0) - 2);  // 無理をさせた代償
    msg = o.tire ? o.p.name + "には無理をさせた分の疲れが残った"
                 : t.name + "の" + o.label + "は実らなかった";
  }
  c.done = {ok, text:o.win && ok ? o.win : o.lose, my, op, msg};
  partyNews(ok ? "采" : "無", ok ? "good" : "warn",
    "【采配】" + t.name + "、" + c.card.title + "で" + o.label + "。" +
    (ok ? o.win + "、値千金の逆転勝ち" : o.lose + "。一歩及ばず"), null, t);
  if(ok) seWin(); else seMiss();
  renderSaihai();
}
function saihaiPass(){
  const c = state.saihaiCtx;
  if(!c) return;
  c.done = {ok:false, text:"采配は切らなかった", my: c.side === "A" ? c.game.rA : c.game.rB,
            op: c.side === "A" ? c.game.rB : c.game.rA, msg:"この1回は取っておく。使いどころは他にある"};
  renderSaihai();
}
function closeSaihai(){
  const c = state.saihaiCtx;
  if(!c) return;
  state.saihaiCtx = null;
  $("saihai-bg").classList.remove("show");
  $("s-play").disabled = false; $("s-skip").disabled = false;
  const day = state.pendingDay; state.pendingDay = null;
  if(day) finishDay(day);
  renderLive();
  if(c.resume) startTimer();
}

function tick(){
  if(state.day >= state.schedule.length){ finishSeason(); return; }
  if(playDay() === false){ renderLive(); return; }   // 采配の入力待ち
  renderLive();
  // パーティーモードの波乱イベント(緊急補強は一時停止して選択待ち)
  rollPartyEvent();
  if(state.eventCtx) return; // 緊急補強・選択イベントは入力待ち
  // 生中継: 開幕戦と優勝決定試合だけ、イニングごとにスコアが動く
  let broadcast = null;
  if(state.day === 1 && !state.openingShown){
    state.openingShown = true;
    if(state.lastGames && state.lastGames.length){
      broadcast = {label:"開幕戦 生中継", g: state.lastGames[0], opening: state.lastGames.slice()};
    }
  }
  const clincher = checkClinch();
  if(clincher && state.lastGames){
    const g = state.lastGames.find(x=>x.A===clincher || x.B===clincher);
    if(g) broadcast = {label:"優勝決定試合 生中継", g};
  }
  if(broadcast){
    stopTimer();
    state.resumeAfterLive = true;
    const afterLive = ()=>{
      const ev = dueEvent();
      if(ev){ ev.done = true; state.resumeAfterEvent = state.resumeAfterLive; state.resumeAfterLive=false; startEvent(ev.type, ev); return; }
      if(state.day >= state.schedule.length){ finishSeason(); return; }
      if(state.resumeAfterLive){ state.resumeAfterLive=false; startTimer(); }
    };
    showLiveGame(broadcast.label, broadcast.g, ()=>{
      // 開幕日は中継したカード以外も戦われている。全結果を号外で出す
      if(broadcast.opening && broadcast.opening.length) showOpeningGogai(broadcast.opening, broadcast.g, afterLive);
      else afterLive();
    });
    return;
  }
  const ev = dueEvent();
  if(ev){ stopTimer(); ev.done = true; state.resumeAfterEvent = true; startEvent(ev.type, ev); return; }
  if(state.day >= state.schedule.length) finishSeason();
}
function skipAhead(){
  stopTimer();
  state.openingShown = true; // 一気進行中は中継なし
  let guard = 2000;
  while(state.day < state.schedule.length && guard-->0){
    if(playDay() === false){ renderLive(); return; }   // 采配の入力待ち
    checkClinch();
    const ev = dueEvent();
    if(ev){ renderLive(); ev.done = true; state.resumeAfterEvent = false; startEvent(ev.type, ev); return; }
  }
  renderLive();
  finishSeason();
}
function finishSeason(){
  if(state.finished) return;
  state.finished = true;
  stopTimer();
  $("s-play").textContent = "日本シリーズへ";
  $("s-skip").disabled = true;
  $("s-date").textContent = "シーズン終了";
  const s = standingsSorted();
  $("s-note").textContent = `全${Math.round(state.gamesPer)}試合を完走。1位${s[0].name}と2位${s[1].name}が日本シリーズで激突！`;
  telop(`レギュラーシーズン終了 ―― 日本シリーズは ${s[0].name} 対 ${s[1].name}`);
}
function dueEvent(){
  return state.eventQueue.find(e=>!e.done && e.after <= state.monthsCompleted);
}

// ---- 打席から積み上げる実成績 ----
// 事前生成をやめ、実際に起きた打席の結果をそのまま記録する。
// これで4番が走者を置いて打点を稼ぐ、1番が打席数を稼ぐ、が数字に出る
function blankBat(p, t, bench){
  return {p, t, kind:"B", bench, g:0, pa:0, ab:0, h:0, d2:0, d3:0, hr:0, rbi:0,
          bb:0, hbp:0, so:0, sb:0, avg:0, obp:0, slg:0, ops:0};
}
function blankPit(p, t, role){
  return {p, t, kind:"P", role, g:0, gs:0, w:0, l:0, sv:0, hld:0, cg:0,
          outs:0, ip:0, er:0, so:0, bb:0, hAllow:0, era:0, whip:0, k9:0};
}
function initSeasonStats(){
  const stats = [];
  for(const t of state.parts){
    const seen = new Set();
    for(const d of SLOT_DEFS){
      if(d.key === "MGR") continue;
      const p = t.slots[d.key];
      if(!p || seen.has(p.id)) continue;
      seen.add(p.id);
      stats.push(["SP","RP","CL"].includes(d.grp)
        ? blankPit(p, t, d.grp)
        : blankBat(p, t, BENCH_KEYS.includes(d.key)));
    }
  }
  state.seasonStats = stats;
  state.statIdx = new Map(stats.map(s => [s.p.id + "@" + s.t.name, s]));
}
function lineOf(t, p){
  if(!state.statIdx) return null;
  return state.statIdx.get(p.id + "@" + t.name) || null;
}
function recalcBat(s){
  s.avg = s.ab ? s.h / s.ab : 0;
  const tb = (s.h - s.d2 - s.d3 - s.hr) + s.d2*2 + s.d3*3 + s.hr*4;
  s.slg = s.ab ? tb / s.ab : 0;
  s.obp = (s.ab + s.bb + s.hbp) ? (s.h + s.bb + s.hbp) / (s.ab + s.bb + s.hbp) : 0;
  s.ops = s.obp + s.slg;
}
function recalcPit(s){
  s.ip = Math.round(s.outs / 3 * 10) / 10;
  const innings = s.outs / 3;
  s.era = innings > 0 ? s.er * 9 / innings : 0;
  s.whip = innings > 0 ? (s.hAllow + s.bb) / innings : 0;
  s.k9 = innings > 0 ? s.so * 9 / innings : 0;
}
// 1打席ぶんを両者の記録に足す
function makeRecorder(batT, pitT, seenBat, seenPit){
  return function(bat, pit, kind, runs){
    const bs = lineOf(batT, bat);
    if(bs){
      seenBat.add(bs);
      bs.pa++;
      bs.rbi += runs;
      if(kind === "bb"){ bs.bb++; }
      else if(kind === "sf"){ bs.ab += 0; }        // 犠飛は打数に含めない
      else {
        bs.ab++;
        if(kind === "so") bs.so++;
        else if(kind === "hr"){ bs.h++; bs.hr++; }
        else if(kind === "3b"){ bs.h++; bs.d3++; }
        else if(kind === "2b"){ bs.h++; bs.d2++; }
        else if(kind === "1b"){ bs.h++; }
      }
      recalcBat(bs);
    }
    const ps = pit ? lineOf(pitT, pit) : null;
    if(ps){
      seenPit.add(ps);
      ps.er += runs;
      if(kind === "bb") ps.bb++;
      else if(kind === "so"){ ps.so++; ps.outs++; }
      else if(kind === "out"){ ps.outs++; }
      else if(kind === "dp"){ ps.outs += 2; }
      else if(kind === "sf"){ ps.outs++; }
      else ps.hAllow++;
      recalcPit(ps);
    }
  };
}
// 試合ごとの出場・勝敗・セーブを付ける
function creditGame(A, B, rA, rB, seen){
  for(const s of seen.bat) s.g++;
  for(const s of seen.pit) s.g++;
  const win = rA > rB ? A : rB > rA ? B : null;
  const lose = win === A ? B : win === B ? A : null;
  const spOf = t => { const p = starterOf(t); return p ? lineOf(t, p) : null; };
  const sa = spOf(A), sb = spOf(B);
  if(sa) sa.gs++;
  if(sb) sb.gs++;
  if(win){
    const ws = win === A ? sa : sb, ls = lose === A ? sa : sb;
    if(ws) ws.w++;
    if(ls) ls.l++;
    const cl = win.slots.CL;
    const cs = cl && !isOut(cl) ? lineOf(win, cl) : null;
    const diff = Math.abs(rA - rB);
    if(cs && diff <= 3 && cs !== ws) cs.sv++;
    const rp = RP_KEYS.map(k => win.slots[k]).filter(x => x && !isOut(x));
    for(const r of rp){
      const rs = lineOf(win, r);
      if(rs && diff <= 3 && rnd() < 0.55) rs.hld++;
    }
  }
}
// ============================================================
// 打席方式のシミュレーション
// 点数を先に決めて打席を逆算するのではなく、打順どおりに打席を解いて
// 点を積み上げる。1番から4番までの並びが結果に直結する
// ============================================================
// 打者と投手の力関係から、その打席の結果の確率を作る
function paProbs(bat, pit, park){
  const bo = bat.ovr || 78;
  const po = pit ? (pit.ovr || 78) : 74;
  const edge = (bo - po) * 0.006;              // 打者有利ならプラス
  const hrF = park ? park.hr : 1;
  const runF = park ? park.run : 1;

  // 四球: 出塁能力の高い打者ほど多い
  let bb = clamp(0.082 + (bo - 80) * 0.0022 + edge * 0.35, 0.035, 0.165);
  // 三振: 奪三振の多い投手ほど多く、巧打者ほど少ない
  const k9 = pit && pit.so ? clamp(pit.so / 22, 4, 11) : 7;
  let so = clamp(0.165 + (k9 - 7) * 0.019 - (bat.avg - 0.285) * 0.55 - edge * 0.5, 0.05, 0.36);
  // 本塁打: 登録本塁打と球場から
  let hr = clamp(((bat.hr || 8) / 620) * hrF * (1 + edge * 1.6), 0.004, 0.085);
  // 安打: 打率は「打数あたり」なので、四死球を除いた打数の割合を掛けて打席あたりに直す。
  // ここを打席あたりのまま扱うとリーグ打率が.190台まで落ちる
  const abShare = 1 - bb - 0.008;
  // 得点は打率に対して非線形に増えるので、パークファクターをそのまま打率に足すと
  // 効きが倍以上に膨らむ。実測で得点比がPF比に一致するところまで落としてある
  const avg = clamp(bat.avg + edge * 0.85 + (runF - 1) * 0.105, 0.170, 0.420);
  let hit = avg * abShare - hr;                // 本塁打ぶんを差し引いた単打・長打
  if(hit < 0.04) hit = 0.04;

  const rest = 1 - bb - so - hr - hit;
  return {bb, so, hr, hit, out: Math.max(0.02, rest)};
}
// 1打席を解く。塁の状態を更新して得点を返す
function playPA(st, bat, pit, park, rec){
  const q = paProbs(bat, pit, park);
  const r = rnd();
  let acc = q.bb;
  const on = st.on;
  const push = () => { // 押し出し・単打などで詰まって進む形
    if(on[0] && on[1] && on[2]){ on[2] = on[1]; return 1; }
    if(on[0] && on[1]){ on[2] = true; return 0; }
    if(on[0]){ on[1] = true; return 0; }
    return 0;
  };
  if(r < acc){                                   // 四球
    const runs = (on[0] && on[1] && on[2]) ? 1 : 0;
    if(!(on[0] && on[1] && on[2])) push();
    on[0] = true;
    if(rec) rec(bat, pit, "bb", runs);
    return runs;
  }
  acc += q.so;
  if(r < acc){ st.outs++; if(rec) rec(bat, pit, "so", 0); return 0; }

  acc += q.hr;
  if(r < acc){                                   // 本塁打
    const runs = 1 + (on[0]?1:0) + (on[1]?1:0) + (on[2]?1:0);
    on[0] = on[1] = on[2] = false;
    if(rec) rec(bat, pit, "hr", runs);
    return runs;
  }
  acc += q.hit;
  if(r < acc){                                   // 単打・長打
    const long = rnd();
    if(long < 0.055){                            // 三塁打
      const runs = (on[0]?1:0) + (on[1]?1:0) + (on[2]?1:0);
      on[0] = on[1] = false; on[2] = true;
      if(rec) rec(bat, pit, "3b", runs);
      return runs;
    }
    if(long < 0.28){                             // 二塁打
      const runs = (on[1]?1:0) + (on[2]?1:0) + (on[0] && rnd() < 0.42 ? 1 : 0);
      const wasFirst = on[0];
      on[2] = wasFirst && runs < 3 ? false : false;
      on[0] = false; on[2] = false; on[1] = true;
      if(rec) rec(bat, pit, "2b", runs);
      return runs;
    }
    // 単打。三塁走者は生還、二塁走者は俊足なら生還
    let runs = (on[2]?1:0);
    const second = on[1];
    on[2] = false;
    if(second){
      if(rnd() < 0.42 + clamp((bat.sb||0)/220, 0, 0.18)) runs++;
      else on[2] = true;
      on[1] = false;
    }
    if(on[0]){ if(!on[1]) on[1] = true; else if(!on[2]) on[2] = true; }
    on[0] = true;
    if(rec) rec(bat, pit, "1b", runs);
    return runs;
  }
  // 凡打。走者一塁で1死未満なら併殺の目がある
  if(on[0] && st.outs < 2 && rnd() < 0.13){
    st.outs += 2; on[0] = false;
    if(rec) rec(bat, pit, "dp", 0);
    return 0;
  }
  // 犠飛
  if(on[2] && st.outs < 2 && rnd() < 0.20){
    st.outs++; on[2] = false;
    if(rec) rec(bat, pit, "sf", 1);
    return 1;
  }
  st.outs++;
  if(rec) rec(bat, pit, "out", 0);
  return 0;
}
// 半イニング。3アウトまで打席を回す
function playHalf(order, idx, pit, park, rec){
  const st = {outs:0, on:[false,false,false]};
  let runs = 0;
  let guard = 0;
  while(st.outs < 3 && guard++ < 40){
    const bat = order[idx % order.length];
    idx++;
    runs += playPA(st, bat, pit, park, rec);
  }
  return {runs, idx};
}
// 出目を作るだけ。反映は applyGame で行う。
// 采配の選択を挟むあいだ、結果を確定させずに保留しておく必要があるため分けてある
function rollGame(A, B, keep){
  const park = parkOf(B);              // Bがホーム(Aが表の攻撃)
  const oa = activeLineup(A), ob = activeLineup(B);
  if(!oa.length || !ob.length) return {rA:0, rB:0};
  // keep が真のときだけ成績を積む(試算・采配の下見では積まない)
  const seen = keep ? {bat:new Set(), pit:new Set()} : null;
  const recA = keep ? makeRecorder(A, B, seen.bat, seen.pit) : null;   // Aの攻撃
  const recB = keep ? makeRecorder(B, A, seen.bat, seen.pit) : null;   // Bの攻撃
  let rA = 0, rB = 0, ia = 0, ib = 0;
  const spA = starterOf(A), spB = starterOf(B);
  for(let inn = 1; inn <= 9; inn++){
    const pB = pitcherForInning(B, inn, spB).p;   // Aの攻撃を受けるのはBの投手
    const ra = playHalf(oa, ia, pB, park, recA);
    rA += ra.runs; ia = ra.idx;
    if(inn === 9 && rB > rA) break;               // 裏の攻撃は不要
    const pA = pitcherForInning(A, inn, spA).p;
    const rb = playHalf(ob, ib, pA, park, recB);
    rB += rb.runs; ib = rb.idx;
    if(inn === 9 && rB > rA) break;               // サヨナラ
  }
  // 延長は最大3イニング。決着しなければ引き分け
  for(let ex = 0; ex < 3 && rA === rB; ex++){
    const pB = pitcherForInning(B, 9, spB).p;
    const ra = playHalf(oa, ia, pB, park, recA);
    rA += ra.runs; ia = ra.idx;
    const pA = pitcherForInning(A, 9, spA).p;
    const rb = playHalf(ob, ib, pA, park, recB);
    rB += rb.runs; ib = rb.idx;
  }
  if(keep) creditGame(A, B, rA, rB, seen);
  return {rA, rB};
}
function applyGame(A, B, rA, rB){
  A.RS+=rA; A.RA+=rB; B.RS+=rB; B.RA+=rA;
  if(rA>rB){A.W++;B.L++; A.stk=(A.stk||0)+1; B.stk=0;}
  else if(rB>rA){B.W++;A.L++; B.stk=(B.stk||0)+1; A.stk=0;}
  else {A.T++;B.T++;}
}
function simGame(A, B){
  const g = rollGame(A, B);
  applyGame(A, B, g.rA, g.rB);
  return g;
}
function playDay(){
  const games = state.schedule[state.day];
  if(!games || !games.length){       // 移動日
    state.restDay = true;
    state.lastGames = [];
    state.parts.forEach(t=>t.hist.push(t.W-t.L));
    advanceInjuries();
    state.day++;
    return true;
  }
  state.restDay = false;
  // まずその日の全カードの出目を作る(この時点では成績に反映しない)
  const rolled = games.map(([ai,bi])=>{
    const A = state.parts[ai], B = state.parts[bi];
    const g = rollGame(A, B, true);
    return {A, B, rA:g.rA, rB:g.rB};
  });
  // 勝負どころがあれば、確定させる前に本人へ委ねる
  const cand = state.opts.saihai ? findSaihai(rolled) : null;
  if(cand){ state.pendingDay = rolled; startSaihai(cand); return false; }
  finishDay(rolled);
  return true;
}
function finishDay(rolled){
  const dl = dateLabel(state.day);
  const scores = [];
  const played = [];
  for(const r of rolled){
    const A = r.A, B = r.B;
    const g = {rA:r.rA, rB:r.rB};
    applyGame(A, B, g.rA, g.rB);
    const spA = starterOf(A), spB = starterOf(B);
    A.rotIdx = ((A.rotIdx||0) + 1) % rotKeys(A).length;
    B.rotIdx = ((B.rotIdx||0) + 1) % rotKeys(B).length;
    played.push({A, B, rA:g.rA, rB:g.rB, spA, spB});
    scores.push(`${A.name} ${g.rA}-${g.rB} ${B.name}`);
    // その日の見どころニュース(たまに)
    const diff = Math.abs(g.rA-g.rB);
    const win = g.rA>g.rB ? A : B, lose = g.rA>g.rB ? B : A;
    let flash = null;
    const hero = LINEUP_KEYS.map(k=>win.slots[k]).sort((x,y)=>y.ovr-x.ovr)[Math.floor(rnd()*3)];
    const ace = SP_KEYS.map(k=>win.slots[k]).sort((x,y)=>ovrFor(y,"SP")-ovrFor(x,"SP"))[Math.floor(rnd()*2)];
    if(diff>0 && (g.rA===0||g.rB===0)){
      const r = rnd();
      if(r<0.008){ flash = `【完全試合】${ace.name}（${win.name}）が完全試合を達成！ 球史に残る一夜`; }
      else if(r<0.05){ flash = `【ノーヒットノーラン】${ace.name}（${win.name}）が${lose.name}を無安打無得点に封じた！`; }
      else if(r<0.16){ flash = `${ace.name}（${win.name}）が${lose.name}を完封！`; }
    }
    if(!flash && Math.max(g.rA,g.rB)>=6){
      const r2 = rnd();
      if(r2<0.015){ flash = `【サイクル安打】${hero.name}（${win.name}）がサイクルヒット達成！`; }
      else if(r2<0.04){ flash = `【1試合3発】${hero.name}（${win.name}）が1試合3本塁打の固め打ち！`; }
    }
    if(!flash && diff>0 && [8,10,12,15].includes(win.stk||0)){
      flash = `【${win.stk}連勝】${win.name}、破竹の${win.stk}連勝で球界を席巻！`;
    }
    if(!flash){
      if(diff>=7 && rnd()<0.3){
        flash = `${win.name}が${Math.max(g.rA,g.rB)}−${Math.min(g.rA,g.rB)}の大勝！ ${lose.name}は打つ手なし`;
      }else if(diff===1 && g.rA+g.rB>0 && rnd()<0.05){
        flash = `${hero.name}（${win.name}）が劇的サヨナラ打！ 球場は大興奮`;
      }
    }
    if(flash){ state.news.unshift({mo:dl, txt:flash}); telop(flash); }
  }
  state.parts.forEach(t=>t.hist.push(t.W-t.L));
  advanceInjuries();
  rollInjury();
  state.lastScores = scores;
  state.lastGames = played;
  if(state.day > 0 && state.day % 12 === 0) rollForms(); // 調子の波を引き直し
  const mPrev = monthOfDay(state.day);
  state.day++;
  const mNow = state.day >= state.schedule.length ? 7 : monthOfDay(state.day);
  if(mNow > mPrev){
    state.monthsCompleted = mPrev;
    makeMonthlyNews(mPrev);
  }
}
// 開幕号外(全カードの結果を一枚に)
function showOpeningGogai(games, liveG, after){
  state.gogaiAfter = after || null;
  const rows = games.map(function(g){
    const on = (g === liveG);
    const wa = g.rA > g.rB, wb = g.rB > g.rA;
    return '<div class="og-row' + (on ? " live" : "") + '">' +
      '<span class="og-t' + (wa ? " w" : "") + '">' + teamEmblem(g.A, 17) + esc(g.A.name) + '</span>' +
      '<span class="og-s">' + g.rA + '<i>-</i>' + g.rB + '</span>' +
      '<span class="og-t r' + (wb ? " w" : "") + '">' + esc(g.B.name) + teamEmblem(g.B, 17) + '</span>' +
      (on ? '<span class="og-tag">中継</span>' : '') +
    '</div>';
  }).join("");
  const most = games.slice().sort(function(a,b){ return (b.rA+b.rB)-(a.rA+a.rB); })[0];
  $("og-body").innerHTML = rows +
    '<div class="og-note">' + esc(most.A.name) + '対' + esc(most.B.name) + 'は計' + (most.rA+most.rB) + '得点の打ち合い。長い143試合が、今日始まった。</div>';
  $("opening-bg").classList.add("show");
  seFanfare();
}
function closeOpeningGogai(){
  $("opening-bg").classList.remove("show");
  const a = state.gogaiAfter; state.gogaiAfter = null;
  if(a) a();
}

// その日の全カードを、スコアを立てて並べる
function renderDayScores(){
  const el = $("s-games");
  if(!el) return;
  const gs = state.lastGames || [];
  if(state.restDay){ el.innerHTML = '<div class="sc-none">移動日 ── 試合なし</div>'; return; }
  if(!gs.length){ el.innerHTML = '<div class="sc-none">まだ試合は行われていません</div>'; return; }
  el.innerHTML = gs.map(function(g){
    const wa = g.rA > g.rB, wb = g.rB > g.rA;
    const hot = !g.A.cpu || !g.B.cpu;      // 人間の球団がからむカードは目立たせる
    return '<div class="sc-card' + (hot ? " live" : "") + '">' +
      '<span class="sc-t' + (wa ? " w" : "") + '">' + teamEmblem(g.A, 16) + esc(g.A.name) + '</span>' +
      '<span class="sc-n' + (wa ? " w" : "") + '">' + g.rA + '</span>' +
      '<span class="sc-sep">−</span>' +
      '<span class="sc-n' + (wb ? " w" : "") + '">' + g.rB + '</span>' +
      '<span class="sc-t r' + (wb ? " w" : "") + '">' + esc(g.B.name) + teamEmblem(g.B, 16) + '</span>' +
    '</div>';
  }).join("");
}

function renderLive(){
  $("s-date").textContent = dateLabel(state.day-1);
  renderDayScores();
  const lead = standingsSorted()[0];
  $("s-note").textContent = `首位: ${lead.name}（${lead.W}勝${lead.L}敗${lead.T?lead.T+"分":""}）`;
  renderTeamStrip();
  renderStandings("standings");
  renderLeaders();
  renderRosterLive();
  renderChart();
  renderNews();
}

// ---- 上部の球団ストリップ(順位・貯金・調子・状態を一望) ----
function renderTeamStrip(){
  const el = $("team-strip");
  if(!el) return;
  const total = (state.schedule && state.schedule.length) || 1;
  const pct = clamp(state.day/total, 0, 1)*100;
  const bar = $("season-bar");
  if(bar) bar.style.width = pct.toFixed(1) + "%";
  const lbl = $("season-bar-lbl");
  if(lbl) lbl.textContent = state.finished ? "全日程終了" : `${Math.round(pct)}% 消化`;
  const s = standingsSorted();
  el.innerHTML = s.map((t,i)=>{
    const gap = t.W - t.L;
    const forms = [...LINEUP_KEYS, ...SP_KEYS].map(k=>t.slots[k]).filter(Boolean);
    const avgF = forms.reduce((a,p)=>a+(p.form||0),0)/(forms.length||1);
    const fIcon = avgF > 0.45 ? `<span class="form f2">▲▲</span>` : avgF > 0.15 ? `<span class="form f1">▲</span>`
      : avgF < -0.45 ? `<span class="form fm2">▽▽</span>` : avgF < -0.15 ? `<span class="form fm1">▽</span>` : `<span class="form f0">─</span>`;
    const badges = (t.saihai ? `<span class="ts-b sai">采配${t.saihai}</span>` : "")
      + (t.mgrRest ? `<span class="ts-b bad">監督休養</span>` : "")
      + (t.mood && state.day < t.mood.until ? `<span class="ts-b ${t.mood.val>0?"good":"bad"}">${esc(t.mood.label)}</span>` : "");
    return `<div class="ts-card ${i===0?"lead":""}" style="--tc:${t.color}" onclick="state.rosterTab=${state.parts.indexOf(t)};renderRosterLive();document.getElementById('roster-live').scrollIntoView({behavior:'smooth',block:'center'})">
      <div class="ts-rank">${i+1}</div>
      <div class="ts-main">
        <div class="ts-name">${teamEmblem(t,18)} ${esc(t.name)} ${fIcon}</div>
        <div class="ts-rec">${t.W}<span>勝</span>${t.L}<span>敗</span>${t.T?`${t.T}<span>分</span>`:""}</div>
        <div class="ts-gap ${gap>0?"plus":gap<0?"minus":""}">${gap>0?"貯金"+gap:gap<0?"借金"+(-gap):"五分"}</div>
        ${badges?`<div class="ts-badges">${badges}</div>`:""}
      </div>
    </div>`;
  }).join("");
}

// ---- 事件簿(パーティーモード) ----
function renderPartyLog(){
  const box = $("party-box"), el = $("party-log");
  if(!box || !el) return;
  if(!state.opts.party){ box.style.display = "none"; return; }
  box.style.display = "";
  const log = state.partyLog || [];
  el.innerHTML = log.length ? log.slice(0,24).map((x,i)=>{
    const pic = x.id && EVENT_PIC.has(x.id);
    const ev = x.id ? PARTY_LORE.find(v=>v.id===x.id) : null;
    const note = ev && ev.note ? ev.note : "";
    return `
    <div class="plog ${x.cls}${(pic||note)?" has-src":""}" ${(pic||note)?`onclick="toggleLogSrc(this)"`:""}>
      <div class="pl-line">
        <span class="pl-icon">${x.icon}</span>
        <span class="pl-d">${x.d}</span>
        <span class="pl-t">${esc(x.txt)}</span>
        ${pic?`<img class="pl-pic" src="assets/event/${x.id}.jpg" alt="" loading="lazy">`:""}
        ${(pic||note)?`<span class="pl-more">元ネタ</span>`:""}
      </div>
      ${note?`<div class="pl-src"><b>元ネタ</b>${esc(note)}${pic?`<button class="btn ghost sm" onclick="event.stopPropagation();replayEventPic(${i})">号外カットを見る</button>`:""}</div>`:""}
    </div>`;
  }).join("") : `<div class="sub" style="padding:6px 2px;">まだ事件は起きていません。何かが起こるのを待ちましょう…</div>`;
}

// 事件簿から号外カットを見返す(進行は止めない)
function replayEventPic(i){
  const x = (state.partyLog || [])[i];
  if(!x || !x.id) return;
  const e = PARTY_LORE.find(v=>v.id === x.id);
  if(!e) return;
  const keep = state.playing;
  showEventPic(e, x.txt);
  state.picResume = keep;
}

// 事件簿の行をタップして元ネタ(史実)を開閉する
function toggleLogSrc(el){
  el.classList.toggle("open");
}

function makeMonthlyNews(mi){
  const mo = MONTHS[mi];
  const push = txt => state.news.unshift({mo: mo+"総括", txt});
  const teams = state.parts;
  const sorted = standingsSorted();
  push(`${sorted[0].name}が首位ターン！（${sorted[0].W}勝${sorted[0].L}敗）`);
  telop(`${mo}を終えて首位は${sorted[0].name}（${sorted[0].W}勝${sorted[0].L}敗）`);
  const t = teams[Math.floor(rnd()*teams.length)];
  const stars = LINEUP_KEYS.map(k=>t.slots[k]).sort((x,y)=>y.ovr-x.ovr);
  const star = stars[Math.floor(rnd()*3)];
  const tmpl = [
    `${star.name}（${t.name}）が月間${3+Math.floor(rnd()*9)}本塁打の固め打ち`,
    `${star.name}（${t.name}）が月間MVP級の活躍。${star.year}年の輝きそのまま`,
  ];
  push(tmpl[Math.floor(rnd()*tmpl.length)]);
  const t2 = teams[Math.floor(rnd()*teams.length)];
  if(rnd()<0.6){
    const sp = SP_KEYS.map(k=>t2.slots[k]).sort((x,y)=>ovrFor(y,"SP")-ovrFor(x,"SP"))[0];
    push(`${sp.name}（${t2.name}）、月間${3+Math.floor(rnd()*3)}勝の快進撃`);
  }else{
    const cl = t2.slots.CL;
    push(`守護神${cl.name}（${t2.name}）が今月も無失点セーブを量産`);
  }
  if(rnd()<0.35){
    const t3 = teams[Math.floor(rnd()*teams.length)];
    const m = t3.slots.MGR;
    if(m) push(`${m.name}監督（${t3.name}）の${["継投策","選手起用","勝負手","バント采配","代打起用"][Math.floor(rnd()*5)]}がズバリ的中`);
  }
}
function renderNews(){
  $("news").innerHTML = state.news.slice(0,50).map(n=>`<div class="nw"><span class="mo">${n.mo}</span>${esc(n.txt)}</div>`).join("");
}

// ---- 個人成績ヘルパー ----
function seasonProg(){ return state.schedule && state.schedule.length ? clamp(state.day/state.schedule.length, 0, 1) : 0; }
function statOf(t, p, grp){
  if(!state.seasonStats) return null;
  const pit = ["SP","RP","CL"].includes(grp);
  return state.seasonStats.find(x=>x.t===t && x.p===p && (pit ? x.kind==="P" : x.kind==="B"));
}
function statLineLive(s){ // 実際に積み上がった現在成績
  if(!s) return "";
  const c = v => Math.round(v);
  if(s.kind==="B") return `${avg3(s.avg)}・${c(s.hr)}本・${c(s.rbi)}点` + (s.sb>=10?`・${c(s.sb)}盗`:"");
  if(s.role==="CL") return `${c(s.sv)}S・防${s.era.toFixed(2)}`;
  if(s.role==="RP") return `${c(s.hld)}H・防${s.era.toFixed(2)}`;
  return `${c(s.w)}勝・防${s.era.toFixed(2)}・${c(s.so)}K`;
}

// ---- 部門リーダー(順位表下・各部門5位まで) ----
// 規定打席・規定投球回。NPBと同じく試合数×3.1打席、試合数×1.0回で線を引く。
// これが無いと、数十試合しか出ていない控えが高打率で首位打者になってしまう
function teamGamesDone(t){ return (t.W||0) + (t.L||0) + (t.T||0); }
function reqPA(s){ return teamGamesDone(s.t) * 3.1; }
function reqIP(s){ return teamGamesDone(s.t) * 1.0; }
function qualBat(s){ return s.pa >= reqPA(s); }
function qualPit(s){ return (s.ip || 0) >= reqIP(s); }
// 率のタイトルは規定到達者だけ。到達者がいなければ打席数の多い順に上位から見る
function ratePool(arr, qual){
  const ok = arr.filter(qual);
  if(ok.length) return ok;
  return arr.slice().sort((a,b)=>(b.pa||b.ip||0)-(a.pa||a.ip||0)).slice(0, Math.max(1, Math.ceil(arr.length*0.3)));
}
function leadersHtml(entries, prog){
  const B = entries.filter(s=>s.kind==="B" && !s.bench);
  const P = entries.filter(s=>s.kind==="P");
  const topN = (arr, key, asc=false) => arr.slice().sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key]).slice(0,5);
  const c = v => Math.round(v);
  const defs = [
    ["打率", topN(ratePool(B, qualBat),"avg"), s=>avg3(s.avg)],
    ["本塁打", topN(B,"hr"), s=>c(s.hr)+"本"],
    ["打点", topN(B,"rbi"), s=>c(s.rbi)+"点"],
    ["盗塁", topN(B,"sb"), s=>c(s.sb)+"個"],
    ["勝利", topN(P.filter(x=>x.role==="SP"),"w"), s=>c(s.w)+"勝"],
    ["防御率", topN(ratePool(P.filter(x=>x.role==="SP"), qualPit),"era",true), s=>s.era.toFixed(2)],
    ["セーブ", topN(P.filter(x=>x.role==="CL"),"sv"), s=>c(s.sv)+"S"],
    ["ホールド", topN(P.filter(x=>x.role==="RP"),"hld"), s=>c(s.hld)+"H"],
  ];
  return `<div class="lead-grid">` + defs.map(([label, arr, fmt])=>{
    if(!arr.length) return "";
    return `<div class="lead-cell"><div class="lead-k">${label}</div>` +
      arr.map((s,i)=>`<div class="lead-row${i===0?" first":""}">
        <span class="lead-rk">${i+1}</span>
        <span class="lead-n"><span style="color:${s.t.color}">●</span> ${esc(s.p.name)}</span>
        <span class="lead-v">${fmt(s)}</span></div>`).join("") +
    `</div>`;
  }).join("") + `</div>`;
}
function renderLeaders(){
  const el = $("leaders");
  if(!el || !state.seasonStats) return;
  el.innerHTML = leadersHtml(state.seasonStats, seasonProg());
}

// ---- 速報テロップ ----
const telopQ = [];
let telopBusy = false;
function telop(txt){
  if(telopQ.length > 2) return;
  telopQ.push(txt);
  if(!telopBusy) nextTelop();
}
function nextTelop(){
  const txt = telopQ.shift();
  if(txt === undefined){ telopBusy = false; return; }
  telopBusy = true;
  const el = document.createElement("div");
  el.className = "telop";
  el.innerHTML = `<span class="tk">速報</span>${esc(txt)}`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("in")));
  setTimeout(()=>{
    el.classList.remove("in");
    setTimeout(()=>{ el.remove(); nextTelop(); }, 500);
  }, 2600);
}

function standingsSorted(){
  return state.parts.slice().sort((a,b)=>{
    const pa=a.W/(a.W+a.L||1), pb=b.W/(b.W+b.L||1);
    return pb-pa || (b.RS-b.RA)-(a.RS-a.RA);
  });
}
function renderStandings(elId){
  const s = standingsSorted();
  const top = s[0];
  const clickable = elId === "standings" && state.seasonStats;
  $(elId).innerHTML = `<tr><th>順位</th><th>チーム</th><th>試合</th><th>勝</th><th>敗</th><th>分</th><th>勝率</th><th>差</th></tr>` +
    s.map((t,i)=>{
      const pct = t.W+t.L ? (t.W/(t.W+t.L)).toFixed(3).replace(/^0/,"") : "---";
      const gb = i===0 ? "─" : (((top.W-t.W)+(t.L-top.L))/2).toFixed(1);
      return `<tr class="${i===0?"st-first":""}" ${clickable?`style="cursor:pointer;" onclick="openTeamStats(${state.parts.indexOf(t)})"`:""}><td>${i+1}</td>
        <td style="text-align:left;">${teamEmblem(t,20)} ${esc(t.name)}${clickable?' <span style="font-size:10px;color:#9fbfa8;">▶成績</span>':""}</td>
        <td>${t.W+t.L+t.T}</td><td>${t.W}</td><td>${t.L}</td><td>${t.T}</td><td>${pct}</td><td>${gb}</td></tr>`;
    }).join("");
}

// ---- 所属選手の成績(順位表下の常設ボード・タブ切替・毎日更新) ----
function teamStatRows(t, opts){
  const compact = opts && opts.compact;
  const doneP = new Set();
  const rows = [];
  for(const d of SLOT_DEFS){
    if(d.key==="MGR") continue;
    const p = t.slots[d.key];
    if(!p) continue;
    const pit = ["SP","RP","CL"].includes(d.grp);
    const dupKey = p.id + (pit?"P":"B");
    if(doneP.has(dupKey)) continue;
    doneP.add(dupKey);
    const marks = (p.awakened?" <span class='seal g'>覚</span>":"")+(p.traded?" <span class='seal b'>交</span>":"")+((p.joined!==undefined&&p.joined!==false)?" <span class='seal b'>米</span>":"");
    rows.push(`<tr><td>${d.label}</td><td style="text-align:left;">${formIcon(p)} ${esc(p.name)}${compact?"":titleBadge(p)}${marks}</td><td style="text-align:left;">${statLineLive(statOf(t, p, d.grp))}</td></tr>`);
  }
  return rows.join("");
}
// ---- 野球速報スタイルの詳細成績表 ----
function statTables(t, light){
  const c = v => Math.round(v||0);
  const ipS = v => (Math.round((v||0)*10)/10).toFixed(1);
  const cls = light ? "stat-t light" : "stat-t";
  const marks = p => (p.awakened?`<span class='seal g'>覚</span>`:"")+(p.traded?`<span class='seal b'>交</span>`:"")+((p.joined!==undefined&&p.joined!==false)?`<span class='seal b'>米</span>`:"");

  const bSeen = new Set(), bRows = [];
  for(const d of SLOT_DEFS){
    if(d.key === "MGR" || ["SP","RP","CL"].includes(d.grp)) continue;
    const p = t.slots[d.key];
    if(!p || bSeen.has(p.id)) continue;
    bSeen.add(p.id);
    const s = statOf(t, p, d.grp);
    if(!s){ continue; }
    bRows.push(`<tr${p.inj?' class="row-inj"':''}>
      <td class="pos">${d.label}</td>
      <td class="nm">${formIcon(p)} ${esc(p.name)}${marks(p)}${injBadge(p)}</td>
      <td class="key">${avg3(s.avg)}</td>
      <td class="dim">${c(s.g)}</td><td class="dim">${c(s.ab)}</td><td>${c(s.h)}</td>
      <td>${c(s.d2)}</td><td>${c(s.hr)}</td><td>${c(s.rbi)}</td><td>${c(s.sb)}</td>
      <td class="dim">${c(s.bb)}</td><td class="dim">${c(s.so)}</td>
      <td>${(s.ops||0).toFixed(3).replace(/^0/,"")}</td></tr>`);
  }
  const pSeen = new Set(), pRows = [];
  for(const d of SLOT_DEFS){
    if(!["SP","RP","CL"].includes(d.grp)) continue;
    const p = t.slots[d.key];
    if(!p || pSeen.has(p.id)) continue;
    pSeen.add(p.id);
    const s = statOf(t, p, d.grp);
    if(!s) continue;
    pRows.push(`<tr${p.inj?' class="row-inj"':''}>
      <td class="pos">${d.label}</td>
      <td class="nm">${formIcon(p)} ${esc(p.name)}${marks(p)}${injBadge(p)}</td>
      <td class="key">${(s.era||0).toFixed(2)}</td>
      <td class="dim">${c(s.g)}</td><td>${c(s.w)}</td><td>${c(s.l)}</td>
      <td>${c(s.sv)}</td><td>${c(s.hld)}</td>
      <td class="dim">${ipS(s.ip)}</td><td>${c(s.so)}</td><td class="dim">${c(s.bb)}</td>
      <td>${(s.whip||0).toFixed(2)}</td></tr>`);
  }
  return `
  <div class="stat-wrap"><table class="${cls}">
    <caption>ＢＡＴＴＥＲＳ ─ 野手成績</caption>
    <thead><tr><th></th><th class="l">選手</th><th>打率</th><th>試合</th><th>打数</th><th>安打</th><th>二塁打</th><th>本塁打</th><th>打点</th><th>盗塁</th><th>四球</th><th>三振</th><th>OPS</th></tr></thead>
    <tbody>${bRows.join("")}</tbody>
  </table></div>
  <div class="stat-wrap"><table class="${cls}">
    <caption>ＰＩＴＣＨＥＲＳ ─ 投手成績</caption>
    <thead><tr><th></th><th class="l">選手</th><th>防御率</th><th>登板</th><th>勝</th><th>敗</th><th>S</th><th>H</th><th>投球回</th><th>奪三振</th><th>与四球</th><th>WHIP</th></tr></thead>
    <tbody>${pRows.join("")}</tbody>
  </table></div>`;
}



// ============================================================
// 球界事件簿ビューア(収録された史実イベントを全件読む)
// ============================================================
const FILE_CATS = [
  {k:"all",   label:"すべて"},
  {k:"pic",   label:"挿絵あり"},
  {k:"sc1",   label:"私生活"},
  {k:"sc2",   label:"契約・移籍"},
  {k:"sc3",   label:"規律・炎上"},
  {k:"sc4",   label:"球界の疑惑"},
  {k:"gos",   label:"ゴシップ・舌禍"},
  {k:"showa", label:"昭和"},
  {k:"hei",   label:"平成・令和"},
  {k:"mlb",   label:"MLB"},
  {k:"misc",  label:"助っ人・珍記録"},
];
function fileCatOf(e){ return e.cat || "misc"; }
function openFile(){
  if(state.fileCat === undefined) state.fileCat = "all";
  renderFile();
  $("file-bg").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeFile(){
  $("file-bg").classList.remove("show");
  document.body.style.overflow = "";
}
function fileTab(k){ state.fileCat = k; renderFile(); const l = $("file-list"); if(l) l.scrollTop = 0; }
function fileSearch(){ renderFile(); }
function plainText(t){
  // 「{M}監督」を先に潰さないと「監督監督」になる
  return String(t || "")
    .replace(/\{M\}監督/g, "監督").replace(/\{M\}/g, "監督")
    .replace(/\{P2\}/g, "別の選手").replace(/\{P\}/g, "選手")
    .replace(/\{T2\}/g, "相手球団").replace(/\{T\}/g, "球団");
}
function fileList(){
  const q = ($("file-q") && $("file-q").value || "").trim();
  const cat = state.fileCat || "all";
  return PARTY_LORE.filter(function(e){
    if(cat === "pic"){ if(!EVENT_PIC.has(e.id)) return false; }
    else if(cat !== "all" && fileCatOf(e) !== cat) return false;
    if(q && (plainText(e.text) + " " + (e.note||"")).indexOf(q) < 0) return false;
    return true;
  });
}
function fileCatCount(k){
  if(k === "all") return PARTY_LORE.length;
  if(k === "pic") return PARTY_LORE.filter(function(e){ return EVENT_PIC.has(e.id); }).length;
  return PARTY_LORE.filter(function(e){ return fileCatOf(e) === k; }).length;
}
function renderFile(){
  const cat = state.fileCat || "all";
  const list = fileList();
  $("file-tabs").innerHTML = FILE_CATS.map(function(c){
    return '<button class="ft' + (cat===c.k?" on":"") + '" onclick="fileTab(&quot;' + c.k + '&quot;)">' +
           esc(c.label) + '<i>' + fileCatCount(c.k) + '</i></button>';
  }).join("");
  $("file-count").textContent = list.length + "件";
  $("file-list").innerHTML = list.length ? list.map(function(e){
    const head = (/^【([^】]+)】/.exec(e.text) || [null,"事件"])[1];
    const body = plainText(e.text).replace(/^【[^】]+】/, "");
    const pic = EVENT_PIC.has(e.id);
    const catLabel = (FILE_CATS.find(function(c){ return c.k === fileCatOf(e); }) || {label:""}).label;
    return '<article class="fe">' +
      (pic ? '<button class="fe-pic" onclick="showFilePic(&quot;' + e.id + '&quot;)" title="挿絵を大きく見る">' +
             '<img src="assets/event/' + e.id + '.jpg" alt=""><span>拡大</span></button>' : "") +
      '<div class="fe-body">' +
        '<div class="fe-kick"><span class="fe-icon ' + e.cls + '">' + esc(e.icon) + '</span>' +
          '<span class="fe-cat">' + esc(catLabel) + '</span></div>' +
        '<h3>' + esc(head) + '</h3>' +
        '<p class="fe-txt">' + esc(body) + '</p>' +
        (e.note ? '<div class="fe-note"><b>元ネタ</b>' + esc(e.note) + '</div>' : "") +
      '</div>' +
    '</article>';
  }).join("") : '<div class="fe-empty">該当する事件は見つかりませんでした。</div>';
}
// 事件簿から挿絵を大きく見る(ペナントの進行には影響しない)
function showFilePic(id){
  const e = PARTY_LORE.find(function(v){ return v.id === id; });
  if(!e) return;
  const keep = state.playing;
  showEventPic(e, plainText(e.text));
  state.picResume = keep;
  $("pic-date").textContent = "球史事件簿より";
}

// ============================================================
// 打順・先発ローテーションの編成
// ============================================================
function openOrder(idx){
  const t = state.parts[idx];
  if(!t) return;
  state.orderCtx = {idx, order: orderKeys(t).slice(), rot: rotKeys(t).slice()};
  renderOrder();
  $("order-bg").classList.add("show");
}
function renderOrder(){
  const c = state.orderCtx;
  if(!c) return;
  const t = state.parts[c.idx];
  const row = (arr, i, kind) => {
    const k = arr[i], p = t.slots[k];
    const d = SLOT_DEFS.find(x=>x.key===k);
    const st = p && state.seasonStats ? statOf(t, p, d.grp) : null;
    const line = st ? (kind==="rot"
        ? `${Math.round((st.w||0)*(seasonProg()||1))}勝 防${(st.era||0).toFixed(2)}`
        : `${avg3(st.avg)} ${Math.round((st.hr||0)*(seasonProg()||1))}本`)
      : (p ? "―" : "");
    return `<div class="od-row">
      <span class="od-n">${kind==="rot" ? "第"+(i+1)+"先発" : (i+1)}</span>
      <span class="od-pos">${d ? d.label : ""}</span>
      <span class="od-name">${p ? esc(p.name) : "―"}${p ? rankIcon(p.ovr, 15) : ""}</span>
      <span class="od-st">${line}</span>
      <button class="od-b" onclick="moveOrder('${kind}',${i},-1)" ${i===0?"disabled":""}>▲</button>
      <button class="od-b" onclick="moveOrder('${kind}',${i},1)" ${i===arr.length-1?"disabled":""}>▼</button>
    </div>`;
  };
  $("order-title").innerHTML = teamEmblem(t,20) + " " + esc(t.name) + " ── 打順とローテーション";
  $("order-body").innerHTML =
    `<div class="od-col">
       <div class="od-h">打順</div>
       ${c.order.map((k,i)=>row(c.order,i,"bat")).join("")}
     </div>
     <div class="od-col">
       <div class="od-h">先発ローテーション</div>
       ${c.rot.map((k,i)=>row(c.rot,i,"rot")).join("")}
       <div class="od-note">上から順に登板します。中継ぎ・抑えは自動です。</div>
     </div>`;
}
function moveOrder(kind, i, d){
  const c = state.orderCtx;
  if(!c) return;
  const arr = kind === "rot" ? c.rot : c.order;
  const j = i + d;
  if(j < 0 || j >= arr.length) return;
  const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  seTap();
  renderOrder();
}
function autoOrder(){
  const c = state.orderCtx;
  if(!c) return;
  const t = state.parts[c.idx];
  // 打順は「出塁できる順に上位、長打を3〜5番」という定跡で自動編成
  const ps = c.order.map(k=>({k, p:t.slots[k]})).filter(x=>x.p);
  const onbase = ps.slice().sort((a,b)=>(b.p.avg + b.p.sb*0.0016) - (a.p.avg + a.p.sb*0.0016));
  const power  = ps.slice().sort((a,b)=>(b.p.hr*2 + b.p.rbi) - (a.p.hr*2 + a.p.rbi));
  const out = [], used = new Set();
  const take = list => { for(const x of list){ if(!used.has(x.k)){ used.add(x.k); return x.k; } } return null; };
  out[0] = take(onbase); out[1] = take(onbase);
  out[3] = take(power);  out[2] = take(power); out[4] = take(power);
  for(let i=0;i<9;i++) if(!out[i]) out[i] = take(onbase);
  c.order = out.filter(Boolean);
  c.rot = c.rot.slice().sort((a,b)=>ovrFor(t.slots[b],"SP") - ovrFor(t.slots[a],"SP"));
  seWin();
  renderOrder();
}
function saveOrder(){
  const c = state.orderCtx;
  if(!c) return;
  const t = state.parts[c.idx];
  t.order = c.order.slice();
  t.rot = c.rot.slice();
  t.rotIdx = 0;
  state.orderCtx = null;
  $("order-bg").classList.remove("show");
  seWin();
  renderRosterLive();
}
function closeOrder(){ state.orderCtx = null; $("order-bg").classList.remove("show"); }

function renderRosterLive(){
  const tabs = $("roster-tabs"), body = $("roster-live");
  if(!tabs || !body || !state.seasonStats) return;
  if(state.rosterTab === undefined) state.rosterTab = 0;
  tabs.innerHTML = state.parts.map((t,i)=>
    `<span class="chip ${state.rosterTab===i?"on":""}" onclick="state.rosterTab=${i};renderRosterLive()">${teamEmblem(t,17)} ${esc(t.name)}</span>`
  ).join("");
  const t = state.parts[state.rosterTab] || state.parts[0];
  const m = t.slots.MGR;
  const editable = !t.cpu && !state.finished;
  body.innerHTML = (t.park ? `<div class="rl-park">本拠地　<b>${esc(t.park.name)}</b>　<span>${esc(t.park.type)}／${esc(t.park.note)}</span></div>` : "")
    + (editable ? `<div class="rl-edit"><button class="btn ghost sm" onclick="openOrder(${state.parts.indexOf(t)})">打順・ローテを組む</button></div>` : "")
    + (m ? `<div class="rl-mgr">監督　<b>${esc(m.name)}</b>　采配${((m.ovr-85)*0.1>=0?"+":"")}${((m.ovr-85)*0.1).toFixed(1)}／育成${devStars(m)}${t.mgrRest?`　<span class="seal b">休養中</span>`:""}</div>` : "")
    + statTables(t, false);
}

// ---- チーム別 選手成績(順位表の行をタップ。自由契約やトレードの判断材料に) ----
function openTeamStats(idx){
  const t = state.parts[idx];
  if(!t || !state.seasonStats) return;
  const m = t.slots.MGR;
  $("ts-title").innerHTML = `<span style="color:${t.color}">●</span> ${esc(t.name)} ── ここまでの成績（${t.W}勝${t.L}敗${t.T?t.T+"分":""}）`;
  $("ts-body").innerHTML = (m ? `<div class="rl-mgr light">監督　<b>${esc(m.name)}</b>　采配${((m.ovr-85)*0.1>=0?"+":"")}${((m.ovr-85)*0.1).toFixed(1)}／育成${devStars(m)}${t.mgrRest?`　<span class="seal b">休養中</span>`:""}</div>` : "")
    + statTables(t, true);
  $("team-bg").classList.add("show");
}

function renderChart(){
  const W=720, H=240, padL=34, padR=86, padT=12, padB=22;
  const total = (state.schedule && state.schedule.length) || 1;
  const maxLen = total + 1; // 開幕前(0)+全日程
  let lo=0, hi=0;
  state.parts.forEach(t=>t.hist.forEach(v=>{ lo=Math.min(lo,v); hi=Math.max(hi,v); }));
  if(hi-lo<6){hi+=3;lo-=3;}
  const x = i => padL + (W-padL-padR)*i/(maxLen-1);
  const y = v => padT + (H-padT-padB)*(1-(v-lo)/(hi-lo));
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<line x1="${padL}" y1="${y(0)}" x2="${W-padR}" y2="${y(0)}" stroke="#b3a683" stroke-dasharray="4 4"/>`;
  svg += `<text x="${padL-6}" y="${y(0)+4}" fill="#7b7159" font-size="10" text-anchor="end">0</text>`;
  MONTHS.forEach((m,i)=>{
    const dx = x(i*total/7 + total/14);
    svg += `<text x="${dx}" y="${H-6}" fill="#7b7159" font-size="10" text-anchor="middle">${m}</text>`;
    if(i>0) svg += `<line x1="${x(i*total/7)}" y1="${padT}" x2="${x(i*total/7)}" y2="${H-padB}" stroke="#e6dec7" stroke-width="1"/>`;
  });
  state.parts.forEach(t=>{
    const pts = t.hist.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
    svg += `<polyline points="${pts}" fill="none" stroke="${t.color}" stroke-width="2" stroke-linejoin="round"/>`;
  });
  // 端の見出しは重なりやすい(開幕直後は全球団が0で並ぶ)。上下にずらして必ず読めるようにする
  const ends = state.parts.map(t=>{
    const last = t.hist[t.hist.length-1];
    return {t, last, lx:x(t.hist.length-1), ly:y(last), ty:y(last)};
  }).sort((a,b)=>a.ty-b.ty);
  const GAP = 12;
  for(let i=1;i<ends.length;i++){
    if(ends[i].ty - ends[i-1].ty < GAP) ends[i].ty = ends[i-1].ty + GAP;
  }
  const over = ends.length ? ends[ends.length-1].ty - (H-padB) : 0;
  if(over > 0) ends.forEach(e=>{ e.ty -= over; });
  ends.forEach(e=>{
    const nm = e.t.name.length>5 ? e.t.name.slice(0,5) : e.t.name;
    svg += `<circle cx="${e.lx}" cy="${e.ly}" r="3.5" fill="${e.t.color}"/>`;
    // 点と見出しがずれた分は引き出し線でつなぐ
    if(Math.abs(e.ty - e.ly) > 1.5){
      svg += `<path d="M${e.lx+4} ${e.ly} L${e.lx+9} ${e.ty-3.5}" stroke="${e.t.color}" stroke-width="1" fill="none" opacity=".55"/>`;
    }
    svg += `<text x="${e.lx+11}" y="${e.ty}" fill="${e.t.color}" font-size="10.5" font-weight="bold" dominant-baseline="middle">${esc(nm)} ${e.last>0?"+":""}${e.last}</text>`;
  });
  svg += `</svg>`;
  $("chart").innerHTML = svg;
}

// ============================================================
// イベント: トレードタイム
// ============================================================
function tradablePlayers(t){
  return SLOT_DEFS.filter(d=>d.key!=="MGR").map(d=>({d, p:t.slots[d.key]}))
    .filter(x=>x.p && !x.p.twoWay && x.p.joined===undefined)
    .filter((x,i,arr)=>arr.findIndex(y=>y.p===x.p)===i);
}
function startEvent(type, ev){
  $("s-play").disabled = true; $("s-skip").disabled = true;
  if(type==="roulette"){ startRoulette(ev && ev.no !== undefined ? ev.no : 0); return; }
  if(type==="trade"){
    if(!state.parts.filter(t=>!t.cpu).length){ endEventPhase(); return; }
    state.eventCtx = {type, mode:"table", sel:{a:"", b:"", pa:"", pb:""}, done:[]};
    renderTradeTable();
    $("event-bg").classList.add("show");
  }else if(type==="mlb"){
    // 最下位チームから順に指名(コストは不要)
    state.eventCtx = {type, queue:standingsSorted().reverse(), idx:0,
      pool:mlbOffer(state.parts.length+4), star:null};
    advanceMlb();
  }
}
function endEventPhase(){
  $("event-bg").classList.remove("show");
  state.eventCtx = null;
  // ルーレット中のスキャンダル対応が終わったら、残りの球団へ戻る
  if(state.rouletteResume){
    const r = state.rouletteResume; state.rouletteResume = null;
    state.eventCtx = r;
    $("s-play").disabled = true; $("s-skip").disabled = true;
    rouletteRender();
    $("event-bg").classList.add("show");
    return;
  }
  $("s-play").disabled = false;
  if(!state.finished) $("s-skip").disabled = false;
  renderNews();
  renderStandings("standings");
  if(state.resumeAfterEvent && state.day < state.schedule.length){
    state.resumeAfterEvent = false;
    startTimer();
  }else{
    stopTimer();
  }
}

function tradeRow(x, sel, dim, clickJs, team){
  const p = x.p;
  const st = team ? statLineLive(statOf(team, p, x.d.grp)) : "";
  return `<div class="tr-item ${sel?"sel":""} ${dim?"dim":""}" ${dim?"":`onclick="${clickJs}"`}>
    <span class="tr-pos">${x.d.label}</span>
    <span class="tr-nm">${esc(p.name)}${titleBadge(p)}${st?`<span class="tr-st">${st}</span>`:""}</span>
    <span class="rank rank-${rankOf(ovrFor(p,x.d.grp))}" style="position:static;flex:none;">${rankOf(ovrFor(p,x.d.grp))}</span>
  </div>`;
}
// ---- 交渉テーブル(6月末) ----
// 画面は各球団の「穴」と「出せる選手」を並べるだけ。交渉は卓上で口頭でやり、
// 話がついたものを入力して成立させる
function teamNeeds(t){
  return SLOT_DEFS.filter(d=>d.key!=="MGR" && t.slots[d.key])
    .map(d=>({d, p:t.slots[d.key], o:ovrFor(t.slots[d.key], d.grp)}))
    .sort((x,y)=>x.o-y.o).slice(0,2);
}
function teamOffers(t){
  const need = new Set(teamNeeds(t).map(x=>x.d.key));
  return tradablePlayers(t)
    .filter(x=>!need.has(x.d.key))
    .map(x=>Object.assign({}, x, {o:ovrFor(x.p, x.d.grp)}))
    .sort((x,y)=>y.o-x.o).slice(0,2);
}
function renderTradeTable(){
  const ctx = state.eventCtx;
  const s = standingsSorted();
  const cards = s.map(function(t){
    const rank = s.indexOf(t)+1;
    const need = teamNeeds(t), off = teamOffers(t);
    const line = x => '<div class="ng-p"><span class="ng-pos">' + x.d.label + '</span>' +
      '<span class="ng-nm">' + esc(x.p.name) + '</span>' + rankIcon(x.o, 16) + '</div>';
    return '<div class="ng-card' + (t.cpu ? " cpu" : "") + '">' +
      '<div class="ng-h"><span class="ng-r">' + rank + '</span>' + teamEmblem(t, 19) +
        '<b>' + esc(t.name) + '</b>' +
        '<span class="ng-w">' + t.W + '勝' + t.L + '敗</span></div>' +
      '<div class="ng-sec"><div class="ng-lb need">補強したい</div>' + need.map(line).join("") + '</div>' +
      '<div class="ng-sec"><div class="ng-lb offer">出せる</div>' +
        (off.length ? off.map(line).join("") : '<div class="ng-none">出せる駒がない</div>') + '</div>' +
    '</div>';
  }).join("");
  const done = ctx.done.length
    ? '<div class="ng-done"><div class="ng-done-h">成立したトレード</div>' +
      ctx.done.map(function(d){ return '<div class="ng-done-i">' + esc(d) + '</div>'; }).join("") + '</div>'
    : "";
  $("event-panel").innerHTML =
    '<h2><span class="kicker">移籍情報</span>交渉テーブル ── 6月末</h2>' +
    '<div class="sub">画面はお互いの手の内だけを映します。<b>交渉は卓上で口頭で</b>。' +
    '話がついたら「成立させる」で入力してください。何件でも成立します。</div>' +
    '<div class="ng-grid">' + cards + '</div>' + done +
    '<div class="ng-foot">' +
      '<button class="btn" onclick="tradeOpenInput()">話がついた ── 成立させる</button>' +
      '<button class="btn ghost sm" onclick="endEventPhase()">交渉を終える</button>' +
    '</div>';
}
function tradeOpenInput(){
  const ctx = state.eventCtx;
  ctx.mode = "input";
  ctx.sel = {a:"", b:"", pa:"", pb:""};
  renderTradeInput();
}
function tradeSel(k, v){
  const ctx = state.eventCtx;
  ctx.sel[k] = v;
  if(k === "a"){ ctx.sel.pa = ""; if(ctx.sel.b === v) ctx.sel.b = ""; }
  if(k === "b"){ ctx.sel.pb = ""; }
  if(k === "pa"){ ctx.sel.pb = ""; }
  renderTradeInput();
}
function renderTradeInput(){
  const ctx = state.eventCtx, sel = ctx.sel;
  const A = state.parts.find(t=>t.name===sel.a) || null;
  const B = state.parts.find(t=>t.name===sel.b) || null;
  const listA = A ? tradablePlayers(A) : [];
  const listB = B ? tradablePlayers(B) : [];
  const pa = listA.find(x=>x.d.key===sel.pa) || null;
  const compat = x => pa && eligibleGrp(x.p, pa.d.grp) && eligibleGrp(pa.p, x.d.grp);
  const pb = listB.find(x=>x.d.key===sel.pb && compat(x)) || null;
  const chip = (t, k) => '<span class="chip ' + (sel[k]===t.name?"on":"") + '"' +
    ' onclick="tradeSel(&quot;' + k + '&quot;,&quot;' + esc(t.name) + '&quot;)">' +
    teamEmblem(t, 15) + ' ' + esc(t.name) + '</span>';
  $("event-panel").innerHTML =
    '<h2><span class="kicker">入力</span>成立したトレードを入力</h2>' +
    '<div class="sub">合意した2球団と、交換する選手を選んでください。ポジションが合う選手だけ選べます。</div>' +
    '<div class="ng-in">' +
      '<div class="ng-side">' +
        '<div class="ng-side-h">球団 A</div>' +
        '<div class="ng-chips">' + state.parts.map(t=>chip(t,"a")).join("") + '</div>' +
        '<div class="tr-col">' + (A
          ? listA.map(x=>tradeRow(x, sel.pa===x.d.key, false, 'tradeSel(&quot;pa&quot;,&quot;'+x.d.key+'&quot;)', A)).join("")
          : '<div class="ng-none">← 球団を選んでください</div>') + '</div>' +
      '</div>' +
      '<div class="ng-side">' +
        '<div class="ng-side-h">球団 B</div>' +
        '<div class="ng-chips">' + state.parts.filter(t=>t!==A).map(t=>chip(t,"b")).join("") + '</div>' +
        '<div class="tr-col">' + (B
          ? (pa ? listB.map(x=>tradeRow(x, sel.pb===x.d.key, !compat(x), 'tradeSel(&quot;pb&quot;,&quot;'+x.d.key+'&quot;)', B)).join("")
                : '<div class="ng-none">← 先にAの選手を選んでください</div>')
          : '<div class="ng-none">← 球団を選んでください</div>') + '</div>' +
      '</div>' +
    '</div>' +
    (pa && pb ? '<div class="tr-summary">' +
      '<span><b>' + esc(pa.p.name) + '</b>（' + rankOf(pa.p.ovr) + '・' + pa.p.cost + 'pt）</span>' +
      '<span class="tr-arrow">⇄</span>' +
      '<span><b>' + esc(pb.p.name) + '</b>（' + rankOf(pb.p.ovr) + '・' + pb.p.cost + 'pt）</span>' +
    '</div>' : "") +
    '<div class="ng-foot">' +
      '<button class="btn ghost sm" onclick="tradeBackToTable()">卓上へ戻る</button>' +
      '<button class="btn" onclick="tradeCommit()"' + (pa && pb ? '' : ' disabled') + '>この内容で成立</button>' +
    '</div>';
}
function tradeBackToTable(){
  state.eventCtx.mode = "table";
  renderTradeTable();
}
function tradeCommit(){
  const ctx = state.eventCtx, sel = ctx.sel;
  const A = state.parts.find(t=>t.name===sel.a);
  const B = state.parts.find(t=>t.name===sel.b);
  if(!A || !B) return;
  const pa = tradablePlayers(A).find(x=>x.d.key===sel.pa);
  const pb = tradablePlayers(B).find(x=>x.d.key===sel.pb);
  if(!pa || !pb) return;
  // CPUがからむ場合だけ、割に合うかを見る。人間同士は卓上で合意済みとして通す
  for(const [cpu, give, get] of [[A, pa, pb], [B, pb, pa]]){
    if(cpu.cpu && (get.p.ovr - give.p.ovr) < -1){
      alert(cpu.name + "は首を縦に振らなかった。見返りが釣り合っていない");
      return;
    }
  }
  A.slots[pa.d.key] = pb.p;
  B.slots[pb.d.key] = pa.p;
  pa.p.traded = true; pb.p.traded = true;
  statsSwapTeams(pa.p, pb.p, A, B);
  const txt = "【トレード成立】" + A.name + "の" + pa.p.name + " ⇄ " + B.name + "の" + pb.p.name + " 電撃交換！";
  state.news.unshift({mo:"7月", txt});
  telop(txt);
  partyNews("交", "warn", txt, null, A);
  ctx.done.push(A.name + "　" + pa.p.name + "　⇄　" + pb.p.name + "　" + B.name);
  seWin();
  renderRosterLive(); renderTeamStrip();
  tradeBackToTable();
}

// ============================================================
// イベント: MLBスター補強
// ============================================================
// 提示されるMLB組は「超一流は最大2人」。残りは中位以下から
function mlbOffer(n){
  const avail = MLB_STARS.filter(p=>p.joined===undefined && rankOK(p));
  const elite = shuffle(avail.filter(p=>p.ovr >= 93));
  const rest  = shuffle(avail.filter(p=>p.ovr <  93));
  const eCap  = rnd() < 0.45 ? 1 : (rnd() < 0.7 ? 2 : 0);
  const out = [...elite.slice(0, eCap), ...rest].slice(0, n);
  return out.length >= n ? shuffle(out) : shuffle(avail).slice(0, n);
}
function mlbCompatSlots(t, star){
  return SLOT_DEFS.filter(d=>d.key!=="MGR").filter(d=>{
    const cur = t.slots[d.key];
    if(!cur || cur.twoWay || cur.joined!==undefined) return false;
    if(star.cat==="B" && star.twoWay) return (d.grp==="DH"||d.grp==="BN"||d.grp==="SP");
    if(star.cat==="B") return ["捕","一","二","三","遊","外","DH","BN"].includes(d.grp) && eligibleGrp(star,d.grp);
    return ["SP","RP","CL"].includes(d.grp) && eligibleGrp(star,d.grp);
  });
}
function cpuMlbSign(t, pool){
  const stars = pool.slice().sort((a,b)=>b.ovr-a.ovr);
  for(const star of stars){
    const slots = mlbCompatSlots(t, star);
    if(!slots.length) continue;
    const weakest = slots.sort((a,b)=>ovrFor(t.slots[a.key],a.grp)-ovrFor(t.slots[b.key],b.grp))[0];
    if(ovrFor(star,weakest.grp) - ovrFor(t.slots[weakest.key],weakest.grp) >= 3){
      signMlb(t, star, weakest.key, pool);
      return;
    }
  }
}
function signMlb(t, star, slotKey, pool){
  const released = t.slots[slotKey];
  t.slots[slotKey] = star;
  star.joined = true;
  pool.splice(pool.indexOf(star),1);
  if(state.seasonStats){
    const grp = SLOT_DEFS.find(d=>d.key===slotKey).grp;
    statsReplace(released, star, t, grp);
  }
  const txt = `【電撃補強】${t.name}がMLBから${star.name}を獲得！ ${released.name}は自由契約に`;
  state.news.unshift({mo:"8月", txt});
  telop(txt);
}
function advanceMlb(){
  const ctx = state.eventCtx;
  while(ctx.idx < ctx.queue.length && ctx.queue[ctx.idx].cpu){
    cpuMlbSign(ctx.queue[ctx.idx], ctx.pool);
    ctx.idx++;
  }
  if(ctx.idx >= ctx.queue.length){ endEventPhase(); return; }
  ctx.star = null;
  renderMlbPanel();
  $("event-bg").classList.add("show");
}
function renderMlbPanel(){
  const ctx = state.eventCtx;
  const t = ctx.queue[ctx.idx];
  const star = ctx.star;
  let slotHtml = "";
  if(star){
    const slots = mlbCompatSlots(t, star);
    slotHtml = slots.length ? `
      <div style="margin-top:10px;"><b>${esc(star.name)}</b> と入れ替える（自由契約にする）選手を選択。今季成績を見て決めてください：</div>
      <div class="rel-grid">
        ${slots.map(d=>{
          const cur = t.slots[d.key];
          return `<button class="rel-btn" onclick="mlbSignClick('${d.key}')">
            <span class="rel-hd">[${d.label}] ${esc(cur.name)} <span class="rank rank-${rankOf(ovrFor(cur,d.grp))}" style="position:static;">${rankOf(ovrFor(cur,d.grp))}</span></span>
            <span class="rel-st">${statLineLive(statOf(t, cur, d.grp)) || "─"}</span>
          </button>`;
        }).join("")}
      </div>` :
      `<div class="sub" style="margin-top:10px;color:var(--red)">この選手と入れ替えられる枠がありません</div>`;
  }
  $("event-panel").innerHTML = `
    <h2><span class="kicker">海外通信</span>MLB補強チャンス ── 7月末</h2>
    <div class="sub">最下位チームから順に、MLB歴代スターを1人指名できます（既存選手1人と入れ替え。コスト不要）。獲得するかどうかは自由です。</div>
    <div style="margin:14px 0;font-size:18px;font-weight:bold;"><span style="color:${t.color}">●</span> ${esc(t.name)} の番（現在${standingsSorted().indexOf(t)+1}位）</div>
    <div class="mlb-grid">
      ${ctx.pool.map(p=>`
        <div class="mlb-card ${star===p?"sel":""}" onclick="mlbStarClick('${p.id}')">
          <span class="rank-wrap">${rankIcon(p.ovr, 28)}</span>
          <div class="pc-row">
            ${avatarBox(p, 36)}
            <div class="pc-main">
              <div class="nm">${esc(p.name)}${titleBadge(p)}</div>
              <div class="meta">${roleLabel(p)}・${handMark(p)}${esc(p.team)}・${p.year}年</div>
              <div class="meta">${statShort(p)}</div>
            </div>
          </div>
        </div>`).join("")}
    </div>
    <div class="sub">カードをクリックで選択、もう一度詳しく見るには選択後「経歴を見る」。</div>
    ${star?`<div style="margin-top:6px;"><button class="btn ghost sm" onclick="openModal('${star.id}')">${esc(star.name)}の経歴を見る</button></div>`:""}
    ${slotHtml}
    <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn ghost sm" onclick="mlbPass()">補強しない（パス）</button>
    </div>`;
}
function mlbStarClick(id){
  const ctx = state.eventCtx;
  ctx.star = ctx.pool.find(p=>p.id===id);
  renderMlbPanel();
}
function mlbSignClick(slotKey){
  const ctx = state.eventCtx;
  const t = ctx.queue[ctx.idx];
  signMlb(t, ctx.star, slotKey, ctx.pool);
  ctx.idx++;
  advanceMlb();
}
function mlbPass(){
  const ctx = state.eventCtx;
  ctx.idx++;
  advanceMlb();
}

// ============================================================
// 個人成績シミュレーション & タイトル
// ============================================================
function totalG(){ return state.gamesPer || state.pairGames*(state.parts.length-1); }
// 移籍しても積み上げた成績は本人についていく。所属だけ移す
function statsSwapTeams(pA, pB, tA, tB){
  for(const s of state.seasonStats){
    if(s.p===pA && s.t===tA) s.t = tB;
    else if(s.p===pB && s.t===tB) s.t = tA;
  }
  rebuildStatIdx();
}
// 入れ替えで入ってきた選手には、その時点からの記録を作る
function statsReplace(released, star, t, slotGrp){
  if(lineOf(t, star)) return;
  state.seasonStats.push(["SP","RP","CL"].includes(slotGrp)
    ? blankPit(star, t, slotGrp)
    : blankBat(star, t, slotGrp === "BN"));
  rebuildStatIdx();
}
function rebuildStatIdx(){
  state.statIdx = new Map((state.seasonStats||[]).map(s => [s.p.id + "@" + s.t.name, s]));
}

function computeTitles(){
  const S = state.seasonStats;
  const B = S.filter(s=>s.kind==="B" && !s.bench);
  const P = S.filter(s=>s.kind==="P");
  const best = (arr, key, asc=false) => arr.slice().sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key])[0];
  const titles = [];
  const push=(tt,s,val)=>{ if(s) titles.push({tt, name:s.p.name, team:s.t, val}); };
  let x;
  x = best(ratePool(B, qualBat),"avg");  push("首位打者", x, `打率 ${avg3(x.avg)}`);
  x = best(B,"hr");   push("本塁打王", x, `${x.hr}本塁打`);
  x = best(B,"rbi");  push("打点王", x, `${x.rbi}打点`);
  x = best(B,"sb");   if(x && x.sb>=10) push("盗塁王", x, `${x.sb}盗塁`);
  const SP_ = P.filter(s=>s.role==="SP");
  x = best(SP_,"w");  push("最多勝", x, `${x.w}勝`);
  x = best(ratePool(SP_, qualPit),"era",true); push("最優秀防御率", x, `防御率 ${x.era.toFixed(2)}`);
  x = best(P,"so");   push("最多奪三振", x, `${x.so}奪三振`);
  x = best(P.filter(s=>s.role==="CL"),"sv"); push("最多セーブ", x, `${x.sv}セーブ`);
  x = best(P.filter(s=>s.role==="RP"),"hld"); push("最優秀中継ぎ", x, `${x.hld}ホールド`);
  // MVP: 優勝チームで最も活躍した選手
  const champ = standingsSorted()[0];
  const cand = S.filter(s=>s.t===champ && !s.bench).map(s=>{
    const score = s.kind==="B" ? (s.avg-0.25)*300 + s.hr*0.8 + s.rbi*0.15 : s.w*2.2 + s.sv*1.2 + s.hld*0.8 + Math.max(0,(3.6-s.era))*6;
    return {s, score};
  }).sort((a,b)=>b.score-a.score);
  if(cand.length){
    const m=cand[0].s;
    push("MVP", m, m.kind==="B" ? `打率${avg3(m.avg)} ${m.hr}本 ${m.rbi}打点` : (m.role==="CL"?`${m.sv}セーブ 防${m.era.toFixed(2)}`:m.role==="RP"?`${m.hld}H 防${m.era.toFixed(2)}`:`${m.w}勝 防${m.era.toFixed(2)}`));
  }
  if(champ.slots.MGR) titles.push({tt:"最優秀監督", name:champ.slots.MGR.name, team:champ, val:`${champ.name}を優勝に導く`});
  return titles;
}

function statLineOf(s){
  if(!s) return "";
  if(s.kind==="B") return `${avg3(s.avg)}・${s.hr}本・${s.rbi}打点` + (s.sb>=10?`・${s.sb}盗`:"");
  if(s.role==="CL") return `${s.sv}S・防${s.era.toFixed(2)}・${s.so}K`;
  if(s.role==="RP") return `${s.hld}H・防${s.era.toFixed(2)}・${s.so}K`;
  return `${s.w}勝・防${s.era.toFixed(2)}・${s.so}K`;
}

// ============================================================
// 結果発表
// ============================================================
// 球団ごとの一年の出来事。最終成績の下に添える
function teamLogHtml(ti){
  const all = state.partyLog || [];
  const log = all.filter(function(x){ return x.teams && x.teams.indexOf(ti) >= 0; });
  if(!log.length){
    return '<div class="tr-log"><div class="tr-log-h">この一年の出来事<span>0件</span></div>' +
           '<div class="tr-none">特筆すべき事件は起きなかった。平穏なシーズンだった。</div></div>';
  }
  const rows = log.slice().reverse().map(function(x){   // 起きた順に並べ直す
    const ev = x.id ? PARTY_LORE.find(function(v){ return v.id === x.id; }) : null;
    const note = ev && ev.note ? ev.note : "";
    const pic = x.id && EVENT_PIC.has(x.id);
    return '<div class="tr-ev ' + x.cls + (note ? " has-src" : "") + '"' +
        (note ? ' onclick="toggleLogSrc(this)"' : '') + '>' +
      '<div class="tr-ev-line">' +
        '<span class="tr-d">' + esc(x.d) + '</span>' +
        '<span class="tr-i">' + esc(x.icon) + '</span>' +
        '<span class="tr-t">' + esc(x.txt) + '</span>' +
        (pic ? '<img class="tr-pic" src="assets/event/' + x.id + '.jpg" alt="" loading="lazy">' : '') +
        (note ? '<span class="tr-more">元ネタ</span>' : '') +
      '</div>' +
      (note ? '<div class="tr-src"><b>元ネタ</b>' + esc(note) + '</div>' : '') +
    '</div>';
  }).join("");
  const good = log.filter(function(x){ return x.cls === "good"; }).length;
  const bad  = log.filter(function(x){ return x.cls === "bad"; }).length;
  return '<div class="tr-log">' +
    '<div class="tr-log-h">この一年の出来事' +
      '<span>' + log.length + '件（吉' + good + '・凶' + bad + '）</span></div>' +
    rows +
  '</div>';
}

function showResult(){
  const s = standingsSorted();
  const champ = state.seriesWinner || s[0];
  show("scr-result");
  $("r-champ").textContent = champ.name;
  const pct=(champ.W/(champ.W+champ.L)).toFixed(3).replace(/^0/,"");
  if(state.seriesWinner){
    const rank = s.indexOf(champ)+1;
    $("r-champlabel").textContent = "日　本　一";
    $("r-record").textContent = `リーグ${rank}位（${champ.W}勝${champ.L}敗${champ.T?champ.T+"分":""}・勝率${pct}）から日本シリーズを${state.seriesScore}で制覇！`;
  }else{
    $("r-champlabel").textContent = "優　勝";
    $("r-record").textContent = `${champ.W}勝${champ.L}敗${champ.T?champ.T+"分":""}（勝率${pct}）で優勝！`;
  }
  renderStandings("r-standings");
  const titles = computeTitles();
  $("r-titles").innerHTML = titles.map(t=>`
    <div class="title-card">
      <div class="tt">${t.tt}</div>
      <div class="tn">${esc(t.name)} <span style="font-size:12px;color:${t.team.color}">（${esc(t.team.name)}）</span></div>
      <div class="tv">${esc(t.val)}</div>
    </div>`).join("");
  // 各チーム最終成績
  $("r-teams").innerHTML = s.map((t,rank)=>{
    const mgr = t.slots.MGR;
    return `<div class="team-report">
      <h3>${rank+1}位 <span style="color:${t.color}">●</span> ${esc(t.name)}（${t.W}勝${t.L}敗${t.T?t.T+"分":""}）
        <span class="tag">合計コスト ${t.spent}pt</span>${t.park?`<span class="park-tag">本拠地 ${esc(t.park.name)}</span>`:""}</h3>
      ${mgr?`<div class="rl-mgr light">監督　<b>${esc(mgr.name)}</b>（'${String(mgr.year).slice(2)}）　優勝${mgr.pennants}回・日本一${mgr.japan}回／育成${devStars(mgr)}</div>`:""}
      ${statTables(t, "final")}
      ${state.opts.party ? teamLogHtml(state.parts.indexOf(t)) : ""}
    </div>`;
  }).join("");
  confetti();
  seFanfare();
  showGogai(champ);
}
function confetti(){
  const cols=["#a72c18","#22456b","#2c5c34","#9a7714","#e2b13c","#faf6ec"];
  for(let i=0;i<85;i++){
    const e=document.createElement("span");
    e.className="confetti";
    e.style.background=cols[Math.floor(rnd()*cols.length)];
    e.style.left=(rnd()*100)+"vw";
    e.style.animationDuration=(2.5+rnd()*3)+"s";
    e.style.animationDelay=(rnd()*2)+"s";
    e.style.width=(6+rnd()*6)+"px";
    e.style.height=(10+rnd()*8)+"px";
    document.body.appendChild(e);
    setTimeout(()=>e.remove(), 7000);
  }
}

// ============================================================
// 観戦モード: 現在の戦況をURLに畳み込み、QRで各自のスマホへ配る
// ============================================================
function pidOf(p){ const i = PLAYERS.indexOf(p); return i>=0 ? i : 100000 + MLB_STARS.indexOf(p); }
function pById(i){ return i>=100000 ? MLB_STARS[i-100000] : PLAYERS[i]; }
function buildSnapshot(){
  const total = state.schedule.length || 1;
  return {
    d: state.day, g: total,
    teams: state.parts.map(t=>({
      n: t.name, W: t.W, L: t.L, T: t.T,
      s: SLOT_DEFS.map(d=>{
        const p = t.slots[d.key];
        if(!p) return null;
        const st = state.seasonStats ? state.seasonStats.find(x=>x.t===t && x.p===p && (["SP","RP","CL"].includes(d.grp) ? x.kind==="P" : x.kind==="B")) : null;
        let line = null;
        if(st){
          line = st.kind==="B" ? [Math.round(st.avg*1000), st.hr, st.rbi, st.sb] : [st.w, Math.round(st.era*100), st.so, st.sv, st.hld];
        }
        return [pidOf(p), (p.awakened?1:0)|(p.traded?2:0)|(p.joined?4:0), line];
      }),
    })),
  };
}
function b64urlEncode(bytes){
  let s = "";
  for(let i=0;i<bytes.length;i+=0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000));
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64urlDecode(str){
  const b = atob(str.replace(/-/g,"+").replace(/_/g,"/"));
  const arr = new Uint8Array(b.length);
  for(let i=0;i<b.length;i++) arr[i] = b.charCodeAt(i);
  return arr;
}
async function makeShareUrl(){
  const bytes = new TextEncoder().encode(JSON.stringify(buildSnapshot()));
  let tag = "j", payload = bytes;
  if(typeof CompressionStream !== "undefined"){
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    payload = new Uint8Array(await new Response(stream).arrayBuffer());
    tag = "z";
  }
  return location.origin + location.pathname + "#v=" + tag + b64urlEncode(payload);
}
async function openQr(){
  if(!state.parts.length || !state.parts.every(rosterFull)){ alert("ドラフト完了後に使えます"); return; }
  const url = await makeShareUrl();
  const qr = qrcode(0, "M");
  qr.addData(url, "Byte");
  qr.make();
  $("qr-img").innerHTML = qr.createSvgTag({cellSize:4, margin:0, scalable:true});
  $("qr-bg").classList.add("show");
}
async function tryEnterSpectator(){
  const m = location.hash.match(/^#v=([jz])(.+)$/);
  if(!m) return false;
  try{
    let bytes = b64urlDecode(m[2]);
    if(m[1]==="z"){
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const snap = JSON.parse(new TextDecoder().decode(bytes));
    renderSpectator(snap);
    return true;
  }catch(e){
    console.error("spectator decode failed", e);
    return false;
  }
}
function renderSpectator(snap){
  show("scr-spec");
  const prog = clamp(snap.d/snap.g, 0, 1);
  $("spec-note").textContent = `${snap.d}試合日消化 ／ 全${snap.g}日程 ― ホスト端末が「観戦用QR」を出した時点の速報です`;
  const teams = snap.teams.map((t,i)=>({...t, color: COLORS[i%COLORS.length]}));
  const sorted = teams.slice().sort((a,b)=>{
    const pa=a.W/(a.W+a.L||1), pb=b.W/(b.W+b.L||1);
    return pb-pa;
  });
  const top = sorted[0];
  $("spec-standings").innerHTML = `<tr><th>順位</th><th>チーム</th><th>勝</th><th>敗</th><th>分</th><th>勝率</th><th>差</th></tr>` +
    sorted.map((t,i)=>{
      const pct = t.W+t.L ? (t.W/(t.W+t.L)).toFixed(3).replace(/^0/,"") : "---";
      const gb = i===0 ? "─" : (((top.W-t.W)+(t.L-top.L))/2).toFixed(1);
      return `<tr class="${i===0?"st-first":""}"><td>${i+1}</td><td style="text-align:left;"><span style="color:${t.color}">●</span> ${esc(t.n)}</td><td>${t.W}</td><td>${t.L}</td><td>${t.T}</td><td>${pct}</td><td>${gb}</td></tr>`;
    }).join("");
  const entries = [];
  teams.forEach(t=>{
    t.s.forEach((cell,si)=>{
      if(!cell || !cell[2]) return;
      const d = SLOT_DEFS[si];
      const p = pById(cell[0]);
      if(!p) return;
      if(["SP","RP","CL"].includes(d.grp)){
        const [w,era100,so,sv,hld] = cell[2];
        entries.push({t, p, kind:"P", role:d.grp, w, era:era100/100, so, sv, hld});
      }else if(d.key!=="MGR"){
        const [avg1000,hr,rbi,sb] = cell[2];
        entries.push({t, p, kind:"B", bench: d.grp==="BN", avg:avg1000/1000, hr, rbi, sb});
      }
    });
  });
  $("spec-leaders").innerHTML = leadersHtml(entries, prog);
  $("spec-tabs").innerHTML = teams.map((t,i)=>`<span class="chip" id="spec-tab-${i}" onclick="specShowTeam(${i})"><span style="color:${t.color}">●</span> ${esc(t.n)}</span>`).join("");
  window._specData = {teams, prog};
  specShowTeam(0);
}
function specShowTeam(i){
  const {teams, prog} = window._specData;
  const t = teams[i];
  teams.forEach((_,k)=>{ const el=$("spec-tab-"+k); if(el) el.classList.toggle("on", k===i); });
  const c = v=>Math.round(v*prog);
  const rows = t.s.map((cell,si)=>{
    if(!cell) return "";
    const d = SLOT_DEFS[si];
    const p = pById(cell[0]);
    if(!p) return "";
    const fl = cell[1]||0;
    const marks = (fl&1?" <span class='seal g'>覚</span>":"")+(fl&2?" <span class='seal b'>交</span>":"")+(fl&4?" <span class='seal b'>米</span>":"");
    let line = "";
    if(cell[2]){
      if(["SP","RP","CL"].includes(d.grp)){
        const [w,era100,so,sv,hld] = cell[2];
        line = d.grp==="CL" ? `${c(sv)}S・防${(era100/100).toFixed(2)}` : d.grp==="RP" ? `${c(hld)}H・防${(era100/100).toFixed(2)}` : `${c(w)}勝・防${(era100/100).toFixed(2)}・${c(so)}K`;
      }else{
        const [avg1000,hr,rbi,sb] = cell[2];
        line = `${avg3(avg1000/1000)}・${c(hr)}本・${c(rbi)}打点` + (sb>=10?`・${c(sb)}盗`:"");
      }
    }else if(d.key==="MGR"){
      line = "指揮官";
    }
    return `<tr><td>${d.label}</td><td style="text-align:left;">${esc(p.name)}${titleBadge(p)}${marks}</td><td style="text-align:left;">${line}</td></tr>`;
  }).join("");
  $("spec-team").innerHTML = `<table><tr><th>位置</th><th>選手</th><th>ここまでの成績</th></tr>${rows}</table>`;
}
tryEnterSpectator();

// ============================================================
// 選手シルエット肖像(著作権フリーの描き起こしSVG。打席/利き腕で向きが変わる)
// ============================================================
const FR_ACCENT = {
  "巨人":"#e86100","阪神":"#e8c400","中日":"#16336e","ヤクルト":"#0b8747","広島":"#c3000f",
  "DeNA":"#005bac","ソフトバンク":"#e8b800","西武":"#1f366a","ロッテ":"#3a3a3a","日本ハム":"#02598c",
  "オリックス":"#9f8a44","近鉄":"#b7282e","楽天":"#860010","その他":"#666666","MLB":"#1c3d6e",
};
function avatarSvg(p, size=44){
  const acc = FR_ACCENT[p.mlb ? "MLB" : p.fr] || "#666";
  const ink = "#2a251c";
  const flip = (p.cat==="B" && p.bh==="左") || (p.cat==="P" && p.th==="左");
  let pre = "", post = "";
  if(p.cat==="B"){
    pre = `<rect x="30.5" y="3" width="3" height="20" rx="1.5" transform="rotate(24 32 13)" fill="${ink}"/>`;
  }else if(p.cat==="P"){
    pre = `<path d="M31 31 Q37 24 38.5 13" stroke="${ink}" stroke-width="4.6" fill="none" stroke-linecap="round"/><circle cx="39" cy="10.5" r="2.6" fill="${ink}"/>`;
  }else{
    post = `<path d="M24 33 l2.6 4.6 -2.6 8.4 -2.6 -8.4 Z" fill="${acc}"/>`;
  }
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#efe7d2" stroke="#c8bda0"/><g ${flip?'transform="translate(48,0) scale(-1,1)"':''}>${pre}<path d="M7 46 Q10 32 24 31.5 Q38 32 41 46 Z" fill="${ink}"/><circle cx="24" cy="17.5" r="7.4" fill="${ink}"/><path d="M16.6 15.8 A7.4 7.4 0 0 1 31.4 15.8 Z" fill="${acc}"/>${p.cat==="M"?"":`<rect x="28.5" y="14.6" width="8.2" height="2.4" rx="1.2" fill="${acc}"/>`}${post}</g></svg>`;
}
function avatarBox(p, size=42){
  return `<div class="pc-av">${avatarSvg(p,size)}${p.no!==undefined?`<span class="pc-no">${p.no}</span>`:""}</div>`;
}

// ============================================================
// 効果音(WebAudioでその場で合成。素材ファイル不要)
// ============================================================
let AC = null;
let sndOn = true;
try{ sndOn = localStorage.getItem("kyushi_snd") !== "0"; }catch(e){}
function ac(){
  if(!AC){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; AC = new C(); }
  if(AC.state === "suspended") AC.resume();
  return AC;
}
function updateSndBtns(){ document.querySelectorAll(".snd-btn").forEach(b=>b.textContent = sndOn ? "音:ON" : "音:OFF"); }
function toggleSnd(){
  sndOn = !sndOn;
  try{ localStorage.setItem("kyushi_snd", sndOn?"1":"0"); }catch(e){}
  if(!sndOn) seRollStop();
  updateSndBtns();
}
function noiseBurst(t, dur, freq, vol){
  const ctx = ac(); if(!ctx) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate*dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*(1-i/len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination);
  src.start(t);
}
function tone(t, freq, dur, vol, type="square"){
  const ctx = ac(); if(!ctx) return;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t+0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t+dur+0.05);
}
function seTap(){ if(!sndOn) return; const c=ac(); if(!c) return; tone(c.currentTime, 620, 0.07, 0.10, "triangle"); }
let rollTimer = null;
function seRollStart(){
  if(!sndOn) return; const c=ac(); if(!c) return;
  seRollStop();
  const hit = ()=>{ if(AC) noiseBurst(AC.currentTime, 0.05, 1800, 0.09); };
  hit();
  rollTimer = setInterval(hit, 62);
}
function seRollStop(){ if(rollTimer){ clearInterval(rollTimer); rollTimer = null; } }
function seMiss(){ if(!sndOn) return; const c=ac(); if(!c) return; tone(c.currentTime, 130, 0.28, 0.14, "sawtooth"); }
function seWin(){
  if(!sndOn) return; const c=ac(); if(!c) return;
  const t = c.currentTime;
  noiseBurst(t, 0.9, 6500, 0.12);
  [523,659,784,1047].forEach((f,i)=>tone(t+0.05+i*0.09, f, 0.5, 0.11));
}
function seFanfare(){
  if(!sndOn) return; const c=ac(); if(!c) return;
  const t = c.currentTime;
  const seq = [[392,0],[523,0.14],[659,0.28],[784,0.42],[659,0.62],[784,0.76],[1047,0.95]];
  for(const [f,dt] of seq){ tone(t+dt, f, 0.42, 0.11); tone(t+dt, f/2, 0.42, 0.06, "triangle"); }
  noiseBurst(t+0.95, 1.4, 7000, 0.10);
}

// ============================================================
// 優勝号外演出
// ============================================================
function showGogai(champ){
  $("gg-team").textContent = champ.name;
  const pct = (champ.W/(champ.W+champ.L)).toFixed(3).replace(/^0/,"");
  if(state.seriesWinner){
    $("gg-v").textContent = "日本一";
    $("gg-sub").textContent = `日本シリーズを${state.seriesScore}で制覇（リーグ戦${champ.W}勝${champ.L}敗）―― 歓喜の胴上げ`;
  }else{
    $("gg-v").textContent = "優　勝";
    $("gg-sub").textContent = `${champ.W}勝${champ.L}敗${champ.T?champ.T+"分":""}・勝率${pct} ―― 歓喜の胴上げ`;
  }
  $("gogai-bg").classList.add("show");
  for(let i=0;i<10;i++){
    const m = document.createElement("span");
    m.className = "gogai-mini";
    m.textContent = "号外";
    m.style.left = (rnd()*94)+"vw";
    m.style.animationDuration = (3+rnd()*3.5)+"s";
    m.style.animationDelay = (rnd()*2.5)+"s";
    document.body.appendChild(m);
    setTimeout(()=>m.remove(), 9000);
  }
}
function closeGogai(){ $("gogai-bg").classList.remove("show"); }
updateSndBtns();

// ============================================================
// ライブ中継(開幕戦・優勝決定試合をイニングごとに再現)
// ============================================================
let liveCtx = null;
const DIR_1B = ["レフト前","センター前","ライト前","三遊間","一二塁間","中前","左前","右前"];
const DIR_2B = ["左中間","右中間","レフト線","ライト線","三塁線"];
const DIR_HR = ["レフトスタンド","ライトスタンド","左中間スタンド","右中間スタンド","バックスクリーン","場外"];
const DIR_GO = ["ショートゴロ","セカンドゴロ","サードゴロ","ファーストゴロ","ピッチャーゴロ","一二塁間の当たり"];
const DIR_FO = ["レフトフライ","センターフライ","ライトフライ","ショートフライ","浅いセンターフライ"];
const DIR_LN = ["ショートライナー","セカンドライナー","サードライナー","ピッチャーライナー"];
const K_TXT = ["空振り三振","見逃し三振","フォークで空振り三振","外角いっぱいの見逃し三振","渾身の直球で空振り三振"];
const CATCH = ["快音を残すも好捕","惜しくも正面","大きな当たりだが伸びを欠く","詰まらされた"];

function splitInnings(runs){
  const inn = Array(9).fill(0);
  for(let i=0;i<runs;i++) inn[Math.floor(rnd()*9)]++;
  return inn;
}
function starterOf(t){
  const keys = rotKeys(t);
  const k = keys[(t.rotIdx || 0) % keys.length];
  const p = t.slots[k];
  if(p && !isOut(p)) return p;
  // 予定の先発が離脱していれば、投げられる者を繰り上げる
  const alt = keys.map(x=>t.slots[x]).filter(x=>x && !isOut(x));
  return alt[0] || p || t.slots.SP1;
}
function longReliefOf(t, sp){
  // 先発の次に控えている番手(ロングリリーフ役)。当日の先発とは別人を選ぶ
  const ps = rotKeys(t).map(k=>t.slots[k]).filter(p=>p && p !== sp);
  return ps.length ? ps[0] : (sp || starterOf(t));
}
function pitcherForInning(t, inn, sp){
  const st = (sp && !isOut(sp)) ? sp : starterOf(t);
  if(inn <= 5) return {p:st, key:"SP", label:"先発"};
  if(inn === 6) return {p:longReliefOf(t, st), key:"SP", label:"先発"};
  if(inn === 7) return {p:t.slots.RP1 || t.slots.SP1, key:"RP", label:"中継ぎ"};
  if(inn === 8) return {p:t.slots.RP2 || t.slots.RP1 || t.slots.SP1, key:"RP", label:"セットアッパー"};
  return {p:t.slots.CL || t.slots.RP1 || t.slots.SP1, key:"CL", label:"抑え"};
}
function basesLabel(b){
  const on = [b[0]?"一":"", b[1]?"二":"", b[2]?"三":""].filter(Boolean);
  return on.length ? on.join("・")+"塁" : "走者なし";
}
// 打席結果のシミュレート(basesは破壊しない)
function simOutcome(key, bases, outs, bat, pit){
  const nb = bases.slice();
  let runs = 0, outsAdd = 0, scored = [], text = "", cls = "";
  const push = p => { if(p) scored.push(p.name); runs++; };
  switch(key){
    case "K":
      outsAdd = 1;
      text = `${bat.name}、${pick1(K_TXT)}。${pit.name}がねじ伏せた`;
      break;
    case "GO": {
      if(nb[0] && outs < 2 && rnd() < 0.34){
        outsAdd = 2; const r1 = nb[0]; nb[0] = null;
        if(nb[2]){ push(nb[2]); nb[2] = null; }
        text = `${bat.name}、${pick1(["ショートゴロ併殺打","セカンドゴロ併殺打","三塁線ゴロ併殺打"])}。${pit.name}が最少失点で切り抜ける`;
      }else{
        outsAdd = 1;
        const adv = outs < 2 && rnd() < 0.45;
        const dir = pick1(DIR_GO);
        if(adv){
          if(nb[2]){ push(nb[2]); nb[2] = null; cls = "run"; }
          if(nb[1]){ nb[2] = nb[1]; nb[1] = null; }
          if(nb[0]){ nb[1] = nb[0]; nb[0] = null; }
          text = runs ? `${bat.name}、${dir}の間に生還！ ${scored[0]}がホームを踏む` : `${bat.name}、${dir}。走者を進める進塁打`;
        }else{
          text = `${bat.name}、${dir}。${pick1(["軽快に処理","無難にさばく","堅い守り"])}`;
        }
      }
      break;
    }
    case "FO": {
      outsAdd = 1;
      if(nb[2] && outs < 2 && rnd() < 0.6){
        push(nb[2]); nb[2] = null; cls = "run";
        text = `${bat.name}、${pick1(["右犠飛","左犠飛","中犠飛"])}！ ${scored[0]}が悠々生還`;
      }else{
        text = `${bat.name}、${pick1([...DIR_FO, ...DIR_LN])}。${pick1(CATCH)}`;
      }
      break;
    }
    case "1B": {
      const dir = pick1(DIR_1B);
      if(nb[2]){ push(nb[2]); nb[2] = null; }
      if(nb[1]){ if(rnd() < 0.62){ push(nb[1]); } else { nb[2] = nb[1]; } nb[1] = null; }
      if(nb[0]){ nb[1] = nb[0]; nb[0] = null; }
      nb[0] = bat;
      cls = runs ? "run" : "hit";
      text = runs
        ? `${bat.name}、${dir}へ運ぶタイムリーヒット！ ${scored.join("・")}が生還`
        : `${bat.name}、${dir}へクリーンヒット`;
      break;
    }
    case "2B": {
      const dir = pick1(DIR_2B);
      if(nb[2]){ push(nb[2]); nb[2] = null; }
      if(nb[1]){ push(nb[1]); nb[1] = null; }
      if(nb[0]){ if(rnd() < 0.5){ push(nb[0]); } else { nb[2] = nb[0]; } nb[0] = null; }
      nb[1] = bat;
      cls = runs ? "run" : "hit";
      text = runs
        ? `${bat.name}、${dir}を破る${runs}点タイムリー二塁打！ ${scored.join("・")}が還る`
        : `${bat.name}、${dir}を破る二塁打で好機を作る`;
      break;
    }
    case "3B": {
      [2,1,0].forEach(i=>{ if(nb[i]){ push(nb[i]); nb[i] = null; } });
      nb[2] = bat;
      cls = runs ? "run" : "hit";
      text = `${bat.name}、${pick1(["右中間深く","左中間深く","ライト線"])}を破る三塁打！${runs?` ${scored.join("・")}が生還`:""}`;
      break;
    }
    case "HR": {
      [2,1,0].forEach(i=>{ if(nb[i]){ push(nb[i]); nb[i] = null; } });
      scored.push(bat.name); runs++;
      const n = runs;
      const dist = 110 + Math.floor(rnd()*35);
      cls = "hr";
      text = `${bat.name}、${pick1(DIR_HR)}へ${n===1?"ソロ":n===4?"満塁":n+"ラン"}本塁打！ 推定飛距離${dist}m`;
      break;
    }
    case "BB": case "HBP": {
      if(nb[0] && nb[1] && nb[2]){ push(nb[2]); cls = "run"; }
      else if(nb[0] && nb[1]){ nb[2] = nb[1]; nb[1] = nb[0]; }
      else if(nb[0]){ nb[1] = nb[0]; }
      nb[0] = bat;
      text = key === "BB"
        ? (runs ? `${bat.name}、押し出しの四球！ ${scored[0]}が転がり込む` : `${bat.name}、${pick1(["粘って四球","選球眼を見せて四球","フルカウントから四球"])}`)
        : `${bat.name}、死球で出塁。球場がどよめく`;
      break;
    }
    case "E": {
      const pos = pick1(["ショート","セカンド","サード","ライト"]);
      if(nb[2]){ push(nb[2]); nb[2] = null; cls = "run"; }
      if(nb[1]){ nb[2] = nb[1]; nb[1] = null; }
      if(nb[0]){ nb[1] = nb[0]; nb[0] = null; }
      nb[0] = bat;
      text = `${bat.name}の当たりを${pos}が${pick1(["悪送球","後逸","ファンブル"])}！ 記録はエラー${runs?`、${scored[0]}が生還`:""}`;
      break;
    }
  }
  return {bases:nb, outsAdd, runs, text, cls, scored};
}
// 打者と投手の力関係から結果を抽選(得点の帳尻を合わせる制約つき)
function chooseOutcome(bat, pit, pitKey, need, outs, bases){
  const bo = (bat.ovr||80) + fw(bat);
  const po = ovrFor(pit, pitKey) + fw(pit);
  const edge = clamp(1 + (bo - po)*0.022, 0.55, 1.7);
  const hrRate = clamp((bat.hr||10)/28, 0.15, 2.2);
  const base = {
    K:  22/edge, GO: 25/edge, FO: 21/edge,
    "1B": 17*edge, "2B": 5.2*edge, "3B": 0.5*edge, HR: 4.4*edge*hrRate,
    BB: 7.5, HBP: 0.7, E: 1.6,
  };
  const keys = Object.keys(base);
  const ok = [];
  for(const k of keys){
    const r = simOutcome(k, bases, outs, bat, pit);
    if(r.runs > need) continue;                        // 予定得点を超える結果は出さない
    if(outs + r.outsAdd >= 3 && need > r.runs) continue; // 得点を残してスリーアウトにしない
    if(need === 0 && r.runs === 0 && r.outsAdd === 0 && rnd() < 0.55) continue; // 無得点回は長引かせない
    ok.push(k);
  }
  const pool = ok.length ? ok : (need > 0 ? ["HR"] : ["K","GO","FO"]);
  const total = pool.reduce((s,k)=>s+base[k], 0);
  let r = rnd()*total;
  for(const k of pool){ r -= base[k]; if(r <= 0) return k; }
  return pool[0];
}
function genHalf(bat, pitInfo, target, startIdx, inn, top, walkoff){
  const order = LINEUP_KEYS.map(k=>bat.slots[k]).filter(Boolean);
  const ev = [];
  let idx = startIdx, outs = 0, bases = [null,null,null], runs = 0, guard = 16;
  while(outs < 3 && guard-- > 0){
    const b = order[idx % order.length]; idx++;
    const need = target - runs;
    const prevBases = bases.slice();
    const outsBefore = outs;
    const key = chooseOutcome(b, pitInfo.p, pitInfo.key, need, outs, bases);
    const r = simOutcome(key, bases, outs, b, pitInfo.p);
    bases = r.bases; outs += r.outsAdd; runs += r.runs;
    const onBefore = [!!prevBases[0], !!prevBases[1], !!prevBases[2]];
    for(const q of genPitchSeq(key, b, pitInfo.p)){
      ev.push({t:"pitch", inn:inn, top:top, outs:outsBefore, on:onBefore,
        bat:b.name, batNo:b.no, pit:pitInfo.p.name, pitRole:pitInfo.label,
        b:q.b, s:q.s, type:q.type, kmh:q.kmh, zone:q.zone, res:q.res});
    }
    ev.push({t:"pa", text:r.text, cls:r.cls, runs:r.runs,
      inn, top, outs, on:[!!bases[0], !!bases[1], !!bases[2]],
      bat:b.name, batNo:b.no, pit:pitInfo.p.name, pitRole:pitInfo.label,
      sit:`${inn}回${top?"表":"裏"}　${outs}死　${basesLabel(bases)}`});
    if(walkoff && runs >= target && target > 0){
      ev.push({t:"pa", text:`サヨナラ！ ${bat.name}が試合を決めた！`, cls:"hr", runs:0, sit:"試合終了"});
      break;
    }
    if(runs >= target && outs >= 3) break;
  }
  return {events:ev, nextIdx:idx, outs};
}
function buildGameScript(g){
  const ia = splitInnings(g.rA);
  const ib = splitInnings(g.rB);
  // ホームが先に勝っている場合は9回裏を行わない(Xスコア)
  let skipBottom9 = false, walkoff = false;
  if(g.rB > g.rA && (g.rB - ib[8]) > g.rA){
    const extra = ib[8]; ib[8] = 0;
    for(let i=0;i<extra;i++) ib[Math.floor(rnd()*8)]++;
    skipBottom9 = true;
  }else if(g.rB > g.rA && ib[8] > 0){
    walkoff = true;
  }
  const script = [];
  let idxA = 0, idxB = 0, prevPA = null, prevPB = null;
  for(let inn = 1; inn <= 9; inn++){
    for(const top of [true, false]){
      if(!top && inn === 9 && skipBottom9){ script.push({t:"x"}); continue; }
      const batT = top ? g.A : g.B;
      const pitT = top ? g.B : g.A;
      const info = pitcherForInning(pitT, inn, top ? g.spB : g.spA);
      const prev = top ? prevPA : prevPB;
      if(prev && prev !== info.p){
        script.push({t:"chg", text:`― 投手交代　${pitT.name}　${prev.name} → ${info.p.name}（${info.label}）―`});
      }
      if(top) prevPA = info.p; else prevPB = info.p;
      script.push({t:"half", inn, top, text:`▼ ${inn}回${top?"表":"裏"}　${batT.name}の攻撃　［${pitT.name}・投手 ${info.p.name}］`});
      const runs = top ? ia[inn-1] : ib[inn-1];
      const res = genHalf(batT, info, runs, top ? idxA : idxB, inn, top, !top && inn === 9 && walkoff);
      if(top) idxA = res.nextIdx; else idxB = res.nextIdx;
      script.push(...res.events);
      script.push({t:"end", inn, top, runs,
        text: runs ? `${inn}回${top?"表":"裏"}、${batT.name}が${runs}点を挙げた` : `${inn}回${top?"表":"裏"}、${info.p.name}が${pick1(["三者凡退に抑えた","無失点で切り抜けた","走者を出すも要所を締めた"])}`});
    }
  }
  return {script, ia, ib, skipBottom9};
}
function showLiveGame(label, g, done){
  const built = buildGameScript(g);
  liveCtx = {g, ia:built.ia, ib:built.ib, skipBottom9:built.skipBottom9,
    script:built.script, i:0, shownA:0, shownB:0, done, timer:null};
  $("lv-k").textContent = label;
  renderDiamond(null);
  liveCtx.lastWp = undefined;
  renderWinBar(null);
  $("lv-pbp").innerHTML = "";
  pbpHeadline(null);
  $("lv-msg").textContent = "";
  $("lv-btn").textContent = "結果まで飛ばす";
  renderLiveBoard();
  $("live-bg").classList.add("show");
  liveCtx.timer = setTimeout(liveStep, liveMs());
}
function liveMs(){ const s = $("lv-speed"); return s ? (Number(s.value)||300) : 300; }
function liveSpeed(){
  const c = liveCtx; if(!c || !c.timer) return;
  clearTimeout(c.timer);
  c.timer = setTimeout(liveStep, 60);
}
function renderLiveBoard(){
  const c = liveCtx; if(!c) return;
  const {g, ia, ib, shownA, shownB} = c;
  const row = (name, color, arr, n, other) => `<tr>
    <td class="tn">${esc(name)}</td>
    ${arr.map((v,i)=>`<td class="${i===n?"now":""}">${i<n ? (i===8 && other ? "X" : v) : ""}</td>`).join("")}
    <td class="r">${arr.slice(0,n).reduce((s,x)=>s+x,0)}</td></tr>`;
  $("lv-board").innerHTML = `<table>
    <tr><th></th>${Array.from({length:9},(_,i)=>`<th>${i+1}</th>`).join("")}<th>R</th></tr>
    ${row(g.A.name, g.A.color, ia, shownA, false)}
    ${row(g.B.name, g.B.color, ib, shownB, c.skipBottom9)}
  </table>`;
}
// 画面中央のエフェクト文字(ナイスバッティング等)は中継の邪魔になるため廃止。
// 素材は assets/fx/ に残してある。

// 打者名を別枠で出すので、本文の頭に重複している名前は落とす
function trimLead(text, bat){
  let t = String(text || "").replace(/^\d+回[表裏]?、?/, "");
  if(bat && t.indexOf(bat) === 0){
    t = t.slice(bat.length).replace(/^\s*[、はがのも]?\s*/, "");
  }
  return t;
}
function pbpAdd(text, cls, meta){
  const box = $("lv-pbp");
  if(!box) return;
  const d = document.createElement("div");
  d.className = "pb " + (cls || "");
  if(meta && meta.bat){
    // 打席の結果は「誰が・どうした」を分けて出す
    d.innerHTML =
      '<span class="pb-w">' + (meta.inn ? meta.inn + (meta.top ? "表" : "裏") : "") + '</span>' +
      '<span class="pb-n">' + esc(meta.bat) + '</span>' +
      '<span class="pb-r">' + esc(trimLead(text, meta.bat)) + '</span>' +
      (meta.runs ? '<span class="pb-p">+' + meta.runs + '</span>' : "");
  }else{
    d.textContent = text;
  }
  box.appendChild(d);
  while(box.children.length > 60) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
  // 直近の一行だけ light を当てて、目がどこを追えばいいか分かるようにする
  const prev = box.querySelector(".pb.now");
  if(prev) prev.classList.remove("now");
  d.classList.add("now");
}
// 最新のプレーを大きく出す帯。流れる速報と別に、いま何が起きたかを常に見せる
function pbpHeadline(e){
  const el = $("lv-now");
  if(!el) return;
  if(!e){ el.className = "lv-now"; el.innerHTML = ""; return; }
  el.className = "lv-now show " + (e.cls || "");
  el.innerHTML =
    '<span class="ln-k">' + (e.inn ? e.inn + "回" + (e.top ? "表" : "裏") : "") + '</span>' +
    '<b>' + esc(e.bat || "") + '</b>' +
    '<span class="ln-r">' + esc(trimLead(e.text, e.bat)) + '</span>' +
    (e.runs ? '<span class="ln-p">' + e.runs + '点</span>' : "");
}
// ---- 一球速報のダイヤモンド図(走者・アウト・打者/投手) ----
function renderDiamond(e){
  const box = $("lv-sit");
  if(!box) return;
  if(!e){ box.innerHTML = `<div class="dm-wrap"><div class="dm-note">まもなくプレイボール</div></div>`; return; }
  const on = e.on || [false,false,false];
  const outs = Math.min(3, e.outs || 0);
  const base = (i, cx, cy) => `<div class="dm-b ${on[i]?"on":""}" style="left:${cx}%;top:${cy}%"></div>`;
  box.innerHTML = `
    <div class="dm-wrap">
      <div class="dm-field">
        <div class="dm-inf"></div>
        ${base(1, 50, 6)}
        ${base(0, 82, 38)}
        ${base(2, 18, 38)}
        <div class="dm-home"></div>
      </div>
      <div class="dm-info">
        <div class="dm-inn">${e.inn}回${e.top?"表":"裏"}</div>
        <div class="dm-count">
          <span class="dm-cl">B</span>${[0,1,2].map(i=>`<span class="dm-c b ${i<(e.bcnt||0)?"on":""}"></span>`).join("")}
          <span class="dm-cl">S</span>${[0,1].map(i=>`<span class="dm-c s ${i<(e.scnt||0)?"on":""}"></span>`).join("")}
          <span class="dm-cl">O</span>${[0,1].map(i=>`<span class="dm-c o ${i<outs?"on":""}"></span>`).join("")}
        </div>
        <div class="dm-mt"><span class="dm-k">打</span>${esc(e.bat||"")}${e.batNo!==undefined?`<span class="dm-no">#${e.batNo}</span>`:""}</div>
        <div class="dm-mt"><span class="dm-k p">投</span>${esc(e.pit||"")}<span class="dm-role">${esc(e.pitRole||"")}</span></div>
        ${e.pitchTxt ? `<div class="dm-pitch">${esc(e.pitchTxt)}</div>` : ""}
      </div>
    </div>`;
}
function liveApply(e, silent){
  const c = liveCtx;
  if(e.t === "pitch"){
    if(!silent){
      if(e.b === 0 && e.s === 0) showSuper(e);
      renderDiamond({inn:e.inn, top:e.top, outs:e.outs, on:e.on, bat:e.bat, batNo:e.batNo,
        pit:e.pit, pitRole:e.pitRole, bcnt:e.b, scnt:e.s,
        pitchTxt:`${e.kmh}km/h ${e.type}・${e.zone} → ${e.res}`});
      if(sndOn){ const x = ac(); if(x) tone(x.currentTime, e.res.indexOf("空振")>=0?520:430, 0.05, 0.05, "square"); }
    }
    return;
  }
  if(e.t === "half"){ if(!silent) pbpAdd(e.text, "half"); }
  else if(e.t === "chg"){ if(!silent) pbpAdd(e.text, "chg"); }
  else if(e.t === "pa"){
    if(!silent){
      pbpAdd(e.text, e.cls, e);
      pbpHeadline(e);
      renderDiamond(e);
      renderWinBar(e);
      if(sndOn && e.runs > 0){ const x = ac(); if(x) tone(x.currentTime, e.cls === "hr" ? 900 : 780, 0.18, 0.10, "triangle"); }
      if(e.cls === "hr" && sndOn){ const x = ac(); if(x) noiseBurst(x.currentTime, 0.55, 5200, 0.09); }
    }
  }
  else if(e.t === "end"){
    if(e.top) c.shownA = e.inn; else c.shownB = e.inn;
    if(!silent){ pbpAdd(e.text, "end"); renderLiveBoard(); renderWinBar({inn:e.inn, top:e.top, outs:3, on:[]}); }
  }
  else if(e.t === "x"){ c.shownB = 9; }
}
function eventDelay(e){
  const base = liveMs();
  if(!e) return base;
  if(e.t === "pitch") return Math.max(70, base * 0.30);
  if(e.t === "pa"){
    if(e.cls === "hr") return base * 1.9;
    if(e.cls === "run") return base * 1.5;
    return base * 0.9;
  }
  if(e.t === "half" || e.t === "chg") return base * 1.1;
  if(e.t === "end") return base * 1.0;
  return base;
}
function liveStep(){
  const c = liveCtx; if(!c) return;
  if(c.i >= c.script.length){ liveFinish(); return; }
  const e = c.script[c.i++];
  liveApply(e, false);
  if(c.i >= c.script.length){ liveFinish(); return; }
  // 次のイベントまでの間を状況に応じて変える(山場で溜める)
  if(c.timer){ clearTimeout(c.timer); }
  c.timer = setTimeout(liveStep, eventDelay(c.script[c.i]));
}
function liveFinish(){
  const c = liveCtx; if(!c) return;
  if(c.timer){ clearTimeout(c.timer); c.timer = null; }
  while(c.i < c.script.length) liveApply(c.script[c.i++], true);
  c.shownA = 9; c.shownB = 9;
  renderLiveBoard();
  const g = c.g;
  const win = g.rA > g.rB ? g.A : g.rB > g.rA ? g.B : null;
  const wp = win ? pitcherForInning(win, 1, win === g.A ? g.spA : g.spB).p : null;
  $("lv-sit").innerHTML = `<div class="dm-wrap"><div class="dm-note">試合終了</div></div>`;
  $("lv-msg").textContent = win
    ? `試合終了 ―― ${win.name}、${Math.max(g.rA,g.rB)}対${Math.min(g.rA,g.rB)}で勝利！${wp?`（先発 ${wp.name}）`:""}`
    : `試合終了 ―― ${g.rA}対${g.rB}の引き分け`;
  $("lv-btn").textContent = "閉じる";
  if(sndOn){ const x = ac(); if(x) noiseBurst(x.currentTime, 1.1, 5000, 0.10); }
}
function liveSkip(){
  const c = liveCtx; if(!c) return;
  if(c.i < c.script.length){ liveFinish(); return; } // 1度目は結果まで早送り
  $("live-bg").classList.remove("show");
  const done = c.done;
  liveCtx = null;
  if(done) done();
}

// ============================================================
// 日本シリーズ(レギュラー1位×2位・4勝先取・全試合生中継)
// ============================================================
// 短期決戦もペナントと同じ打席方式で解く。引き分けは無しにして決着させる
function simSeriesGame(A, B){
  let g, guard = 0;
  do { g = rollGame(A, B); } while(g.rA === g.rB && guard++ < 12);
  if(g.rA === g.rB){ if(rnd() < 0.5) g.rA++; else g.rB++; }
  return g;
}
function startSeries(){
  const s = standingsSorted();
  state.series = {A:s[0], B:s[1], w:[0,0], g:1};
  const txt = `日本シリーズ開幕 ―― ${s[0].name}(1位) 対 ${s[1].name}(2位)`;
  state.news.unshift({mo:"10月", txt});
  telop(txt);
  $("s-date").textContent = "日本シリーズ";
  nextSeriesGame();
}
function nextSeriesGame(){
  const S = state.series;
  const label = `日本シリーズ 第${S.g}戦（${S.A.name} ${S.w[0]}勝${S.w[1]}敗 ${S.B.name}）`;
  const r = simSeriesGame(S.A, S.B);
  if(r.rA > r.rB) S.w[0]++; else S.w[1]++;
  showLiveGame(label, {A:S.A, B:S.B, rA:r.rA, rB:r.rB}, ()=>{
    state.news.unshift({mo:"日S", txt:`第${S.g}戦 ${S.A.name} ${r.rA}-${r.rB} ${S.B.name}（${S.w[0]}勝${S.w[1]}敗）`});
    renderNews();
    if(S.w[0] >= 4 || S.w[1] >= 4){ finishSeries(); }
    else { S.g++; nextSeriesGame(); }
  });
}
function finishSeries(){
  const S = state.series;
  state.seriesDone = true;
  state.seriesWinner = S.w[0] > S.w[1] ? S.A : S.B;
  state.seriesScore = `4勝${Math.min(S.w[0], S.w[1])}敗`;
  const txt = `【日本一】${state.seriesWinner.name}が日本シリーズを${state.seriesScore}で制覇！`;
  state.news.unshift({mo:"日S", txt});
  showResult();
}

// ============================================================
// パーティーモード(波乱イベント): 監督休養/スキャンダル謹慎/助っ人帰国/ケンカ
// ============================================================
function isForeignName(name){
  return /^[ァ-ヶーｦ-ﾟ・()A-Za-z0-9\.\-]+$/.test(name.replace(/\s/g,""));
}
// ---- 汎用ヘルパー ----
const pick1 = arr => arr[Math.floor(rnd()*arr.length)];
function anyTeam(){ return pick1(state.parts); }
function orderKeys(t){
  // 打順が壊れていても必ず9枠そろえる(補強や交代で欠けることがある)
  const o = (t.order || []).filter(k => LINEUP_KEYS.includes(k));
  const seen = new Set(o);
  return o.concat(LINEUP_KEYS.filter(k => !seen.has(k)));
}
function rotKeys(t){
  const r = (t.rot || []).filter(k => SP_KEYS.includes(k));
  const seen = new Set(r);
  return r.concat(SP_KEYS.filter(k => !seen.has(k)));
}
function lineupOf(t){ return orderKeys(t).map(k=>t.slots[k]).filter(Boolean); }
function pitchersOf(t){ return [...SP_KEYS, ...RP_KEYS, "CL"].map(k=>t.slots[k]).filter(Boolean); }
function benchOf(t){ return BENCH_KEYS.map(k=>t.slots[k]).filter(Boolean); }
function moodFree(t){ return !(t.mood && state.day < t.mood.until); }
function droppableDefs(t){
  return SLOT_DEFS.filter(d=>{
    if(d.key==="MGR") return false;
    const p = t.slots[d.key];
    return p && !p.twoWay;
  });
}
// 事件簿へ記録しつつ紙面とテロップに流す
function partyNews(icon, cls, txt, id, teamHint){
  state.news.unshift({mo: dateLabel(state.day-1), txt});
  state.partyLog = state.partyLog || [];
  // 本文に出てくる球団名から、どの球団の出来事かを拾う。
  // 2球団がらみの事件は両方に紐づく
  const teams = [];
  state.parts.forEach(function(t, i){ if(t.name && txt.indexOf(t.name) >= 0) teams.push(i); });
  // 選手名しか出ない事件(球団名を含まない文面)は、当事者の球団を明示で受け取る
  if(teamHint){
    const hi = state.parts.indexOf(teamHint);
    if(hi >= 0 && teams.indexOf(hi) < 0) teams.push(hi);
  }
  state.partyLog.unshift({d: dateLabel(state.day-1), icon, cls, txt, id, teams, day: state.day});
  telop(txt);
  renderPartyLog();
}
function formShift(list, delta){
  for(const p of list) p.form = clamp((p.form||0) + delta, -2, 2);
}

// ---- 選択式イベント(パーティーの華) ----
function startChoice(kicker, title, body, options){
  const wasPlaying = state.playing;
  stopTimer();
  state.resumeAfterEvent = wasPlaying;
  state.eventCtx = {type:"choice", options};
  $("s-play").disabled = true; $("s-skip").disabled = true;
  $("event-panel").innerHTML = `
    <h2><span class="kicker">${kicker}</span>${title}</h2>
    <div class="ev-body">${body}</div>
    <div class="ev-choices">${options.map((o,i)=>`
      <button class="ev-choice" onclick="pickChoice(${i})">
        <span class="ec-t">${o.label}</span>
        <span class="ec-d">${o.desc}</span>
      </button>`).join("")}</div>`;
  $("event-bg").classList.add("show");
}
function pickChoice(i){
  const ctx = state.eventCtx;
  if(!ctx || ctx.type !== "choice") return;
  const o = ctx.options[i];
  seTap();
  endEventPhase();
  if(o.run) o.run();
}

// ============================================================
// イベント表(重み付き抽選。needがtrueのものだけ候補になる)
// ============================================================
const PARTY_EVENTS = [
  // ── 離脱・緊急補強系 ─────────────────────────
  { id:"scandal", w:7,
    need:()=>state.parts.some(t=>droppableDefs(t).length),
    run(){ const t = pick1(state.parts.filter(x=>droppableDefs(x).length));
      startEmergency(t, pick1(droppableDefs(t)).key, "写真週刊誌のスキャンダル直撃で無期限謹慎"); } },
  { id:"gaijin", w:5,
    need:()=>state.parts.some(t=>droppableDefs(t).some(d=>isForeignName(t.slots[d.key].name))),
    run(){ const t = pick1(state.parts.filter(x=>droppableDefs(x).some(d=>isForeignName(x.slots[d.key].name))));
      const ds = droppableDefs(t).filter(d=>isForeignName(t.slots[d.key].name));
      startEmergency(t, pick1(ds).key, "家庭の事情により電撃帰国"); } },
  { id:"kega", w:7,
    need:()=>state.parts.some(t=>droppableDefs(t).length),
    run(){ const t = pick1(state.parts.filter(x=>droppableDefs(x).length));
      startEmergency(t, pick1(droppableDefs(t)).key, pick1(["死球で右手を骨折し全治3か月","走塁中に肉離れを起こし戦線離脱","アキレス腱を痛めて今季絶望"])); } },
  { id:"monge", w:4,
    need:()=>state.parts.some(t=>droppableDefs(t).length),
    run(){ const t = pick1(state.parts.filter(x=>droppableDefs(x).length));
      startEmergency(t, pick1(droppableDefs(t)).key, "門限破りが発覚し無期限の出場停止処分"); } },
  { id:"kaigai", w:3,
    need:()=>state.parts.some(t=>droppableDefs(t).length),
    run(){ const t = pick1(state.parts.filter(x=>droppableDefs(x).length));
      startEmergency(t, pick1(droppableDefs(t)).key, "海外移籍を電撃表明しチームを去った"); } },

  // ── 監督系 ───────────────────────────────
  { id:"mgrRest", w:6,
    need:()=>{ const s = standingsSorted(); const t = s[s.length-1]; return t && !t.mgrRest && t.slots.MGR && (t.W-t.L) <= -8; },
    run(){ const s = standingsSorted(); const t = s[s.length-1]; t.mgrRest = true;
      partyNews("休","bad",`【監督休養】成績不振の責任を取り、${t.slots.MGR.name}監督（${t.name}）が無期限休養へ。指揮はヘッドコーチが代行`); } },
  { id:"mgrBack", w:5,
    need:()=>state.parts.some(t=>t.mgrRest),
    run(){ const t = state.parts.find(x=>x.mgrRest); t.mgrRest = false;
      moodSet(t, 1.0, 20, "監督復帰");
      partyNews("復","good",`【電撃復帰】${t.slots.MGR.name}監督（${t.name}）がベンチに帰ってきた！ ナインの表情が引き締まる`); } },
  { id:"taijou", w:5, need:()=>true,
    run(){ const t = anyTeam(); if(!t.slots.MGR) return;
      partyNews("退","warn",`【退場処分】${t.slots.MGR.name}監督（${t.name}）が判定を巡って猛抗議、一発退場。スタンドは騒然`); } },
  { id:"kakushitsu", w:5, need:()=>state.parts.some(moodFree),
    run(){ const t = pick1(state.parts.filter(moodFree)); if(!t.slots.MGR) return;
      const p = pick1(lineupOf(t)); moodSet(t, -1.4, 18, "監督と確執");
      partyNews("確","bad",`【確執】${t.slots.MGR.name}監督が${p.name}（${t.name}）の起用法を巡って対立。ロッカーに重い空気が流れる`); } },
  { id:"kiai", w:5, need:()=>state.parts.some(moodFree),
    run(){ const t = pick1(state.parts.filter(moodFree)); if(!t.slots.MGR) return;
      moodSet(t, 1.5, 18, "監督の檄");
      partyNews("檄","good",`【一喝】${t.slots.MGR.name}監督（${t.name}）が臨時ミーティングでナインに大喝。チームの目の色が変わった`); } },

  // ── チーム士気系 ─────────────────────────
  { id:"kenka", w:7, need:()=>state.parts.some(moodFree),
    run(){ const t = pick1(state.parts.filter(moodFree)); const ps = lineupOf(t);
      const a = pick1(ps); const b = ps[(ps.indexOf(a)+1+Math.floor(rnd()*(ps.length-1)))%ps.length];
      moodSet(t, -1.4, 15, "チーム内不和");
      partyNews("乱","bad",`【不穏】${a.name}と${b.name}（${t.name}）がベンチ裏で衝突。しばらくチームの空気は最悪…`); } },
  { id:"rantou", w:4, need:()=>state.parts.length>=2,
    run(){ const [a,b] = shuffle(state.parts).slice(0,2);
      const pa = pick1(lineupOf(a)), pb = pick1(pitchersOf(b));
      moodSet(a, 1.2, 12, "乱闘で結束");
      partyNews("闘","warn",`【乱闘】${pb.name}の内角球に${pa.name}が激高、両軍入り乱れる大乱闘に。${a.name}ナインは結束を強めた`); } },
  { id:"shokuchudoku", w:4, need:()=>true,
    run(){ const t = anyTeam(); formShift([...lineupOf(t), ...pitchersOf(t)], -1);
      partyNews("菌","bad",`【集団食中毒】遠征先の弁当が原因で${t.name}ナインが体調不良を訴える。全員のコンディションが急降下`); renderRosterLive(); } },
  { id:"moushou", w:4, need:()=>state.day > 60,
    run(){ const t = anyTeam(); formShift([...lineupOf(t)], -1);
      partyNews("暑","warn",`【猛暑】記録的な酷暑で${t.name}打線がバテ気味。ベンチには氷嚢の山が築かれた`); renderRosterLive(); } },
  { id:"manin", w:5, need:()=>state.parts.some(moodFree),
    run(){ const t = pick1(state.parts.filter(moodFree)); moodSet(t, 1.3, 16, "本拠地の大声援");
      partyNews("満","good",`【満員御礼】${t.name}の本拠地が超満員。地鳴りのような大声援がナインを後押しする`); } },
  { id:"renpai", w:5, need:()=>state.parts.some(t=>moodFree(t) && (t.stk===0) && (t.W-t.L) < -5),
    run(){ const t = pick1(state.parts.filter(x=>moodFree(x) && x.stk===0 && (x.W-x.L) < -5));
      moodSet(t, -1.3, 14, "連敗で重い空気");
      partyNews("闇","bad",`【泥沼】${t.name}が出口の見えない連敗地獄。ベンチからは笑顔が消えた`); } },
  { id:"magic", w:4, need:()=>{ const s=standingsSorted(); return state.day > state.schedule.length*0.6 && s[0] && (s[0].W-s[1].W) >= 8; },
    run(){ const t = standingsSorted()[0]; moodSet(t, 1.4, 20, "マジック点灯");
      partyNews("M","good",`【マジック点灯】${t.name}に優勝マジックが点灯！ 街は早くも優勝ムードに包まれる`); } },

  // ── 個人の成長・不調 ─────────────────────
  { id:"kakusei2", w:6, need:()=>true,
    run(){ const t = anyTeam(); const cands = [...lineupOf(t), ...benchOf(t)].filter(p=>p.ovr < 92);
      if(!cands.length) return; const p = pick1(cands);
      p.ovr = Math.min(99, p.ovr + 3); p.awakened = true; p.form = 2;
      partyNews("覚","good",`【急成長】${p.name}（${t.name}）が打撃改造に成功！ 別人のような打球を飛ばし始めた`); renderRosterLive(); } },
  { id:"newpitch", w:6, need:()=>true,
    run(){ const t = anyTeam(); const cands = pitchersOf(t).filter(p=>p.ovr < 92);
      if(!cands.length) return; const p = pick1(cands);
      p.ovr = Math.min(99, p.ovr + 3); p.awakened = true; p.form = 2;
      partyNews("新","good",`【新球種】${p.name}（${t.name}）が${pick1(["高速スライダー","ツーシーム","チェンジアップ","フォークボール","カットボール"])}を習得。打者の的が絞れなくなった`); renderRosterLive(); } },
  { id:"slump", w:6, need:()=>true,
    run(){ const t = anyTeam(); const p = pick1(lineupOf(t));
      p.ovr = Math.max(60, p.ovr - 3); p.form = -2;
      partyNews("不","bad",`【深刻なスランプ】${p.name}（${t.name}）がフォーム改造に失敗。出口の見えない不振に苦しむ`); renderRosterLive(); } },
  { id:"kekkon", w:5, need:()=>true,
    run(){ const t = anyTeam(); const p = pick1([...lineupOf(t), ...pitchersOf(t)]);
      p.form = 2;
      partyNews("祝","good",`【祝福】${p.name}（${t.name}）が電撃結婚を発表！ 幸せいっぱいのバットが火を噴く`); renderRosterLive(); } },
  { id:"inFire", w:5, need:()=>true,
    run(){ const t = anyTeam(); const p = pick1([...lineupOf(t), ...pitchersOf(t)]);
      p.form = 2;
      partyNews("神","good",`【神懸かり】${p.name}（${t.name}）が「ボールが止まって見える」と語るほどの絶好調モードに突入`); renderRosterLive(); } },

  // ── 珍事件(実害なしの笑い担当) ───────────────
  { id:"neko", w:4, need:()=>true,
    run(){ const t = anyTeam();
      partyNews("猫","fun",`【珍事】${t.name}戦のグラウンドに猫が乱入。捕獲されるまで7分間の中断となった`); } },
  { id:"mascot", w:4, need:()=>true,
    run(){ const t = anyTeam();
      partyNews("珍","fun",`【珍事】${t.name}のマスコットがバック転に失敗して着地失敗。球場は温かい拍手に包まれた`); } },
  { id:"garasu", w:3, need:()=>true,
    run(){ const t = anyTeam(); const p = pick1(lineupOf(t));
      partyNews("砲","fun",`【怪力】${p.name}（${t.name}）の場外弾が球場外の車のガラスを直撃。球団が全額弁償することに`); } },
  { id:"nebou", w:3, need:()=>true,
    run(){ const t = anyTeam(); const p = pick1(lineupOf(t));
      partyNews("眠","fun",`【珍事】${p.name}（${t.name}）が寝坊で試合開始に遅刻。罰金と反省文で決着した`); } },
  { id:"oiokoshi", w:3, need:()=>true,
    run(){ const t = anyTeam(); const [a,b] = shuffle(lineupOf(t)).slice(0,2);
      partyNews("珍","fun",`【珍プレー】${a.name}が${b.name}を追い越してアウト（${t.name}）。ベンチは頭を抱えた`); } },
];

// ---- 人間チーム向けの選択式イベント ----
const PARTY_CHOICES = [
  { id:"slumpChoice",
    need:t=>benchOf(t).length && lineupOf(t).length,
    run(t){
      const starter = lineupOf(t).slice().sort((a,b)=>(a.form||0)-(b.form||0))[0];
      const sub = benchOf(t).slice().sort((a,b)=>b.ovr-a.ovr)[0];
      const key = LINEUP_KEYS.find(k=>t.slots[k]===starter);
      const bkey = BENCH_KEYS.find(k=>t.slots[k]===sub);
      startChoice("監督采配", `${t.name} ── 主力の大不振`,
        `<b>${esc(starter.name)}</b>（${rankOf(starter.ovr)}・調子${formIcon(starter)}）が深刻な不振に陥っています。<br>
         控えの <b>${esc(sub.name)}</b>（${rankOf(sub.ovr)}）を使う手もありますが、指揮官の判断は？`,
        [
          {label:"我慢して起用を続ける", desc:"復調すれば恩返し。信頼はナインに伝わる", run(){
            starter.form = clamp((starter.form||0)+2, -2, 2); moodSet(t, 0.8, 14, "信頼の起用");
            partyNews("信","good",`【采配】${t.name}は${starter.name}を四番に据え続けた。期待に応えるように打球が上がり始める`); renderRosterLive();
          }},
          {label:"控えとスタメンを入れ替える", desc:"即効性はあるが、外された選手は不満を抱くかも", run(){
            if(key && bkey){ t.slots[key] = sub; t.slots[bkey] = starter; }
            sub.form = 1;
            partyNews("替","warn",`【采配】${t.name}がスタメンを再編。${sub.name}が${starter.name}に代わって定位置を奪った`); renderRosterLive();
          }},
        ]);
    } },
  { id:"fightChoice",
    need:t=>lineupOf(t).length >= 2,
    run(t){
      const [a,b] = shuffle(lineupOf(t)).slice(0,2);
      startChoice("緊急事態", `${t.name} ── ロッカーの衝突`,
        `<b>${esc(a.name)}</b> と <b>${esc(b.name)}</b> が練習中の些細なことから殴り合い寸前に。<br>報道陣が球団事務所に押し寄せています。監督としてどう収めますか？`,
        [
          {label:"二人まとめて謹慎処分", desc:"けじめは付くが、しばらく戦力を欠く", run(){
            formShift([a,b], -2); moodSet(t, 0.6, 12, "けじめ");
            partyNews("罰","warn",`【処分】${t.name}が${a.name}と${b.name}に厳重処分。チームには緊張感が戻った`); renderRosterLive();
          }},
          {label:"焼肉に連れて行って手打ち", desc:"昭和の解決法。うまくいけばチームは一つに", run(){
            if(rnd() < 0.65){ moodSet(t, 1.6, 20, "結束"); formShift([a,b], 1);
              partyNews("肉","good",`【和解】${t.name}の三人は焼肉屋で完全和解。翌日から異様な結束力を見せ始めた`);
            }else{ moodSet(t, -1.5, 16, "火に油");
              partyNews("炎","bad",`【逆効果】${t.name}の手打ちの席で口論が再燃。火に油を注ぐ結果になった`); }
            renderRosterLive();
          }},
        ]);
    } },
  { id:"gaijinChoice",
    need:t=>droppableDefs(t).some(d=>isForeignName(t.slots[d.key].name)),
    run(t){
      const d = pick1(droppableDefs(t).filter(x=>isForeignName(t.slots[x.key].name)));
      const p = t.slots[d.key];
      startChoice("海外通信", `${t.name} ── ${esc(p.name)}の帰国要請`,
        `<b>${esc(p.name)}</b> が「家族が母国で待っている」と一時帰国を申し出ました。<br>認めれば信頼は保たれますが、その間は戦えません。`,
        [
          {label:"快く送り出す", desc:"数試合の離脱と引き換えに、帰国後は奮起", run(){
            p.form = -2; moodSet(t, 0.9, 10, "温情");
            partyNews("情","warn",`【温情】${t.name}は${p.name}の一時帰国を承諾。「必ず恩返しする」と男は誓った`);
            setTimeout(()=>{ p.form = 2; renderRosterLive(); }, 0);
          }},
          {label:"慰留して残ってもらう", desc:"戦力は保てるが、本人の心はここにあらず", run(){
            p.form = -1; moodSet(t, -0.8, 14, "不協和音");
            partyNews("留","bad",`【慰留】${t.name}が${p.name}を引き止めた。だが心ここにあらずのプレーが続く`); renderRosterLive();
          }},
        ]);
    } },
  { id:"aceChoice",
    need:t=>SP_KEYS.every(k=>t.slots[k]),
    run(t){
      const ace = SP_KEYS.map(k=>t.slots[k]).sort((a,b)=>ovrFor(b,"SP")-ovrFor(a,"SP"))[0];
      startChoice("緊急事態", `${t.name} ── エースの右肘に違和感`,
        `<b>${esc(ace.name)}</b> が登板後に右肘の張りを訴えました。<br>精密検査の結果は「軽度」。ここが勝負どころですが……`,
        [
          {label:"連投させてでも勝ちに行く", desc:"当たれば大きい。壊れれば取り返しがつかない", run(){
            if(rnd() < 0.55){ ace.form = 2; moodSet(t, 1.2, 16, "エースの気迫");
              partyNews("鉄","good",`【気迫】${ace.name}（${t.name}）が痛みを押して連投。チームを引っ張る鬼気迫る快投を演じた`);
            }else{ ace.ovr = Math.max(60, ace.ovr-5); ace.form = -2;
              partyNews("傷","bad",`【誤算】${ace.name}（${t.name}）の状態が悪化。かつての球威は影を潜めてしまった`); }
            renderRosterLive();
          }},
          {label:"大事を取って休ませる", desc:"目先の勝ちは失うが、終盤に万全の姿で戻る", run(){
            ace.form = -1;
            partyNews("養","warn",`【休養】${t.name}は${ace.name}を登板回避させた。復帰は終盤戦の見込み`);
            setTimeout(()=>{ ace.form = 2; renderRosterLive(); }, 0);
          }},
        ]);
    } },
];

// ============================================================
// 史実パロディ・イベント(データ駆動。data/party_*.json → PARTY_LORE)
// ============================================================
function loreTargets(e){
  // 対象を解決。条件に合うチーム/選手が見つからなければ null
  const teams = shuffle(state.parts);
  for(const t of teams){
    const bats = lineupOf(t).concat(benchOf(t));
    const pits = pitchersOf(t);
    const all = bats.concat(pits);
    const drops = droppableDefs(t);
    let P = null, P2 = null, T2 = null, slotKey = null;
    switch(e.target){
      case "team": break;
      case "manager": if(!t.slots.MGR) continue; break;
      case "player": if(!bats.length) continue; P = pick1(bats); break;
      case "pitcher": if(!pits.length) continue; P = pick1(pits); break;
      case "foreign": {
        const fs = all.filter(p=>isForeignName(p.name));
        if(!fs.length) continue;
        P = pick1(fs); break;
      }
      case "twoPlayers": {
        if(bats.length < 2) continue;
        const two = shuffle(bats).slice(0,2); P = two[0]; P2 = two[1]; break;
      }
      case "twoTeams": {
        const others = state.parts.filter(x=>x!==t);
        if(!others.length) continue;
        T2 = pick1(others); break;
      }
      default: if(!all.length) continue; P = pick1(all);
    }
    // leave は入れ替え可能な枠が必要
    if(e.effect === "leave"){
      let ds = drops;
      if(e.target === "foreign") ds = drops.filter(d=>isForeignName(t.slots[d.key].name));
      else if(e.target === "pitcher") ds = drops.filter(d=>["SP","RP","CL"].includes(d.grp));
      else if(e.target === "player") ds = drops.filter(d=>!["SP","RP","CL"].includes(d.grp));
      if(!ds.length) continue;
      const d = P ? (ds.find(x=>t.slots[x.key] === P) || pick1(ds)) : pick1(ds);
      slotKey = d.key; P = t.slots[d.key];
    }
    // 士気系は効果が重複しないように
    if((e.effect === "moodUp" || e.effect === "moodDown") && !moodFree(t)) continue;
    if(e.effect === "mgrRest" && (t.mgrRest || !t.slots.MGR)) continue;
    if(e.effect === "mgrBack" && !t.mgrRest) continue;
    return {t, P, P2, T2, slotKey};
  }
  return null;
}
function loreText(e, x){
  return e.text
    .replace(/\{P2\}/g, x.P2 ? x.P2.name : (x.P ? x.P.name : "ナイン"))
    .replace(/\{P\}/g,  x.P ? x.P.name : "ナイン")
    .replace(/\{T2\}/g, x.T2 ? x.T2.name : "相手球団")
    .replace(/\{T\}/g,  x.t.name)
    .replace(/\{M\}/g,  x.t.slots.MGR ? x.t.slots.MGR.name : "監督");
}

// ── 史実イベントの号外カット ───────────────────────────────
// 挿絵のあるイベントだけは試合を止めて大きく見せる(415件中11件)
const EVENT_PIC = new Set([
  "backscreen-3renpatsu","ball-touitsu","bat-orete-kossetsu","chien-koui",
  "daida-manrui-sayonara","daida-sayonara","dairanto","daiso-specialist",
  "daisou-gyakusou","dengeki-intai","densetsu-no-renpai",
  "dotonbori-tobikomi","douage-shippai","dousei-suzume","go-eikyu-fumetsu",
  "go-heading","hamakaze","heading-jiken","hikouki-chien","juten-ichikyu",
  "kaimaku-26-0","kamino-otsuge","kantoku-fukki","kanzen-shiai",
  "keiyakukin-chouka","koushin-etsunen","kyudan-gappei","maboroshi-homerun",
  "magic-shometsu","make-drama","make-legend","muhai-24shou","nijuichikyu",
  "nitouryu-kousou","no-hit-no-run","noumu-called","rabbit-ball",
  "raiu-chudan","renzoku-sanshin","request-konran","rookie-7kyudan",
  "sayonara-balk","sebangou-machigai","shinkyudan-tanjo","shomei-shoutou",
  "shuzai-kyohi","sign-nusumi","sousha-oikoshi","suketto-mikikoku",
  "uniform-wasure","yon-shissaku"
]);
function showEventPic(e, txt, after){
  const wasPlaying = state.playing;
  stopTimer();
  state.picResume = wasPlaying;
  state.picAfter = after || null;
  const m = /^【([^】]{1,14})】/.exec(txt || "");
  $("pic-date").textContent = dateLabel(state.day - 1);
  $("pic-head").textContent = m ? m[1] : "球界を揺るがす一日";
  $("pic-txt").textContent  = (txt || "").replace(/^【[^】]+】/, "");
  $("pic-note").textContent = e.note || "";
  $("pic-note").parentNode.style.display = e.note ? "" : "none";
  const img = $("pic-img");
  img.onerror = function(){ this.parentNode.style.display = "none"; };
  img.parentNode.style.display = "";
  img.src = "assets/event/" + e.id + ".jpg";
  $("pic-bg").classList.add("show");
  seTap();
}
function closeEventPic(){
  $("pic-bg").classList.remove("show");
  const after = state.picAfter; state.picAfter = null;
  if(after){
    // 続く処理(緊急補強など)に「元は動いていたか」を引き継ぐ
    state.playing = state.picResume; state.picResume = false;
    after();
    return;
  }
  if(state.picResume){ state.picResume = false; startTimer(); }
}
function runLore(e){
  const x = loreTargets(e);
  if(!x) return false;
  const t = x.t;
  const txt = loreText(e, x);
  switch(e.effect){
    case "moodUp":   moodSet(t, 1.3, 16, "好材料"); break;
    case "moodDown": moodSet(t, -1.3, 16, "動揺"); break;
    case "formUp":   if(x.P) x.P.form = 2; break;
    case "formDown": if(x.P) x.P.form = -2; break;
    case "formUpTeam":   formShift([...lineupOf(t), ...pitchersOf(t)], 1); break;
    case "formDownTeam": formShift([...lineupOf(t), ...pitchersOf(t)], -1); break;
    case "ovrUp":   if(x.P){ x.P.ovr = Math.min(99, x.P.ovr + 3); x.P.awakened = true; x.P.form = 2; } break;
    case "ovrDown": if(x.P){ x.P.ovr = Math.max(60, x.P.ovr - 3); x.P.form = -2; } break;
    case "mgrRest": t.mgrRest = true; break;
    case "mgrBack": t.mgrRest = false; moodSet(t, 1.0, 18, "監督復帰"); break;
    case "leave": {
      partyNews(e.icon || "急", e.cls || "bad", txt, e.id, t);
      // 事件の見出しをそのまま離脱理由にする(例:【直撃】→「直撃」)
      const m = /^【([^】]{1,10})】/.exec(e.text || "");
      const reason = m ? m[1] + "の余波でチームを離れた" : "球界を揺るがす事態でチームを離れた";
      const go = () => { startEmergency(t, x.slotKey, reason); renderRosterLive(); };
      if(EVENT_PIC.has(e.id)) showEventPic(e, txt, go); else go();
      return true;
    }
    default: break;
  }
  partyNews(e.icon || "報", e.cls || "fun", txt, e.id, t);
  if(["formUp","formDown","formUpTeam","formDownTeam","ovrUp","ovrDown"].includes(e.effect)) renderRosterLive();
  if(EVENT_PIC.has(e.id)) showEventPic(e, txt);
  return true;
}

function rollPartyEvent(){
  if(!state.opts.party || state.eventCtx || liveCtx || state.finished) return;
  if(state.day < 8) return;
  // 選択式イベント(人間チームのみ・シーズン中3回まで)
  const humans = state.parts.filter(t=>!t.cpu);
  if(humans.length && (state.choiceCount||0) < 3 && rnd() < 0.030){
    const t = pick1(humans);
    const cands = PARTY_CHOICES.filter(c=>c.need(t));
    if(cands.length){
      state.choiceCount = (state.choiceCount||0) + 1;
      pick1(cands).run(t);
      return;
    }
  }
  if(rnd() > 0.13) return;
  // 史実パロディ(データ駆動)を優先抽選。対象が見つからなければ既存イベントへ
  if(typeof PARTY_LORE !== "undefined" && PARTY_LORE.length && rnd() < 0.75){
    const total = PARTY_LORE.reduce((s,e)=>s+(e.w||2), 0);
    let r = rnd()*total;
    for(const e of PARTY_LORE){
      r -= (e.w||2);
      if(r <= 0){ try{ if(runLore(e)) return; }catch(err){ console.error("lore", e.id, err); } break; }
    }
  }
  const cands = PARTY_EVENTS.filter(e=>{ try{ return e.need(); }catch(err){ return false; } });
  if(!cands.length) return;
  const total = cands.reduce((s,e)=>s+e.w, 0);
  let r = rnd()*total;
  for(const e of cands){ r -= e.w; if(r <= 0){ try{ e.run(); }catch(err){ console.error(e.id, err); } return; } }
}
// ── 補強の当たり外れ ────────────────────────────────────────
// 良い代役がいつでも来ると緊急事態が緊急でなくなるので、抽選で質を決める。
// 順位が下のチームほどわずかに当たりやすい(戦力均衡のイメージ)。
function reinforceLuck(t){
  const s = standingsSorted();
  const i = s.indexOf(t);
  const tilt = s.length > 1 && i >= 0 ? i/(s.length-1) : 0.5;   // 0=首位 1=最下位
  const r = rnd();
  if(r < 0.05 + 0.05*tilt) return {label:"大当たり", tone:"good", lo:1,   hi:14,  note:"まさかの大物が空いていた"};
  if(r < 0.22 + 0.13*tilt) return {label:"当たり",   tone:"good", lo:-3,  hi:2,   note:"穴を埋められる実力者"};
  if(r < 0.58 + 0.12*tilt) return {label:"及第点",   tone:"mid",  lo:-10, hi:-3,  note:"戦力ダウンは避けられない"};
  return                          {label:"苦しい",   tone:"bad",  lo:-24, hi:-10, note:"層の薄さが露呈した"};
}
// 基準値+lo〜+hiの範囲から候補をn人。足りなければ帯の中心に近い順で補う
function bandPick(cands, base, lo, hi, n){
  const mid = base + (lo+hi)/2;
  let inBand = cands.filter(p=>p.ovr >= base+lo && p.ovr <= base+hi);
  if(inBand.length < n){
    const set = new Set(inBand);
    const rest = cands.filter(p=>!set.has(p))
      .sort((a,b)=>Math.abs(a.ovr-mid)-Math.abs(b.ovr-mid));
    inBand = inBand.concat(rest.slice(0, n-inBand.length));
  }
  return shuffle(inBand).slice(0, n).sort((a,b)=>b.ovr-a.ovr);
}
function startEmergency(t, slotKey, reason){
  const d = SLOT_DEFS.find(x=>x.key===slotKey);
  const victim = t.slots[slotKey];
  const wasPlaying = state.playing;
  stopTimer();
  state.resumeAfterEvent = wasPlaying;
  const cands = PLAYERS.filter(p=>!state.taken.has(p.id) && poolOK(p) && p.cat!=="M" && !p.twoWay && eligibleGrp(p, d.grp))
    .sort((a,b)=>b.ovr-a.ovr);
  const luck = reinforceLuck(t);
  const watch = t.watch || new Set();
  // 抽選で決まった帯の中から5人。注目リストの選手は帯に入っていれば優先で残す
  let list = bandPick(cands, victim.ovr, luck.lo, luck.hi, 5);
  const wIn = cands.filter(p=>watch.has(p.id) && p.ovr >= victim.ovr+luck.lo && p.ovr <= victim.ovr+luck.hi)
    .filter(p=>list.indexOf(p) < 0);
  if(wIn.length) list = [...wIn.slice(0,2), ...list].slice(0,5).sort((a,b)=>b.ovr-a.ovr);
  partyNews("急","bad",`【緊急事態】${victim.name}（${t.name}・${d.label}）が${reason}！`);
  if(!list.length){ // 代役なし→騒動は沈静化
    state.news.unshift({mo:dateLabel(state.day-1), txt:`${t.name}球団が謝罪会見。${victim.name}は厳重注意で決着した`});
    if(state.resumeAfterEvent){ state.resumeAfterEvent=false; startTimer(); }
    return;
  }
  state.eventCtx = {type:"emergency", t, slotKey, victim, reason, list, luck, opened:false};
  $("s-play").disabled = true; $("s-skip").disabled = true;
  if(t.cpu){ emergencySign(list[0].id); return; }
  renderEmergency();
  $("event-bg").classList.add("show");
  return;
}
// スカウト部からの連絡 → 封を開けて候補リストを見る、の2段構え
function scoutOpen(){
  const c = state.eventCtx;
  if(!c || c.type !== "emergency") return;
  c.opened = true;
  seRollStop();
  renderEmergency();
}
function renderEmergency(){
  const c = state.eventCtx;
  if(!c || c.type !== "emergency") return;
  const { t, victim, reason, list, luck } = c;
  const d = SLOT_DEFS.find(x=>x.key===c.slotKey);
  if(!c.opened){
    $("event-panel").innerHTML = `
      <h2><span class="kicker">緊急速報</span>${esc(t.name)} ── 緊急補強</h2>
      <div class="sub"><b>${esc(victim.name)}</b>（${d.label}）が${reason}。編成部がスカウトに調査を依頼しました。</div>
      <div class="sc-env">
        <div class="sc-seal">親展</div>
        <div class="sc-from">${esc(t.name)} 編成部 スカウト班</div>
        <div class="sc-ttl">${d.label}　補強候補リスト</div>
        <div class="sc-note">封筒はまだ開けられていない</div>
      </div>
      <div style="text-align:center;margin-top:14px;">
        <button class="btn" onclick="scoutOpen()">封を開けてリストを見る</button>
      </div>`;
    seRollStart();
    return;
  }
  $("event-panel").innerHTML = `
    <h2><span class="kicker">緊急速報</span>${esc(t.name)} ── 緊急補強</h2>
    <div class="sub"><b>${esc(victim.name)}</b>（${d.label}）が${reason}。支配下外から代役を1人選んでください（コスト不要・残り試合に出場）。★は注目リストの選手。<br><b class="luck-${luck.tone}">スカウト報告：${luck.label}</b> ── ${luck.note}</div>
    <div class="mlb-grid" style="margin-top:10px;">
      ${list.map(p=>`
        <div class="mlb-card" onclick="emergencySign('${p.id}')">
          <span class="rank-wrap">${rankIcon(p.ovr, 28)}</span>
          <div class="pc-row">${avatarBox(p, 36)}
            <div class="pc-main">
              <div class="nm">${(t.watch&&t.watch.has(p.id))?"★":""}${esc(p.name)}${titleBadge(p)}</div>
              <div class="meta">${roleLabel(p)}・${handMark(p)}${esc(p.team)}・${p.year}年</div>
              <div class="meta">${statShort(p)}</div>
            </div>
          </div>
        </div>`).join("")}
    </div>`;
}

function emergencySign(pid){
  const ctx = state.eventCtx;
  if(!ctx || ctx.type!=="emergency") return;
  const p = findPlayer(pid);
  const t = ctx.t;
  const d = SLOT_DEFS.find(x=>x.key===ctx.slotKey);
  state.taken.add(p.id);
  t.slots[ctx.slotKey] = p;
  p.joined = true;
  statsReplace(ctx.victim, p, t, d.grp);   // 離脱者の記録は残し、代役には新しい記録を作る
  partyNews("補","good",`【緊急補強】${t.name}が${p.name}を電撃獲得！ ${ctx.victim.name}の穴を埋める`);
  seTap();
  endEventPhase();
}

// ============================================================
// ドラフト記念紙面(画像保存)
// ============================================================
function snapPaper(){
  if(!state.parts.length || !state.parts.every(rosterFull)){ alert("ドラフト完了後に使えます"); return; }
  const n = state.parts.length;
  const cols = n<=2 ? n : 2;
  const rows = Math.ceil(n/cols);
  const W = 1080, colW = (W-60)/cols;
  const blockH = 520, headH = 170;
  const H = headH + rows*blockH + 50;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const mincho = '"Zen Old Mincho","Yu Mincho","Hiragino Mincho ProN",serif';
  // 紙面
  ctx.fillStyle = "#f2ecdd"; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = "#221e17"; ctx.lineWidth = 3; ctx.strokeRect(14,14,W-28,H-28);
  ctx.lineWidth = 1; ctx.strokeRect(20,20,W-40,H-40);
  // 見出し
  ctx.fillStyle = "#a72c18"; ctx.fillRect(40,44,110,34);
  ctx.fillStyle = "#fdf9ef"; ctx.font = `bold 20px ${mincho}`; ctx.fillText("球史特報", 52, 68);
  ctx.fillStyle = "#221e17"; ctx.font = `900 52px ${mincho}`;
  ctx.fillText("ドラフト会議 全指名選手", 170, 84);
  ctx.font = `15px ${mincho}`; ctx.fillStyle = "#57503f";
  const capLbl = state.rankCap ? `能力縛り:${state.rankCap===93?"S以下":state.rankCap===88?"A以下":"B以下"}　` : "";
  ctx.fillText(`${capLbl}コスト上限${state.budget}pt　参加${n}球団 ―― 球史新聞社`, 172, 112);
  ctx.strokeStyle = "#221e17"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40,130); ctx.lineTo(W-40,130); ctx.stroke();
  // 各チーム
  state.parts.forEach((t,i)=>{
    const cx = 40 + (i%cols)*colW;
    const cy = headH + Math.floor(i/cols)*blockH;
    ctx.fillStyle = t.color; ctx.fillRect(cx, cy, 8, 26);
    ctx.fillStyle = "#221e17"; ctx.font = `900 26px ${mincho}`;
    ctx.fillText(t.name, cx+16, cy+22);
    ctx.font = `13px ${mincho}`; ctx.fillStyle = "#57503f";
    ctx.fillText(`計${t.spent}pt`, cx+colW-90, cy+20);
    let y = cy + 48;
    const done = new Set();
    for(const d of SLOT_DEFS){
      const p = t.slots[d.key];
      if(!p) continue;
      const key = p.id + d.grp;
      if(done.has(p.id) && d.grp==="SP" && p.twoWay){ /* 二刀流2行目もOK */ }
      else if(done.has(p.id)) continue;
      done.add(p.id);
      ctx.fillStyle = "#8f8468"; ctx.font = `12px ${mincho}`;
      ctx.fillText(d.label, cx+4, y);
      ctx.fillStyle = "#221e17"; ctx.font = `bold 17px ${mincho}`;
      ctx.fillText(`${p.name}`, cx+48, y);
      ctx.fillStyle = "#57503f"; ctx.font = `12px ${mincho}`;
      const extra = p.cat==="M" ? `優勝${p.pennants}回` : `'${String(p.year).slice(2)} ${p.no!==undefined?"#"+p.no:""}${p.tc?" 三冠":p.titles?" ★"+p.titles:""}`;
      ctx.fillText(extra, cx+colW-118, y);
      y += 23.5;
    }
  });
  ctx.fillStyle = "#8f8468"; ctx.font = `12px ${mincho}`;
  ctx.fillText("kusayakyu-navi.com/legend-draft ── 成績はキャリアハイ年の実測に基づく", 40, H-32);
  const url = cv.toDataURL("image/png");
  $("paper-img").innerHTML = `<img src="${url}" style="max-width:100%;border:1px solid var(--rule2);" alt="ドラフト記念紙面">`;
  $("paper-dl").href = url;
  $("paper-dl").download = "legend-draft-shimen.png";
  $("paper-bg").classList.add("show");
}

function initEngagement(){
  state.rouletteResume = null;
  state.parts.forEach(function(t){ t.budgetFrozen = false; });
}



// ---- 結果画面: パーティー総合順位 ----

// ============================================================
// 月例ルーレット(球団運営の運命。吉凶が混ざった12マス)
// ============================================================
// ルーレットの補強で1人を入れ替える
function scoutSign(t, key, cur, p){
  state.taken.add(p.id);
  t.slots[key] = p; p.joined = true; p.form = 1;
  if(state.seasonStats && !lineOf(t, p)){ state.seasonStats.push(blankBat(p, t, true)); rebuildStatIdx(); }
}
const ROULETTE = [
  {id:"training", eff:"ナイン全員の調子が上向く", label:"猛特訓", icon:"練", cls:"good", color:"#2c5c34",
   run(t){ formShift([...lineupOf(t), ...pitchersOf(t)], 1);
     return "【猛特訓】"+t.name+"が地獄の強化合宿を敢行。ナイン全体の動きが見違えた"; }},
  {id:"awake", eff:"野手1人の能力+4／絶好調に", label:"主力が覚醒", icon:"覚", cls:"good", color:"#2c5c34",
   run(t){ const c=lineupOf(t).filter(p=>p.ovr<97); if(!c.length) return null;
     const p=pick1(c); p.ovr=Math.min(99,p.ovr+4); p.form=2; p.awakened=true;
     return "【覚醒】"+p.name+"（"+t.name+"）が突如、別人のような打球を飛ばし始めた"; }},
  {id:"newpitch", eff:"投手1人の能力+4／絶好調に", label:"新球種を習得", icon:"球", cls:"good", color:"#2c5c34",
   run(t){ const c=pitchersOf(t).filter(p=>p.ovr<97); if(!c.length) return null;
     const p=pick1(c); p.ovr=Math.min(99,p.ovr+4); p.form=2; p.awakened=true;
     return "【新球種】"+p.name+"（"+t.name+"）が"+pick1(["高速スライダー","ツーシーム","フォーク","カットボール"])+"を習得。打者の的が絞れない"; }},
  {id:"cheer", eff:"チーム士気↑（22日間）", label:"満員御礼", icon:"満", cls:"good", color:"#2c5c34",
   run(t){ moodSet(t, 1.6, 22, "本拠地の大声援");
     return "【満員御礼】"+t.name+"の本拠地が超満員。地鳴りのような声援がナインを後押しする"; }},
  {id:"scout", eff:"支配下外から控えを1人補強（コスト不要）", label:"補強成功", icon:"補", cls:"good", color:"#9a7714",
   run(t){
     const key = BENCH_KEYS.find(k=>t.slots[k]) || BENCH_KEYS[0];
     const cur = t.slots[key];
     const all = PLAYERS.filter(p=>!state.taken.has(p.id) && poolOK(p) && p.cat==="B" && !p.twoWay)
       .sort((a,b)=>b.ovr-a.ovr);
     if(!all.length || !cur) return null;
     // 良い目とはいえ大物が確定で来るわけではない
     const q = rnd();
     const band = q < 0.12 ? [4, 16] : q < 0.45 ? [0, 4] : [-5, 0];
     const cands = bandPick(all, cur.ovr, band[0], band[1], 4);
     if(!cands.length) return null;
     if(!t.cpu){
       // 人間のチームは誰を獲るか自分で選ぶ
       state.scoutPick = {t, key, cur, cands};
       return "【緊急補強】"+t.name+"にスカウト部から連絡。獲得候補のリストが届いた";
     }
     const p = pick1(cands);
     scoutSign(t, key, cur, p);
     return "【緊急補強】"+t.name+"が"+p.name+"の獲得に成功！ "+cur.name+"と入れ替わる"; }},
  {id:"calm", eff:"変化なし", label:"平穏無事", icon:"平", cls:"none", color:"#6e675a",
   run(t){ return "【平穏】"+t.name+"に特筆すべき動きなし。粛々と調整が進む"; }},
  {id:"calm2", eff:"変化なし", label:"報道なし", icon:"静", cls:"none", color:"#6e675a",
   run(t){ return "【静観】"+t.name+"の番記者いわく「今月は書くことがない」。それも悪くない"; }},
  {id:"keiei", eff:"チーム士気↓（26日間）／補強凍結", label:"親会社が経営不振", icon:"経", cls:"bad", color:"#8c2412",
   run(t){ moodSet(t, -1.6, 26, "親会社の経営不振"); t.budgetFrozen = true;
     return "【経営不振】"+t.name+"の親会社が大幅減益を発表。補強凍結の噂が流れ、ロッカーに不安が広がる"; }},
  {id:"scandal", eff:"主力が1人離脱 → 緊急補強へ", label:"主力にスキャンダル", icon:"醜", cls:"bad", color:"#8c2412",
   leave:true,
   run(t){ return null; }},
  {id:"injury", eff:"主砲の能力−5／絶不調に", label:"主砲が故障", icon:"傷", cls:"bad", color:"#8c2412",
   run(t){ const c=lineupOf(t).sort((a,b)=>b.ovr-a.ovr).slice(0,3); if(!c.length) return null;
     const p=pick1(c); p.ovr=Math.max(60,p.ovr-5); p.form=-2;
     return "【離脱危機】"+p.name+"（"+t.name+"）が"+pick1(["右手薬指を骨折","脇腹を痛め","右膝に違和感を訴え"])+"戦線を離れかける"; }},
  {id:"naifun", eff:"チーム士気↓（20日間）", label:"チーム内紛", icon:"紛", cls:"bad", color:"#8c2412",
   run(t){ const ps=lineupOf(t); if(ps.length<2) return null;
     const two=shuffle(ps).slice(0,2); moodSet(t,-1.5,20,"チーム内紛");
     return "【内紛】"+two[0].name+"と"+two[1].name+"（"+t.name+"）が衝突。ベンチの空気が凍りついた"; }},
  {id:"slump", eff:"打線全員の調子が下がる", label:"謎の大不振", icon:"不", cls:"bad", color:"#8c2412",
   run(t){ formShift([...lineupOf(t)], -1);
     return "【謎の不振】"+t.name+"打線が球団史上最悪の貧打に陥る。誰にも原因が分からない"; }},
];

const MONTH_LABEL = ["4月","5月","6月","7月","8月","9月"];
function startRoulette(no){
  state.eventCtx = {type:"roulette", queue:state.parts.slice(), idx:0, no:no, spinning:false, result:null};
  $("s-play").disabled = true; $("s-skip").disabled = true;
  rouletteRender();
  $("event-bg").classList.add("show");
}
function rouletteRender(){
  const ctx = state.eventCtx;
  if(!ctx) return;
  const t = ctx.queue[ctx.idx];
  const N = ROULETTE.length;
  const seg = 360 / N;
  const res = ctx.result;
  const pick = state.scoutPick;

  // 一コマずつ独立した扇として描き、境界に太い白の仕切りを入れる。
  // 同じ色が隣り合っても地続きに見えないようにするため
  const R = 128, CX = 140, CY = 140;
  const arc = (i) => {
    const a0 = (i*seg - 90) * Math.PI/180, a1 = ((i+1)*seg - 90) * Math.PI/180;
    const x0 = CX + R*Math.cos(a0), y0 = CY + R*Math.sin(a0);
    const x1 = CX + R*Math.cos(a1), y1 = CY + R*Math.sin(a1);
    return "M" + CX + " " + CY + " L" + x0.toFixed(2) + " " + y0.toFixed(2) +
           " A" + R + " " + R + " 0 0 1 " + x1.toFixed(2) + " " + y1.toFixed(2) + " Z";
  };
  const wedges = ROULETTE.map(function(r,i){
    const hit = res && res.id === r.id;
    return '<path d="' + arc(i) + '" fill="' + r.color + '" stroke="#fbf7ec" stroke-width="3.5"' +
           ' class="rw-seg' + (hit ? " hit" : "") + '"/>';
  }).join("");
  // コマの中身は漢字1字だけを大きく。細い放射状の文字を詰め込むと読めないので、
  // 何の目かは盤の下の対照表で示す
  const texts = ROULETTE.map(function(r,i){
    const ang = i*seg + seg/2 - 90;
    const rad = ang * Math.PI/180;
    const tx = CX + 88*Math.cos(rad), ty = CY + 88*Math.sin(rad);
    return '<text class="rw-i" x="' + tx.toFixed(1) + '" y="' + (ty+9).toFixed(1) + '" text-anchor="middle">' +
           esc(r.icon) + '</text>';
  }).join("");
  // 盤の下にも日本語の対照表を置く。当たった目だけが残る
  const legend = ROULETTE.map(function(r){
    const hit = res && res.id === r.id;
    return '<span class="rl-chip ' + r.cls + (hit ? " hit" : (res ? " dim" : "")) + '">' +
           '<i style="background:' + r.color + '">' + esc(r.icon) + '</i>' + esc(r.label) + '</span>';
  }).join("");

  const nGood = ROULETTE.filter(function(r){ return r.cls==="good"; }).length;
  const nBad  = ROULETTE.filter(function(r){ return r.cls==="bad"; }).length;

  let resultHtml = '<div class="rl-wait"><span>運命やいかに</span></div>';
  if(res){
    resultHtml =
      '<div class="rl-card ' + res.cls + '">' +
        '<div class="rl-cap">' + (res.cls==="good"?"吉":res.cls==="bad"?"凶":"平") + '</div>' +
        '<div class="rl-big"><span class="rl-ri">' + esc(res.icon) + '</span>' + esc(res.label) + '</div>' +
        (res.eff ? '<div class="rl-eff"><b>効果</b>' + esc(res.eff) + '</div>' : "") +
        (res.msg ? '<div class="rl-msg">' + esc(res.msg.replace(/^【[^】]+】/, "")) + '</div>' : "") +
      '</div>';
  }

  let picker = "";
  if(pick && pick.t === t){
    picker =
      '<div class="rl-pick">' +
        '<div class="rl-pick-h">スカウト部からの獲得候補（' + pick.cands.length + '人）── 1人を選ぶと' + esc(pick.cur.name) + 'と入れ替わります</div>' +
        '<div class="mlb-grid">' + pick.cands.map(function(p, i){
          return '<div class="mlb-card" onclick="scoutChoose(' + i + ')">' +
            '<span class="rank-wrap">' + rankIcon(p.ovr, 28) + '</span>' +
            '<div class="pc-row">' + avatarBox(p, 36) +
              '<div class="pc-main">' +
                '<div class="nm">' + esc(p.name) + titleBadge(p) + '</div>' +
                '<div class="meta">' + roleLabel(p) + '・' + handMark(p) + esc(p.team) + '・' + p.year + '年</div>' +
                '<div class="meta">' + statShort(p) + '</div>' +
              '</div></div></div>';
        }).join("") + '</div>' +
      '</div>';
  }

  const lamps = Array.from({length:16}, function(_,i){
    return '<i style="--a:' + (i*22.5) + 'deg;--d:' + (i*0.09).toFixed(2) + 's"></i>';
  }).join("");

  $("event-panel").innerHTML =
    '<h2><span class="kicker">' + (MONTH_LABEL[ctx.no]||"") + '末</span>球団運営ルーレット</h2>' +
    '<div class="rl-team">' + teamEmblem(t, 22) + '<b>' + esc(t.name) + '</b>' +
      '<span class="rl-turn">' + (ctx.idx+1) + ' / ' + ctx.queue.length + '球団</span></div>' +
    '<div class="sub">吉' + nGood + '・凶' + nBad + '・平' + (N-nGood-nBad) + '。2か月に一度、球団の運命が動きます。</div>' +
    '<div class="rl-stage' + (res ? " landed" : "") + '" id="rl-stage">' +
      '<div class="rl-lamps">' + lamps + '</div>' +
      '<div class="rl-needle"></div>' +
      '<svg class="rl-wheel" id="rl-wheel" viewBox="0 0 280 280" aria-hidden="true">' +
        '<circle cx="140" cy="140" r="133" fill="#221e17"/>' +
        wedges + texts +
        '<circle cx="140" cy="140" r="31" fill="#fbf7ec" stroke="#221e17" stroke-width="3"/>' +
        '<text class="rw-hub" x="140" y="148" text-anchor="middle">運</text>' +
      '</svg>' +
      '<div class="rl-flash"></div>' +
    '</div>' +
    '<div class="rl-legend">' + legend + '</div>' +
    resultHtml + picker +
    '<div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;">' +
      (res
        ? (picker ? '' : '<button class="btn sm" onclick="rouletteNext()">' + (ctx.idx + 1 >= ctx.queue.length ? "試合再開" : "次の球団へ") + '</button>')
        : '<button class="btn rl-go" id="rl-btn" onclick="rouletteSpin()">ルーレットを回す</button>') +
    '</div>';
  const w = $("rl-wheel");
  if(w && ctx.wheelDeg) w.style.transform = "rotate(" + ctx.wheelDeg + "deg)";
}
// 補強候補から1人選ぶ
function scoutChoose(i){
  const pick = state.scoutPick;
  if(!pick) return;
  const p = pick.cands[i];
  scoutSign(pick.t, pick.key, pick.cur, p);
  partyNews("補", "good", "【緊急補強】" + pick.t.name + "が" + p.name + "の獲得に成功！ " + pick.cur.name + "と入れ替わる");
  state.scoutPick = null;
  seWin();
  renderRosterLive(); renderTeamStrip();
  rouletteRender();
}
function rouletteSpin(){
  const ctx = state.eventCtx;
  if(!ctx || ctx.spinning) return;
  ctx.spinning = true;
  const t = ctx.queue[ctx.idx];
  const i = Math.floor(rnd() * ROULETTE.length);
  const seg = 360 / ROULETTE.length;
  const turns = 6 + Math.floor(rnd()*3);
  const deg = turns*360 + (360 - (i*seg + seg/2));
  const w = $("rl-wheel");
  const b = $("rl-btn");
  const stage = $("rl-stage");
  if(b){ b.disabled = true; b.textContent = "回転中…"; }
  if(stage) stage.classList.add("spinning");
  if(w){
    w.style.transition = "transform 4.2s cubic-bezier(.1,.62,.12,1)";
    w.style.transform = "rotate(" + deg + "deg)";
  }
  ctx.wheelDeg = deg;
  seRollStart();
  setTimeout(function(){
    seRollStop();
    if(stage){ stage.classList.remove("spinning"); stage.classList.add("landed"); }
    const r = ROULETTE[i];
    let msg = null;
    if(r.leave){
      const ds = droppableDefs(t);
      if(ds.length){
        ctx.result = {id:r.id, icon:r.icon, label:r.label, cls:r.cls, eff:r.eff,
                      msg:"写真週刊誌が主力の私生活を報道。球団は対応に追われる"};
        ctx.spinning = false;
        rouletteRender();
        setTimeout(function(){
          const d = pick1(ds);
          state.eventCtx = null;
          startEmergency(t, d.key, "写真週刊誌のスキャンダル直撃で無期限謹慎");
          const rest = {type:"roulette", queue:ctx.queue, idx:ctx.idx+1, no:ctx.no, spinning:false, result:null};
          state.rouletteResume = (rest.idx < rest.queue.length) ? rest : null;
        }, 1800);
        return;
      }
      msg = "【小康】"+t.name+"に不穏な噂が流れたが、球団は火消しに成功した";
    }
    if(msg === null) msg = r.run(t);
    if(!msg) msg = "【平穏】"+t.name+"に大きな動きはなかった";
    partyNews(r.icon, r.cls === "none" ? "fun" : r.cls, msg);
    if(r.cls === "good") seWin(); else if(r.cls === "bad") seMiss(); else seTap();
    ctx.result = {id:r.id, icon:r.icon, label:r.label, cls:r.cls, eff:r.eff, msg:msg};
    ctx.spinning = false;
    renderRosterLive(); renderTeamStrip();
    rouletteRender();
  }, 4300);
}
function rouletteNext(){
  const ctx = state.eventCtx;
  if(!ctx) return;
  ctx.idx++; ctx.result = null; ctx.spinning = false; ctx.wheelDeg = 0;
  if(ctx.idx >= ctx.queue.length){ endEventPhase(); return; }
  rouletteRender();
}

// ============================================================
// 投球単位の中継(B-S-Oカウント/球種/球速/コース)
// ============================================================
const PITCH_TYPES = [
  {n:"ストレート", v:[142,158], w:34},
  {n:"スライダー", v:[128,142], w:16},
  {n:"フォーク",   v:[130,143], w:12},
  {n:"カーブ",     v:[110,126], w:9},
  {n:"チェンジアップ", v:[118,132], w:9},
  {n:"シュート",   v:[133,147], w:7},
  {n:"ツーシーム", v:[138,150], w:7},
  {n:"カットボール", v:[136,148], w:6},
];
const ZONES = ["外角低め","外角高め","内角低め","内角高め","真ん中低め","外角いっぱい","内角ぎりぎり","真ん中"];
function pickPitchType(p){
  const era = (p.twoWay ? p.twoWay.era : p.era) || 3.2;
  const total = PITCH_TYPES.reduce(function(s,x){ return s + x.w; }, 0);
  let r = rnd()*total;
  for(const x of PITCH_TYPES){ r -= x.w; if(r <= 0){
    const lo = x.v[0], hi = x.v[1];
    const bonus = clamp(Math.round((3.4 - era)*2.5), -4, 6);
    return {name:x.n, kmh: clamp(Math.round(lo + rnd()*(hi-lo)) + bonus, 105, 165)};
  }}
  return {name:"ストレート", kmh:145};
}
// 打席結果に至るまでの投球シーケンスを組み立てる
function genPitchSeq(key, bat, pit){
  const seq = [];
  let b = 0, st = 0;
  const foulish = function(){ return st === 2 && rnd() < 0.45; };
  const push = function(res){
    const pt = pickPitchType(pit);
    seq.push({b:b, s:st, type:pt.name, kmh:pt.kmh, zone:pick1(ZONES), res:res});
  };
  if(key === "BB"){
    while(b < 3 || st > 0){
      if(b < 3 && (st >= 2 || rnd() < 0.62)){ push("ボール"); b++; }
      else if(st < 2){ push(pick1(["見逃しストライク","空振り","ファウル"])); st++; }
      else { push("ファウル"); }
      if(b >= 3 && st <= 2 && seq.length > 3) break;
      if(seq.length > 9) break;
    }
    push("ボール（四球）"); return seq;
  }
  if(key === "HBP"){
    const n = Math.floor(rnd()*3);
    for(let i=0;i<n;i++){ if(rnd()<0.5){ push("ボール"); b++; } else if(st<2){ push("空振り"); st++; } }
    push("死球"); return seq;
  }
  if(key === "K"){
    while(st < 2){
      if(b < 3 && rnd() < 0.4){ push("ボール"); b++; }
      else { push(pick1(["見逃しストライク","空振り","ファウル"])); st++; }
      if(seq.length > 8) break;
    }
    while(foulish()){ push("ファウル"); if(seq.length > 11) break; }
    push(pick1(["空振り三振","見逃し三振"])); return seq;
  }
  // インプレー(打った)
  const pre = Math.floor(rnd()*4);
  for(let i=0;i<pre;i++){
    if(b < 3 && rnd() < 0.45){ push("ボール"); b++; }
    else if(st < 2){ push(pick1(["見逃しストライク","空振り","ファウル"])); st++; }
    else { push("ファウル"); }
  }
  push("打った");
  return seq;
}

// ============================================================
// 勝利確率バー(試合の熱量を可視化)
// ============================================================
function winProbA(rA, rB, inn, top, outs, on){
  const diff = rA - rB;                       // 先攻(A)から見た点差
  const outsTotal = (inn - 1) * 6 + (top ? 0 : 3) + Math.min(3, outs);
  const remain = Math.max(0.6, (54 - outsTotal) / 6);   // 残りイニング相当
  let z = 0.92 * diff / Math.sqrt(remain);
  // 走者と1死以内のアドバンテージは攻撃側に加算
  const runner = (on && on[0] ? 0.30 : 0) + (on && on[1] ? 0.45 : 0) + (on && on[2] ? 0.55 : 0);
  const adv = (runner + (2 - Math.min(2, outs)) * 0.16) / Math.sqrt(remain) * 0.42;
  z += top ? adv : -adv;                      // 表はAの攻撃、裏はBの攻撃
  return clamp(1 / (1 + Math.exp(-z)), 0.005, 0.995);
}
function renderWinBar(e){
  const box = $("lv-wp");
  const c = liveCtx;
  if(!box || !c) return;
  const g = c.g;
  const rA = c.ia.slice(0, c.shownA).reduce(function(s,x){ return s + x; }, 0);
  const rB = c.ib.slice(0, c.shownB).reduce(function(s,x){ return s + x; }, 0);
  const p = e
    ? winProbA(rA, rB, e.inn || 1, !!e.top, e.outs || 0, e.on || [])
    : winProbA(rA, rB, 1, true, 0, []);
  const pa = Math.round(p * 100), pb = 100 - pa;
  const swing = c.lastWp === undefined ? 0 : Math.abs(pa - c.lastWp);
  c.lastWp = pa;
  box.innerHTML =
    '<div class="wp-head"><span class="wp-l">勝利確率</span>' +
      (swing >= 14 ? '<span class="wp-swing">形勢が大きく動いた</span>' : '') + '</div>' +
    '<div class="wp-bar">' +
      '<div class="wp-a" style="width:' + pa + '%;background:' + g.A.color + '"><span>' + pa + '%</span></div>' +
      '<div class="wp-b" style="width:' + pb + '%;background:' + g.B.color + '"><span>' + pb + '%</span></div>' +
    '</div>' +
    '<div class="wp-names"><span>' + esc(g.A.name) + '</span><span>' + esc(g.B.name) + '</span></div>';
}

// ============================================================
// 選手紹介スーパー(打席入り時に2秒だけ出す)
// ============================================================
function poseFor(p, kind){
  // 名前から安定した番号を作り、同じ選手には常に同じ絵を割り当てる
  let h = 0;
  const n = p.name || "";
  for(let i=0;i<n.length;i++) h = (h*31 + n.charCodeAt(i)) & 0x7fffffff;
  const idx = (h % 6) + 1;
  return "assets/pose/" + kind + idx + ".png";
}
function numImg(n){
  if(n === undefined || n === null) return "";
  n = Math.max(0, Math.min(99, Math.round(n)));
  const one = function(d, val){
    return '<img class="sp-numimg" src="assets/num/n' + (d+1) + '.png" alt="' + val + '" data-no="' + val + '" onerror="numImgFail(this)">';
  };
  if(n <= 20) return one(n, n);              // 0〜20は専用画像
  const t = Math.floor(n/10), o = n%10;      // 21〜99は十の位と一の位を並べる
  return '<span class="sp-numset">' + one(t, t) + one(o, o) + '</span>';
}
function numImgFail(img){
  const sp = document.createElement("span");
  sp.className = "sp-no";
  sp.textContent = img.getAttribute("data-no") || "";
  img.replaceWith(sp);
}
function showSuper(e){
  if(!e || !e.bat) return;
  const c = liveCtx; if(!c) return;
  const t = e.top ? c.g.A : c.g.B;
  // 打者本人の season 成績を引く
  const p = LINEUP_KEYS.concat(BENCH_KEYS).map(function(k){ return t.slots[k]; })
    .find(function(x){ return x && x.name === e.bat; });
  const st = p ? statOf(t, p, "DH") : null;
  const prog = seasonProg() || 1;
  const cv = function(v){ return Math.round((v||0) * prog); };
  const box = $("lv-super");
  if(!box) return;
  box.innerHTML =
    '<div class="sp-inner">' +
    '<img class="sp-fig" src="' + poseFor(p || {name:e.bat}, "bat") + '" alt="" onerror="this.style.display=\'none\'">' +
    '<div class="sp-body">' +
      '<div class="sp-top">' + (e.batNo !== undefined ? numImg(e.batNo) : "") +
        '<span class="sp-team">' + esc(t.name) + '</span>' +
        (p ? '<span class="sp-hand">' + (p.th||"?") + '投' + (p.bh||"?") + '打</span>' : "") + '</div>' +
      '<div class="sp-name">' + esc(e.bat) + '</div>' +
      (st ? '<div class="sp-stats">' +
        '<span><i>打率</i>' + avg3(st.avg) + '</span>' +
        '<span><i>本</i>' + cv(st.hr) + '</span>' +
        '<span><i>点</i>' + cv(st.rbi) + '</span>' +
        '<span><i>OPS</i>' + (st.ops||0).toFixed(3).replace(/^0/,"") + '</span>' +
      '</div>' : "") +
    '</div></div>';
  box.classList.add("in");
  clearTimeout(state.superTimer);
  state.superTimer = setTimeout(function(){ box.classList.remove("in"); }, 1900);
}
