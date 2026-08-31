"use strict";
// ============================================================
// 名鑑に載せる顔写真を Wikimedia から拾う。
//   pilicense=free で「自由ライセンスの代表画像」だけを対象にし、
//   縮小版をそのまま貰って assets/face/<n>.jpg に置く。
//   出典(作者・ライセンス・ファイルのページ)は data/photo_credit.json に残す。
//   CC BY / BY-SA は表示が要るので、名鑑の各項に作者名を出すこと。
//   使い方: node tools/fetch_photo.js [--limit N]
// ============================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const DATA = path.join(ROOT, "data");
const FACE = path.join(ROOT, "assets", "face");
const OUT = path.join(DATA, "photo_credit.json");
const THUMB = 200;                       // 名鑑に出す幅。これ以上は要らない

// 自由に使えると判断するライセンス。pilicense=free で絞ったうえ、念のため見る
const FREE = /(public domain|pd-|cc0|cc by|cc-by|attribution|copyrighted free use|gfdl)/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadPlayers(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const seen = new Set();
  return [].concat(g.DB || [], g.MLB_DB || []).filter(p => {
    if(seen.has(p.name)) return false;
    seen.add(p.name); return true;
  });
}
async function api(host, params){
  const url = "https://" + host + "/w/api.php?format=json&formatversion=2&" + params;
  const res = await fetch(url, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
// 記事の代表画像(自由ライセンスのみ)を引く
async function leadImages(titles){
  const j = await api("ja.wikipedia.org",
    "action=query&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=" +
    encodeURIComponent(titles.join("|")));
  const q = j.query || {};
  const map = {};
  (q.normalized || []).forEach(x => { map[x.from] = x.to; });
  (q.redirects || []).forEach(x => { map[x.from] = x.to; });
  const byTitle = {};
  (q.pages || []).forEach(p => { byTitle[p.title] = p.pageimage || null; });
  const out = {};
  titles.forEach(n => {
    let t = n, hop = 0;
    while(map[t] && hop++ < 4) t = map[t];
    out[n] = byTitle[t] || null;
  });
  return out;
}
// ファイルの出典と縮小版のURL。題は空白に正規化されて返るので合わせる
async function fileInfo(files){
  const j = await api("commons.wikimedia.org",
    "action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=" + THUMB +
    "&iiextmetadatafilter=LicenseShortName|Artist|LicenseUrl|Credit&titles=" +
    encodeURIComponent(files.map(f => "File:" + f).join("|")));
  const out = {};
  ((j.query || {}).pages || []).forEach(p => {
    if(!p.imageinfo || !p.imageinfo[0]) return;
    const ii = p.imageinfo[0], e = ii.extmetadata || {};
    const strip = v => String((v && v.value) || "").replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
    out[p.title.replace(/^File:/, "").replace(/ /g, "_")] = {
      url: ii.thumburl || ii.url,
      page: ii.descriptionurl,
      lic: strip(e.LicenseShortName),
      author: strip(e.Artist).slice(0, 60),
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

const MORE = process.argv.includes("--more") || process.argv.includes("--deep");
(async function main(){
  if(MORE) return;
  if(!fs.existsSync(FACE)) fs.mkdirSync(FACE, {recursive:true});
  const args = process.argv.slice(2);
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit")+1]) : 0;

  const aliasFile = path.join(DATA, "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

  let players = loadPlayers().filter(p => !(p.name in prev));
  if(limit) players = players.slice(0, limit);
  console.log("対象 " + players.length + "人");

  let next = Math.max(0, ...Object.values(prev).filter(Boolean).map(v => v.i)) + 1;
  let got = 0, none = 0, bytes = 0;

  for(let i = 0; i < players.length; i += 40){
    const batch = players.slice(i, i + 40);
    // 別名が分かっている人はその題で引く
    const titles = batch.map(p => alias[p.name] || p.name.replace(/\([^)]*\)/g, "").trim());
    let lead;
    try{ lead = await leadImages(titles); }
    catch(e){ console.log("  代表画像の取得に失敗 " + e.message); await sleep(4000); continue; }
    await sleep(400);

    const wanted = [];
    batch.forEach((p, k) => {
      const f = lead[titles[k]];
      if(f) wanted.push({p, file:f});
      else { prev[p.name] = null; none++; }
    });
    if(!wanted.length){ process.stdout.write("  " + Math.min(i+40, players.length) + "/" + players.length + "\r"); continue; }

    let info = {};
    for(let k = 0; k < wanted.length; k += 20){
      try{ info = Object.assign(info, await fileInfo(wanted.slice(k, k+20).map(w => w.file))); }
      catch(e){ await sleep(3000); }
      await sleep(400);
    }
    for(const w of wanted){
      const m = info[w.file] || info[w.file.replace(/ /g, "_")];
      if(!m || !m.url || !FREE.test(m.lic || "")){ prev[w.p.name] = null; none++; continue; }
      const id = next++;
      try{
        const n = await download(m.url, path.join(FACE, id + ".jpg"));
        bytes += n;
        prev[w.p.name] = {i:id, a:m.author, l:m.lic, u:m.page};
        got++;
      }catch(e){ prev[w.p.name] = null; none++; next--; }
      await sleep(180);
    }
    fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
    process.stdout.write("  " + Math.min(i+40, players.length) + "/" + players.length +
      "  写真" + got + "件 " + Math.round(bytes/1024) + "KB\r");
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  const have = Object.values(prev).filter(Boolean).length;
  console.log("\n取れた " + got + " / 無し " + none + " / 累計 " + have + "人 " + Math.round(bytes/1024) + "KB");
})();

// ============================================================
// --more : ja記事の代表画像が無い人を、他の口から探す。
//   (1) Wikidata の P18(画像) ── 記事に貼られていなくても登録がある
//   (2) 英語版の代表画像 ── MLBの選手はこちらの方が揃っている
//   (3) Commons の全文検索 ── 名前(和名・英名)で当てる
//   いずれも自由ライセンスのものだけを採り、出典を残す。
// ============================================================
async function jaApi(params){
  const res = await fetch("https://ja.wikipedia.org/w/api.php?format=json&formatversion=2&" + params,
    {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function enApi(params){
  const res = await fetch("https://en.wikipedia.org/w/api.php?format=json&formatversion=2&" + params,
    {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
// ja記事から Wikidata の項目番号と英語版の題を得る
async function idsFor(titles){
  const j = await jaApi("action=query&prop=pageprops|langlinks&lllang=en&lllimit=max&redirects=1&titles=" +
    encodeURIComponent(titles.join("|")));
  const q = j.query || {};
  const map = {};
  (q.normalized || []).forEach(x => { map[x.from] = x.to; });
  (q.redirects || []).forEach(x => { map[x.from] = x.to; });
  const byTitle = {};
  (q.pages || []).forEach(p => {
    byTitle[p.title] = {
      qid: p.pageprops && p.pageprops.wikibase_item,
      en: p.langlinks && p.langlinks[0] && p.langlinks[0].title,
    };
  });
  const out = {};
  titles.forEach(n => {
    let t = n, hop = 0;
    while(map[t] && hop++ < 4) t = map[t];
    out[n] = byTitle[t] || {};
  });
  return out;
}
// Wikidata の P18
async function wdImages(qids){
  const res = await fetch("https://www.wikidata.org/w/api.php?format=json&formatversion=2" +
    "&action=wbgetentities&props=claims&ids=" + encodeURIComponent(qids.join("|")),
    {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  const out = {};
  Object.entries(j.entities || {}).forEach(([q, e]) => {
    const c = e.claims && e.claims.P18 && e.claims.P18[0];
    const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
    if(v) out[q] = String(v).replace(/ /g, "_");
  });
  return out;
}
// 英語版の代表画像(自由ライセンスのみ)
async function enLead(titles){
  const j = await enApi("action=query&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=" +
    encodeURIComponent(titles.join("|")));
  const q = j.query || {};
  const map = {};
  (q.normalized || []).forEach(x => { map[x.from] = x.to; });
  (q.redirects || []).forEach(x => { map[x.from] = x.to; });
  const byTitle = {};
  (q.pages || []).forEach(p => { byTitle[p.title] = p.pageimage || null; });
  const out = {};
  titles.forEach(n => {
    let t = n, hop = 0;
    while(map[t] && hop++ < 4) t = map[t];
    out[n] = byTitle[t] || null;
  });
  return out;
}
// Commons の全文検索。人物の名前で当てて、野球らしいものを選ぶ
async function commonsSearch(name){
  const res = await fetch("https://commons.wikimedia.org/w/api.php?format=json&formatversion=2" +
    "&action=query&list=search&srnamespace=6&srlimit=8&srsearch=" +
    encodeURIComponent('"' + name + '" baseball'),
    {headers:{"User-Agent": UA}});
  if(!res.ok) return [];
  const j = await res.json();
  return ((j.query || {}).search || [])
    .map(x => x.title.replace(/^File:/, "").replace(/ /g, "_"))
    .filter(f => /\.(jpe?g|png)$/i.test(f));
}

async function moreMode(){
  if(!fs.existsSync(FACE)) fs.mkdirSync(FACE, {recursive:true});
  const aliasFile = path.join(DATA, "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

  const players = loadPlayers().filter(p => !prev[p.name]);
  console.log("写真の無い " + players.length + "人を、他の口から探す");

  let next = Math.max(0, ...Object.values(prev).filter(Boolean).map(v => v.i)) + 1;
  let got = 0, bytes = 0;

  for(let i = 0; i < players.length; i += 30){
    const batch = players.slice(i, i + 30);
    const titles = batch.map(p => alias[p.name] || p.name.replace(/\([^)]*\)/g, "").trim());
    let ids = {};
    try{ ids = await idsFor(titles); }catch(e){ await sleep(3000); }
    await sleep(400);

    // (1) Wikidata の P18
    const qids = batch.map((p, k) => ids[titles[k]] && ids[titles[k]].qid).filter(Boolean);
    let wd = {};
    if(qids.length){
      for(let k = 0; k < qids.length; k += 40){
        try{ wd = Object.assign(wd, await wdImages(qids.slice(k, k+40))); }catch(e){ await sleep(3000); }
        await sleep(400);
      }
    }
    // (2) 英語版の代表画像
    const enTitles = batch.map((p, k) => ids[titles[k]] && ids[titles[k]].en).filter(Boolean);
    let en = {};
    if(enTitles.length){
      for(let k = 0; k < enTitles.length; k += 30){
        try{ en = Object.assign(en, await enLead(enTitles.slice(k, k+30))); }catch(e){ await sleep(3000); }
        await sleep(400);
      }
    }

    const wanted = [];
    const stillNone = [];
    batch.forEach((p, k) => {
      const id = ids[titles[k]] || {};
      const f = (id.qid && wd[id.qid]) || (id.en && en[id.en]) || null;
      if(f) wanted.push({p, file:f});
      else stillNone.push({p, en: id.en, title: titles[k]});
    });
    // (3) それでも無ければ Commons を名前で検索する。
    //     写真の少ない監督や古い選手はここで拾えることがある
    for(const s2 of stillNone){
      const q = s2.en || s2.title;
      let hits = [];
      try{ hits = await commonsSearch(q); }catch(e){}
      await sleep(400);
      if(!hits.length && s2.en && s2.title !== s2.en){
        try{ hits = await commonsSearch(s2.title); }catch(e){}
        await sleep(400);
      }
      if(hits.length) wanted.push({p: s2.p, file: hits[0]});
    }

    let info = {};
    for(let k = 0; k < wanted.length; k += 20){
      try{ info = Object.assign(info, await fileInfo(wanted.slice(k, k+20).map(w => w.file))); }
      catch(e){ await sleep(3000); }
      await sleep(400);
    }
    for(const w of wanted){
      const m = info[w.file] || info[w.file.replace(/ /g, "_")];
      if(!m || !m.url || !FREE.test(m.lic || "")) continue;
      const id = next++;
      try{
        bytes += await download(m.url, path.join(FACE, id + ".jpg"));
        prev[w.p.name] = {i:id, a:m.author, l:m.lic, u:m.page};
        got++;
      }catch(e){ next--; }
      await sleep(180);
    }
    fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
    process.stdout.write("  " + Math.min(i+30, players.length) + "/" + players.length +
      "  追加" + got + "件 " + Math.round(bytes/1024) + "KB\r");
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  console.log("\n追加 " + got + "件 / 写真のある人 " +
    Object.values(prev).filter(Boolean).length + "人");
}
if(process.argv.includes("--more")) moreMode();

// ============================================================
// --deep : まだ写真の無い人を、さらに別の口から探す。
//   (4) 他言語版(英・韓・中・西)の代表画像
//   (5) Wikidata の P373(Commonsのカテゴリ)を辿って中の画像
//   いずれも自由ライセンスのものだけ。ここまでやって無ければ、
//   その人の自由に使える写真は存在しないと考えてよい。
// ============================================================
const LANGS = ["en", "ko", "zh", "es"];
async function langTitles(titles){
  const j = await jaApi("action=query&prop=langlinks&lllang=&lllimit=max&redirects=1&titles=" +
    encodeURIComponent(titles.join("|")));
  const q = j.query || {};
  const map = {};
  (q.normalized || []).forEach(x => { map[x.from] = x.to; });
  (q.redirects || []).forEach(x => { map[x.from] = x.to; });
  const byTitle = {};
  (q.pages || []).forEach(p => {
    const o = {};
    (p.langlinks || []).forEach(l => { if(LANGS.includes(l.lang)) o[l.lang] = l.title; });
    byTitle[p.title] = o;
  });
  const out = {};
  titles.forEach(n => {
    let t = n, hop = 0;
    while(map[t] && hop++ < 4) t = map[t];
    out[n] = byTitle[t] || {};
  });
  return out;
}
async function leadOn(lang, titles){
  const res = await fetch("https://" + lang + ".wikipedia.org/w/api.php?format=json&formatversion=2" +
    "&action=query&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=" +
    encodeURIComponent(titles.join("|")), {headers:{"User-Agent": UA}});
  if(!res.ok) return {};
  const j = await res.json();
  const q = j.query || {};
  const map = {};
  (q.normalized || []).forEach(x => { map[x.from] = x.to; });
  (q.redirects || []).forEach(x => { map[x.from] = x.to; });
  const byTitle = {};
  (q.pages || []).forEach(p => { byTitle[p.title] = p.pageimage || null; });
  const out = {};
  titles.forEach(n => {
    let t = n, hop = 0;
    while(map[t] && hop++ < 4) t = map[t];
    out[n] = byTitle[t] || null;
  });
  return out;
}
// Wikidata の P373 から Commons のカテゴリ名を得る
async function commonsCats(qids){
  const res = await fetch("https://www.wikidata.org/w/api.php?format=json&formatversion=2" +
    "&action=wbgetentities&props=claims&ids=" + encodeURIComponent(qids.join("|")),
    {headers:{"User-Agent": UA}});
  if(!res.ok) return {};
  const j = await res.json();
  const out = {};
  Object.entries(j.entities || {}).forEach(([q, e]) => {
    const c = e.claims && e.claims.P373 && e.claims.P373[0];
    const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
    if(v) out[q] = String(v);
  });
  return out;
}
// カテゴリの中の画像。人物のカテゴリなら本人の写真が入っている
async function catFiles(cat){
  const res = await fetch("https://commons.wikimedia.org/w/api.php?format=json&formatversion=2" +
    "&action=query&list=categorymembers&cmtype=file&cmlimit=12&cmtitle=" +
    encodeURIComponent("Category:" + cat), {headers:{"User-Agent": UA}});
  if(!res.ok) return [];
  const j = await res.json();
  return ((j.query || {}).categorymembers || [])
    .map(x => x.title.replace(/^File:/, "").replace(/ /g, "_"))
    .filter(f => /\.(jpe?g|png)$/i.test(f));
}

async function deepMode(){
  if(!fs.existsSync(FACE)) fs.mkdirSync(FACE, {recursive:true});
  const aliasFile = path.join(DATA, "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const players = loadPlayers().filter(p => !prev[p.name]);
  console.log("まだ写真の無い " + players.length + "人を、他言語版とCommonsのカテゴリから探す");

  let next = Math.max(0, ...Object.values(prev).filter(Boolean).map(v => v.i)) + 1;
  let got = 0, bytes = 0;

  for(let i = 0; i < players.length; i += 20){
    const batch = players.slice(i, i + 20);
    const titles = batch.map(p => alias[p.name] || p.name.replace(/\([^)]*\)/g, "").trim());
    let ll = {}, ids = {};
    try{ ll = await langTitles(titles); }catch(e){}
    await sleep(400);
    try{ ids = await idsFor(titles); }catch(e){}
    await sleep(400);

    // (4) 他言語版の代表画像
    const found = {};
    for(const lang of LANGS){
      const want = batch.map((p, k) => ll[titles[k]] && ll[titles[k]][lang]).filter(Boolean);
      if(!want.length) continue;
      let r = {};
      try{ r = await leadOn(lang, want); }catch(e){}
      await sleep(400);
      batch.forEach((p, k) => {
        if(found[p.name]) return;
        const t = ll[titles[k]] && ll[titles[k]][lang];
        if(t && r[t]) found[p.name] = r[t];
      });
    }
    // (5) Commonsのカテゴリ
    const need = batch.filter(p => !found[p.name]);
    const qids = need.map((p, k) => ids[titles[batch.indexOf(p)]] && ids[titles[batch.indexOf(p)]].qid).filter(Boolean);
    let cats = {};
    if(qids.length){ try{ cats = await commonsCats(qids); }catch(e){} await sleep(400); }
    for(const p of need){
      const k = batch.indexOf(p);
      const qid = ids[titles[k]] && ids[titles[k]].qid;
      const cat = qid && cats[qid];
      if(!cat) continue;
      let files = [];
      try{ files = await catFiles(cat); }catch(e){}
      await sleep(400);
      if(files.length) found[p.name] = files[0];
    }

    const wanted = Object.keys(found).map(n => ({p: batch.find(x => x.name === n), file: found[n]}))
      .filter(w => w.p);
    let meta = {};
    for(let k = 0; k < wanted.length; k += 20){
      try{ meta = Object.assign(meta, await fileInfo(wanted.slice(k, k+20).map(w => w.file))); }
      catch(e){ await sleep(3000); }
      await sleep(400);
    }
    for(const w of wanted){
      const m = meta[w.file] || meta[w.file.replace(/ /g, "_")];
      if(!m || !m.url || !FREE.test(m.lic || "")) continue;
      const id = next++;
      try{
        bytes += await download(m.url, path.join(FACE, id + ".jpg"));
        prev[w.p.name] = {i:id, a:m.author, l:m.lic, u:m.page};
        got++;
      }catch(e){ next--; }
      await sleep(180);
    }
    fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
    process.stdout.write("  " + Math.min(i+20, players.length) + "/" + players.length +
      "  追加" + got + "件 " + Math.round(bytes/1024) + "KB\r");
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  console.log("\n追加 " + got + "件 / 写真のある人 " + Object.values(prev).filter(Boolean).length + "人");
}
if(process.argv.includes("--deep")) deepMode();
