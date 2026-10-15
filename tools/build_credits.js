"use strict";
// 写真の出典一覧(credits.html)を players.js / data/park_photo.json から生成する。
// CC BY / CC BY-SA の写真は作者・ライセンス・出典・改変の有無を示す義務があるので、名鑑の個別表示に加えて一覧ページでも示す。
// マスコットは 2026-10-15 にゲームオリジナルの架空キャラへ差し替え、写真は使っていない。
//   使い方: node tools/build_credits.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

const ctx = {}; vm.createContext(ctx);
vm.runInContext(read("players.js").replace(/^const /mg, "var "), ctx);
const players = [].concat(ctx.DB || [], ctx.MLB_DB || []).filter(p => p.ph !== undefined);
const parksRaw = JSON.parse(read("data/park_photo.json"));
const parks = {}; Object.keys(parksRaw).forEach(k => { if(parksRaw[k] && typeof parksRaw[k] === "object") parks[k] = parksRaw[k]; });
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
  if(/CC BY 2\.1 jp/i.test(s)) return "https://creativecommons.org/licenses/by/2.1/jp/deed.ja";
  if(/CC0/i.test(s)) return "https://creativecommons.org/publicdomain/zero/1.0/deed.ja";
  if(/public domain/i.test(s)) return "https://commons.wikimedia.org/wiki/Commons:Licensing/ja";
  return "";
};
const author = (a, l) => a ? a : (/public domain|CC0/i.test(String(l)) ? "(作者の記載なし)" : "出典ページを参照");
const row = (name, a, l, u) =>
  '<tr><td>' + esc(name) + '</td><td>' + esc(author(a, l)) + '</td><td>' + (licUrl(l) ? '<a href="' + licUrl(l) + '" target="_blank" rel="noopener">' + esc(l) + '</a>' : esc(l || "")) + '</td>' +
  '<td>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">出典</a>' : "") + '</td></tr>';

const tally = list => { const t = {}; list.forEach(l => { t[l] = (t[l] || 0) + 1; }); return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const pRows = players.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "ja")).map(p => row(p.name, p.pa, p.pl, p.pu)).join("\n");
const kRows = Object.keys(parks).map(k => row(parkNames[k] || k, parks[k].a, parks[k].l, parks[k].u)).join("\n");
const pT = tally(players.map(p => p.pl || "不明")), kT = tally(Object.values(parks).map(v => v.l || "不明"));
const tallyHtml = t => '<ul class="tally">' + t.map(x => '<li>' + esc(x[0]) + '<b>' + x[1] + '</b></li>').join("") + '</ul>';
const nP = players.length, nK = Object.keys(parks).length;
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
<header class="ab-head"><a href="./" class="ab-back">← ゲームへ戻る</a><h1>写真の出典一覧</h1><p class="ab-lead">ゲーム内の選手の顔写真と球場の写真は、すべて <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener">Wikimedia Commons</a> で自由なライセンスのもと公開されているものです。作者名とライセンスは各写真の出典ページに従って掲載しています。誤りや取り下げのご希望は <a href="about.html#contact">こちら</a>。生成日 ${today}。</p></header>
<main class="ab-main">
<nav class="ab-toc"><a href="#players">選手 ${nP}枚</a><a href="#parks">球場 ${nK}枚</a><a href="#changes">改変について</a></nav>
<section id="changes"><h2>改変について</h2>
<p>ゲームで表示するため、すべての写真について<b>顔または建物の部分を切り抜き、縮小し、JPEG形式で再圧縮</b>しています。色や内容の加工はしていません。</p>
<p>CC BY-SA の写真を改変したもの(切り抜き・縮小した画像)は、元の写真と同じ CC BY-SA の各バージョンで提供します。パブリックドメイン・CC0 の写真に作者名がある場合は、記録として残しているものです。</p>
<p>マスコットはゲームオリジナルの架空キャラクターで、実在の球団のマスコットとは関係ありません。写真は使っていません。</p>
</section>
<section id="players"><h2>選手の顔写真 <small>${nP}枚</small></h2>${tallyHtml(pT)}
<div class="tbl"><table><thead><tr><th>選手</th><th>作者</th><th>ライセンス</th><th>出典</th></tr></thead><tbody>
${pRows}
</tbody></table></div></section>
<section id="parks"><h2>球場の写真 <small>${nK}枚</small></h2>${tallyHtml(kT)}
<div class="tbl"><table><thead><tr><th>球場</th><th>作者</th><th>ライセンス</th><th>出典</th></tr></thead><tbody>
${kRows}
</tbody></table></div></section>
</main>
<footer class="ab-foot"><a href="about.html">このゲームについて</a> ・ <a href="./">ゲームへ戻る</a> ・ <a href="https://kusayakyu-navi.com/?utm_source=legend-draft&utm_medium=credits&utm_campaign=game">草野球ナビ</a></footer>
</body>
</html>
`;
fs.writeFileSync(path.join(root, "credits.html"), html, "utf8");
console.log("credits.html: players", nP, "parks", nK);
console.log("player licenses:", pT.map(x => x[0] + "=" + x[1]).join(", "));
