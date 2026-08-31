"use strict";
// ============================================================
// 選手名鑑用のプロフィールを ja.wikipedia から拾う。
//   読みがな / 生没年 / 出身地 の3点だけを冒頭文から取り出し、
//   data/wiki_profile.json に書き出す。
//   本文そのものは持ち込まない(引用にならない範囲の事実だけ)。
//   使い方: node tools/fetch_wiki.js [--limit N] [--only 名前,名前]
// ============================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const OUT = path.join(ROOT, "data", "wiki_profile.json");

function loadNames(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const names = new Set();
  (g.DB || []).forEach(p => names.add(p.name));
  (g.MLB_DB || []).forEach(p => names.add(p.name));
  return [...names];
}

// 冒頭文は「氏名（よみ、生年 - 没年）は、出身地の…選手」という形が多い。
// 入れ子の括弧があるので、開き括弧から対応する閉じ括弧までを自分で数える
function headParen(text){
  // 外国人の記事は半角括弧で「（George Thomas Seaver, 1944年…）」と書くことがある
  const cands = [text.indexOf("（"), text.indexOf("(")].filter(x => x >= 0);
  if(!cands.length) return "";
  const i = Math.min(...cands);
  const open = text[i], close = open === "（" ? "）" : ")";
  let depth = 0;
  for(let j = i; j < text.length; j++){
    if(text[j] === open) depth++;
    else if(text[j] === close){ depth--; if(!depth) return text.slice(i+1, j); }
  }
  return "";
}

const KANA = /^[぀-ゟ゠-ヿ・ー 　]+$/;

function parse(text){
  const out = {};
  const head = headParen(text);
  if(head){
    // 「つるおか かずと〈かずんど〉」のような別読みの添えものを落とす
    const first = head.split("、")[0].replace(/[〈《\(][^〉》\)]*[〉》\)]/g, "").trim();
    if(first && KANA.test(first) && first.length <= 24) out.y = first.replace(/[ 　]+/g, " ");

  }
  // 生没年は「◯◯（…）は、」の定義節から拾う。括弧は入れ子も閉じ忘れもあるので当てにしない
  const cut = text.indexOf("は、");
  const def = cut > 0 ? text.slice(0, cut) : text.slice(0, 200);
  const yrs = [...def.matchAll(/(\d{4})年/g)].filter(m => {
    const v = Number(m[1]); return v >= 1850 && v <= 2030;
  });
  if(yrs.length){
    out.b = Number(yrs[0][1]);
    const tail = def.slice(yrs[0].index);
    const dash = tail.search(/[-–—―]/);
    if(dash >= 0){
      const d = tail.slice(dash).match(/(\d{4})年/);
      if(d && Number(d[1]) >= out.b) out.d = Number(d[1]);
    }
  }
  const body = text.slice(0, 400);
  const from = body.match(/([^、。（）\s]{2,14}?[都道府県])(?:[^、。]{0,24}?)(出身|生まれ)/);
  if(from) out.f = from[1].replace(/^[ぁ-ゟ、]+/, "");
  else {
    const jp = body.match(/(アメリカ合衆国|カナダ|ドミニカ共和国|プエルトリコ|キューバ|ベネズエラ|メキシコ|韓国|台湾|オランダ領[^、。]{0,6})/);
    if(jp) out.f = jp[1];
    else {
      const abroad = body.match(/([゠-ヿ]{2,12}(?:州|共和国)?)出身/);
      if(abroad) out.f = abroad[1];
    }
  }
  return out;
}

// 野球の人物のページを引けたかを確かめる。同名の別人を掴まないための関門
const BALL = /(プロ野球選手|野球選手|プロ野球監督|投手|内野手|外野手|捕手|メジャーリーグ|大リーグ|野球指導者)/;

