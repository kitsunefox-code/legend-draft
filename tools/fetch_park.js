"use strict";
// ============================================================
// 球場の写真を Wikimedia から拾う。
//   game.js の PARKS を読み、ja記事の代表画像(自由ライセンス)を採る。
//   無ければ Wikidata の P18 と英語版も当たる。
//   assets/park/<id>.jpg に置き、出典を data/park_photo.json に残す。
//   使い方: node tools/fetch_park.js
// ============================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const DIR = path.join(ROOT, "assets", "park");
const OUT = path.join(ROOT, "data", "park_photo.json");
const THUMB = 480;                        // 球場は横長。名鑑の顔より大きく取る
const FREE = /(public domain|pd-|cc0|cc by|cc-by|attribution|copyrighted free use|gfdl)/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 記事名が球場名と違うもの、通称で登録しているものは人手で指定する
const PIN = {
  "楽天モバイル 最強パーク宮城": "楽天モバイルパーク宮城",
  "MAZDA Zoom-Zoomスタジアム広島": "MAZDA Zoom-Zoom スタジアム広島",
  "バンテリンドーム ナゴヤ": "バンテリンドーム ナゴヤ",
  "福岡PayPayドーム": "福岡PayPayドーム",
  "ベルーナドーム": "ベルーナドーム",
  "こまちスタジアム": "秋田県立野球場",
  "ひなたサンマリンスタジアム宮崎": "宮崎県総合運動公園硬式野球場",
  "石川県立野球場": "石川県立野球場",
  "帯広の森野球場": "帯広の森野球場",
  "静岡草薙球場": "静岡県草薙総合運動場硬式野球場",
  "東京スタジアム": "東京スタジアム (野球場)",
  "広島市民球場": "広島市民球場 (初代)",
  "グレート・アメリカン・ボールパーク": "グレート・アメリカン・ボール・パーク",
  "安平ときわ球場": "",                    // 記事が無い。写真は諦める
};

