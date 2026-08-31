"use strict";
// ============================================================
// MLB選手のキャリアハイを ja.wikipedia の年度別成績から自動で作る。
//   素性(名前・球団・守備)はこちらで与え、数字は表から取る。
//   打ち込みで間違えるより、表から拾ったほうが確かなので。
//   入力: data/mlb_seed.json  [{name, team, cat, pos|role, desc, no, th, bh, titles, tc}]
//   出力: data/seg_mlb8.json
//   使い方: node tools/gen_mlb.js [--only 名前]
// ============================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const SEED = path.join(ROOT, "data", "mlb_seed.json");
const OUT = path.join(ROOT, "data", "seg_mlb8.json");
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

// 年度の行を全部読む。球団の欄は同じ球団が続くとまとめられて消えるので、
// 見出しとの長さの差を見て後ろから突き合わせる
function seasons(html, cols){
  const tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
  for(const tb of tables){
    const rows = tb.match(/<tr[\s\S]*?<\/tr>/g) || [];
    let head = null;
    for(const r of rows){
      const th = r.match(/<th[\s\S]*?<\/th>/g);
      if(th && th.length >= 8){ head = th.map(cell); break; }
    }
    if(!head || head.indexOf("年度") < 0) continue;
    const out = [];
    for(const r of rows){
      const cs = (r.match(/<t[hd][\s\S]*?<\/t[hd]>/g) || []).map(cell);
      if(!cs.length || !/^(19|20)\d\d$/.test(cs[0])) continue;
      const off = head.length - cs.length;
      const rec = {year: Number(cs[0])};
      for(const [key, nm] of Object.entries(cols)){
        const idx = head.indexOf(nm);
        if(idx < 0) continue;
        const n = num(cs[idx - off]);
        if(n !== null) rec[key] = n;
      }
      out.push(rec);
    }
    if(out.length) return out;
  }
  return null;
}
const BAT = {avg:"打率", hr:"本塁打", rbi:"打点", sb:"盗塁", g:"試合", ops:"OPS"};
const PIT = {w:"勝利", l:"敗戦", era:"防御率", so:"奪三振", sv:"セーブ", hld:"ホールド", g:"登板", ip:"投球回"};

async function statsOf(title, isPit){
  const j = await api("action=parse&prop=sections&redirects=1&page=" + encodeURIComponent(title));
  const secs = ((j.parse || {}).sections || []);
  await sleep(350);
  const want = isPit ? /年度別投手成績/ : /年度別打撃成績/;
  const sec = secs.find(s => want.test(s.line));
  if(!sec) return null;
  const j2 = await api("action=parse&prop=text&redirects=1&section=" + sec.index +
    "&page=" + encodeURIComponent(title));
  await sleep(350);
  return seasons(((j2.parse || {}).text) || "", isPit ? PIT : BAT);
}
// いちばん良かった年を選ぶ。打者は長打と打点、投手は役割で見るところを変える
function best(rows, seed){
  if(!rows || !rows.length) return null;
  if(seed.cat === "P"){
    const role = seed.role || "SP";
    if(role === "CL" || role === "RP"){
      const withSv = rows.filter(r => (r.sv || 0) > 0 || (r.hld || 0) > 0);
      const pool = withSv.length ? withSv : rows;
      return pool.slice().sort(function(a, b){
        return ((b.sv || 0) * 2 + (b.hld || 0)) - ((a.sv || 0) * 2 + (a.hld || 0)) ||
               (a.era || 9) - (b.era || 9);
      })[0];
    }
    return rows.slice().sort(function(a, b){
      return (b.w || 0) - (a.w || 0) || (a.era || 9) - (b.era || 9) || (b.so || 0) - (a.so || 0);
    })[0];
  }
  return rows.slice().sort(function(a, b){
    const s = r => (r.hr || 0) * 2.2 + (r.rbi || 0) * 0.35 + (r.avg || 0) * 90 + (r.ops || 0) * 12;
    return s(b) - s(a);
  })[0];
}

(async function main(){
  const seed = JSON.parse(fs.readFileSync(SEED, "utf8")).filter(x => x && x.name);
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only")+1].split(",") : null;
  const list = only ? seed.filter(x => only.includes(x.name)) : seed;

  const out = [];
  const bad = [];
  for(const sd of list){
    // 監督は成績表の形が違うので、与えられた数字をそのまま使う
    if(sd.cat === "M"){ out.push(sd); continue; }
    let rows = null;
    try{ rows = await statsOf(sd.page || sd.name, sd.cat === "P"); }catch(e){}
    const b = best(rows, sd);
    if(!b){ bad.push(sd.name); console.log("  × " + sd.name + " 成績表が読めない"); continue; }
    const rec = {
      name: sd.name, cat: sd.cat, team: sd.team, fr: "MLB", year: b.year,
      desc: sd.desc || "", mlb: true,
    };
    if(sd.cat === "P"){
      rec.role = sd.role || "SP";
      rec.w = b.w || 0; rec.era = b.era != null ? b.era : 4.00;
      rec.so = b.so || 0; rec.sv = b.sv || 0; rec.hld = b.hld || 0;
    }else{
      rec.pos = sd.pos || "外";
      rec.avg = b.avg != null ? b.avg : 0.270;
      rec.hr = b.hr || 0; rec.rbi = b.rbi || 0; rec.sb = b.sb || 0;
    }
    if(sd.th) rec.th = sd.th;
    if(sd.bh) rec.bh = sd.bh;
    if(sd.no !== undefined) rec.no = sd.no;
    if(sd.titles) rec.titles = sd.titles;
    if(sd.tc) rec.tc = true;
    out.push(rec);
    console.log("  ○ " + sd.name.padEnd(24) + b.year + "年  " +
      (sd.cat === "P" ? (rec.w + "勝 防" + rec.era + " " + rec.so + "K" + (rec.sv ? " " + rec.sv + "S" : ""))
                      : (rec.avg + " " + rec.hr + "本 " + rec.rbi + "点")));
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1), "utf8");
  console.log("\n書き出し " + out.length + "件 → data/seg_mlb8.json");
  if(bad.length) console.log("読めなかった: " + bad.join(", "));
})();
