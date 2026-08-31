"use strict";
// ============================================================
// 国際大会の出場歴を ja.wikipedia から拾い、data/intl.json に書き出す。
//   記事の全リンクを拾うと、前文で触れられただけの人まで入ってしまう。
//   そこで「選手」「メンバー」等の節だけを開き、その中のリンクだけを採る。
//   使い方: node tools/fetch_intl.js
// ============================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const OUT = path.join(ROOT, "data", "intl.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 大会の一覧。kind はリボンの種類、label は表に出す名前
const EVENTS = [
  // ---- ワールド・ベースボール・クラシック ----
  {id:"wbc2006", kind:"WBC", y:2006, label:"WBC 2006", page:"2006 ワールド・ベースボール・クラシック 日本代表"},
  {id:"wbc2009", kind:"WBC", y:2009, label:"WBC 2009", page:"2009 ワールド・ベースボール・クラシック 日本代表"},
  {id:"wbc2013", kind:"WBC", y:2013, label:"WBC 2013", page:"2013 ワールド・ベースボール・クラシック 日本代表"},
  {id:"wbc2017", kind:"WBC", y:2017, label:"WBC 2017", page:"2017 ワールド・ベースボール・クラシック 日本代表"},
  {id:"wbc2023", kind:"WBC", y:2023, label:"WBC 2023", page:"2023 ワールド・ベースボール・クラシック 日本代表"},
  {id:"wbc2026", kind:"WBC", y:2026, label:"WBC 2026", page:"2026 ワールド・ベースボール・クラシック 日本代表"},
  // ---- オリンピック ----
  {id:"og1984", kind:"五輪", y:1984, label:"ロサンゼルス五輪", page:"1984年ロサンゼルスオリンピックの野球競技"},
  {id:"og1988", kind:"五輪", y:1988, label:"ソウル五輪",       page:"1988年ソウルオリンピックの野球競技"},
  {id:"og1992", kind:"五輪", y:1992, label:"バルセロナ五輪",   page:"1992年バルセロナオリンピックの野球競技・日本代表"},
  {id:"og1996", kind:"五輪", y:1996, label:"アトランタ五輪",   page:"1996年アトランタオリンピックの野球競技・日本代表"},
  {id:"og2000", kind:"五輪", y:2000, label:"シドニー五輪",     page:"2000年シドニーオリンピックの野球競技・日本代表"},
  {id:"og2004", kind:"五輪", y:2004, label:"アテネ五輪",       page:"2004年アテネオリンピックの野球競技・日本代表"},
  {id:"og2008", kind:"五輪", y:2008, label:"北京五輪",         page:"2008年北京オリンピックの野球競技・日本代表"},
  {id:"og2020", kind:"五輪", y:2020, label:"東京五輪",         page:"2020年東京オリンピックの野球競技・日本代表"},
  {id:"og1984b", kind:"五輪", y:1984, label:"ロサンゼルス五輪", page:"1984年ロサンゼルスオリンピックの野球競技・日本代表"},
  {id:"og1988b", kind:"五輪", y:1988, label:"ソウル五輪",       page:"1988年ソウルオリンピックの野球競技・日本代表"},
  // ---- 日米野球(MLB選抜の来日) ----
  {id:"nb2014", kind:"日米", y:2014, label:"日米野球 2014", page:"日米野球2014"},
  // ---- 戦前の日米野球 ----
  // 日本側は1934年の全日本(のちの巨人)。米国側はルース・ゲーリッグらの来日組
  {id:"nb1934jp", kind:"日米", y:1934, label:"日米野球 1934（全日本）",
   page:"1934年の大日本東京野球倶楽部"},
  {id:"nb1934us", kind:"日米", y:1934, label:"日米野球（戦前）",
   page:"日米野球", sec:"昭和（戦前）"},
];
// 名簿の節だけを開く。
// 「辞退選手」「予備登録選手」「候補」の類は出場していないので必ず外すこと
const ROSTER_RE = /^(代表メンバー|代表選手|出場メンバー|出場選手|メンバー|ロースター|日本代表|MLBオールスター|選手)/;
const SKIP_RE = /(辞退|不参加|落ち|予備|候補|サポート|選考|変遷|表明|予選|エキシビション|壮行|連合軍|地区|戦績|結果|試合|概要|沿革|歴史|脚注|出典|関連|外部|参考|放送|記録|規定|賞金|中継|始球式)/;

