// SS級の選手だけ、Wikipediaから「経歴(所属球団の歩み)」と「タイトル・表彰」を集めて ss.js を作る。
// ガチャでSSが出たときの見せ場(年表→受賞歴→カード)に使う。
// 使い方: node tools/fetch_ss.js
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "ss.js");
const UA = "LegendDraft/1.0 (party game; contact: konkon0621@gmail.com)";

// 名前 → 記事名。MLBは英語版
const SS = [
  ["小鶴誠","ja","小鶴誠"], ["落合博満","ja","落合博満"], ["藤本英雄","ja","藤本英雄"], ["金田正一","ja","金田正一"],
  ["杉浦忠","ja","杉浦忠"], ["稲尾和久","ja","稲尾和久"], ["権藤博","ja","権藤博"], ["江夏豊","ja","江夏豊"],
  ["ダルビッシュ有","ja","ダルビッシュ有"], ["田中将大","ja","田中将大"], ["山本由伸","ja","山本由伸"], ["野口二郎","ja","野口二郎"],
  ["ベーブ・ルース","en","Babe Ruth"], ["テッド・ウィリアムズ","en","Ted Williams"], ["バリー・ボンズ","en","Barry Bonds"],
  ["大谷翔平(MLB)","en","Shohei Ohtani"], ["ウォルター・ジョンソン","en","Walter Johnson"], ["サンディ・コーファックス","en","Sandy Koufax"],
  ["ペドロ・マルティネス","en","Pedro Martínez"], ["クレイトン・カーショウ","en","Clayton Kershaw"], ["スタン・ミュージアル","en","Stan Musial"],
  ["ジミー・フォックス","en","Jimmie Foxx"], ["ロナルド・アクーニャJr.","en","Ronald Acuña Jr."], ["スティーブ・カールトン","en","Steve Carlton"],
  ["ドワイト・グッデン","en","Dwight Gooden"], ["トッド・ヘルトン","en","Todd Helton"], ["ラリー・ウォーカー","en","Larry Walker"],
  ["クリスティ・マシューソン","en","Christy Mathewson"], ["タイ・カッブ","en","Ty Cobb"], ["ナップ・ラジョイ","en","Nap Lajoie"],
  ["ジョージ・シスラー","en","George Sisler"], ["ロジャース・ホーンスビー","en","Rogers Hornsby"], ["アル・シモンズ","en","Al Simmons"],
  ["ハック・ウィルソン","en","Hack Wilson"], ["チャック・クライン","en","Chuck Klein"], ["ビル・テリー","en","Bill Terry"],
  ["エド・ウォルシュ","en","Ed Walsh"], ["バイダ・ブルー","en","Vida Blue"],
];

