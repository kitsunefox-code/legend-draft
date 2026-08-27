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
function newTeam(name, fr, cpu, color){
  return {name, fr, cpu, color, slots:{}, spent:0, W:0,L:0,T:0,RS:0,RA:0, hist:[0], watch:new Set()};
}
function startDraft(){
  const rows = [...$("p-list").children];
  if(rows.length<2){ alert("参加者は2人以上必要です"); return; }
  state.parts = rows.map((row,i)=>newTeam(
    row.querySelector("input").value.trim() || `参加者${i+1}`,
    row.querySelector("select").value, false, COLORS[i]));
  state.eras = new Set([...$("era-chips").children].filter(c=>c.classList.contains("on")).map(c=>c.dataset.era));
  state.opts.trade = $("opt-trade").checked;
  state.opts.mlb = $("opt-mlb").checked && MLB_STARS.length > 0;
  state.budget = Number($("opt-budget").value) || 130;

  if($("opt-cpu").checked){
    const cpuNames = ["CPU猛牛","CPU荒鷲","CPU海豚"];
    let k=0;
    while(state.parts.length<4) state.parts.push(newTeam(cpuNames[k++], "", true, COLORS[state.parts.length]));
  }
  // プール枯渇チェック
  const n = state.parts.length;
  const pool = PLAYERS.filter(p=>eraOK(p));
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
  const avail = PLAYERS.filter(p=>!state.taken.has(p.id) && eraOK(p));
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
  let pool = PLAYERS.filter(p=>!state.taken.has(p.id) && eraOK(p) && canTake(t,p));
  let over = false;
  if(!pool.length){ // 資金難で候補ゼロ→特例で予算超過を許可(最安値の選手を拾えるように)
    pool = PLAYERS.filter(p=>!state.taken.has(p.id) && eraOK(p) && canTake(t,p,true));
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
  const t = currentTeam();
  const {lifted, over} = validPool(t);
  const ph = currentPhase();
  const open = openSlots(t).filter(d=>!ph || PHASE_GRPS[ph].includes(d.grp));
  const bidding = state.bid && state.bid.stage === "collect";
  $("d-who").innerHTML = `<span style="color:${t.color}">●</span> ${esc(t.name)} の${bidding?"入札":"指名"}`;
  const openLabels = [...new Set(open.map(d=>d.label))].join("・");
  if(bidding){
    $("d-round").innerHTML = `<b style="color:#e2b13c">【${PART_LABEL[state.bid.part]}ドラフト・第1巡 入札】</b>選択希望選手を1人選ぶ（重複したら抽選）｜<b style="color:#e2b13c">残りコスト ${budgetLeft(t)}pt</b>` +
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
          <div class="meta">${statShort(r.p)}<span style="float:right;font-weight:900;" class="rank-${rankOf(r.p.ovr)}">${rankOf(r.p.ovr)}</span></div>
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
  $("pool-count").textContent = `${list.length}名`;
  $("pool").innerHTML = list.map(p=>`
    <div class="pcard" onclick="openModal('${p.id}')">
      <span class="rank rank-${rankOf(p.ovr)}">${rankOf(p.ovr)}</span>
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
      <h4><span style="color:${t.color}">●</span> ${esc(t.name)} <span class="tag" style="color:var(--gold)">残${budgetLeft(t)}pt</span>${t.fr?` <span class="tag">${t.fr}縛り</span>`:""}</h4>${html}</div>`;
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
  announceLine("入札", `${PART_LABEL[part]}ドラフト第1巡 ―― 各球団、選択希望選手の入札に入ります`);
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
    curtain(`${t.name} の入札`,
      `他の人に画面が見えないように端末を受け取ってください。<br>選択希望選手が重複した場合は<b>抽選</b>になります。`,
      "入札をはじめる", ()=>{ renderDraft(); });
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
function startLottery(g){
  const bid = state.bid;
  const order = shuffle(g.idxs);
  const winner = order[Math.floor(rnd()*order.length)];
  bid.lot = {g, order, winner, flipped:0};
  $("event-panel").innerHTML = `
    <h2><span class="kicker">抽選</span>${esc(g.p.name)} ── 交渉権抽選</h2>
    <div class="sub" style="text-align:center;">${g.idxs.length}球団が競合。封筒をタップしてめくってください。</div>
    <div class="kuji-row">
      ${order.map((idx,i)=>{
        const t = state.parts[idx];
        return `<div class="kuji" id="kuji-${i}" onclick="kujiFlip(${i})">
          <div class="env">
            <div class="slip ${idx===winner?"win":""}">${idx===winner?"当":"外"}</div>
            <div class="env-front">選択希望選手</div>
          </div>
          <div class="t-name"><span style="color:${t.color}">●</span> ${esc(t.name)}</div>
        </div>`;
      }).join("")}
    </div>
    <div class="kuji-result" id="kuji-result"></div>
    <div style="text-align:right;"><button class="btn" id="kuji-next" style="display:none;" onclick="lotteryDone()">交渉権確定</button></div>`;
  $("event-bg").classList.add("show");
  seRollStart();
}
function kujiFlip(i){
  const lot = state.bid.lot;
  const el = $("kuji-"+i);
  if(!el || el.classList.contains("drawn") || el.classList.contains("drawing")) return;
  el.classList.add("drawing"); // 封筒を振る
  lot.flipped++;
  const idx = lot.order[i];
  setTimeout(()=>{
    el.classList.remove("drawing");
    el.classList.add("drawn"); // 紙を引き抜く
    if(idx === lot.winner){
      seRollStop();
      setTimeout(seWin, 380);
      setTimeout(()=>{
        const t = state.parts[idx];
        $("kuji-result").innerHTML = `交渉権獲得 ―― <span style="color:${t.color}">●</span> ${esc(t.name)}！`;
      }, 820);
    }else{
      setTimeout(seMiss, 420);
    }
    if(lot.flipped >= lot.order.length){
      setTimeout(()=>{ const b=$("kuji-next"); if(b) b.style.display = ""; }, 950);
    }
  }, 340);
}
function lotteryDone(){
  seRollStop();
  const bid = state.bid;
  const lot = bid.lot;
  const wt = state.parts[lot.winner];
  assignPick(wt, lot.g.p);
  pickAnnounce(wt, lot.g.p, `第1巡・${lot.g.idxs.length}球団競合の抽選を制し`);
  for(const idx of lot.g.idxs) if(idx !== lot.winner) bid.losers.push(idx);
  bid.qi++;
  nextBidResolution();
}
function finishBidRound(){
  const bid = state.bid;
  $("event-bg").classList.remove("show");
  if(bid.losers.length){
    announceLine("入札", `抽選に外れた${bid.losers.length}球団による再入札を行います`);
    startBidRound(bid.part, bid.losers);
    return;
  }
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
function mgrBonus(t){ const m=t.slots.MGR; return m ? (m.ovr-85)*0.10 : 0; }
function teamAtt(t){
  let s=0;
  for(const k of LINEUP_KEYS) s += t.slots[k].ovr;
  for(const k of BENCH_KEYS) s += t.slots[k].ovr*0.25;
  return s/9.75 + mgrBonus(t);
}
function teamDef(t){
  const sp = SP_KEYS.reduce((s,k)=>s+ovrFor(t.slots[k],"SP"),0)/3;
  const rp = RP_KEYS.reduce((s,k)=>s+ovrFor(t.slots[k],"RP"),0)/2;
  const cl = ovrFor(t.slots.CL,"CL");
  return sp*0.60 + rp*0.25 + cl*0.15 + mgrBonus(t);
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
  state.pairGames = clamp(Math.round(130/(n-1)), 8, 60);
  state.schedule = buildSchedule(n, state.pairGames);
  state.day = 0; state.news = []; state.lastScores = [];
  state.playing = false; state.timer = null; state.finished = false;
  state.monthsCompleted = -1; state.resumeAfterEvent = false;
  state.eventQueue = [];
  if(state.opts.trade) state.eventQueue.push({after:2, type:"trade"});
  if(state.opts.mlb) state.eventQueue.push({after:3, type:"mlb"});
  const wokeCount = rollAwakenings();
  simulateAllPlayerStats();
  show("scr-season");
  renderStandings("standings");
  renderLeaders();
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
  $("s-play").textContent = state.finished ? "結果発表へ" : "再開";
}
function changeSpeed(){ if(state.playing) startTimer(); }
function togglePlay(){
  if(state.finished){ showResult(); return; }
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
      if(ev){ ev.done = true; state.resumeAfterEvent = state.resumeAfterLive; state.resumeAfterLive=false; startEvent(ev.type); return; }
      if(state.day >= state.schedule.length){ finishSeason(); return; }
      if(state.resumeAfterLive){ state.resumeAfterLive=false; startTimer(); }
    });
    return;
  }
  const ev = dueEvent();
  if(ev){ stopTimer(); ev.done = true; state.resumeAfterEvent = true; startEvent(ev.type); return; }
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
    if(ev){ renderLive(); ev.done = true; state.resumeAfterEvent = false; startEvent(ev.type); return; }
  }
  renderLive();
  finishSeason();
}
function finishSeason(){
  state.finished = true;
  stopTimer();
  $("s-play").textContent = "結果発表へ";
  $("s-skip").disabled = true;
  $("s-date").textContent = "シーズン終了";
  $("s-note").textContent = `全${state.pairGames*(state.parts.length-1)}試合を戦い抜きました！`;
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
  if(rA>rB){A.W++;B.L++;} else if(rB>rA){B.W++;A.L++;} else {A.T++;B.T++;}
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
    if(diff>=7 && rnd()<0.3){
      flash = `${win.name}が${Math.max(g.rA,g.rB)}−${Math.min(g.rA,g.rB)}の大勝！ ${lose.name}は打つ手なし`;
    }else if(diff===1 && g.rA+g.rB>0 && rnd()<0.05){
      const hero = LINEUP_KEYS.map(k=>win.slots[k]).sort((x,y)=>y.ovr-x.ovr)[Math.floor(rnd()*3)];
      flash = `${hero.name}（${win.name}）が劇的サヨナラ打！ 球場は大興奮`;
    }else if(diff>0 && (g.rA===0||g.rB===0) && rnd()<0.12){
      const ace = SP_KEYS.map(k=>win.slots[k]).sort((x,y)=>ovrFor(y,"SP")-ovrFor(x,"SP"))[Math.floor(rnd()*2)];
      flash = `${ace.name}（${win.name}）が${lose.name}を完封！`;
    }
    if(flash){ state.news.unshift({mo:dl, txt:flash}); telop(flash); }
  }
  state.parts.forEach(t=>t.hist.push(t.W-t.L));
  state.lastScores = scores;
  state.lastGames = played;
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
  renderStandings("standings");
  renderLeaders();
  renderChart();
  renderNews();
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

// ---- 部門リーダー(順位表下) ----
function renderLeaders(){
  const el = $("leaders");
  if(!el || !state.seasonStats) return;
  const S = state.seasonStats;
  const prog = state.schedule && state.schedule.length ? clamp(state.day/state.schedule.length, 0, 1) : 0;
  const B = S.filter(s=>s.kind==="B" && !s.bench);
  const P = S.filter(s=>s.kind==="P");
  const top = (arr, key, asc=false) => arr.slice().sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key])[0];
  const c = v => Math.round(v*prog); // 消化試合数ぶんに換算
  const defs = [
    ["打率", top(B,"avg"), s=>avg3(s.avg)],
    ["本塁打", top(B,"hr"), s=>c(s.hr)+"本"],
    ["打点", top(B,"rbi"), s=>c(s.rbi)+"点"],
    ["盗塁", top(B,"sb"), s=>c(s.sb)+"個"],
    ["勝利", top(P.filter(x=>x.role==="SP"),"w"), s=>c(s.w)+"勝"],
    ["防御率", top(P.filter(x=>x.role==="SP"),"era",true), s=>s.era.toFixed(2)],
    ["セーブ", top(P.filter(x=>x.role==="CL"),"sv"), s=>c(s.sv)+"S"],
    ["ホールド", top(P.filter(x=>x.role==="RP"),"hld"), s=>c(s.hld)+"H"],
  ];
  el.innerHTML = `<div class="lead-grid">` + defs.map(([label, s, fmt])=>{
    if(!s) return "";
    return `<div class="lead-cell"><div class="lead-k">${label}</div>
      <div class="lead-n"><span style="color:${s.t.color}">●</span> ${esc(s.p.name)}</div>
      <div class="lead-v">${fmt(s)}</div></div>`;
  }).join("") + `</div>`;
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
  $(elId).innerHTML = `<tr><th>順位</th><th>チーム</th><th>試合</th><th>勝</th><th>敗</th><th>分</th><th>勝率</th><th>差</th></tr>` +
    s.map((t,i)=>{
      const pct = t.W+t.L ? (t.W/(t.W+t.L)).toFixed(3).replace(/^0/,"") : "---";
      const gb = i===0 ? "─" : (((top.W-t.W)+(t.L-top.L))/2).toFixed(1);
      return `<tr class="${i===0?"st-first":""}"><td>${i+1}</td>
        <td style="text-align:left;"><span style="color:${t.color}">●</span> ${esc(t.name)}</td>
        <td>${t.W+t.L+t.T}</td><td>${t.W}</td><td>${t.L}</td><td>${t.T}</td><td>${pct}</td><td>${gb}</td></tr>`;
    }).join("");
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
function startEvent(type){
  $("s-play").disabled = true; $("s-skip").disabled = true;
  if(type==="trade"){
    const humans = state.parts.filter(t=>!t.cpu);
    if(!humans.length){ endEventPhase(); return; }
    state.eventCtx = {type, queue:humans, idx:0, sel:{partner:"", mine:"", theirs:""}};
    renderTradePanel();
    $("event-bg").classList.add("show");
  }else if(type==="mlb"){
    // 最下位チームから順に指名(コストは不要)
    state.eventCtx = {type, queue:standingsSorted().reverse(), idx:0,
      pool:shuffle(MLB_STARS.filter(p=>p.joined===undefined)).slice(0, state.parts.length+4), star:null};
    advanceMlb();
  }
}
function endEventPhase(){
  $("event-bg").classList.remove("show");
  state.eventCtx = null;
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

function tradeRow(x, sel, dim, clickJs){
  const p = x.p;
  return `<div class="tr-item ${sel?"sel":""} ${dim?"dim":""}" ${dim?"":`onclick="${clickJs}"`}>
    <span class="tr-pos">${x.d.label}</span>
    <span class="tr-nm">${esc(p.name)}${titleBadge(p)}</span>
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
        ${myList.map(x=>tradeRow(x, mine&&x.d.key===ctx.sel.mine, false, `tradeSel('mine','${x.d.key}')`)).join("")}
      </div>
      <div class="tr-col">
        <div class="tr-head">${partner?`獲得したい選手（${esc(partner.name)}）`:"← まず相手チームを選択"}</div>
        ${partner ? (mine
          ? theirList.map(x=>tradeRow(x, theirs&&x.d.key===ctx.sel.theirs, !compat(x), `tradeSel('theirs','${x.d.key}')`)).join("")
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
      <div style="margin-top:10px;"><b>${esc(star.name)}</b> と入れ替える（自由契約にする）選手を選択：</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        ${slots.map(d=>`<button class="btn ghost sm" onclick="mlbSignClick('${d.key}')">[${d.label}] ${esc(t.slots[d.key].name)} (${rankOf(ovrFor(t.slots[d.key],d.grp))})</button>`).join("")}
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
          <span class="rank rank-${rankOf(p.ovr)}" style="position:absolute;top:7px;right:8px;font-weight:900;">${rankOf(p.ovr)}</span>
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
  const vol = (totalG()/130) * (bench?0.4:1) * joinScale(p);
  const avg = clamp(p.avg - 0.012 + gauss()*0.016, 0.210, 0.402);
  const hr = Math.max(0, Math.round(p.hr*vol*(0.82+rnd()*0.35)));
  const rbi = Math.max(hr, Math.round(p.rbi*vol*(0.82+rnd()*0.35)));
  const sb = Math.max(0, Math.round(p.sb*vol*(0.75+rnd()*0.45)));
  return {p, t, kind:"B", bench, avg, hr, rbi, sb};
}
function genPitLine(p, t, role, wShare){
  const scale = totalG()/130;
  const src = p.twoWay || p;
  if(role==="SP"){
    const era = Math.max(0.85, src.era*(0.9+rnd()*0.45) + 0.25);
    const w = clamp(Math.round(wShare*(0.85+rnd()*0.3)*joinScale(p)), 1, 28);
    const so = Math.round(Math.min(src.so,300)*scale*(0.75+rnd()*0.45)*joinScale(p));
    return {p, t, kind:"P", role, w, era, so, sv:0, hld:0};
  }
  if(role==="RP"){
    const era = Math.max(0.85, src.era*(0.9+rnd()*0.5) + 0.3);
    const hld = clamp(Math.round(totalG()*0.28*(0.75+rnd()*0.5)*(ovrFor(p,"RP")/86)*joinScale(p)), 5, 48);
    const w = Math.round((2+rnd()*5)*scale*joinScale(p));
    const so = Math.round(Math.min(src.so,120)*scale*(0.8+rnd()*0.4)*joinScale(p));
    return {p, t, kind:"P", role, w, era, so, sv:Math.round(rnd()*3), hld};
  }
  const era = Math.max(0.60, src.era*(0.9+rnd()*0.5) + 0.2);
  const sv = clamp(Math.round(projWins(t)*0.58*(0.85+rnd()*0.3)*joinScale(p)), 5, 59);
  const w = Math.round((1+rnd()*4)*scale*joinScale(p));
  const so = Math.round(Math.min(src.so,110)*scale*(0.8+rnd()*0.4)*joinScale(p));
  return {p, t, kind:"P", role, w, era, so, sv, hld:0};
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
  const champ = s[0];
  show("scr-result");
  $("r-champ").textContent = champ.name;
  const pct=(champ.W/(champ.W+champ.L)).toFixed(3).replace(/^0/,"");
  $("r-record").textContent = `${champ.W}勝${champ.L}敗${champ.T?champ.T+"分":""}（勝率${pct}）で優勝！`;
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
    const statOf = p => state.seasonStats.find(x=>x.t===t && x.p===p);
    const rows = [];
    const mgr = t.slots.MGR;
    if(mgr) rows.push(`<tr><td>監督</td><td style="text-align:left;">${esc(mgr.name)} ('${String(mgr.year).slice(2)})</td><td>${rankOf(mgr.ovr)}</td><td>${mgr.cost}pt</td><td style="text-align:left;">優勝${mgr.pennants}回・日本一${mgr.japan}回・育成${devStars(mgr)}</td></tr>`);
    const doneP = new Set();
    for(const d of SLOT_DEFS){
      if(d.key==="MGR") continue;
      const p = t.slots[d.key];
      const isPitchSlot = ["SP","RP","CL"].includes(d.grp);
      const stat = state.seasonStats.find(x=>x.t===t && x.p===p && (isPitchSlot ? x.kind==="P" : x.kind==="B"));
      const dupKey = p.id + (isPitchSlot?"P":"B");
      if(doneP.has(dupKey)) continue;
      doneP.add(dupKey);
      rows.push(`<tr><td>${d.label}</td><td style="text-align:left;">${esc(p.name)}${titleBadge(p)} ('${String(p.year).slice(2)})${p.awakened?" <span class='seal g'>覚</span>":""}${p.traded?" <span class='seal b'>交</span>":""}${p.joined!==undefined?" <span class='seal b'>米</span>":""}</td><td>${rankOf(ovrFor(p,d.grp))}</td><td>${p.cost}pt</td><td style="text-align:left;">${statLineOf(stat)}</td></tr>`);
    }
    return `<div class="team-report">
      <h3>${rank+1}位 <span style="color:${t.color}">●</span> ${esc(t.name)}（${t.W}勝${t.L}敗${t.T?t.T+"分":""}）
        <span class="tag">合計コスト ${t.spent}pt</span></h3>
      <table><tr><th>位置</th><th>選手</th><th>能力</th><th>コスト</th><th>今季成績</th></tr>${rows.join("")}</table>
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
  const B = entries.filter(s=>s.kind==="B" && !s.bench), P = entries.filter(s=>s.kind==="P");
  const topOf = (arr,key,asc=false)=>arr.slice().sort((a,b)=>asc?a[key]-b[key]:b[key]-a[key])[0];
  const c = v=>Math.round(v*prog);
  const defs = [
    ["打率", topOf(B,"avg"), s=>avg3(s.avg)], ["本塁打", topOf(B,"hr"), s=>c(s.hr)+"本"],
    ["打点", topOf(B,"rbi"), s=>c(s.rbi)+"点"], ["盗塁", topOf(B,"sb"), s=>c(s.sb)+"個"],
    ["勝利", topOf(P.filter(x=>x.role==="SP"),"w"), s=>c(s.w)+"勝"],
    ["防御率", topOf(P.filter(x=>x.role==="SP"),"era",true), s=>s.era.toFixed(2)],
    ["セーブ", topOf(P.filter(x=>x.role==="CL"),"sv"), s=>c(s.sv)+"S"],
    ["ホールド", topOf(P.filter(x=>x.role==="RP"),"hld"), s=>c(s.hld)+"H"],
  ];
  $("spec-leaders").innerHTML = `<div class="lead-grid">` + defs.map(([label,s,fmt])=> s?`
    <div class="lead-cell"><div class="lead-k">${label}</div>
    <div class="lead-n"><span style="color:${s.t.color}">●</span> ${esc(s.p.name)}</div>
    <div class="lead-v">${fmt(s)}</div></div>`:"").join("") + `</div>`;
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
  $("gg-sub").textContent = `${champ.W}勝${champ.L}敗${champ.T?champ.T+"分":""}・勝率${pct} ―― 歓喜の胴上げ`;
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
function splitInnings(runs){
  const inn = Array(9).fill(0);
  for(let i=0;i<runs;i++) inn[Math.floor(rnd()*9)]++;
  return inn;
}
function showLiveGame(label, g, done){
  const ia = splitInnings(g.rA), ib = splitInnings(g.rB);
  liveCtx = {g, ia, ib, step:0, done, timer:null};
  $("lv-k").textContent = label;
  $("lv-msg").textContent = "プレイボール ――";
  $("lv-btn").textContent = "スキップ";
  renderLiveBoard();
  $("live-bg").classList.add("show");
  liveCtx.timer = setInterval(liveStep, 620);
}
function renderLiveBoard(){
  const {g, ia, ib, step} = liveCtx;
  const aN = Math.min(9, Math.ceil(step/2)), bN = Math.min(9, Math.floor(step/2));
  const aActive = (step%2===0 && step<18) ? step/2 : -1;
  const bActive = (step%2===1 && step<18) ? (step-1)/2 : -1;
  const row = (name, color, arr, n, active) => `<tr>
    <td class="tn"><span style="color:${color}">●</span> ${esc(name)}</td>
    ${arr.map((v,i)=>`<td class="${active===i?"now":""}">${i<n?v:""}</td>`).join("")}
    <td class="r">${arr.slice(0,n).reduce((s,x)=>s+x,0)}</td></tr>`;
  $("lv-board").innerHTML = `<table>
    <tr><th></th>${Array.from({length:9},(_,i)=>`<th>${i+1}</th>`).join("")}<th>R</th></tr>
    ${row(g.A.name, g.A.color, ia, aN, aActive)}
    ${row(g.B.name, g.B.color, ib, bN, bActive)}
  </table>`;
}
function liveStep(){
  const c = liveCtx; if(!c) return;
  c.step++;
  renderLiveBoard();
  const k = c.step - 1;
  const runs = k%2===0 ? c.ia[k/2] : c.ib[(k-1)/2];
  if(sndOn && runs>0){ const x = ac(); if(x) tone(x.currentTime, 760+runs*70, 0.16, 0.10, "triangle"); }
  const inning = Math.floor(k/2)+1;
  if(c.step < 18) $("lv-msg").textContent = `${inning}回${k%2===0?"表":"裏"} ―― ${runs>0 ? runs+"点が入った！" : "無得点"}`;
  if(c.step >= 18) liveFinish();
}
function liveFinish(){
  const c = liveCtx; if(!c) return;
  if(c.timer){ clearInterval(c.timer); c.timer = null; }
  c.step = 18;
  renderLiveBoard();
  const g = c.g;
  const win = g.rA>g.rB ? g.A : g.rB>g.rA ? g.B : null;
  $("lv-msg").textContent = win
    ? `試合終了 ―― ${win.name}、${Math.max(g.rA,g.rB)}対${Math.min(g.rA,g.rB)}で勝利！`
    : `試合終了 ―― ${g.rA}対${g.rB}の引き分け`;
  $("lv-btn").textContent = "閉じる";
  if(sndOn){ const x = ac(); if(x) noiseBurst(x.currentTime, 1.1, 5000, 0.10); }
}
function liveSkip(){
  const c = liveCtx; if(!c) return;
  if(c.step < 18){ liveFinish(); return; } // 途中スキップはまず結果表示へ
  $("live-bg").classList.remove("show");
  const done = c.done;
  liveCtx = null;
  if(done) done();
}