async function api(params){
  const res = await fetch("https://ja.wikipedia.org/w/api.php?format=json&formatversion=2&" + params,
    {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function sections(page){
  const j = await api("action=parse&prop=sections&redirects=1&page=" + encodeURIComponent(page));
  return ((j.parse || {}).sections || []);
}
// 節のHTMLから、記事へのリンクの題だけを取り出す。
// action=parse&section=N は下位の節も一緒に返す。名簿の節の下に
// 「辞退した選手」がぶら下がっていることが多いので、その見出しで打ち切る
function cutAtDeclined(html){
  const re = /<h([234])[^>]*>([\s\S]*?)<\/h\1>/g;
  let m;
  while((m = re.exec(html))){
    const line = m[2].replace(/<[^>]*>/g, "").replace(/\[.*?\]/g, "").trim();
    if(SKIP_RE.test(line)) return html.slice(0, m.index);
  }
  return html;
}
async function sectionLinks(page, index){
  const j = await api("action=parse&prop=text&redirects=1" +
    (index === null ? "" : "&section=" + index) +
    "&page=" + encodeURIComponent(page));
  let html = ((j.parse || {}).text) || "";
  html = cutAtDeclined(html);
  // 名簿は表で書かれている。表の外(前書きや脚注)のリンクは拾わない
  const tables = html.match(/<table[\s\S]*?<\/table>/g);
  const scope = (tables && tables.length) ? tables.join("") : html;
  const out = new Set();
  const re = /<a href="\/wiki\/([^"#:?]+)"/g;
  let m;
  while((m = re.exec(scope))){
    let t = decodeURIComponent(m[1]).replace(/_/g, " ");
    if(/^(ファイル|Category|カテゴリ|Help|Template|Wikipedia|Special)/.test(t)) continue;
    out.add(t);
  }
  return [...out];
}

(async function main(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const players = [].concat(g.DB || [], g.MLB_DB || []);

  // 記事名から選手を引ける表を作る。別名(曖昧さ回避つきの題)も入れる
  const aliasFile = path.join(ROOT, "data", "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
  const norm = s => String(s || "").replace(/[ 　]/g, "");
  const byTitle = new Map();
  const add = (t, name) => {
    const k = norm(t);
    if(!byTitle.has(k)) byTitle.set(k, new Set());
    byTitle.get(k).add(name);
  };
  players.forEach(p => {
    add(p.name, p.name);
    if(alias[p.name]) add(alias[p.name], p.name);
  });

  const out = {};   // 選手名 → [大会id]
  const meta = {};  // 大会id → {kind, y, label, n}
  for(const ev of EVENTS){
    let targets;
    if(ev.whole){
      targets = [{index:null, line:"(記事まるごと)"}];
    }else{
      let secs;
      try{ secs = await sections(ev.page); }
      catch(e){ console.log("× " + ev.label + " 節が読めない " + e.message); continue; }
      await sleep(500);
      targets = ev.sec
        ? secs.filter(s => s.line === ev.sec)
        : secs.filter(s => ROSTER_RE.test(s.line) && !SKIP_RE.test(s.line));
    }
    if(!targets.length){
      const secs = await sections(ev.page);
      console.log("× " + ev.label + " 名簿の節が見つからない: " +
        secs.map(s => s.line).slice(0, 8).join(" / "));
      continue;
    }
    const hit = new Set();
    for(const s of targets){
      let links;
      try{ links = await sectionLinks(ev.page, s.index); }
      catch(e){ continue; }
      await sleep(500);
      links.forEach(t => {
        const names = byTitle.get(norm(t));
        if(!names) return;
        names.forEach(n => {
          // 記事を丸ごと読むときは、その時代の選手だけに絞る
          if(ev.maxYear){
            const p = players.find(x => x.name === n);
            if(!p || p.year > ev.maxYear) return;
          }
          hit.add(n);
        });
      });
    }
    hit.forEach(n => { (out[n] = out[n] || []).push(ev.id); });
    meta[ev.id] = {kind:ev.kind, y:ev.y, label:ev.label, n:hit.size};
    console.log("○ " + ev.label.padEnd(16) + hit.size + "人  (節: " +
      targets.map(s => s.line).join(" / ") + ")");
  }
  fs.writeFileSync(OUT, JSON.stringify({meta, players:out}, null, 0), "utf8");
  console.log("\n出場歴のある選手 " + Object.keys(out).length + "人 → data/intl.json");
})();
