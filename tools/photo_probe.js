"use strict";
// ============================================================
// 候補の名前に、ja.wikipedia の代表画像(自由ライセンス)があるかを調べる。
// 選手を増やすとき「写真がある人を優先」で選ぶための下見。何も書き換えない。
//   入力: JSONの配列 [{name, page?}] か、1行1名のテキスト
//   使い方: node tools/photo_probe.js data/cand.json
// ============================================================
const fs = require("fs");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const FREE = /(public domain|pd-|cc0|cc by|cc-by|attribution|copyrighted free use|gfdl)/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(host, params){
  const res = await fetch("https://" + host + "/w/api.php?format=json&formatversion=2&" + params, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function leadImages(titles){
  const j = await api("ja.wikipedia.org", "action=query&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=" + encodeURIComponent(titles.join("|")));
  const q = j.query || {}; const map = {};
  (q.normalized || []).forEach(x => { map[x.from] = x.to; });
  (q.redirects || []).forEach(x => { map[x.from] = x.to; });
  const byTitle = {}; (q.pages || []).forEach(p => { byTitle[p.title] = p.missing ? "MISSING" : (p.pageimage || null); });
  const out = {};
  titles.forEach(n => { let t = n, hop = 0; while(map[t] && hop++ < 4) t = map[t]; out[n] = byTitle[t] === undefined ? null : byTitle[t]; });
  return out;
}
async function fileLic(files){
  const j = await api("commons.wikimedia.org", "action=query&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=LicenseShortName&titles=" + encodeURIComponent(files.map(f => "File:" + f).join("|")));
  const out = {};
  ((j.query || {}).pages || []).forEach(p => {
    const ii = p.imageinfo && p.imageinfo[0]; const e = ii && ii.extmetadata || {};
    out[p.title.replace(/^File:/, "").replace(/ /g, "_")] = String((e.LicenseShortName || {}).value || "");
  });
  return out;
}
(async function(){
  const src = fs.readFileSync(process.argv[2], "utf8");
  let list;
  try{ list = JSON.parse(src); }catch(e){ list = src.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(name => ({name})); }
  const rows = [];
  for(let i = 0; i < list.length; i += 40){
    const batch = list.slice(i, i + 40);
    const titles = batch.map(x => (x.page || x.name).replace(/\(MLB\)$/, ""));
    let lead = {};
    try{ lead = await leadImages(titles); }catch(e){ console.error("lead fail", e.message); await sleep(3000); i -= 40; continue; }
    await sleep(400);
    const files = batch.map((x, k) => lead[titles[k]]).filter(f => f && f !== "MISSING");
    let lic = {};
    for(let k = 0; k < files.length; k += 20){
      try{ lic = Object.assign(lic, await fileLic(files.slice(k, k + 20))); }catch(e){ await sleep(2000); }
      await sleep(300);
    }
    batch.forEach((x, k) => {
      const f = lead[titles[k]];
      const l = f && f !== "MISSING" ? (lic[f.replace(/ /g, "_")] || "") : "";
      rows.push({name:x.name, page:x.page || "", status: f === "MISSING" ? "no-article" : !f ? "no-photo" : FREE.test(l) ? "photo" : "unfree", lic:l});
    });
    process.stdout.write("  " + Math.min(i + 40, list.length) + "/" + list.length + "\r");
  }
  const ok = rows.filter(r => r.status === "photo");
  console.log("\n写真あり " + ok.length + " / 記事なし " + rows.filter(r => r.status === "no-article").length + " / 写真なし " + rows.filter(r => r.status === "no-photo").length + " / 不自由 " + rows.filter(r => r.status === "unfree").length);
  console.log("PHOTO: " + ok.map(r => r.name).join(" / "));
  console.log("NO-ARTICLE: " + rows.filter(r => r.status === "no-article").map(r => r.name).join(" / "));
  console.log("NO-PHOTO: " + rows.filter(r => r.status !== "photo" && r.status !== "no-article").map(r => r.name).join(" / "));
  const out = process.argv[3]; if(out) fs.writeFileSync(out, JSON.stringify(rows, null, 1), "utf8");
})();
