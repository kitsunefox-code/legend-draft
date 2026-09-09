"use strict";
// ============================================================
// マスコットの写真を Wikimedia から拾う。
//   mascots.js の MASCOTS を読み、ja記事 → en記事 の代表画像(自由ライセンス)、
//   それでも無ければ Commons をファイル検索して自由ライセンスの写真を採る。
//   assets/mascot/<id>.jpg に置き、出典を mascot-photo.js(MASCOT_PHOTO) に残す。
//   使い方: node tools/fetch_mascot.js [--only id,id]
// ============================================================
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const DIR = path.join(ROOT, "assets", "mascot");
const OUT = path.join(ROOT, "mascot-photo.js");
const THUMB = 420;
const FREE = /(public domain|pd-|cc0|cc by|cc-by|attribution|copyrighted free use|gfdl)/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function mascots(){
  const s = fs.readFileSync(path.join(ROOT, "mascots.js"), "utf8");
  const g = {};
  new Function("g", s.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  return g.MASCOTS;
}
async function api(host, params){
  const res = await fetch("https://" + host + "/w/api.php?format=json&formatversion=2&" + params, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function leadImage(host, title){
  const j = await api(host, "action=query&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=" + encodeURIComponent(title));
  const p = ((j.query || {}).pages || [])[0];
  return p && !p.missing ? (p.pageimage || null) : null;
}
async function commonsSearch(q){
  const j = await api("commons.wikimedia.org", "action=query&list=search&srnamespace=6&srlimit=12&srsearch=" + encodeURIComponent(q + " filetype:bitmap"));
  return ((j.query || {}).search || []).map(x => x.title.replace(/^File:/, "")).filter(f => /\.(jpe?g|png)$/i.test(f));
}
async function fileInfo(file){
  const j = await api("commons.wikimedia.org", "action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=" + THUMB +
    "&iiextmetadatafilter=LicenseShortName|Artist&titles=" + encodeURIComponent("File:" + file));
  const p = ((j.query || {}).pages || [])[0];
  if(!p || !p.imageinfo || !p.imageinfo[0]) return null;
  const ii = p.imageinfo[0], e = ii.extmetadata || {};
  const strip = v => String((v && v.value) || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
  return {url: ii.thumburl || ii.url, page: ii.descriptionurl, lic: strip(e.LicenseShortName), author: strip(e.Artist).slice(0, 60)};
}
async function download(url, dest){
  const res = await fetch(url, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}
(async function main(){
  if(!fs.existsSync(DIR)) fs.mkdirSync(DIR, {recursive:true});
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only")+1].split(",") : null;
  let prev = {};
  if(fs.existsSync(OUT)){ try{ const g = {}; new Function("g", fs.readFileSync(OUT, "utf8").replace(/^const /gm, "g.") + "\nreturn 0;")(g); prev = g.MASCOT_PHOTO || {}; }catch(e){} }
  const list = mascots().filter(m => only ? only.includes(m.id) : !(m.id in prev));
  let got = 0;
  for(const m of list){
    let file = null, how = "";
    try{ if(m.ja){ file = await leadImage("ja.wikipedia.org", m.ja); how = "ja"; } }catch(e){}
    await sleep(250);
    if(!file && m.en){ try{ file = await leadImage("en.wikipedia.org", m.en); how = "en"; }catch(e){} await sleep(250); }
    let info = null;
    if(file){ try{ info = await fileInfo(file); }catch(e){} await sleep(250); }
    if(!(info && info.url && FREE.test(info.lic || "")) && m.q){
      info = null;
      let files = [];
      try{ files = await commonsSearch(m.q); }catch(e){}
      await sleep(300);
      for(const f of files){
        let fi = null; try{ fi = await fileInfo(f); }catch(e){}
        await sleep(250);
        if(fi && fi.url && FREE.test(fi.lic || "")){ info = fi; file = f; how = "commons"; break; }
      }
    }
    if(!(info && info.url && FREE.test(info.lic || ""))){ prev[m.id] = null; console.log("  × " + m.name + " (写真なし)"); continue; }
    try{
      await download(info.url, path.join(DIR, m.id + ".jpg"));
      prev[m.id] = {a: info.author, l: info.lic, u: info.page, f: file, how};
      got++;
      console.log("  ○ " + m.name.padEnd(18) + " " + how + "  " + info.lic + "  " + info.author);
    }catch(e){ prev[m.id] = null; console.log("  × " + m.name + " (取得失敗 " + e.message + ")"); }
    await sleep(200);
  }
  fs.writeFileSync(OUT, "// tools/fetch_mascot.js が生成。マスコット写真の出典(作者・ライセンス・ページ)\nconst MASCOT_PHOTO = " + JSON.stringify(prev, null, 1) + ";\n", "utf8");
  console.log("取れた " + got + " / 累計 " + Object.values(prev).filter(Boolean).length + " → mascot-photo.js");
})();
