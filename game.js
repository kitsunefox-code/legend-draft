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
  {key:"RP1", grp:"RP",  label:"中継"},
  {key:"RP2", grp:"RP",  label:"中継"},
  {key:"CL",  grp:"CL",  label:"抑え"},
];
const LINEUP_KEYS = ["C","B1","B2","B3","SS","OF1","OF2","OF3","DH"];
const BENCH_KEYS = ["BN1","BN2","BN3"];
const SP_KEYS = ["SP1","SP2","SP3"];
const RP_KEYS = ["RP1","RP2"];

// ---------- utils ----------
const $ = id => document.getElementById(id);
const rnd = () => Math.random();
const gauss = () => (rnd()+rnd()+rnd()+rnd()-2)/1.2;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const avg3 = v => v.toFixed(3).replace(/^0/,"");
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
function poisson(lam){ let L=Math.exp(-lam),k=0,p=1; do{k++;p*=rnd();}while(p>L); return k-1; }
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
  row.innerHTML = `<span class="idx" style="background:${COLORS[i]}">${i+1}</span>
    <input type="text" value="参加者${i+1}" maxlength="10">
    <select><option value="">縛りなし</option>${FRANCHISES.map(f=>`<option>${f}</option>`).join("")}</select>
    <button class="btn ghost sm" onclick="this.parentNode.remove();renumber()">✕</button>`;
  list.appendChild(row);
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
function newTeam(name, fr, cpu, color){
  return {name, fr, cpu, color, emblem:nextEmblem(), slots:{}, spent:0, W:0,L:0,T:0,RS:0,RA:0, hist:[0], watch:new Set()};
}
function startDraft(){
  const rows = [...$("p-list").children];
  if(rows.length<2){ alert("参加者は2人以上必要です"); return; }
  emblemPool = null;
  state.parts = rows.map((row,i)=>newTeam(
    row.querySelector("input").value.trim() || `参加者${i+1}`,
    row.querySelector("select").value, false, COLORS[i]));
  state.eras = new Set([...$("era-chips").children].filter(c=>c.classList.contains("on")).map(c=>c.dataset.era));
  state.opts.trade = $("opt-trade").checked;
  state.opts.mlb = $("opt-mlb").checked && MLB_STARS.length > 0;
  state.budget = Number($("opt-budget").value) || 130;
  state.rankCap = Number($("opt-rank").value) || 0; // 0=縛りなし
  state.opts.party = $("opt-party") ? $("opt-party").checked : false;

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
    const secs = [["首脳陣",["MGR"]],["スタメン",LINEUP_KEYS],["控え",BENCH_KEYS],["投手",["SP1","SP2","SP3","RP1","RP2","CL"]]];
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
function teamAtt(t){
  let s=0;
  for(const k of LINEUP_KEYS){ const p=t.slots[k]; s += p.ovr + fw(p); }
  for(const k of BENCH_KEYS){ const p=t.slots[k]; s += (p.ovr + fw(p))*0.25; }
  return s/9.75 + mgrBonus(t) + morale(t);
}
function teamDef(t){
  const sp = SP_KEYS.reduce((s,k)=>{const p=t.slots[k];return s+ovrFor(p,"SP")+fw(p);},0)/3;
  const rp = RP_KEYS.reduce((s,k)=>{const p=t.slots[k];return s+ovrFor(p,"RP")+fw(p);},0)/2;
  const cl = ovrFor(t.slots.CL,"CL") + fw(t.slots.CL);
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
function buildSchedule(n, cycles){
  const ids = [...Array(n).keys()];
  if(n % 2) ids.push(-1); // 奇数チームは休養日
  const m = ids.length;
  const rounds = [];
  const arr = ids.slice();
  for(let r=0; r<m-1; r++){
    const games = [];
    for(let i=0; i<m/2; i++){
      const a = arr[i], b = arr[m-1-i];
      if(a !== -1 && b !== -1) games.push(rnd()<0.5 ? [a,b] : [b,a]);
    }
    rounds.push(games);
    arr.splice(1, 0, arr.pop());
  }
  const days = [];
  for(let c=0; c<cycles; c++) for(const r of rounds) days.push(r);
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
  state.day = 0; state.news = []; state.lastScores = [];
  state.partyLog = []; state.choiceCount = 0;
  state.playing = false; state.timer = null; state.finished = false;
  state.monthsCompleted = -1; state.resumeAfterEvent = false;
  state.eventQueue = [];
  initEngagement();
  state.scored = false; state.scoreBoard = null; state.predicted = false;
  // 月例ルーレット(毎月末)
  [0,1,2,3,4,5].forEach(function(m){ state.eventQueue.push({after:m, type:"roulette", no:m}); });
  if(state.opts.trade) state.eventQueue.push({after:2, type:"trade"});
  if(state.opts.mlb) state.eventQueue.push({after:3, type:"mlb"});
  const wokeCount = rollAwakenings();
  simulateAllPlayerStats();
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
  $("s-scores").textContent = "";
  const ev = [];
  if(wokeCount) ev.push(`キャンプで${wokeCount}人が覚醒`);
  if(state.opts.trade) ev.push("6月末にトレードタイム");
  if(state.opts.mlb) ev.push("7月末にMLBスター補強（最下位チームから指名）");
  $("s-note").textContent = `${n}球団・各チーム${state.pairGames*(n-1)}試合を自動でシミュレート。` + (ev.length ? ev.join("、")+"。" : "");
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
function tick(){
  if(state.day >= state.schedule.length){ finishSeason(); return; }
  playDay();
  renderLive();
  // パーティーモードの波乱イベント(緊急補強は一時停止して選択待ち)
  rollPartyEvent();
  if(state.eventCtx) return; // 緊急補強・選択イベントは入力待ち
  // 生中継: 開幕戦と優勝決定試合だけ、イニングごとにスコアが動く
  let broadcast = null;
  if(state.day === 1 && !state.openingShown){
    state.openingShown = true;
    if(state.lastGames && state.lastGames.length) broadcast = {label:"開幕戦 生中継", g: state.lastGames[0]};
  }
  const clincher = checkClinch();
  if(clincher && state.lastGames){
    const g = state.lastGames.find(x=>x.A===clincher || x.B===clincher);
    if(g) broadcast = {label:"優勝決定試合 生中継", g};
  }
  if(broadcast){
    stopTimer();
    state.resumeAfterLive = true;
    showLiveGame(broadcast.label, broadcast.g, ()=>{
      const ev = dueEvent();
      if(ev){ ev.done = true; state.resumeAfterEvent = state.resumeAfterLive; state.resumeAfterLive=false; startEvent(ev.type, ev); return; }
      if(state.day >= state.schedule.length){ finishSeason(); return; }
      if(state.resumeAfterLive){ state.resumeAfterLive=false; startTimer(); }
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
    playDay();
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
  $("s-note").textContent = `全${state.pairGames*(state.parts.length-1)}試合を完走。1位${s[0].name}と2位${s[1].name}が日本シリーズで激突！`;
  telop(`レギュラーシーズン終了 ―― 日本シリーズは ${s[0].name} 対 ${s[1].name}`);
}
function dueEvent(){
  return state.eventQueue.find(e=>!e.done && e.after <= state.monthsCompleted);
}

function simGame(A, B){
  const expA = clamp(4.2*(1+0.022*(teamAtt(A)-teamDef(B))), 1.0, 11);
  const expB = clamp(4.2*(1+0.022*(teamAtt(B)-teamDef(A))), 1.0, 11);
  let rA = poisson(expA), rB = poisson(expB);
  if(rA===rB && rnd()<0.82){
    if(rnd() < expA/(expA+expB)) rA++; else rB++;
  }
  A.RS+=rA; A.RA+=rB; B.RS+=rB; B.RA+=rA;
  if(rA>rB){A.W++;B.L++; A.stk=(A.stk||0)+1; B.stk=0;}
  else if(rB>rA){B.W++;A.L++; B.stk=(B.stk||0)+1; A.stk=0;}
  else {A.T++;B.T++;}
  return {rA, rB};
}
function playDay(){
  const games = state.schedule[state.day];
  const dl = dateLabel(state.day);
  const scores = [];
  const played = [];
  for(const [ai,bi] of games){
    const A = state.parts[ai], B = state.parts[bi];
    const g = simGame(A,B);
    played.push({A, B, rA:g.rA, rB:g.rB});
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
function renderLive(){
  $("s-date").textContent = dateLabel(state.day-1);
  $("s-scores").textContent = state.lastScores.join("　／　");
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
    const badges = (t.mgrRest ? `<span class="ts-b bad">監督休養</span>` : "")
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
  el.innerHTML = log.length ? log.slice(0,24).map(x=>`
    <div class="plog ${x.cls}">
      <span class="pl-icon">${x.icon}</span>
      <span class="pl-d">${x.d}</span>
      <span class="pl-t">${esc(x.txt)}</span>
    </div>`).join("") : `<div class="sub" style="padding:6px 2px;">まだ事件は起きていません。何かが起こるのを待ちましょう…</div>`;
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
function statLineLive(s){ // 消化試合数ぶんに換算した現在成績
  if(!s) return "";
  const c = v => Math.round(v*seasonProg());
  if(s.kind==="B") return `${avg3(s.avg)}・${c(s.hr)}本・${c(s.rbi)}点` + (s.sb>=10?`・${c(s.sb)}盗`:"");
  if(s.role==="CL") return `${c(s.sv)}S・防${s.era.toFixed(2)}`;
  if(s.role==="RP") return `${c(s.hld)}H・防${s.era.toFixed(2)}`;
  return `${c(s.w)}勝・防${s.era.toFixed(2)}・${c(s.so)}K`;
}

// ---- 部門リーダー(順位表下・各部門5位まで) ----
function leadersHtml(entries, prog){
  const B = entries.filter(s=>s.kind==="B" && !s.bench);
  const P = entries.filter(s=>s.kind==="P");
  const topN = (arr, key, asc=false) => arr.slice().sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key]).slice(0,5);
  const c = v => Math.round(v*prog);
  const defs = [
    ["打率", topN(B,"avg"), s=>avg3(s.avg)],
    ["本塁打", topN(B,"hr"), s=>c(s.hr)+"本"],
    ["打点", topN(B,"rbi"), s=>c(s.rbi)+"点"],
    ["盗塁", topN(B,"sb"), s=>c(s.sb)+"個"],
    ["勝利", topN(P.filter(x=>x.role==="SP"),"w"), s=>c(s.w)+"勝"],
    ["防御率", topN(P.filter(x=>x.role==="SP"),"era",true), s=>s.era.toFixed(2)],
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
  const prog = light === "final" ? 1 : seasonProg();
  const c = v => Math.round((v||0)*prog);
  const ipS = v => (Math.round((v||0)*prog*10)/10).toFixed(1);
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
    bRows.push(`<tr>
      <td class="pos">${d.label}</td>
      <td class="nm">${formIcon(p)} ${esc(p.name)}${marks(p)}</td>
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
    pRows.push(`<tr>
      <td class="pos">${d.label}</td>
      <td class="nm">${formIcon(p)} ${esc(p.name)}${marks(p)}</td>
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
function renderRosterLive(){
  const tabs = $("roster-tabs"), body = $("roster-live");
  if(!tabs || !body || !state.seasonStats) return;
  if(state.rosterTab === undefined) state.rosterTab = 0;
  tabs.innerHTML = state.parts.map((t,i)=>
    `<span class="chip ${state.rosterTab===i?"on":""}" onclick="state.rosterTab=${i};renderRosterLive()">${teamEmblem(t,17)} ${esc(t.name)}</span>`
  ).join("");
  const t = state.parts[state.rosterTab] || state.parts[0];
  const m = t.slots.MGR;
  body.innerHTML = (m ? `<div class="rl-mgr">監督　<b>${esc(m.name)}</b>　采配${((m.ovr-85)*0.1>=0?"+":"")}${((m.ovr-85)*0.1).toFixed(1)}／育成${devStars(m)}${t.mgrRest?`　<span class="seal b">休養中</span>`:""}</div>` : "")
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
    const last=t.hist[t.hist.length-1];
    const lx=x(t.hist.length-1), ly=y(last);
    svg += `<circle cx="${lx}" cy="${ly}" r="3.5" fill="${t.color}"/>`;
    const nm = t.name.length>5 ? t.name.slice(0,5) : t.name;
    svg += `<text x="${lx+7}" y="${ly+3.5}" fill="${t.color}" font-size="10.5" font-weight="bold">${esc(nm)} ${last>0?"+":""}${last}</text>`;
  });
  svg += `</svg>`;
  svg += `<div style="margin-top:6px;">` + state.parts.map(t=>`<span class="tag"><span style="color:${t.color}">●</span> ${esc(t.name)}</span>`).join("") + `</div>`;
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
    const humans = state.parts.filter(t=>!t.cpu);
    if(!humans.length){ endEventPhase(); return; }
    state.eventCtx = {type, queue:humans, idx:0, sel:{partner:"", mine:"", theirs:""}};
    renderTradePanel();
    $("event-bg").classList.add("show");
  }else if(type==="mlb"){
    // 最下位チームから順に指名(コストは不要)
    state.eventCtx = {type, queue:standingsSorted().reverse(), idx:0,
      pool:shuffle(MLB_STARS.filter(p=>p.joined===undefined && rankOK(p))).slice(0, state.parts.length+4), star:null};
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
function renderTradePanel(){
  const ctx = state.eventCtx;
  const me = ctx.queue[ctx.idx];
  const others = state.parts.filter(t=>t!==me);
  const partner = state.parts.find(t=>t.name===ctx.sel.partner) || null;
  const myList = tradablePlayers(me);
  const mine = myList.find(x=>x.d.key===ctx.sel.mine) || null;
  let theirList = [];
  if(partner) theirList = tradablePlayers(partner);
  const compat = x => mine && eligibleGrp(x.p, mine.d.grp) && eligibleGrp(mine.p, x.d.grp);
  const theirs = theirList.find(x=>x.d.key===ctx.sel.theirs && compat(x)) || null;
  $("event-panel").innerHTML = `
    <h2><span class="kicker">移籍情報</span>トレードタイム ── 6月末</h2>
    <div class="sub">手順: ①相手チーム → ②放出する自分の選手 → ③欲しい相手の選手 の順にタップ。ポジションが合う選手だけ選べます。1チーム1回まで。</div>
    <div style="margin:12px 0 8px;font-size:17px;font-weight:bold;"><span style="color:${me.color}">●</span> ${esc(me.name)} の交渉</div>
    <div style="margin-bottom:8px;">
      ${others.map(t=>`<span class="chip ${ctx.sel.partner===t.name?"on":""}" onclick="tradeSel('partner','${esc(t.name)}')"><span style="color:${ctx.sel.partner===t.name?"#fff":t.color}">●</span> ${esc(t.name)}</span>`).join("")}
    </div>
    <div class="tr-cols">
      <div class="tr-col">
        <div class="tr-head">放出する選手（${esc(me.name)}）</div>
        ${myList.map(x=>tradeRow(x, mine&&x.d.key===ctx.sel.mine, false, `tradeSel('mine','${x.d.key}')`, me)).join("")}
      </div>
      <div class="tr-col">
        <div class="tr-head">${partner?`獲得したい選手（${esc(partner.name)}）`:"← まず相手チームを選択"}</div>
        ${partner ? (mine
          ? theirList.map(x=>tradeRow(x, theirs&&x.d.key===ctx.sel.theirs, !compat(x), `tradeSel('theirs','${x.d.key}')`, partner)).join("")
          : `<div class="sub" style="padding:10px;">← 先に放出する選手を選んでください</div>`) : ""}
      </div>
    </div>
    ${mine&&theirs ? `
    <div class="tr-summary">
      <span><b>${esc(mine.p.name)}</b>（${rankOf(mine.p.ovr)}・${mine.p.cost}pt）</span>
      <span class="tr-arrow">⇄</span>
      <span><b>${esc(theirs.p.name)}</b>（${rankOf(theirs.p.ovr)}・${theirs.p.cost}pt）</span>
    </div>` : ""}
    <div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn ghost sm" onclick="tradePass()">トレードしない（パス）</button>
      <button class="btn sm" onclick="tradePropose()" ${mine&&theirs?"":"disabled"}>この内容で提案する</button>
    </div>`;
}
function tradeSel(k,v){
  const ctx = state.eventCtx;
  ctx.sel[k]=v;
  if(k==="partner") ctx.sel.theirs="";
  if(k==="mine") ctx.sel.theirs="";
  renderTradePanel();
}
function tradeAdvance(){
  const ctx = state.eventCtx;
  ctx.idx++;
  ctx.sel = {partner:"", mine:"", theirs:""};
  if(ctx.idx >= ctx.queue.length){ endEventPhase(); return; }
  renderTradePanel();
}
function tradePass(){ tradeAdvance(); }
function tradePropose(){
  const ctx = state.eventCtx;
  const me = ctx.queue[ctx.idx];
  const partner = state.parts.find(t=>t.name===ctx.sel.partner);
  const mine = tradablePlayers(me).find(x=>x.d.key===ctx.sel.mine);
  const theirs = tradablePlayers(partner).find(x=>x.d.key===ctx.sel.theirs);
  if(!partner||!mine||!theirs) return;
  let ok;
  if(partner.cpu){
    ok = (mine.p.ovr - theirs.p.ovr) >= -1;
    if(!ok) alert(`${partner.name}は提案を拒否した…（見返りが釣り合いません）`);
  }else{
    ok = confirm(`【${partner.name}さんへの提案】\n${me.name}の ${mine.p.name} ⇄ ${partner.name}の ${theirs.p.name}\n\n${partner.name}さん、このトレードを承諾しますか？`);
    if(!ok) alert("交渉決裂！");
  }
  if(ok){
    me.slots[mine.d.key] = theirs.p;
    partner.slots[theirs.d.key] = mine.p;
    mine.p.traded = true; theirs.p.traded = true;
    statsSwapTeams(mine.p, theirs.p, me, partner);
    const txt = `【トレード成立】${me.name}の${mine.p.name} ⇄ ${partner.name}の${theirs.p.name} 電撃交換！`;
    state.news.unshift({mo:"7月", txt});
    telop(txt);
    tradeAdvance();
  }else{
    renderTradePanel();
  }
}

// ============================================================
// イベント: MLBスター補強
// ============================================================
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
function joinScale(p){ return p.joined!==undefined && p.joined!==false ? 0.45 : 1; }
function totalG(){ return state.pairGames*(state.parts.length-1); }
// 想定勝利数(シーズン成績の事前生成用)。実際のW確定前でも使えるようにチーム力から推定
function projWins(t){
  const G = totalG();
  const others = state.parts.filter(x=>x!==t);
  const diff = (teamAtt(t)+teamDef(t))/2 - others.reduce((s,x)=>s+(teamAtt(x)+teamDef(x))/2,0)/others.length;
  return clamp(Math.round(G*(0.5 + diff*0.012)), Math.round(G*0.25), Math.round(G*0.72));
}
function genBatLine(p, t, bench){
  const G = totalG();
  const vol = (G/143) * (bench?0.4:1) * joinScale(p);
  const avg = clamp(p.avg - 0.012 + gauss()*0.016, 0.210, 0.402);
  const hr = Math.max(0, Math.round(p.hr*vol*(0.82+rnd()*0.35)));
  const rbi = Math.max(hr, Math.round(p.rbi*vol*(0.82+rnd()*0.35)));
  const sb = Math.max(0, Math.round(p.sb*vol*(0.75+rnd()*0.45)));
  // 細かい成績(試合・打席・打数・安打・長打・四死球・三振・出塁率/長打率)
  const g = Math.max(1, Math.round(G * (bench?0.62:0.94) * joinScale(p) * (0.92+rnd()*0.12)));
  const pa = Math.max(hr+1, Math.round(g * (bench?2.6:4.25)));
  const bbRate = clamp(0.055 + (p.ovr-80)*0.0032 + rnd()*0.02, 0.04, 0.155);
  const bb = Math.round(pa * bbRate);
  const hbp = Math.round(pa * 0.006);
  const sf = Math.round(pa * 0.008);
  const ab = Math.max(hr+1, pa - bb - hbp - sf);
  const h = Math.max(hr, Math.round(ab * avg));
  const d3 = Math.round((h-hr) * 0.022 * (1 + (p.sb||0)/60));
  const d2 = Math.round((h-hr-d3) * 0.21);
  const so = Math.round(pa * clamp(0.20 - (p.avg-0.28)*0.35 + rnd()*0.05, 0.07, 0.30));
  const tb = h + d2 + 2*d3 + 3*hr;
  const obp = (h + bb + hbp) / Math.max(1, ab + bb + hbp + sf);
  const slg = tb / Math.max(1, ab);
  return {p, t, kind:"B", bench, avg, hr, rbi, sb, g, pa, ab, h, d2, d3, bb, hbp, so, obp, slg, ops: obp+slg};
}
function pitDetail(s, ip){
  s.ip = Math.round(ip*10)/10;
  s.er = Math.max(0, Math.round(s.era * s.ip / 9));
  s.hAllow = Math.max(0, Math.round(s.ip * clamp(0.98 - (3.6-s.era)*0.06, 0.62, 1.25)));
  s.bb = Math.max(0, Math.round(s.ip * clamp(0.34 - (3.6-s.era)*0.02, 0.14, 0.48)));
  s.whip = (s.hAllow + s.bb) / Math.max(1, s.ip);
  s.k9 = s.so * 9 / Math.max(1, s.ip);
  return s;
}
function genPitLine(p, t, role, wShare){
  const G = totalG();
  const scale = G/143;
  const src = p.twoWay || p;
  if(role==="SP"){
    const era = Math.max(0.85, src.era*(0.9+rnd()*0.45) + 0.25);
    const w = clamp(Math.round(wShare*(0.85+rnd()*0.3)*joinScale(p)), 1, 28);
    const so = Math.round(Math.min(src.so,300)*scale*(0.75+rnd()*0.45)*joinScale(p));
    const g = Math.max(1, Math.round(G*0.185*joinScale(p)*(0.9+rnd()*0.2)));
    const ip = g * (5.4 + rnd()*1.6);
    const l = clamp(Math.round(g*0.34 - w*0.22 + rnd()*2), 0, 22);
    return pitDetail({p, t, kind:"P", role, w, l, era, so, sv:0, hld:0, g, gs:g, cg:Math.round(g*0.06)}, ip);
  }
  if(role==="RP"){
    const era = Math.max(0.85, src.era*(0.9+rnd()*0.5) + 0.3);
    const hld = clamp(Math.round(G*0.28*(0.75+rnd()*0.5)*(ovrFor(p,"RP")/86)*joinScale(p)), 5, 48);
    const w = Math.round((2+rnd()*5)*scale*joinScale(p));
    const so = Math.round(Math.min(src.so,120)*scale*(0.8+rnd()*0.4)*joinScale(p));
    const g = Math.max(1, Math.round(G*0.42*joinScale(p)*(0.85+rnd()*0.3)));
    const ip = g * (0.9 + rnd()*0.35);
    return pitDetail({p, t, kind:"P", role, w, l:clamp(Math.round(rnd()*5),0,9), era, so, sv:Math.round(rnd()*3), hld, g, gs:0, cg:0}, ip);
  }
  const era = Math.max(0.60, src.era*(0.9+rnd()*0.5) + 0.2);
  const sv = clamp(Math.round(projWins(t)*0.58*(0.85+rnd()*0.3)*joinScale(p)), 5, 59);
  const w = Math.round((1+rnd()*4)*scale*joinScale(p));
  const so = Math.round(Math.min(src.so,110)*scale*(0.8+rnd()*0.4)*joinScale(p));
  const g = Math.max(1, Math.round(G*0.4*joinScale(p)*(0.85+rnd()*0.25)));
  const ip = g * (0.95 + rnd()*0.25);
  return pitDetail({p, t, kind:"P", role, w, l:clamp(Math.round(rnd()*5),0,9), era, so, sv, hld:0, g, gs:0, cg:0}, ip);
}
function simulateAllPlayerStats(){
  const stats = [];
  for(const t of state.parts){
    for(const k of [...LINEUP_KEYS, ...BENCH_KEYS]){
      stats.push(genBatLine(t.slots[k], t, BENCH_KEYS.includes(k)));
    }
    const spOvrs = SP_KEYS.map(k=>ovrFor(t.slots[k],"SP"));
    const spSum = spOvrs.reduce((a,b)=>a+b,0);
    const wPool = Math.round(projWins(t)*0.62);
    SP_KEYS.forEach((k,i)=>{ stats.push(genPitLine(t.slots[k], t, "SP", wPool*(spOvrs[i]/spSum))); });
    for(const k of RP_KEYS) stats.push(genPitLine(t.slots[k], t, "RP", 0));
    stats.push(genPitLine(t.slots.CL, t, "CL", 0));
  }
  state.seasonStats = stats;
}
// ロースター変動時のシーズン成績メンテナンス
function statsSwapTeams(pA, pB, tA, tB){
  for(const s of state.seasonStats){
    if(s.p===pA && s.t===tA) s.t = tB;
    else if(s.p===pB && s.t===tB) s.t = tA;
  }
}
function statsReplace(released, star, t, slotGrp){
  state.seasonStats = state.seasonStats.filter(s=>!(s.p===released && s.t===t));
  if(["SP","RP","CL"].includes(slotGrp)) state.seasonStats.push(genPitLine(star, t, slotGrp, projWins(t)*0.2));
  else state.seasonStats.push(genBatLine(star, t, slotGrp==="BN"));
}

function computeTitles(){
  const S = state.seasonStats;
  const B = S.filter(s=>s.kind==="B" && !s.bench);
  const P = S.filter(s=>s.kind==="P");
  const best = (arr, key, asc=false) => arr.slice().sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key])[0];
  const titles = [];
  const push=(tt,s,val)=>{ if(s) titles.push({tt, name:s.p.name, team:s.t, val}); };
  let x;
  x = best(B,"avg");  push("首位打者", x, `打率 ${avg3(x.avg)}`);
  x = best(B,"hr");   push("本塁打王", x, `${x.hr}本塁打`);
  x = best(B,"rbi");  push("打点王", x, `${x.rbi}打点`);
  x = best(B,"sb");   if(x && x.sb>=10) push("盗塁王", x, `${x.sb}盗塁`);
  const SP_ = P.filter(s=>s.role==="SP");
  x = best(SP_,"w");  push("最多勝", x, `${x.w}勝`);
  x = best(SP_,"era",true); push("最優秀防御率", x, `防御率 ${x.era.toFixed(2)}`);
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
function showResult(){
  if(!state.seasonStats) simulateAllPlayerStats();
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
        <span class="tag">合計コスト ${t.spent}pt</span></h3>
      ${mgr?`<div class="rl-mgr light">監督　<b>${esc(mgr.name)}</b>（'${String(mgr.year).slice(2)}）　優勝${mgr.pennants}回・日本一${mgr.japan}回／育成${devStars(mgr)}</div>`:""}
      ${statTables(t, "final")}
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
// 優勝號外演出
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
    m.textContent = "號外";
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
function pitcherForInning(t, inn){
  if(inn <= 5) return {p:t.slots.SP1, key:"SP", label:"先発"};
  if(inn === 6) return {p:t.slots.SP2 || t.slots.SP1, key:"SP", label:"先発"};
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
      const info = pitcherForInning(pitT, inn);
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
const BADGE = {HR:"fx1", K:"fx2", HIT:"fx3", OUT:"fx4", SAFE:"fx5", STEAL:"fx6",
  FINE:"fx7", E:"fx8", CHANCE:"fx9", NICEP:"fx10", NICEB:"fx11", TIE:"fx12"};
const BADGE_DIR = "assets/fx/";
function badgeFor(e){
  if(!e || !e.text) return null;
  const t = e.text;
  if(e.cls === "hr") return "HR";
  if(t.indexOf("併殺") >= 0) return "FINE";
  if(t.indexOf("三振") >= 0) return "K";
  if(t.indexOf("エラー") >= 0) return "E";
  if(t.indexOf("サヨナラ") >= 0) return "NICEB";
  if(t.indexOf("タイムリー") >= 0 || t.indexOf("生還") >= 0) return "NICEB";
  if(t.indexOf("二塁打") >= 0 || t.indexOf("三塁打") >= 0 || t.indexOf("ヒット") >= 0) return "HIT";
  if(e.cls === "run") return "NICEB";
  return null;
}
// 大きな見せ場は画面中央にバッジを出す
function flashBadge(key){
  const id = BADGE[key];
  if(!id) return;
  const el = document.createElement("div");
  el.className = "play-badge";
  el.innerHTML = '<img src="' + BADGE_DIR + id + '.png" alt="" onerror="this.parentNode.remove()">';
  document.body.appendChild(el);
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add("in"); }); });
  setTimeout(function(){ el.classList.remove("in"); setTimeout(function(){ el.remove(); }, 420); }, 1250);
}
function pbpAdd(text, cls){
  const box = $("lv-pbp");
  if(!box) return;
  const d = document.createElement("div");
  d.className = "pb " + (cls || "");
  d.textContent = text;
  box.appendChild(d);
  while(box.children.length > 60) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
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
      pbpAdd(e.text, e.cls);
      renderDiamond(e);
      renderWinBar(e);
      const bk = badgeFor(e);
      if(bk && (e.cls === "hr" || e.cls === "run" || bk === "K" || bk === "DP" || bk === "E")) flashBadge(bk);
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
  const wp = win ? pitcherForInning(win, 1).p : null;
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
function simSeriesGame(A, B){
  const expA = clamp(4.2*(1+0.022*(teamAtt(A)-teamDef(B))), 1.0, 11);
  const expB = clamp(4.2*(1+0.022*(teamAtt(B)-teamDef(A))), 1.0, 11);
  let rA = poisson(expA), rB = poisson(expB);
  if(rA === rB){ if(rnd() < expA/(expA+expB)) rA++; else rB++; } // 延長決着
  return {rA, rB};
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
function lineupOf(t){ return LINEUP_KEYS.map(k=>t.slots[k]).filter(Boolean); }
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
function partyNews(icon, cls, txt){
  state.news.unshift({mo: dateLabel(state.day-1), txt});
  state.partyLog = state.partyLog || [];
  state.partyLog.unshift({d: dateLabel(state.day-1), icon, cls, txt});
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
      partyNews(e.icon || "急", e.cls || "bad", txt);
      // 事件の見出しをそのまま離脱理由にする(例:【直撃】→「直撃」)
      const m = /^【([^】]{1,10})】/.exec(e.text || "");
      const reason = m ? m[1] + "の余波でチームを離れた" : "球界を揺るがす事態でチームを離れた";
      startEmergency(t, x.slotKey, reason);
      renderRosterLive();
      return true;
    }
    default: break;
  }
  partyNews(e.icon || "報", e.cls || "fun", txt);
  if(["formUp","formDown","formUpTeam","formDownTeam","ovrUp","ovrDown"].includes(e.effect)) renderRosterLive();
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
function startEmergency(t, slotKey, reason){
  const d = SLOT_DEFS.find(x=>x.key===slotKey);
  const victim = t.slots[slotKey];
  const wasPlaying = state.playing;
  stopTimer();
  state.resumeAfterEvent = wasPlaying;
  const cands = PLAYERS.filter(p=>!state.taken.has(p.id) && poolOK(p) && p.cat!=="M" && !p.twoWay && eligibleGrp(p, d.grp))
    .sort((a,b)=>b.ovr-a.ovr);
  const watch = t.watch || new Set();
  const list = [...cands.filter(p=>watch.has(p.id)), ...cands.filter(p=>!watch.has(p.id))].slice(0,10);
  partyNews("急","bad",`【緊急事態】${victim.name}（${t.name}・${d.label}）が${reason}！`);
  if(!list.length){ // 代役なし→騒動は沈静化
    state.news.unshift({mo:dateLabel(state.day-1), txt:`${t.name}球団が謝罪会見。${victim.name}は厳重注意で決着した`});
    if(state.resumeAfterEvent){ state.resumeAfterEvent=false; startTimer(); }
    return;
  }
  state.eventCtx = {type:"emergency", t, slotKey, victim, reason, list};
  $("s-play").disabled = true; $("s-skip").disabled = true;
  if(t.cpu){ emergencySign(list[0].id); return; }
  $("event-panel").innerHTML = `
    <h2><span class="kicker">緊急速報</span>${esc(t.name)} ── 緊急補強</h2>
    <div class="sub"><b>${esc(victim.name)}</b>（${d.label}）が${reason}。支配下外から代役を1人選んでください（コスト不要・残り試合に出場）。★は注目リストの選手。</div>
    <div class="mlb-grid" style="margin-top:10px;">
      ${list.map(p=>`
        <div class="mlb-card" onclick="emergencySign('${p.id}')">
          <span class="rank rank-${rankOf(p.ovr)}" style="position:absolute;top:7px;right:8px;">${rankOf(p.ovr)}</span>
          <div class="pc-row">${avatarBox(p,36)}
            <div class="pc-main">
              <div class="nm">${watch.has(p.id)?'<span class="tbadge">★</span>':''}${esc(p.name)}${titleBadge(p)}</div>
              <div class="meta">${roleLabel(p)}・${handMark(p)}${esc(p.team)}・${p.year}年</div>
              <div class="meta">${statShort(p)}</div>
            </div>
          </div>
        </div>`).join("")}
    </div>`;
  $("event-bg").classList.add("show");
}
function emergencySign(pid){
  const ctx = state.eventCtx;
  if(!ctx || ctx.type!=="emergency") return;
  const p = findPlayer(pid);
  const t = ctx.t;
  const d = SLOT_DEFS.find(x=>x.key===ctx.slotKey);
  state.taken.add(p.id);
  state.seasonStats = state.seasonStats.filter(s=>!(s.p===ctx.victim && s.t===t));
  t.slots[ctx.slotKey] = p;
  p.joined = true;
  if(["SP","RP","CL"].includes(d.grp)) state.seasonStats.push(genPitLine(p, t, d.grp, projWins(t)*0.2));
  else state.seasonStats.push(genBatLine(p, t, d.grp==="BN"));
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
const ROULETTE = [
  {id:"training", label:"猛特訓", icon:"練", cls:"good", color:"#2c5c34",
   run(t){ formShift([...lineupOf(t), ...pitchersOf(t)], 1);
     return "【猛特訓】"+t.name+"が地獄の強化合宿を敢行。ナイン全体の動きが見違えた"; }},
  {id:"awake", label:"主力が覚醒", icon:"覚", cls:"good", color:"#2c5c34",
   run(t){ const c=lineupOf(t).filter(p=>p.ovr<97); if(!c.length) return null;
     const p=pick1(c); p.ovr=Math.min(99,p.ovr+4); p.form=2; p.awakened=true;
     return "【覚醒】"+p.name+"（"+t.name+"）が突如、別人のような打球を飛ばし始めた"; }},
  {id:"newpitch", label:"新球種を習得", icon:"球", cls:"good", color:"#2c5c34",
   run(t){ const c=pitchersOf(t).filter(p=>p.ovr<97); if(!c.length) return null;
     const p=pick1(c); p.ovr=Math.min(99,p.ovr+4); p.form=2; p.awakened=true;
     return "【新球種】"+p.name+"（"+t.name+"）が"+pick1(["高速スライダー","ツーシーム","フォーク","カットボール"])+"を習得。打者の的が絞れない"; }},
  {id:"cheer", label:"満員御礼", icon:"満", cls:"good", color:"#2c5c34",
   run(t){ moodSet(t, 1.6, 22, "本拠地の大声援");
     return "【満員御礼】"+t.name+"の本拠地が超満員。地鳴りのような声援がナインを後押しする"; }},
  {id:"scout", label:"補強成功", icon:"補", cls:"good", color:"#9a7714",
   run(t){
     const key = BENCH_KEYS.find(k=>t.slots[k]) || BENCH_KEYS[0];
     const cur = t.slots[key];
     const cands = PLAYERS.filter(p=>!state.taken.has(p.id) && poolOK(p) && p.cat==="B" && !p.twoWay)
       .sort((a,b)=>b.ovr-a.ovr).slice(0,8);
     if(!cands.length || !cur) return null;
     const p = pick1(cands);
     state.taken.add(p.id);
     if(state.seasonStats) state.seasonStats = state.seasonStats.filter(x=>!(x.p===cur && x.t===t));
     t.slots[key] = p; p.joined = true; p.form = 1;
     if(state.seasonStats) state.seasonStats.push(genBatLine(p, t, true));
     return "【緊急補強】"+t.name+"が"+p.name+"の獲得に成功！ "+cur.name+"と入れ替わる"; }},
  {id:"calm", label:"平穏無事", icon:"平", cls:"none", color:"#6e675a",
   run(t){ return "【平穏】"+t.name+"に特筆すべき動きなし。粛々と調整が進む"; }},
  {id:"calm2", label:"報道なし", icon:"静", cls:"none", color:"#6e675a",
   run(t){ return "【静観】"+t.name+"の番記者いわく「今月は書くことがない」。それも悪くない"; }},
  {id:"keiei", label:"親会社が経営不振", icon:"経", cls:"bad", color:"#8c2412",
   run(t){ moodSet(t, -1.6, 26, "親会社の経営不振"); t.budgetFrozen = true;
     return "【経営不振】"+t.name+"の親会社が大幅減益を発表。補強凍結の噂が流れ、ロッカーに不安が広がる"; }},
  {id:"scandal", label:"主力にスキャンダル", icon:"醜", cls:"bad", color:"#8c2412",
   leave:true,
   run(t){ return null; }},
  {id:"injury", label:"主砲が故障", icon:"傷", cls:"bad", color:"#8c2412",
   run(t){ const c=lineupOf(t).sort((a,b)=>b.ovr-a.ovr).slice(0,3); if(!c.length) return null;
     const p=pick1(c); p.ovr=Math.max(60,p.ovr-5); p.form=-2;
     return "【離脱危機】"+p.name+"（"+t.name+"）が"+pick1(["右手薬指を骨折","脇腹を痛め","右膝に違和感を訴え"])+"戦線を離れかける"; }},
  {id:"naifun", label:"チーム内紛", icon:"紛", cls:"bad", color:"#8c2412",
   run(t){ const ps=lineupOf(t); if(ps.length<2) return null;
     const two=shuffle(ps).slice(0,2); moodSet(t,-1.5,20,"チーム内紛");
     return "【内紛】"+two[0].name+"と"+two[1].name+"（"+t.name+"）が衝突。ベンチの空気が凍りついた"; }},
  {id:"slump", label:"謎の大不振", icon:"不", cls:"bad", color:"#8c2412",
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
  const seg = 360 / ROULETTE.length;
  const stops = ROULETTE.map(function(r,i){ return r.color + " " + (i*seg) + "deg " + ((i+1)*seg) + "deg"; }).join(",");
  const labels = ROULETTE.map(function(r,i){
    const a = i*seg + seg/2;
    return '<span class="rl-lb" style="transform:rotate(' + a + 'deg) translateY(var(--rl-r, -84px)) rotate(' + (-a) + 'deg)">' + r.icon + '</span>';
  }).join("");
  const res = ctx.result;
  $("event-panel").innerHTML =
    '<h2><span class="kicker">' + (MONTH_LABEL[ctx.no]||"") + '末</span>球団運営ルーレット ── ' + esc(t.name) + '</h2>' +
    '<div class="sub">今月、あなたの球団に何が起こるか。吉と凶が同じ数だけ入っています。</div>' +
    '<div class="rl-stage">' +
      '<div class="rl-needle"></div>' +
      '<div class="rl-wheel" id="rl-wheel" style="background:conic-gradient(' + stops + ')">' + labels + '</div>' +
    '</div>' +
    '<div class="rl-result ' + (res ? res.cls : "") + '" id="rl-result">' + (res ? ('<span class="rl-ri">' + res.icon + '</span>' + esc(res.label)) : "運命やいかに") + '</div>' +
    '<div class="rl-msg" id="rl-msg">' + (res && res.msg ? esc(res.msg) : "") + '</div>' +
    '<div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;">' +
      (res
        ? '<button class="btn sm" onclick="rouletteNext()">' + (ctx.idx + 1 >= ctx.queue.length ? "試合再開" : "次の球団へ") + '</button>'
        : '<button class="btn" id="rl-btn" onclick="rouletteSpin()">ルーレットを回す</button>') +
    '</div>';
}
function rouletteSpin(){
  const ctx = state.eventCtx;
  if(!ctx || ctx.spinning) return;
  ctx.spinning = true;
  const t = ctx.queue[ctx.idx];
  const i = Math.floor(rnd() * ROULETTE.length);
  const seg = 360 / ROULETTE.length;
  const turns = 5 + Math.floor(rnd()*3);
  const deg = turns*360 + (360 - (i*seg + seg/2));
  const w = $("rl-wheel");
  const b = $("rl-btn");
  if(b) b.disabled = true;
  if(w){
    w.style.transition = "transform 3.4s cubic-bezier(.12,.72,.16,1)";
    w.style.transform = "rotate(" + deg + "deg)";
  }
  seRollStart();
  setTimeout(function(){
    seRollStop();
    const r = ROULETTE[i];
    let msg = null;
    if(r.leave){
      // スキャンダル → 緊急補強へ
      const ds = droppableDefs(t);
      if(ds.length){
        ctx.result = {icon:r.icon, label:r.label, cls:r.cls, msg:"写真週刊誌が主力の私生活を報道。球団は対応に追われる"};
        rouletteRender();
        setTimeout(function(){
          const d = pick1(ds);
          state.eventCtx = null;
          startEmergency(t, d.key, "写真週刊誌のスキャンダル直撃で無期限謹慎");
          // 緊急補強のあと、残りの球団のルーレットへ戻す
          const rest = {type:"roulette", queue:ctx.queue, idx:ctx.idx+1, no:ctx.no, spinning:false, result:null};
          state.rouletteResume = (rest.idx < rest.queue.length) ? rest : null;
        }, 1400);
        return;
      }
      msg = "【小康】"+t.name+"に不穏な噂が流れたが、球団は火消しに成功した";
    }
    if(msg === null) msg = r.run(t);
    if(!msg) msg = "【平穏】"+t.name+"に大きな動きはなかった";
    partyNews(r.icon, r.cls === "none" ? "fun" : r.cls, msg);
    if(r.cls === "good") seWin(); else if(r.cls === "bad") seMiss(); else seTap();
    ctx.result = {icon:r.icon, label:r.label, cls:r.cls, msg:msg};
    ctx.spinning = false;
    renderRosterLive(); renderTeamStrip();
    rouletteRender();
  }, 3500);
}
function rouletteNext(){
  const ctx = state.eventCtx;
  if(!ctx) return;
  ctx.idx++; ctx.result = null; ctx.spinning = false;
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
  if(n >= 0 && n <= 20){
    return '<img class="sp-numimg" src="assets/num/n' + (n+1) + '.png" alt="' + n + '" data-no="' + n + '" onerror="numImgFail(this)">';
  }
  return '<span class="sp-no">' + n + '</span>';
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
    '</div>';
  box.classList.add("in");
  clearTimeout(state.superTimer);
  state.superTimer = setTimeout(function(){ box.classList.remove("in"); }, 1900);
}
