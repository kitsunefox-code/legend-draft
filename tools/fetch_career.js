"use strict";
// ============================================================
// 通算成績を ja.wikipedia の「年度別成績」の表から拾い、
// data/career.json に書き出す。
//   表の見出し行から列名を読み、名前で対応づける(列の位置は記事ごとに
//   違うので、位置で数えると別の数字を掴む)。
//   拾うのは「通算」で始まる行だけ。
//   使い方: node tools/fetch_career.js [--limit N] [--only 名前]
// ============================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const OUT = path.join(ROOT, "data", "career.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(params){
  const res = await fetch("https://ja.wikipedia.org/w/api.php?format=json&formatversion=2&" + params,
    {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
const cell = h => h.replace(/<[^>]*>/g, "").replace(/&#\d+;/g, "")
  .replace(/&amp;/g, "&").replace(/\[.*?\]/g, "").replace(/\s|　/g, "").trim();
const num = v => {
  const t = String(v).replace(/,/g, "");
  if(!/^-?\.?\d/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// 打者と投手で拾う列。見出しの言葉はゆれるので候補を並べる
const BAT_COLS = {
  g:["試合"], ab:["打数"], h:["安打"], hr:["本塁打"], rbi:["打点"],
  sb:["盗塁"], avg:["打率"], ops:["OPS"], obp:["出塁率"], slg:["長打率"],
};
const PIT_COLS = {
  g:["登板"], w:["勝利"], l:["敗戦"], sv:["セーブ"], hld:["ホールド","ホールドポイント"],
  ip:["投球回"], so:["奪三振"], era:["防御率"], whip:["WHIP"],
};

// 表を読んで合計の行を返す。行の頭は「通算」だけでなく
// 「NPB：9年」「MLB：19年」のこともあるので、いずれも拾って区別しておく
const TOTAL_RE = /^(通算|通　算|NPB|MLB|日本|メジャー)/;
function scanTables(html, cols){
  const found = {};
  const tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
  for(const tb of tables){
    const rows = tb.match(/<tr[\s\S]*?<\/tr>/g) || [];
    if(rows.length < 2) continue;
    let head = null;
    for(const r of rows){
      const th = r.match(/<th[\s\S]*?<\/th>/g);
      if(th && th.length >= 6){ head = th.map(cell); break; }
    }
    if(!head) continue;
    for(const r of rows){
      const cs = (r.match(/<t[hd][\s\S]*?<\/t[hd]>/g) || []).map(cell);
      if(!cs.length || !TOTAL_RE.test(cs[0])) continue;
      // 合計行は「球団」の欄が無いぶん見出しより短い。後ろから突き合わせる
      const off = head.length - cs.length;
      const out = {};
      for(const [key, names] of Object.entries(cols)){
        let idx = -1;
        for(const nm of names){ idx = head.indexOf(nm); if(idx >= 0) break; }
        if(idx < 0) continue;
        const n = num(cs[idx - off]);
        if(n !== null) out[key] = n;
      }
      if(Object.keys(out).length < 3) continue;
      const yr = cs[0].match(/(\d+)年/);
      if(yr) out.yr = Number(yr[1]);
      const tag = /^MLB|^メジャー/.test(cs[0]) ? "mlb" : /^NPB|^日本/.test(cs[0]) ? "npb" : "all";
      if(!found[tag]) found[tag] = out;
    }
  }
  return Object.keys(found).length ? found : null;
}
async function careerOf(title, isPit){
  let secs;
  try{
    const j = await api("action=parse&prop=sections&redirects=1&page=" + encodeURIComponent(title));
    secs = ((j.parse || {}).sections || []);
  }catch(e){ return null; }
  await sleep(350);
  const want = isPit ? /年度別投手成績|投手成績/ : /年度別打撃成績|打撃成績/;
  const sec = secs.find(s => want.test(s.line)) ||
              secs.find(s => /年度別成績|成績$/.test(s.line));
  if(!sec) return null;
  let html;
  try{
    const j = await api("action=parse&prop=text&redirects=1&section=" + sec.index +
      "&page=" + encodeURIComponent(title));
    html = ((j.parse || {}).text) || "";
  }catch(e){ return null; }
  await sleep(350);
  return scanTables(html, isPit ? PIT_COLS : BAT_COLS);
}

(async function main(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const seen = new Set();
  let players = [].concat(g.DB || [], g.MLB_DB || []).filter(p => {
    const k = p.name + "|" + p.cat;
    if(seen.has(k)) return false;
    seen.add(k); return true;
  });
  const args = process.argv.slice(2);
  if(args.includes("--only")){
    const only = args[args.indexOf("--only")+1].split(",");
    players = players.filter(p => only.includes(p.name));
  }
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit")+1]) : 0;

  const aliasFile = path.join(ROOT, "data", "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

  let todo = players.filter(p => !((p.name + "|" + p.cat) in prev));
  if(limit) todo = todo.slice(0, limit);
  console.log("通算成績 対象 " + todo.length + "人");

  let ok = 0, miss = 0;
  for(let i = 0; i < todo.length; i++){
    const p = todo[i];
    const key = p.name + "|" + p.cat;
    const title = alias[p.name] || p.name.replace(/\([^)]*\)/g, "").trim();
    if(p.cat === "M"){ prev[key] = null; continue; }   // 監督の通算は既にDBにある
    const found = await careerOf(title, p.cat === "P");
    // 所属していたリーグの合計を選ぶ。NPBの選手にMLBの数字を入れない
    const r = found
      ? (p.mlb ? (found.mlb || found.all || found.npb) : (found.npb || found.all || found.mlb))
      : null;
    prev[key] = r || null;
    if(r) ok++; else miss++;
    if(i % 20 === 19 || i === todo.length - 1){
      fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
      process.stdout.write("  " + (i+1) + "/" + todo.length + "  取れた" + ok + " 無し" + miss + "\r");
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  console.log("\n取れた " + ok + " / 取れず " + miss +
    " / 累計 " + Object.values(prev).filter(Boolean).length);
})();
