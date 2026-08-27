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
const NPB_SEGS = ["seg_base.json","seg_middle.json","seg_corner.json","seg_of_classic.json","seg_of_modern.json","seg_sp_classic.json","seg_sp_modern.json","seg_relief.json","seg_mgr.json","seg_prewar.json","seg_60s90s.json","seg_modern2.json"];
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
for(const f of ["seg_mlb.json","seg_mlb2.json"]){
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

const header = "// このファイルは tools/merge_db.js が data/*.json から自動生成する。直接編集しないこと。\n";
const body = "const DB = " + JSON.stringify(db) + ";\n\nconst MLB_DB = " + JSON.stringify(mlb) + ";\n";
fs.writeFileSync(path.join(root, "players.js"), header + body, "utf8");
console.log("\nwrote players.js");
