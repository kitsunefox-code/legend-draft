"use strict";
// 全選手の「経歴(所属の歩み)」と「タイトル・表彰」を ja.wikipedia から集めて lore.js を作る。
// 長押しの名鑑(球歴・受賞歴)で使う。SS級の ss.js(fetch_ss.js)と同じ読み方で、対象を全員に広げたもの。
//   使い方: node tools/fetch_lore.js [--limit N] [--only 名前,名前] [--redo]
//   途中経過は data/lore.json に溜め、次回は取れていない選手だけ取りに行く
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "lore.js");
const CACHE = path.join(ROOT, "data", "lore.json");
const UA = "LegendDraft/1.0 (party game; contact: konkon0621@gmail.com)";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(params){
  for(let k = 0; k < 4; k++){
    const res = await fetch("https://ja.wikipedia.org/w/api.php?format=json&formatversion=2&maxlag=5&" + params, {headers:{"User-Agent": UA}});
    if(res.status === 429 || res.status === 503){ await sleep(3000 * (k + 1)); continue; }
    if(!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    if(j.error && j.error.code === "maxlag"){ await sleep(3000); continue; }
    return j;
  }
  throw new Error("retry over");
}
async function wikitext(title){
  const j = await api("action=parse&prop=wikitext&redirects=1&page=" + encodeURIComponent(title));
  return j.parse ? {title: j.parse.title, wt: j.parse.wikitext} : null;
}
async function search(q){
  const j = await api("action=query&list=search&srlimit=3&srsearch=" + encodeURIComponent(q));
  return (j.query && j.query.search || []).map(x => x.title);
}
function clean(s){
  return s
    .replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{(?:nowrap|nobr|lang\|[a-z-]+)\|([^{}]*)\}\}/gi, "$1")
    .replace(/\{\{[^{}|]*\|([^{}]*)\}\}/g, (m, a) => a.split("|").pop())
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\]\]\s*\[\[/g, "]]／[[")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
    .replace(/※.*$/, "").replace(/\s*p=\d+/g, "").trim();
}
function bullets(block){
  return String(block || "").split("\n").map(l => l.trim()).filter(l => /^[*#]/.test(l))
    .map(l => clean(l.replace(/^[*#:]+\s*/, ""))).filter(l => l && l.length <= 90);
}
function infoField(wt, names){
  for(const nm of names){
    const re = new RegExp("\\|\\s*" + nm + "\\s*=([\\s\\S]*?)(?=\\n\\s*\\|\\s*[^=\\n]{1,30}=|\\n\\}\\})");
    const m = wt.match(re);
    if(m) return m[1];
  }
  return "";
}
function section(wt, keys){
  const out = [];
  const re = /^(={2,4})\s*(.+?)\s*\1\s*$/gm;
  const heads = [];
  let m;
  while((m = re.exec(wt))) heads.push({i: m.index, end: m.index + m[0].length, t: m[2], lv: m[1].length});
  for(let k = 0; k < heads.length; k++){
    const h = heads[k];
    if(!keys.some(x => h.t.indexOf(x) >= 0)) continue;
    let j = k + 1;
    while(j < heads.length && heads[j].lv > h.lv) j++;
    out.push(...bullets(wt.slice(h.end, j < heads.length ? heads[j].i : undefined)));
  }
  return out;
}
const isBall = wt => /選手名|経歴\s*=|野球選手|プロ野球/.test(wt);

async function main(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const d = {};
  new Function("g", fs.readFileSync(path.join(ROOT, "danger.js"), "utf8").replace(/^const /gm, "g.") + "\nreturn 0;")(d);
  const seen = new Set();
  let players = [].concat(g.DB || [], g.MLB_DB || [], d.DANGER_DB || []).filter(p => { if(seen.has(p.name)) return false; seen.add(p.name); return true; });
  const args = process.argv.slice(2);
  if(args.includes("--only")) players = players.filter(p => args[args.indexOf("--only") + 1].split(",").includes(p.name));
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 0;
  const aliasFile = path.join(ROOT, "data", "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
  const prev = (!args.includes("--redo") && fs.existsSync(CACHE)) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
  let todo = players.filter(p => !(p.name in prev));
  if(limit) todo = todo.slice(0, limit);
  console.log("対象 " + todo.length + "人 (済 " + Object.keys(prev).length + ")");
  let ok = 0, miss = 0;
  const save = () => fs.writeFileSync(CACHE, JSON.stringify(prev), "utf8");
  for(let i = 0; i < todo.length; i++){
    const p = todo[i];
    const base = alias[p.name] || p.name.replace(/\([^)]*\)/g, "").trim();
    const cands = [base, base + " (野球)", base + " (投手)", base + " (内野手)", base + " (外野手)", base + " (捕手)"];
    let got = null;
    try{
      for(const t of cands){
        const r = await wikitext(t);
        if(r && r.wt && isBall(r.wt)){ got = r; break; }
        await sleep(60);
      }
      if(!got){
        for(const t of await search(base + " 野球選手")){
          const r = await wikitext(t);
          if(r && r.wt && isBall(r.wt) && r.title.indexOf(base.slice(0, 2)) >= 0){ got = r; break; }
          await sleep(120);
        }
      }
    }catch(e){ console.log("×", p.name, e.message); await sleep(2000); }
    if(got){
      const chron = bullets(infoField(got.wt, ["経歴"])).slice(0, 10);
      const awards = section(got.wt, ["タイトル", "表彰"]).filter(x => !/^(年度別|通算|背番号|登場曲|関連|出典|脚注)/.test(x)).slice(0, 16);
      prev[p.name] = (chron.length || awards.length) ? {chron, awards, src: "https://ja.wikipedia.org/wiki/" + encodeURIComponent(got.title.replace(/ /g, "_"))} : null;
      if(prev[p.name]) ok++; else miss++;
    }else{ prev[p.name] = null; miss++; }
    if(i % 10 === 9 || i === todo.length - 1){ save(); process.stdout.write((i + 1) + "/" + todo.length + " 取れた" + ok + " 無し" + miss + "\n"); }
    await sleep(90);
  }
  save();
  const out = {};
  for(const k of Object.keys(prev)) if(prev[k]) out[k] = prev[k];
  fs.writeFileSync(OUT, "// このファイルは tools/fetch_lore.js が Wikipedia から自動生成する。直接編集しないこと。\n// 全選手の経歴と受賞歴(長押しの名鑑で使う)。出典は各 src。\nconst LORE = " + JSON.stringify(out) + ";\n");
  console.log("wrote lore.js", Object.keys(out).length, "人");
}
main();