async function wikitext(lang, title){
  const url = "https://" + lang + ".wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&prop=wikitext&redirects=1&page=" + encodeURIComponent(title);
  const res = await fetch(url, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  return j.parse ? j.parse.wikitext : "";
}
// 記法を落として読める文にする
function clean(s){
  return s
    .replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{(?:nowrap|nobr|lang\|[a-z-]+)\|([^{}]*)\}\}/gi, "$1")
    .replace(/\{\{[^{}|]*\|([^{}]*)\}\}/g, (m, a) => a.split("|").pop())   // {{Baseball year|1920}} → 1920
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
    .replace(/profile$/i, "").replace(/※.*$/, "")
    .replace(/Shared with[^.]*\.?/i, "")
    .trim();
}
function bullets(block){
  return block.split("\n").map(l => l.trim()).filter(l => /^[*#]/.test(l))
    .map(l => clean(l.replace(/^[*#:]+\s*/, ""))).filter(l => l && l.length <= 90);
}
// 情報箱の一項目(複数行)を取り出す
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
    // 次の同じか上の階層の見出しまで
    let j = k + 1;
    while(j < heads.length && heads[j].lv > h.lv) j++;
    const body = wt.slice(h.end, j < heads.length ? heads[j].i : undefined);
    out.push(...bullets(body));
  }
  return out;
}
// 英語の表彰を日本語に寄せる
const EN = [
  [/(\d+)× ?World Series champion/i, "ワールドシリーズ制覇 $1回"], [/World Series champion/i, "ワールドシリーズ制覇"],
  [/(\d+)× ?All-Star/i, "オールスター $1回"], [/All-Star/i, "オールスター"],
  [/(\d+)× ?(?:AL|NL) MVP/i, "リーグMVP $1回"], [/(?:AL|NL) MVP/i, "リーグMVP"],
  [/(\d+)× ?(?:AL|NL) Cy Young Award/i, "サイ・ヤング賞 $1回"], [/Cy Young Award/i, "サイ・ヤング賞"],
  [/(\d+)× ?Gold Glove Award/i, "ゴールドグラブ賞 $1回"], [/Gold Glove Award/i, "ゴールドグラブ賞"],
  [/(\d+)× ?Silver Slugger Award/i, "シルバースラッガー賞 $1回"], [/Silver Slugger Award/i, "シルバースラッガー賞"],
  [/(\d+)× ?(?:AL|NL) batting champion/i, "首位打者 $1回"], [/(?:AL|NL) batting champion/i, "首位打者"],
  [/(\d+)× ?(?:AL|NL) home run leader/i, "本塁打王 $1回"], [/(?:AL|NL) home run leader/i, "本塁打王"],
  [/(\d+)× ?(?:AL|NL) RBI leader/i, "打点王 $1回"], [/(?:AL|NL) RBI leader/i, "打点王"],
  [/(\d+)× ?(?:AL|NL) wins leader/i, "最多勝 $1回"], [/(?:AL|NL) wins leader/i, "最多勝"],
  [/(\d+)× ?(?:AL|NL) ERA leader/i, "最優秀防御率 $1回"], [/(?:AL|NL) ERA leader/i, "最優秀防御率"],
  [/(\d+)× ?(?:AL|NL) strikeout leader/i, "最多奪三振 $1回"], [/(?:AL|NL) strikeout leader/i, "最多奪三振"],
  [/(\d+)× ?(?:AL|NL) stolen base leader/i, "盗塁王 $1回"], [/(?:AL|NL) stolen base leader/i, "盗塁王"],
  [/Triple Crown/i, "三冠王"], [/(?:AL|NL) Rookie of the Year/i, "新人王"], [/Hank Aaron Award/i, "ハンク・アーロン賞"],
  [/World Series MVP/i, "ワールドシリーズMVP"], [/(?:ALCS|NLCS) MVP/i, "リーグ優勝決定シリーズMVP"],
  [/Pitched a perfect game/i, "完全試合"], [/Pitched (?:a )?no-hitters?/i, "ノーヒットノーラン"], [/(\d+)× ?no-hitters?/i, "ノーヒットノーラン $1回"],
  [/Major League Baseball All-Century Team/i, "MLBオールセンチュリーチーム"], [/MLB All-Time Team/i, "MLBオールタイムチーム"],
  [/(?:No\.|Number) (\d+) retired by[^,;]*/i, "背番号$1 永久欠番"], [/Hall of Fame/i, "野球殿堂入り"],
  [/Roberto Clemente Award/i, "ロベルト・クレメンテ賞"], [/Edgar Martínez Award/i, "エドガー・マルティネス賞"],
  [/(\d+)× ?(?:AL|NL) (?:OPS|slugging) leader/i, "長打率トップ $1回"],
  [/Pacific League/i, "パ・リーグ"], [/Central League/i, "セ・リーグ"], [/Japan Series champion/i, "日本シリーズ制覇"],
  [/Best Battery Award/i, "最優秀バッテリー賞"], [/Best Nine Award/i, "ベストナイン"], [/Sawamura Award/i, "沢村賞"],
  [/(?:パ・リーグ|セ・リーグ) ERA leader/i, "最優秀防御率"], [/Game MVP/i, "ゲームMVP"],
  [/\bAL\b/g, "ア・リーグ"], [/\bNL\b/g, "ナ・リーグ"],
];
function jaify(s){ let t = s; for(const [re, to] of EN) t = t.replace(re, to); return t; }

async function main(){
  const out = {};
  for(const [name, lang, title] of SS){
    try{
      const wt = await wikitext(lang, title);
      if(!wt){ console.log("×", name, "(記事なし)"); continue; }
      let chron = [], awards = [];
      if(lang === "ja"){
        chron = bullets(infoField(wt, ["経歴"])).slice(0, 8);
        awards = section(wt, ["タイトル", "表彰"]).slice(0, 14);
      }else{
        chron = bullets(infoField(wt, ["teams"])).slice(0, 8);
        awards = bullets(infoField(wt, ["highlights", "awards"])).map(jaify).slice(0, 14);
      }
      out[name] = {chron, awards, src: "https://" + lang + ".wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"))};
      console.log("○", name, "経歴" + chron.length, "表彰" + awards.length);
      await new Promise(r => setTimeout(r, 350));
    }catch(e){ console.log("×", name, e.message); }
  }
  const js = "// このファイルは tools/fetch_ss.js が Wikipedia から自動生成する。直接編集しないこと。\n" +
    "// SS級の選手の経歴と受賞歴(ガチャの見せ場で使う)。出典は各 src。\n" +
    "const SS_LORE = " + JSON.stringify(out, null, 1) + ";\n";
  fs.writeFileSync(OUT, js);
  console.log("wrote", OUT, Object.keys(out).length, "人");
}
main();
