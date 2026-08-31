// data/seg_*.json をマージ・検証して players.js を生成する
// 実行: node tools/merge_db.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

const FR = new Set(["巨人","阪神","中日","ヤクルト","広島","DeNA","ソフトバンク","西武","ロッテ","日本ハム","オリックス","近鉄","楽天","その他"]);
const POS_CHARS = "捕一二三遊外指";
const ROLES = new Set(["SP","RP","CL"]);

const num = (v,d=0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
// 同一人物の表記ゆれ
const ALIAS = {
  "チャーリー・マニエル":"マニエル",
  "タフィ・ローズ":"ローズ(T)", "ロバート・ローズ":"ローズ(R)",
  "ランディ・バース":"バース", "ブーマー・ウェルズ":"ブーマー",
  "篠塚和典":"篠塚利夫", "アレックス・カブレラ":"カブレラ", "ロベルト・ペタジーニ":"ペタジーニ",
  "タイロン・ウッズ":"ウッズ", "トニ・ブランコ":"ブランコ", "アレックス・ラミレス":"ラミレス",
  "デニス・サファテ":"サファテ", "オレステス・デストラーデ":"デストラーデ", "ラルフ・ブライアント":"ブライアント",
};
const normName = s => { const n = String(s).replace(/[\s　]/g,""); return ALIAS[n] || n; };

function cleanPos(pos){
  const s = [...String(pos||"")].filter(c=>POS_CHARS.includes(c));
  return [...new Set(s)].join("");
}

function cleanEntry(raw, isMLB){
  const e = {};
  e.name = String(raw.name||"").trim();
  if(!e.name) return null;
  // 監督
  if(raw.cat === "M"){
    e.cat = "M";
    e.team = String(raw.team||"").trim() || "-";
    e.fr = FR.has(raw.fr) ? raw.fr : "その他";
    e.year = clamp(Math.round(num(raw.year, 1980)), 1936, 2026);
    e.pennants = clamp(Math.round(num(raw.pennants)), 0, 12);
    e.japan = clamp(Math.round(num(raw.japan)), 0, 11);
    e.wins = clamp(Math.round(num(raw.wins)), 0, 1800);
    e.desc = String(raw.desc||"").trim().slice(0, 100);
    if(Number.isFinite(Number(raw.no))) e.no = clamp(Math.round(Number(raw.no)), 0, 199);
    return e;
  }
  // cat判定: 明示 or フィールドから推測
  let cat = raw.cat;
  if(!cat) cat = (raw.role || raw.era !== undefined && raw.w !== undefined && raw.avg === undefined) ? "P" : "B";
  if(raw.avg !== undefined && raw.role === undefined) cat = "B";
  if(raw.role !== undefined) cat = "P";
  e.cat = cat === "P" ? "P" : "B";
  e.team = String(raw.team||"").trim() || "-";
  e.fr = isMLB ? "MLB" : (FR.has(raw.fr) ? raw.fr : "その他");
  e.year = clamp(Math.round(num(raw.year, 2000)), isMLB ? 1900 : 1936, 2026);
  e.desc = String(raw.desc||"").trim().slice(0, 90);
  if(raw.titles !== undefined) e.titles = clamp(Math.round(num(raw.titles)), 0, 45);
  if(raw.tc) e.tc = true;
  if(raw.th==="右"||raw.th==="左") e.th = raw.th;
  if(["右","左","両"].includes(raw.bh)) e.bh = raw.bh;
  if(Number.isFinite(Number(raw.no))) e.no = clamp(Math.round(Number(raw.no)), 0, 199);
  if(e.cat === "B"){
    e.pos = cleanPos(raw.pos) || "外";
    let avg = num(raw.avg);
    if(avg > 1) avg = avg / 1000;           // .335 を 335 と書かれた場合の救済
    e.avg = clamp(avg, 0.180, 0.420);
    e.hr = clamp(Math.round(num(raw.hr)), 0, isMLB?73:60);
    e.rbi = clamp(Math.round(num(raw.rbi)), 0, isMLB?191:165);
    e.sb = clamp(Math.round(num(raw.sb)), 0, 130);
    if(raw.twoWay){
      e.twoWay = { w: clamp(Math.round(num(raw.twoWay.w)),0,30),
                   era: clamp(num(raw.twoWay.era,3), 0.5, 6),
                   so: clamp(Math.round(num(raw.twoWay.so)),0,400) };
    }
  }else{
    e.role = ROLES.has(raw.role) ? raw.role : (num(raw.sv) >= 15 ? "CL" : "SP");
    e.w = clamp(Math.round(num(raw.w)), 0, isMLB?45:42);
    e.era = clamp(num(raw.era, 3.5), 0.10, 9.99);
    e.so = clamp(Math.round(num(raw.so)), 0, isMLB?400:401);
    e.sv = clamp(Math.round(num(raw.sv)), 0, isMLB?62:60);
    e.hld = clamp(Math.round(num(raw.hld)), 0, 55);
  }
  if(isMLB) e.mlb = true;
  return e;
}

function loadSeg(file){
  const p = path.join(dataDir, file);
  if(!fs.existsSync(p)) { console.log("  (missing)", file); return []; }
  try{
    let txt = fs.readFileSync(p, "utf8").replace(/^﻿/, "");
    // コードフェンス等の混入救済
    const m = txt.match(/\[[\s\S]*\]/);
    if(m) txt = m[0];
    const arr = JSON.parse(txt);
    if(!Array.isArray(arr)) throw new Error("not array");
    console.log("  loaded", file, arr.length);
    return arr;
  }catch(err){ console.log("  !! parse error", file, err.message); return []; }
}

// ---- main ----
const NPB_SEGS = ["seg_base.json","seg_middle.json","seg_corner.json","seg_of_classic.json","seg_of_modern.json","seg_sp_classic.json","seg_sp_modern.json","seg_relief.json","seg_mgr.json","seg_prewar.json","seg_60s90s.json","seg_modern2.json","seg_bat3.json","seg_pit3.json","seg_mgr2.json",
  "seg_x_giants.json","seg_x_tigers.json","seg_x_dragons.json","seg_x_swallows.json","seg_x_carp.json","seg_x_baystars.json",
  "seg_x_hawks.json","seg_x_lions.json","seg_x_marines.json","seg_x_fighters.json","seg_x_buffaloes.json","seg_x_kintetsu_eagles.json",
  "seg_mgr3.json","seg_mgr4.json"];
const seen = new Set();
const db = [];
console.log("NPB segments:");
for(const f of NPB_SEGS){
  for(const raw of loadSeg(f)){
    const e = cleanEntry(raw, false);
    if(!e) continue;
    // 監督は選手と同名でも別エントリ(名前空間を分ける)
    const k = (e.cat==="M" ? "M:" : "") + normName(e.name);
    if(seen.has(k)) continue;
    seen.add(k);
    db.push(e);
  }
}
console.log("MLB segments:");
const mlb = [];
const seenM = new Set();
for(const f of ["seg_mlb.json","seg_mlb2.json","seg_mlb3.json","seg_mlb4.json","seg_mlb5.json","seg_mlb6.json","seg_mlb7.json"]){
  for(const raw of loadSeg(f)){
    const e = cleanEntry(raw, true);
    if(!e) continue;
    const k = normName(e.name);
    if(seenM.has(k) || seen.has(k)) continue;
    seenM.add(k);
    mlb.push(e);
  }
}

// タイトル数パッチの適用(titles_*.json: [{name, titles, tc}])
function applyTitles(file, arr){
  const patch = loadSeg(file);
  if(!patch.length) return 0;
  const map = new Map();
  for(const r of patch){
    if(!r || !r.name) continue;
    map.set(normName(r.name), {titles: clamp(Math.round(num(r.titles)),0,45), tc: !!r.tc});
  }
  let hit = 0;
  for(const p of arr){
    if(p.cat === "M") continue;
    const v = map.get(normName(p.name));
    if(v){
      if(p.titles === undefined || v.titles > p.titles) p.titles = v.titles;
      if(v.tc) p.tc = true;
      hit++;
    }
  }
  return hit;
}
console.log("titles patches:");
console.log("  bat:", applyTitles("titles_bat.json", db), "matched");
console.log("  pit:", applyTitles("titles_pit.json", db), "matched");
console.log("  mlb:", applyTitles("titles_mlb.json", mlb), "matched");

// 投打(利き腕)パッチの適用(hands_*.json: [{name, t:"右|左", b:"右|左|両"}])
function applyHands(file, arr){
  const patch = loadSeg(file);
  if(!patch.length) return 0;
  const map = new Map();
  for(const r of patch){ if(r && r.name) map.set(normName(r.name), r); }
  let hit = 0;
  for(const p of arr){
    if(p.cat === "M") continue;
    const v = map.get(normName(p.name));
    if(v){
      if(v.t==="右"||v.t==="左") p.th = v.t;
      if(["右","左","両"].includes(v.b)) p.bh = v.b;
      hit++;
    }
  }
  return hit;
}
console.log("hands patches:");
console.log("  bat:", applyHands("hands_bat.json", db), "matched");
console.log("  pit:", applyHands("hands_pit.json", db), "matched");
console.log("  mlb:", applyHands("hands_mlb.json", mlb), "matched");

// 背番号パッチの適用(numbers_*.json: [{name, no}])
// catsで適用先を限定(同名の選手/監督で番号が違うケースを守る: 王=選手1/監督89 など)
function applyNumbers(file, arr, cats){
  const patch = loadSeg(file);
  if(!patch.length) return 0;
  const map = new Map();
  for(const r of patch){ if(r && r.name && Number.isFinite(Number(r.no))) map.set(normName(r.name), clamp(Math.round(Number(r.no)), 0, 199)); }
  let hit = 0;
  for(const p of arr){
    if(cats && !cats.includes(p.cat)) continue;
    const v = map.get(normName(p.name));
    if(v !== undefined){ p.no = v; hit++; }
  }
  return hit;
}
// 名鑑用のプロフィール(wiki_profile.json: {名前:{y:読み, b:生年, d:没年, f:出身}})
// tools/fetch_wiki.js が ja.wikipedia の冒頭文から拾った事実だけを持つ
function applyProfile(file, arr){
  const p = path.join(dataDir, file);
  if(!fs.existsSync(p)) return 0;
  const patch = JSON.parse(fs.readFileSync(p, "utf8"));
  const map = new Map();
  for(const k of Object.keys(patch)){ if(patch[k]) map.set(normName(k), patch[k]); }
  let hit = 0;
  for(const q of arr){
    const v = map.get(normName(q.name));
    if(!v) continue;
    if(v.y) q.y = v.y;
    if(v.b) q.b = v.b;
    if(v.d) q.d = v.d;
    if(v.f) q.f = v.f;
    hit++;
  }
  return hit;
}
console.log("profile patch:");
console.log("  npb:", applyProfile("wiki_profile.json", db), "matched");
console.log("  mlb:", applyProfile("wiki_profile.json", mlb), "matched");

// 名鑑の顔写真(photo_credit.json: {名前:{i:番号, a:作者, l:ライセンス, u:出典URL}})
// CC BY / BY-SA は作者とライセンスの表示が要るので、必ず一緒に持ち回る
function applyPhoto(file, arr){
  const p = path.join(dataDir, file);
  if(!fs.existsSync(p)) return 0;
  const patch = JSON.parse(fs.readFileSync(p, "utf8"));
  const map = new Map();
  for(const k of Object.keys(patch)){ if(patch[k]) map.set(normName(k), patch[k]); }
  let hit = 0;
  for(const q of arr){
    const v = map.get(normName(q.name));
    if(!v) continue;
    q.ph = v.i; q.pa = v.a || ""; q.pl = v.l || ""; q.pu = v.u || "";
    hit++;
  }
  return hit;
}
console.log("photo patch:");
console.log("  npb:", applyPhoto("photo_credit.json", db), "matched");
console.log("  mlb:", applyPhoto("photo_credit.json", mlb), "matched");

// 国際大会の出場歴(intl.json)。tools/fetch_intl.js が名簿の節から拾う。
// 辞退者・候補は含めない(出場した人にだけリボンを付ける)
let INTL_META = {};
function applyIntl(file, arr){
  const p = path.join(dataDir, file);
  if(!fs.existsSync(p)) return 0;
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  INTL_META = j.meta || {};
  const map = new Map();
  for(const k of Object.keys(j.players || {})) map.set(normName(k), j.players[k]);
  let hit = 0;
  for(const q of arr){
    const v = map.get(normName(q.name));
    if(!v || !v.length) continue;
    q.itl = v.slice();
    hit++;
  }
  return hit;
}
console.log("intl patch:");
console.log("  npb:", applyIntl("intl.json", db), "matched");
console.log("  mlb:", applyIntl("intl.json", mlb), "matched");

// 通算成績(career.json)。tools/fetch_career.js が年度別成績の表から拾う。
// キャリアハイの年だけでは物足りないので、名鑑と選手詳細に並べて出す
function applyCareer(file, arr){
  const p = path.join(dataDir, file);
  if(!fs.existsSync(p)) return 0;
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  let hit = 0;
  for(const q of arr){
    const v = j[q.name + "|" + q.cat];
    if(!v) continue;
    q.car = v; hit++;
  }
  return hit;
}
console.log("career patch:");
console.log("  npb:", applyCareer("career.json", db), "matched");
console.log("  mlb:", applyCareer("career.json", mlb), "matched");

console.log("numbers patches:");
console.log("  bat:", applyNumbers("numbers_bat.json", db, ["B"]), "matched");
console.log("  pit+mgr:", applyNumbers("numbers_pit.json", db, ["P","M"]), "matched");
console.log("  mlb:", applyNumbers("numbers_mlb.json", mlb, null), "matched");

// 集計
const count = (arr, fn) => arr.filter(fn).length;
const posCount = c => count(db, p=>p.cat==="B" && p.pos.includes(c));
console.log("\n=== NPB", db.length, "players ===");
for(const c of POS_CHARS) console.log(" ", c, posCount(c));
console.log("  SP", count(db,p=>p.role==="SP"), " RP", count(db,p=>p.role==="RP"), " CL", count(db,p=>p.role==="CL"), " 監督", count(db,p=>p.cat==="M"));
console.log("=== MLB", mlb.length, "players ===");
console.log("  野手", count(mlb,p=>p.cat==="B"), " SP", count(mlb,p=>p.role==="SP"), " RP/CL", count(mlb,p=>p.role==="RP"||p.role==="CL"));

// ---- パーティーモードの史実パロディ・イベント ----
const PARTY_FILES = ["party_npb_showa.json","party_npb_heisei.json","party_mlb.json","party_misc.json","party_scandal1.json","party_scandal2.json","party_scandal3.json","party_scandal4.json","party_gossip.json","party_damesuke.json"];
const VALID_EFFECT = new Set(["none","moodUp","moodDown","formUp","formDown","formUpTeam","formDownTeam","ovrUp","ovrDown","leave","mgrRest","mgrBack"]);
const VALID_TARGET = new Set(["team","player","pitcher","foreign","manager","twoPlayers","twoTeams"]);
const VALID_CLS = new Set(["good","bad","warn","fun"]);
console.log("party events:");
const LORE_CAT = {
  "party_npb_showa.json":"showa", "party_npb_heisei.json":"hei",
  "party_mlb.json":"mlb", "party_misc.json":"misc",
  "party_scandal1.json":"sc1", "party_scandal2.json":"sc2",
  "party_scandal3.json":"sc3", "party_scandal4.json":"sc4",
  "party_gossip.json":"gos", "party_damesuke.json":"dame",
};
const lore = [], loreSeen = new Set();
for(const f of PARTY_FILES){
  let n = 0;
  for(const raw of loadSeg(f)){
    if(!raw || !raw.text || !raw.id) continue;
    const id = String(raw.id).trim();
    if(loreSeen.has(id)) continue;
    loreSeen.add(id);
    lore.push({
      id,
      icon: (String(raw.icon||"報").trim()[0]) || "報",
      cls: VALID_CLS.has(raw.cls) ? raw.cls : "fun",
      w: clamp(Math.round(num(raw.w, 2)), 1, 5),
      target: VALID_TARGET.has(raw.target) ? raw.target : "team",
      effect: VALID_EFFECT.has(raw.effect) ? raw.effect : "none",
      cat: LORE_CAT[f] || "misc",
      note: String(raw.note || ""),
      text: String(raw.text).trim().slice(0, 140),
    });
    n++;
  }
  if(n) console.log("  ", f, n);
}
const byEffect = {};
for(const e of lore) byEffect[e.effect] = (byEffect[e.effect]||0)+1;
console.log("  total:", lore.length, JSON.stringify(byEffect));
fs.writeFileSync(path.join(root, "party.js"),
  "// 自動生成(tools/merge_db.js)。史実パロディ・イベント定義。\nconst PARTY_LORE = " + JSON.stringify(lore) + ";\n", "utf8");

const header = "// このファイルは tools/merge_db.js が data/*.json から自動生成する。直接編集しないこと。\n";
const body = "const DB = " + JSON.stringify(db) + ";\n\nconst MLB_DB = " + JSON.stringify(mlb) + ";\n" +
  "\n// 国際大会の一覧(リボンの見出しに使う)\nconst INTL = " + JSON.stringify(INTL_META) + ";\n";
fs.writeFileSync(path.join(root, "players.js"), header + body, "utf8");
console.log("\nwrote players.js");
