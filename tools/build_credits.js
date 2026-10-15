"use strict";
// 写真の出典一覧(credits.html)を players.js / data/park_photo.json / mascot-photo.js から生成する。
// CC BY / CC BY-SA の写真は作者と出典ページを明記する義務があるので、名鑑の個別表示に加えて一覧ページでも示す。
//   使い方: node tools/build_credits.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

const ctx = {}; vm.createContext(ctx);
vm.runInContext(read("players.js").replace(/^const /mg, "var "), ctx);
vm.runInContext(read("mascot-photo.js").replace(/^const /mg, "var "), ctx);
const players = [].concat(ctx.DB || [], ctx.MLB_DB || []).filter(p => p.ph !== undefined);
const parks = JSON.parse(read("data/park_photo.json"));
const mascotsRaw = ctx.MASCOT_PHOTO || {};
const mascots = {}; Object.keys(mascotsRaw).forEach(k => { if(mascotsRaw[k] && typeof mascotsRaw[k] === "object") mascots[k] = mascotsRaw[k]; });
let parkNames = {};
try{
  const g = read("game.js");
  const m = g.match(/const PARKS = \[[\s\S]*?\n\];/);
  if(m){ const c2 = {}; vm.createContext(c2); vm.runInContext(m[0].replace("const PARKS", "var PARKS"), c2); (c2.PARKS || []).forEach(pk => { parkNames[pk.id] = pk.name; }); }
}catch(e){}

const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const licUrl = l => {
  const s = String(l || "");
  const m = s.match(/CC (BY(?:-SA)?) (\d\.\d)/i);
  if(m) return "https://creativecommons.org/licenses/" + m[1].toLowerCase() + "/" + m[2] + "/deed.ja";
  if(/CC0/i.test(s)) return "https://creativecommons.org/publicdomain/zero/1.0/deed.ja";
  if(/public domain/i.test(s)) return "https://commons.wikimedia.org/wiki/Commons:Licensing/ja";
  return "";
};
const row = (name, a, l, u) =>
  '<tr><td>' + esc(name) + '</td><td>' + esc(a || "不明") + '</td><td>' + (licUrl(l) ? '<a href="' + licUrl(l) + '" target="_blank" rel="noopener">' + esc(l) + '</a>' : esc(l || "")) + '</td>' +
  '<td>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">出典</a>' : "") + '</td></tr>';

const tally = list => { const t = {}; list.forEach(l => { t[l] = (t[l] || 0) + 1; }); return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const pRows = players.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "ja")).map(p => row(p.name, p.pa, p.pl, p.pu)).join("\n");
const kRows = Object.keys(parks).filter(k => parks[k] && typeof parks[k] === "object").map(k => row(parkNames[k] || k, parks[k].a, parks[k].l, parks[k].u)).join("\n");
const mRows = Object.keys(mascots).map(k => row(k, mascots[k].a, mascots[k].l, mascots[k].u)).join("\n");
const pT = tally(players.map(p => p.pl || "不明")), kT = tally(Object.values(parks).filter(v => v && typeof v === "object").map(v => v.l || "不明")), mT = tally(Object.values(mascots).map(v => v.l || "不明"));
const tallyHtml = t => '<ul class="tally">' + t.map(x => '<li>' + esc(x[0]) + '<b>' + x[1] + '</b></li>').join("") + '</ul>';
const today = new Date().toISOString().slice(0, 10);

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>写真の出典一覧 ─ 球史 レジェンドドラフト</title>
<link rel="stylesheet" href="about.css?v=1">
</head>
<body>
<header class="ab-head"><a href="./" class="ab-back">← ゲームへ戻る</a><h1>写真の出典一覧</h1><p class="ab-lead">ゲーム内の顔写真・球場写真・マスコット写真はすべて <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener">Wikimedia Commons</a> で公開されているものです。作者名とライセンスは各写真の出典ページに従って掲載しています。誤りや取り下げのご希望は <a href="about.html#contact">こちら</a>。生成日 ${today}。</p></header>
<main class="ab-main">
<nav class="ab-toc"><a href="#players">選手 ${players.length}枚</a><a href="#parks">球場 ${Object.keys(parks).length}枚</a><a href="#mascots">マスコット ${Object.keys(mascots).length}枚</a></nav>
<section id="players"><h2>選手の顔写真 <small>${players.length}枚</small></h2>${tallyHtml(pT)}
<div class="tbl"><table><thead><tr><th>選手</th><th>作者</th><th>ライセンス</th><th>出典</th></tr></thead><tbody>
${pRows}
</tbody></table></div></section>
<section id="parks"><h2>球場の写真 <small>${Object.keys(parks).length}枚</small></h2>${tallyHtml(kT)}
<div class="tbl"><table><thead><tr><th>球場</th><th>作者</th><th>ライセンス</th><th>出典</th></tr></thead><tbody>
${kRows}
</tbody></table></div></section>
<section id="mascots"><h2>マスコットの写真 <small>${Object.keys(mascots).length}枚</small></h2>${tallyHtml(mT)}
<div class="tbl"><table><thead><tr><th>マスコット</th><th>作者</th><th>ライセンス</th><th>出典</th></tr></thead><tbody>
${mRows}
</tbody></table></div></section>
<p class="ab-note">CC BY-SA の写真は、同じ条件で再配布できます。パブリックドメイン・CC0 の写真に作者の記載がある場合は、記録として残しているものです。</p>
</main>
<footer class="ab-foot"><a href="about.html">このゲームについて</a> ・ <a href="./">ゲームへ戻る</a></footer>
</body>
</html>
`;
fs.writeFileSync(path.join(root, "credits.html"), html, "utf8");
console.log("credits.html: players", players.length, "parks", Object.keys(parks).length, "mascots", Object.keys(mascots).length);
console.log("player licenses:", pT.map(x => x[0] + "=" + x[1]).join(", "));
