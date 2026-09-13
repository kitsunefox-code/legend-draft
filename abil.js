// パワプロ流の能力評価(2026-09-13 本人要望)。0〜100 を S/A/B/C/D/E/F/G で見せる。
// 数値は名鑑の成績(その年)から機械的に引く。守備系は守備位置と総合値から。
// S 90〜 / A 80〜 / B 70〜 / C 60〜 / D 50〜 / E 40〜 / F 20〜 / G それ未満(パワプロと同じ刻み)
const AB_GRADE = v => v >= 90 ? "S" : v >= 80 ? "A" : v >= 70 ? "B" : v >= 60 ? "C" : v >= 50 ? "D" : v >= 40 ? "E" : v >= 20 ? "F" : "G";
const AB_COLOR = {S:"#c9a000", A:"#e0342c", B:"#f07c1f", C:"#cfae00", D:"#3aa64a", E:"#35a8d8", F:"#2c62d8", G:"#7c7c8a"};
function abHash(p){ let h = 7; const s = String(p.name) + String(p.year); for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function abClamp(v){ return Math.max(1, Math.min(100, Math.round(v))); }
function abilities(p){
  if(!p) return [];
  if(p._ab && p._abOvr === p.ovr) return p._ab;
  const h = abHash(p), j = k => ((h >> (k * 4)) % 13) - 6;   // -6〜+6 の個人差(同じ選手は毎回同じ)
  let out = [];
  if(p.cat === "B"){
    const avg = p.avg || 0, hr = p.hr || 0, sb = p.sb || 0, pos = p.pos || "";
    const q = (p.ovr || 75) - 80;
    const armBase = {捕:76, 遊:76, 三:72, 外:70, 二:62, 一:50}[pos] || 55;
    const fldBase = {捕:76, 遊:80, 二:76, 三:70, 外:66, 一:56}[pos] || 50;
    out = [
      {k:"ミート", s:"ミ", v:abClamp((avg - 0.200) / 0.16 * 100)},
      {k:"パワー", s:"パ", v:abClamp(22 + hr * 1.6 + Math.max(0, (p.rbi || 0) - 80) * 0.1)},
      {k:"走力",   s:"走", v:abClamp(34 + sb * 1.9 + (pos === "捕" ? -6 : 0))},
      {k:"肩力",   s:"肩", v:abClamp(armBase + j(1) + q * 0.2)},
      {k:"守備力", s:"守", v:abClamp(fldBase + j(2) + q * 0.3)},
      {k:"捕球",   s:"捕", v:abClamp(fldBase - 4 + j(3))},
    ];
  }else if(p.cat === "P"){
    const sp = p.role === "SP", w = p.w || 0, l = p.l || 0, so = p.so || 0, era = p.era || 4, sv = p.sv || 0, hld = p.hld || 0;
    // 投球回は名鑑にないので勝ち数・セーブ数から見積もる(先発は1勝あたり約11回)
    const ip = sp ? Math.max(100, w * 11 + l * 6) : Math.max(45, 55 + sv * 0.3 + hld * 0.3);
    const k9 = Math.min(12.5, so / ip * 9);
    const velo = Math.round(137 + Math.max(0, Math.min(21, (k9 - 4) * 2.4)) + j(1) * 0.4);
    out = [
      {k:"球速", s:"球", v:velo, unit:"km/h", g: velo >= 155 ? "S" : velo >= 150 ? "A" : velo >= 146 ? "B" : velo >= 142 ? "C" : velo >= 139 ? "D" : "E"},
      {k:"コントロール", s:"制", v:abClamp(100 - (era - 1.0) * 20 + j(2))},
      {k:"スタミナ", s:"ス", v:abClamp(sp ? ip / 2.3 : 28 + j(3))},
      {k:"変化球", s:"変", v:abClamp(k9 * 7 + 12 + j(4))},
    ];
  }else if(p.cat === "M"){
    const pen = p.pennants || 0, jp = p.japan || 0, wins = p.wins || 0;
    out = [
      {k:"采配", s:"采", v:abClamp(45 + pen * 8 + jp * 4)},
      {k:"実績", s:"実", v:abClamp(20 + wins / 22)},
      {k:"勝負強さ", s:"勝", v:abClamp(40 + jp * 12 + pen * 2)},
    ];
    if(p.danger) out = out.map(x => ({k:x.k, s:x.s, v:abClamp(Math.min(x.v, 18 + (abHash(p) % 8)))}));
  }
  out.forEach(x => { if(!x.g) x.g = AB_GRADE(x.v); });
  p._ab = out; p._abOvr = p.ovr;
  return out;
}
// 札の並び: 大きな等級の字と数値
function abilChips(p){
  const ab = abilities(p);
  if(!ab.length) return "";
  return '<div class="ab-chips">' + ab.map(x =>
    '<span class="ab" style="--c:' + AB_COLOR[x.g] + '"><i>' + x.g + '</i>' + x.k + '<small>' + x.v + (x.unit || "") + '</small></span>').join("") + '</div>';
}
// 一覧の一行ぶん: 「ミA パS 走C 守B」
function abilShort(p){
  const ab = abilities(p);
  if(!ab.length) return "";
  const pick = p.cat === "B" ? [0, 1, 2, 4] : p.cat === "P" ? [0, 1, 2, 3] : [0, 1, 2];
  return '<span class="plr-ab">' + pick.map(i => ab[i]).filter(Boolean).map(x =>
    '<span>' + x.s + '<i style="background:' + AB_COLOR[x.g] + '">' + x.g + '</i>' + (x.unit ? '<small>' + x.v + '</small>' : '') + '</span>').join("") + '</span>';
}
// 並び替えの鍵
const AB_SORT = {meet:["B",0], power:["B",1], run:["B",2], arm:["B",3], field:["B",4], velo:["P",0], ctrl:["P",1], stam:["P",2], brk:["P",3], sai:["M",0], jis:["M",1], sho:["M",2]};
const AB_SORT_LABEL = {ovr:"総合", cost:"コスト", meet:"ミート", power:"パワー", run:"走力", arm:"肩", field:"守備", velo:"球速", ctrl:"制球", stam:"スタミナ", brk:"変化球", sai:"采配", jis:"実績", sho:"勝負強さ", year:"年代", name:"名前"};
function abilVal(p, key){
  const d = AB_SORT[key];
  if(!d) return -1;
  const ab = abilities(p);
  return (p.cat === d[0] && ab[d[1]]) ? ab[d[1]].v : -1;
}
// 同じ札をもう一度押すと昇順・降順が入れ替わる
let poolAsc = false;
function poolSort(key){
  const el = document.getElementById("f-sort");
  const cur = el ? el.value : "ovr";
  if(cur === key) poolAsc = !poolAsc; else poolAsc = false;
  if(el){ if(!Array.from(el.options).some(o => o.value === key)){ const o = document.createElement("option"); o.value = key; o.textContent = AB_SORT_LABEL[key] || key; el.appendChild(o); } el.value = key; }
  if(typeof seTap === "function") seTap();
  if(typeof renderPool === "function") renderPool();
}
// 一覧の上の並び替えの札。いま並んでいる顔ぶれ(監督だけ/投手だけ/野手)に合わせて出す
function poolSortBar(fSlot, list){
  const cur = (document.getElementById("f-sort") || {}).value || "ovr";
  const cats = new Set((list || []).map(p => p.cat));
  const onlyM = cats.size === 1 && cats.has("M"), onlyP = cats.size === 1 && cats.has("P");
  const pit = onlyP || fSlot === "SP" || fSlot === "RP" || fSlot === "CL";
  const keys = (onlyM || fSlot === "MGR") ? ["ovr", "cost", "sai", "jis", "sho"] : pit ? ["ovr", "cost", "velo", "ctrl", "stam", "brk"] : ["ovr", "cost", "meet", "power", "run", "field"];
  return '<div class="pl-sort"><span class="pl-sort-lb">並び</span>' + keys.map(k =>
    '<button type="button" class="pl-sort-b' + (cur === k ? " on" : "") + '" onclick="poolSort(&quot;' + k + '&quot;)">' + AB_SORT_LABEL[k] + (cur === k ? '<i>' + (poolAsc ? "▲" : "▼") + '</i>' : '') + '</button>').join("") + '</div>';
}

// ---- 出来事の文中の選手名を太字に(2026-09-13 本人要望) ----
let _emphRe = null, _emphN = -1;
function emphNames(html){
  if(!html || typeof state === "undefined" || !state.parts) return html;
  const names = [];
  state.parts.forEach(t => { if(t.slots) Object.keys(t.slots).forEach(k => { const p = t.slots[k]; if(p && p.name) names.push(p.name); }); });
  if(!names.length) return html;
  if(_emphN !== names.length || !_emphRe){
    const uniq = Array.from(new Set(names)).sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    _emphRe = new RegExp(uniq.join("|"), "g"); _emphN = names.length;
  }
  // 既にタグの中にある名前は触らない(単純にタグの外だけを置換)
  return html.split(/(<[^>]+>)/).map(seg => seg.charAt(0) === "<" ? seg : seg.replace(_emphRe, m => '<b class="pn">' + m + '</b>')).join("");
}

// ---- ダメ監督(残念助っ人の監督版)。育成は鈍り、開幕はチームの空気が重い ----
(function(){
  if(typeof DANGERS !== "undefined") DANGERS.forEach(p => { if(p.cat === "M"){ p.ovr = 62; if(typeof costOf === "function") p.cost = costOf(p.ovr, "M", false); p.rank = "D"; } });
  if(typeof devMult === "function"){
    const prev = devMult;
    devMult = function(t){ const m = t && t.slots && t.slots.MGR; return (m && m.danger) ? 0.45 : prev(t); };
  }
  if(typeof startSeason === "function"){
    const prev = startSeason;
    startSeason = function(){
      prev.apply(this, arguments);
      try{
        state.parts.forEach(t => { const m = t.slots.MGR; if(m && m.danger){ if(typeof moodSet === "function") moodSet(t, -1.0, 20, "監督への不信"); state.news.unshift({mo:"4月", txt:"【不安】" + t.name + "、" + m.name + "監督の采配に早くも疑問の声"}); } });
      }catch(e){}
    };
  }
})();

// ---- 名前の横の札: MLB選手と残念枠がひと目で分かる(2026-09-13 本人要望) ----
function nameTags(p){
  if(!p) return "";
  return (p.mlb ? '<i class="tg tg-mlb">MLB</i>' : '') + (p.danger ? '<i class="tg tg-dg">' + (p.cat === "M" ? "ダメ" : "残念") + '</i>' : '');
}
function nameHtml(p){ return p ? esc(p.name) + nameTags(p) : ""; }