async function fetchBatch(titles){
  const url = "https://ja.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
    "&prop=extracts|pageprops&ppprop=disambiguation&exintro=1&explaintext=1&exlimit=20&redirects=1&titles=" +
    encodeURIComponent(titles.join("|"));
  const res = await fetch(url, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  const q = j.query || {};
  // 転送(スタルヒン→ヴィクトル・スタルヒン)を辿って、頼んだ名前で引けるようにする
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

const FIX = ["--fix","--repair","--recheck","--audit","--pin"].some(x => process.argv.includes(x));
(async function main(){
  if(FIX) return;
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only")+1].split(",") : null;
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit")+1]) : 0;

  let names = only || loadNames();
  if(limit) names = names.slice(0, limit);

  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const todo = only ? names : names.filter(n => !(n in prev));
  console.log("対象 " + names.length + "人 / 未取得 " + todo.length + "人");

  let ok = 0, miss = 0, notBall = 0;
  for(let i = 0; i < todo.length; i += 20){
    const batch = todo.slice(i, i + 20);
    let pages;
    try{ pages = await fetchBatch(batch); }
    catch(e){ console.log("  取得失敗 " + e.message + " → 5秒待って再試行"); await sleep(5000);
              try{ pages = await fetchBatch(batch); }catch(e2){ console.log("  諦め: " + batch.join(",")); continue; } }

    for(const name of batch){
      const p = pages[name];
      if(!p || p.missing || !p.extract){ prev[name] = null; miss++; continue; }
      if(!BALL.test(p.extract.slice(0, 300))){ prev[name] = null; notBall++; continue; }
      const r = parse(p.extract);
      prev[name] = Object.keys(r).length ? r : null;
      if(prev[name]) ok++; else miss++;
    }
    process.stdout.write("  " + Math.min(i+20, todo.length) + "/" + todo.length + "\r");
    await sleep(700);
  }
  fs.writeFileSync(OUT, JSON.stringify(prev, null, 0), "utf8");
  const have = Object.values(prev).filter(Boolean).length;
  console.log("\n取得 " + ok + " / 見つからず " + miss + " / 野球の人でない " + notBall);
  console.log("累計 " + have + "/" + Object.keys(prev).length + "人 → data/wiki_profile.json");
})();

// ============================================================
// --fix : 引けなかった人を、球団名を添えた検索で引き直す。
//   「江川卓(ロシア文学者)」「尾崎行雄(政治家)」のような同名の別人や、
//   「バース」「ローズ(R)」のような助っ人の通称を拾うための後追い。
// ============================================================
async function search(q){
  const url = "https://ja.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
    "&list=search&srlimit=6&srsearch=" + encodeURIComponent(q);
  const res = await fetch(url, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  return ((j.query && j.query.search) || []).map(x => x.title);
}
async function fixMode(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const rec = new Map();
  [].concat(g.DB || [], g.MLB_DB || []).forEach(p => { if(!rec.has(p.name)) rec.set(p.name, p); });

  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const todo = Object.keys(prev).filter(n => !prev[n]);
  console.log("引き直し " + todo.length + "人");

  let ok = 0;
  for(const name of todo){
    const p = rec.get(name) || {};
    // 「ローズ(R)」のような添え字と、Jr. の表記ゆれを落として検索語にする
    const base = name.replace(/\([^)]*\)/g, "").replace(/Jr\.?$/i, "").trim();
    const queries = [
      '"' + base + '" 野球 ' + (p.team || ""),
      base + " " + (p.team || "") + " 選手",
      base + " 野球選手",
    ];
    let hit = null;
    for(const q of queries){
      let titles;
      try{ titles = await search(q); }catch(e){ await sleep(3000); continue; }
      await sleep(500);
      if(!titles.length) continue;
      let pages;
      try{ pages = await fetchBatch(titles.slice(0, 6)); }catch(e){ await sleep(3000); continue; }
      await sleep(500);
      for(const t of titles){
        const pg = pages[t];
        if(!pg || !pg.extract) continue;
        const head = pg.extract.slice(0, 400);
        if(!BALL.test(head)) continue;
        // 球団名か、姓が本文に出ていることを確かめてから採る
        const team = (p.team || "").replace(/[（(].*/, "");
        const surname = base.split(/[・\s]/).pop();
        if(team && head.indexOf(team) < 0 && pg.extract.indexOf(team) < 0 &&
           head.indexOf(surname) < 0) continue;
        hit = {title:t, extract:pg.extract};
        break;
      }
      if(hit) break;
    }
    if(hit){
      const r = parse(hit.extract);
      if(Object.keys(r).length){
        r.t = hit.title !== name ? hit.title : undefined;
        if(!r.t) delete r.t;
        prev[name] = r; ok++;
        console.log("  " + name + " → " + hit.title + " " + JSON.stringify(r));
      }
    }else{
      console.log("  " + name + " → 見つからず");
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(prev, null, 0), "utf8");
  const have = Object.values(prev).filter(Boolean).length;
  console.log("\n拾えた " + ok + "人 / 累計 " + have + "/" + Object.keys(prev).length);
}
if(process.argv.includes("--fix") && !process.argv.includes("--repair")) fixMode();

// ============================================================
// --repair : まだ埋まっていない人を、曖昧さ回避の別題を当てて拾う。
//   「江川卓 (野球)」のような括弧つきの題を先に試し、
//   だめなら検索に落とす。採る条件は3つ全部:
//     ・記事の題に本人の姓が入っている
//     ・本文に所属球団の名が出てくる
//     ・活躍年 - 生年 が 17〜46歳(監督は除く)
// ============================================================
// その人の守備位置に合った曖昧さ回避を先に当てる。
// 「田中幸雄」のように同名の投手と内野手がいるので、順番を間違えると別人を掴む
// 見分けたいのは投手か野手か監督か、まで。
// 守備位置まで一致を求めると、転向した選手(ポンセ:一塁→外野など)を落とす
function posWords(p){
  if(p.cat === "M") return ["監督"];
  if(p.cat === "P") return ["投手"];
  return ["野手", "内野手", "外野手", "捕手", "指名打者",
          "一塁手", "二塁手", "三塁手", "遊撃手", "左翼手", "中堅手", "右翼手"];
}
// 曖昧さ回避の題を当てるときだけは、守備位置そのものを使う
function posTitle(p){
  if(p.cat === "M") return "野球";
  if(p.cat === "P") return "投手";
  const s = p.pos || "";
  if(s.includes("捕")) return "捕手";
  if(s.includes("外")) return "外野手";
  if(/[一二三遊]/.test(s)) return "内野手";
  return "野球";
}
function disamb(p){
  return ["", " (野球)", " (" + posTitle(p) + ")", " (野球選手)"];
}
function teamWords(team){
  const alias = {
    "東映":["東映","日本ハム","フライヤーズ"], "西鉄":["西鉄","ライオンズ"],
    "南海":["南海","ホークス"], "大洋":["大洋","ホエールズ","横浜"],
    "ダイエー":["ダイエー","ホークス","南海"], "近鉄":["近鉄","バファロー"],
    "オリックス":["オリックス","阪急","ブルーウェーブ"], "DeNA":["DeNA","横浜","ベイスターズ"],
    "ヤクルト":["ヤクルト","スワローズ","アトムズ","サンケイ"],
    "巨人":["巨人","ジャイアンツ","読売"], "阪神":["阪神","タイガース"],
    "中日":["中日","ドラゴンズ"], "広島":["広島","カープ"], "西武":["西武","ライオンズ"],
    "ロッテ":["ロッテ","マリーンズ","オリオンズ"], "日本ハム":["日本ハム","ファイターズ","東映"],
    "ソフトバンク":["ソフトバンク","ホークス","ダイエー"], "楽天":["楽天","イーグルス"],
    "毎日":["毎日","オリオンズ"],
  };
  return alias[team] || [team];
}
// 検査は場面で強さを変える。
//   loose  : 既に本人の記事だと分かっている題を、後から見直すとき
//   disamb : 「◯◯ (野球)」のように機械で当てた題を採るとき
//   search : 検索が返した題を採るとき(いちばん疑ってかかる)
function verify(p, title, extract, pg, mode){
  mode = mode || "search";
  // 「中村稔」「加藤貴之」のように曖昧さ回避ページが返ることがある。
  // 複数人の生年が並ぶので、そのまま解析すると別人の年を掴む
  if(pg && pg.pageprops && "disambiguation" in pg.pageprops) return "曖昧さ回避ページ";
  if(/曖昧さ回避/.test(extract)) return "曖昧さ回避ページ";
  if(!BALL.test(extract.slice(0, 400))) return "野球の人でない";

  const norm = s2 => String(s2||"").replace(/[ 　]/g,"").replace(/[（(][^）)]*[）)]/g,"");
  const base = norm(p.name).replace(/Jr\.?$/i,"");
  const kana = x => x.replace(/ー/g, "").normalize("NFD").replace(/[゙゚]/g, "")
    .replace(/[ァィゥェォッャュョヮ]/g, c => "アイウエオツヤユヨワ"["ァィゥェォッャュョヮ".indexOf(c)]);

  if(mode !== "loose"){
    // 同名の投手と内野手を取り違えないための要
    const head = extract.slice(0, 400);
    if(!posWords(p).some(w => head.includes(w))) return "守備位置が合わない";
  }
  if(mode === "search"){
    const tks = base.split(/[・]/).filter(x => x.length >= 2);
    if(!tks.some(tk => norm(title).includes(tk))) return "題に名前がない";
    // 「ロン・シー → ロン・レニキー」のように名だけ一致するのを弾く
    if(/[ァ-ヿ]/.test(base) && base.includes("・")){
      const sur = kana(base.split("・").pop());
      if(sur.length < 2 || !kana(norm(title)).includes(sur)) return "姓が一致しない";
    }
    if(!p.mlb){
      const words = teamWords(p.team);
      // 冒頭文は短いことがある。ここで落とすと正しい人まで捨てるので、
      // 見つからない時は呼び出し側に本文を確かめさせる
      if(!words.some(w => extract.includes(w))) return "TEAM?";
    }
  }
  const r = parse(extract);
  if(p.cat !== "M"){
    if(!r.b) return "生年が読めない";
    const age = p.year - r.b;
    if(age < 17 || age > 46) return "年齢が合わない(" + age + "歳)";
  }
  if(r.b && r.d && r.d - r.b < 15) return "生没年が不自然(" + r.b + "-" + r.d + ")";
  if(!Object.keys(r).length) return "拾えるものがない";
  return r;
}

// 記事の本文(節構成なし)。球団名が本当に出てくるかを確かめるために使う
async function fullText(title){
  try{
    const j = await api2("action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&titles=" +
      encodeURIComponent(title));
    const p = ((j.query || {}).pages || [])[0];
    return (p && p.extract) || "";
  }catch(e){ return ""; }
}
async function api2(params){
  const res = await fetch("https://ja.wikipedia.org/w/api.php?format=json&formatversion=2&" + params,
    {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function repairMode(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const rec = new Map();
  [].concat(g.DB || [], g.MLB_DB || []).forEach(p => {
    if(!rec.has(p.name) || p.cat !== "M") rec.set(p.name, p);
  });

  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const aliasFile = path.join(ROOT, "data", "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
  const todo = [...rec.keys()].filter(n => !prev[n] || !prev[n].b);
  console.log("埋め直し " + todo.length + "人\n");

  let ok = 0;
  for(const name of todo){
    const p = rec.get(name);
    const bare = name.replace(/\([^)]*\)/g, "").trim();
    const cands = [];
    if(alias[name]) cands.push(alias[name]);
    disamb(p).forEach(d => cands.push(bare + d));
    if(/Jr\.?$/i.test(bare)) cands.push(bare.replace(/Jr\.?$/i, "").trim() + "・ジュニア");

    let got = null, why = [];
    for(let i = 0; i < cands.length && !got; i += 8){
      let pages;
      try{ pages = await fetchBatch(cands.slice(i, i+8)); }catch(e){ await sleep(3000); continue; }
      await sleep(500);
      for(const t of cands.slice(i, i+8)){
        const pg = pages[t];
        if(!pg || pg.missing || !pg.extract) continue;
        const v = verify(p, pg.title, pg.extract, pg, "disamb");
        if(typeof v === "string"){ why.push(pg.title + ":" + v); continue; }
        got = {title:pg.title, r:v}; break;
      }
    }
    if(!got){
      // 通称しか登録名がない助っ人などは、球団名を添えた検索で追う
      const qs = ['"' + bare + '" ' + p.team + " 野球", bare + " " + p.team + " 選手"];
      for(const q of qs){
        if(got) break;
        let titles;
        try{ titles = await search(q); }catch(e){ await sleep(3000); continue; }
        await sleep(400);
        if(!titles.length) continue;
        let pages;
        try{ pages = await fetchBatch(titles.slice(0, 6)); }catch(e){ await sleep(3000); continue; }
        await sleep(400);
        for(const t of titles.slice(0, 6)){
          const pg = pages[t];
          if(!pg || !pg.extract) continue;
          let v = verify(p, pg.title, pg.extract, pg, "search");
          if(v === "TEAM?"){
            const full = await fullText(pg.title);
            await sleep(400);
            if(full && teamWords(p.team).some(w => full.includes(w))){
              v = verify(p, pg.title, pg.extract, pg, "disamb");   // 球団は本文で確認済み
            }else{
              why.push(pg.title + ":本文に球団が出てこない"); continue;
            }
          }
          if(typeof v === "string"){ why.push(pg.title + ":" + v); continue; }
          got = {title:pg.title, r:v}; break;
        }
      }
    }
    if(got){
      prev[name] = got.r;
      alias[name] = got.title;
      ok++;
      console.log("  ○ " + name.padEnd(20) + " → " + got.title + " " + JSON.stringify(got.r));
    }else{
      console.log("  × " + name.padEnd(20) + " " + why.slice(0, 3).join(" / "));
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  fs.writeFileSync(aliasFile, JSON.stringify(alias, null, 1), "utf8");
  console.log("\n埋まった " + ok + "人 / 残り " + (todo.length - ok) + "人");
}

if(process.argv.includes("--repair")) repairMode();

// ============================================================
// --recheck : 既に拾ってある全件を、今の判定でかけ直す。
//   曖昧さ回避ページ・守備位置の食い違い・年齢の矛盾を後から掃除する。
// ============================================================
async function recheckMode(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const rec = new Map();
  [].concat(g.DB || [], g.MLB_DB || []).forEach(p => {
    if(!rec.has(p.name) || p.cat !== "M") rec.set(p.name, p);
  });
  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const aliasFile = path.join(ROOT, "data", "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};

  const names = Object.keys(prev).filter(n => prev[n] && rec.has(n));
  console.log("かけ直し " + names.length + "人");
  let killed = [];
  for(let i = 0; i < names.length; i += 20){
    const batch = names.slice(i, i + 20);
    const titles = batch.map(n => alias[n] || n.replace(/\([^)]*\)/g, "").trim());
    let pages;
    try{ pages = await fetchBatch(titles); }catch(e){ await sleep(4000); continue; }
    await sleep(500);
    batch.forEach((n, k) => {
      const pg = pages[titles[k]];
      if(!pg || !pg.extract){ return; }          // 引けない時は既存の値を残す
      const v = verify(rec.get(n), pg.title, pg.extract, pg, "loose");
      if(typeof v === "string"){
        killed.push(n + " → " + pg.title + " : " + v);
        prev[n] = null; delete alias[n];
      }else{
        prev[n] = v;                              // 解析が良くなった分を取り込む
      }
    });
    process.stdout.write("  " + Math.min(i+20, names.length) + "/" + names.length + "\r");
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  fs.writeFileSync(aliasFile, JSON.stringify(alias, null, 1), "utf8");
  console.log("\n落とした " + killed.length + "件");
  killed.forEach(x => console.log("  " + x));
  console.log("累計 " + Object.values(prev).filter(Boolean).length + "/" + Object.keys(prev).length);
}
if(process.argv.includes("--recheck")) recheckMode();

// ============================================================
// --audit : 引き当てた記事が本当にその選手かを、本文の頭で確かめる。
//   通称や添字つきの登録名(「ローズ(R)」など)は検索では見分けられないので、
//   記事の冒頭1500字に所属球団の名が出るかで最後に検算する。
// ============================================================
async function auditMode(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const rec = new Map();
  [].concat(g.DB || [], g.MLB_DB || []).forEach(p => {
    if(!rec.has(p.name) || p.cat !== "M") rec.set(p.name, p);
  });
  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const aliasFile = path.join(ROOT, "data", "wiki_alias.json");
  const alias = JSON.parse(fs.readFileSync(aliasFile, "utf8"));

  // 危ういのは、登録名が通称(姓だけ)か添字つきの人
  const names = Object.keys(alias).filter(n => {
    const p = rec.get(n);
    return p && !p.mlb && (/\(/.test(n) || (/^[ァ-ヿ・ー]+$/.test(n) && !n.includes("・")));
  });
  console.log("検算 " + names.length + "人");
  const bad = [];
  for(const n of names){
    const p = rec.get(n);
    const full = await fullText(alias[n]);
    await sleep(500);
    if(!full){ console.log("  ? " + n + " 本文が引けない"); continue; }
    const head = full.slice(0, 1500);
    if(teamWords(p.team).some(w => head.includes(w))) continue;
    bad.push(n + " (" + p.team + " " + p.year + ") → " + alias[n]);
    prev[n] = null; delete alias[n];
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  fs.writeFileSync(aliasFile, JSON.stringify(alias, null, 1), "utf8");
  console.log("\n球団が合わず落とした " + bad.length + "件");
  bad.forEach(x => console.log("  " + x));
}
if(process.argv.includes("--audit")) auditMode();

// ============================================================
// --pin : data/wiki_pin.json に人手で書いた記事名だけを引く。
//   通称や添字つきの登録名は検索では見分けられない
//   (「ローズ(R)」に「タフィ・ローズ」が入る)ので、
//   ここでは探さず、指定された記事をそのまま読む。
//   確かめるのは「野球の人か」「曖昧さ回避でないか」だけ。
// ============================================================
async function pinMode(){
  const pinFile = path.join(ROOT, "data", "wiki_pin.json");
  const pin = JSON.parse(fs.readFileSync(pinFile, "utf8"));
  delete pin._;
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {};
  new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  const rec = new Map();
  [].concat(g.DB || [], g.MLB_DB || []).forEach(p => {
    if(!rec.has(p.name) || p.cat !== "M") rec.set(p.name, p);
  });
  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const aliasFile = path.join(ROOT, "data", "wiki_alias.json");
  const alias = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};

  const names = Object.keys(pin).filter(n => rec.has(n));
  console.log("人手で指定した " + names.length + "人");
  let ok = 0;
  for(let i = 0; i < names.length; i += 20){
    const batch = names.slice(i, i + 20);
    let pages;
    try{ pages = await fetchBatch(batch.map(n => pin[n])); }
    catch(e){ await sleep(4000); continue; }
    await sleep(500);
    for(const n of batch){
      const pg = pages[pin[n]];
      if(!pg || pg.missing || !pg.extract){ console.log("  × " + n + " → " + pin[n] + " (記事なし)"); continue; }
      const v = verify(rec.get(n), pg.title, pg.extract, pg, "loose");
      if(typeof v === "string"){ console.log("  × " + n + " → " + pg.title + " : " + v); continue; }
      prev[n] = v; alias[n] = pin[n]; ok++;
      console.log("  ○ " + n.padEnd(18) + " → " + pg.title + " " + JSON.stringify(v));
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(prev), "utf8");
  fs.writeFileSync(aliasFile, JSON.stringify(alias, null, 1), "utf8");
  console.log("\n確定 " + ok + "人 / 累計 " + Object.values(prev).filter(Boolean).length);
}
if(process.argv.includes("--pin")) pinMode();