function parks(){
  const s = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
  const a = s.indexOf("const PARKS = [");
  const b = s.indexOf("];", a) + 2;
  const g = {};
  new Function("g", s.slice(a, b).replace("const PARKS", "g.PARKS") + "\nreturn 0;")(g);
  return g.PARKS;
}
async function api(host, params){
  const res = await fetch("https://" + host + "/w/api.php?format=json&formatversion=2&" + params,
    {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
function resolve(q, titles){
  const map = {};
  (q.normalized || []).forEach(x => { map[x.from] = x.to; });
  (q.redirects || []).forEach(x => { map[x.from] = x.to; });
  const byTitle = {};
  (q.pages || []).forEach(p => { byTitle[p.title] = p; });
  const out = {};
  titles.forEach(n => {
    let t = n, hop = 0;
    while(map[t] && hop++ < 4) t = map[t];
    out[n] = byTitle[t] || null;
  });
  return out;
}
async function leadImage(host, titles){
  const j = await api(host, "action=query&prop=pageimages|pageprops|langlinks&lllang=en&lllimit=max" +
    "&piprop=name&pilicense=free&ppprop=wikibase_item&redirects=1&titles=" +
    encodeURIComponent(titles.join("|")));
  const r = resolve(j.query || {}, titles);
  const out = {};
  titles.forEach(n => {
    const p = r[n];
    out[n] = p ? {
      file: p.pageimage || null,
      qid: p.pageprops && p.pageprops.wikibase_item,
      en: p.langlinks && p.langlinks[0] && p.langlinks[0].title,
    } : {};
  });
  return out;
}
async function wdImages(qids){
  const res = await fetch("https://www.wikidata.org/w/api.php?format=json&formatversion=2" +
    "&action=wbgetentities&props=claims&ids=" + encodeURIComponent(qids.join("|")),
    {headers:{"User-Agent": UA}});
  if(!res.ok) return {};
  const j = await res.json();
  const out = {};
  Object.entries(j.entities || {}).forEach(([q, e]) => {
    const c = e.claims && e.claims.P18 && e.claims.P18[0];
    const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
    if(v) out[q] = String(v).replace(/ /g, "_");
  });
  return out;
}
async function fileInfo(files){
  const j = await api("commons.wikimedia.org",
    "action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=" + THUMB +
    "&iiextmetadatafilter=LicenseShortName|Artist&titles=" +
    encodeURIComponent(files.map(f => "File:" + f).join("|")));
  const out = {};
  ((j.query || {}).pages || []).forEach(p => {
    if(!p.imageinfo || !p.imageinfo[0]) return;
    const ii = p.imageinfo[0], e = ii.extmetadata || {};
    const strip = v => String((v && v.value) || "").replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
    out[p.title.replace(/^File:/, "").replace(/ /g, "_")] = {
      url: ii.thumburl || ii.url, page: ii.descriptionurl,
      lic: strip(e.LicenseShortName), author: strip(e.Artist).slice(0, 60),
    };
  });
  return out;
}
async function download(url, dest){
  const res = await fetch(url, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

(async function main(){
  if(!fs.existsSync(DIR)) fs.mkdirSync(DIR, {recursive:true});
  const list = parks();
  const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const todo = list.filter(p => !(p.id in out));
  console.log("球場 " + list.length + " / 未取得 " + todo.length);

  let got = 0, bytes = 0;
  for(let i = 0; i < todo.length; i += 20){
    const batch = todo.slice(i, i + 20);
    const titles = batch.map(p => (PIN[p.name] !== undefined ? PIN[p.name] : p.name)).filter(Boolean);
    if(!titles.length) continue;
    let ja = {};
    try{ ja = await leadImage("ja.wikipedia.org", titles); }catch(e){ await sleep(3000); }
    await sleep(400);

    // ja記事に無ければ Wikidata と英語版
    const need = batch.filter(p => {
      const t = PIN[p.name] !== undefined ? PIN[p.name] : p.name;
      return t && !(ja[t] && ja[t].file);
    });
    let wd = {}, en = {};
    const qids = need.map(p => {
      const t = PIN[p.name] !== undefined ? PIN[p.name] : p.name;
      return ja[t] && ja[t].qid;
    }).filter(Boolean);
    if(qids.length){ try{ wd = await wdImages(qids); }catch(e){} await sleep(400); }
    const enTitles = need.map(p => {
      const t = PIN[p.name] !== undefined ? PIN[p.name] : p.name;
      return ja[t] && ja[t].en;
    }).filter(Boolean);
    if(enTitles.length){ try{ en = await leadImage("en.wikipedia.org", enTitles); }catch(e){} await sleep(400); }

    const wanted = [];
    batch.forEach(p => {
      const t = PIN[p.name] !== undefined ? PIN[p.name] : p.name;
      if(!t){ out[p.id] = null; return; }
      const info = ja[t] || {};
      let f = info.file;
      if(!f && info.qid && wd[info.qid]) f = wd[info.qid];
      if(!f && info.en && en[info.en] && en[info.en].file) f = en[info.en].file;
      if(f) wanted.push({p, file:f});
      else { out[p.id] = null; console.log("  × " + p.name + " (写真なし)"); }
    });

    let meta = {};
    for(let k = 0; k < wanted.length; k += 20){
      try{ meta = Object.assign(meta, await fileInfo(wanted.slice(k, k+20).map(w => w.file))); }
      catch(e){ await sleep(3000); }
      await sleep(400);
    }
    for(const w of wanted){
      const m = meta[w.file] || meta[w.file.replace(/ /g, "_")];
      if(!m || !m.url || !FREE.test(m.lic || "")){ out[w.p.id] = null; console.log("  × " + w.p.name + " (使えるライセンスでない)"); continue; }
      try{
        bytes += await download(m.url, path.join(DIR, w.p.id + ".jpg"));
        out[w.p.id] = {a:m.author, l:m.lic, u:m.page};
        got++;
        console.log("  ○ " + w.p.name.padEnd(24) + m.lic + "  " + m.author.slice(0, 30));
      }catch(e){ out[w.p.id] = null; }
      await sleep(200);
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1), "utf8");
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1), "utf8");
  console.log("\n取れた " + got + "球場 / " + Math.round(bytes/1024) + "KB");
})();
