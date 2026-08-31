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
  const i = text.indexOf("（");
  if(i < 0) return "";
  let depth = 0;
  for(let j = i; j < text.length; j++){
    if(text[j] === "（") depth++;
    else if(text[j] === "）"){ depth--; if(!depth) return text.slice(i+1, j); }
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

    // 生年 - 没年。元号や中国語表記の括弧・ハイフンに引っかからないよう、
    // 最初の西暦を起点にして、そのあとのダッシュより後ろだけを見る
    const flat = head.replace(/[（〈《][^（）〈〉《》]*[）〉》]/g, "");
    const yrs = [...flat.matchAll(/(\d{4})年/g)];
    if(yrs.length){
      const b = Number(yrs[0][1]);
      if(b >= 1850 && b <= 2030){
        out.b = b;
        const tail = flat.slice(yrs[0].index);
        const dash = tail.search(/[-–—―]/);
        if(dash >= 0){
          const d = tail.slice(dash).match(/(\d{4})年/);
          if(d && Number(d[1]) >= b) out.d = Number(d[1]);
        }
      }
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
    "&prop=extracts&exintro=1&explaintext=1&exlimit=20&redirects=1&titles=" +
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

const FIX = process.argv.includes("--fix");
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
if(process.argv.includes("--fix")) fixMode();
