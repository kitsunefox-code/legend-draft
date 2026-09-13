"use strict";
// ============================================================
// 名鑑に選手を足す(2026-09-13)。ja.wikipedia のタイトル受賞者カテゴリから候補を集め、
//   ・冒頭の定義文: 読み / 生年 / 出身地
//   ・テンプレート: 投打 / 守備位置
//   ・年度別成績の表: いちばん良い年の成績(査定の元)、通算、太字(リーグ1位)の数=主要タイトル
//   ・自由ライセンスの代表画像: assets/face/<n>.jpg(作者・ライセンス・出典を残す)
//   を拾って players.js の DB 末尾に足す。写真が拾えた人だけ入れる(--nophoto で写真なしも可)。
//   使い方: node tools/add_players.js [--limit N] [--dry] [--nophoto] [--names 名,名]
// ============================================================
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const UA = "legend-draft/1.0 (personal party game; konkon0621@gmail.com)";
const FACE = path.join(ROOT, "assets", "face");
const LOG = path.join(ROOT, "data", "added_players.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);
const opt = k => args.includes(k);
const val = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const LIMIT = Number(val("--limit") || 0);
const DRY = opt("--dry"), NOPHOTO = opt("--nophoto");
const ONLY = val("--names") ? val("--names").split(",") : null;

async function api(host, params){
  for(let t = 0; t < 3; t++){
    try{
      const res = await fetch("https://" + host + "/w/api.php?format=json&formatversion=2&" + params, {headers:{"User-Agent": UA}});
      if(res.ok) return await res.json();
    }catch(e){}
    await sleep(800);
  }
  return {};
}
const ja = p => api("ja.wikipedia.org", p);
const strip = h => String(h || "").replace(/<[^>]*>/g, "").replace(/&#\d+;/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
const num = v => { const t = String(v).replace(/,/g, "").replace(/[^\d.\-]/g, ""); if(!/^-?\.?\d/.test(t)) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };

// 球団名 → 系譜
const FR_MAP = [
  [/巨人|読売|東京巨人/, "巨人", "巨人"], [/阪神|大阪タイガース/, "阪神", "阪神"], [/中日|名古屋|産業/, "中日", "中日"],
  [/ヤクルト|国鉄|サンケイ|アトムズ|産経/, "ヤクルト", null], [/広島/, "広島", "広島"], [/DeNA|横浜|大洋|洋松|松竹/, "DeNA", null],
  [/ソフトバンク|ダイエー|南海/, "ソフトバンク", null], [/西武|西鉄|太平洋|クラウン/, "西武", null], [/ロッテ|毎日|大毎|東京オリオンズ/, "ロッテ", null],
  [/日本ハム|日拓|東映|東急|急映|セネタース/, "日本ハム", null], [/オリックス|阪急/, "オリックス", null], [/近鉄/, "近鉄", "近鉄"], [/楽天/, "楽天", "楽天"],
  [/大映|高橋|トンボ|金星|ゴールドスター|西日本|イーグルス|黒鷲|大和|翼|朝日|名古屋金鯱|ライオン/, "その他", null],
];
function frOf(team){ if(/KBO|CPBL|MLB|韓国|台湾|米国|マイナー|3A|2A|1A|独立|メキシコ|MEX|AAA/.test(team)) return null; for(const [re, fr] of FR_MAP){ if(re.test(team)) return fr; } return null; }
// 表の球団欄は「セネタース東急急映」のように複数がつながることがある。名鑑に載せる短い呼び名を一つ選ぶ
const TEAM_NAMES = ["巨人","阪神","中日","ヤクルト","国鉄","サンケイ","アトムズ","広島","DeNA","横浜","大洋","洋松","松竹","ソフトバンク","ダイエー","南海","西武","西鉄","太平洋","クラウン","ロッテ","毎日","大毎","東京","日本ハム","日拓","東映","東急","急映","セネタース","オリックス","阪急","近鉄","楽天","大映","高橋","トンボ","金星","西日本","名古屋","産業","大和","朝日","黒鷲","イーグルス","ライオン"];
function teamShort(txt){ const s = String(txt || ""); let best = null, bi = 1e9; TEAM_NAMES.forEach(n => { const i = s.indexOf(n); if(i >= 0 && i < bi){ bi = i; best = n; } }); return best || s.replace(/\s/g, "").slice(0, 6); }
const POS_MAP = {"捕手":"捕", "一塁手":"一", "二塁手":"二", "三塁手":"三", "遊撃手":"遊", "外野手":"外", "指名打者":"指", "内野手":"二三遊", "投手":"P"};

async function infobox(title){
  const j = await ja("action=parse&prop=text&section=0&redirects=1&page=" + encodeURIComponent(title));
  const html = ((j.parse || {}).text) || "";
  const out = {title: (j.parse || {}).title || title};
  const rows = html.match(/<tr[\s\S]*?<\/tr>/g) || [];
  rows.forEach(r => {
    const th = r.match(/<th[\s\S]*?<\/th>/), td = r.match(/<td[\s\S]*?<\/td>/);
    if(!th || !td) return;
    const k = strip(th[0]), v = strip(td[0]);
    if(/^出身地/.test(k)){ const m = v.match(/(北海道|東京都|京都府|大阪府|[^\s（(]{1,3}県)/); out.f = m ? m[1] : (v.split(/[ 　（(]/)[0] || "").slice(0, 12); }
    if(/^生年月日/.test(k)){ const m = v.match(/(\d{4})年/); if(m) out.b = Number(m[1]); }
    if(/^没年月日/.test(k)){ const m = v.match(/(\d{4})年/); if(m) out.d = Number(m[1]); }
    if(/^投球・打席|^投打/.test(k)){ const m = v.match(/([右左])投([右左両])打/); if(m){ out.th = m[1]; out.bh = m[2]; } }
    if(/^ポジション|^守備位置/.test(k)){ out.posRaw = v; }
    if(/^国籍/.test(k)) out.nat = v;
  });
  // 読み: 最初の段落の「氏名（よみ、」
  const p = (html.match(/<p>[\s\S]*?<\/p>/g) || []).map(strip).find(t => t.length > 20 && /（/.test(t)) || "";
  const paren = p.indexOf("（");
  if(paren >= 0){
    const inner = p.slice(paren + 1).split(/[、）]/)[0].replace(/[〈《\(][^〉》\)]*[〉》\)]/g, "").trim();
    if(/^[぀-ゟ゠-ヿ・ー 　]+$/.test(inner) && inner.length <= 24) out.y = inner.replace(/[ 　]+/g, " ");
  }
  return out;
}
// 年度別成績の表 → 各年の行と通算
const BAT = {g:["試合"], ab:["打数"], h:["安打"], hr:["本塁打"], rbi:["打点"], sb:["盗塁"], avg:["打率"], obp:["出塁率"], slg:["長打率"], ops:["OPS"]};
const PIT = {g:["登板"], w:["勝利"], l:["敗戦"], sv:["セーブ"], hld:["ホールド","ホールドポイント","HP"], ip:["投球回"], so:["奪三振"], era:["防御率"], whip:["WHIP"]};
const BOLD_B = ["avg","hr","rbi","sb","h","obp"], BOLD_P = ["w","era","so","sv","hld"];
async function seasons(title, isPit){
  const s = await ja("action=parse&prop=sections&redirects=1&page=" + encodeURIComponent(title));
  const secs = ((s.parse || {}).sections || []);
  const want = isPit ? /年度別投手成績|投手成績/ : /年度別打撃成績|打撃成績/;
  const sec = secs.find(x => want.test(x.line) && !/順位|守備|WBC|プレミア|ポストシーズン|オールスター/.test(x.line)) || secs.find(x => /^年度別成績$/.test(x.line));
  if(!sec) return null;
  await sleep(250);
  const j = await ja("action=parse&prop=text&redirects=1&section=" + sec.index + "&page=" + encodeURIComponent(title));
  const html = ((j.parse || {}).text) || "";
  const cols = isPit ? PIT : BAT;
  const tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
  for(const tb of tables){
    const rows = tb.match(/<tr[\s\S]*?<\/tr>/g) || [];
    let head = null;
    // 見出しは縦書き用に「セ丨ブ」「ホ丨ルド」と書かれることがある(丨→ー)
    for(const r of rows){ const th = r.match(/<th[\s\S]*?<\/th>/g); if(th && th.length >= 6){ head = th.map(strip).map(h => h.replace(/丨/g, "ー")); break; } }
    if(!head || !head.some(h => /打率|防御率/.test(h))) continue;
    const idx = {}; for(const [k, names] of Object.entries(cols)){ for(const nm of names){ const i = head.indexOf(nm); if(i >= 0){ idx[k] = i; break; } } }
    const yrs = [], totals = [];
    let lastYear = "", lastTeam = "";
    for(const r of rows){
      let raw = r.match(/<t[hd][\s\S]*?<\/t[hd]>/g) || [];
      let cs = raw.map(strip);
      if(!cs.length) continue;
      // rowspan で年や球団の欄が省かれた行は、前の行の値を補って列をそろえる
      if(cs.length === head.length - 1){
        if(/^(19|20)\d\d/.test(cs[0])){ raw = [raw[0], "<td>" + lastTeam + "</td>"].concat(raw.slice(1)); cs = [cs[0], lastTeam].concat(cs.slice(1)); }
        else if(!/^(通算|通　算|NPB|日本|MLB|メジャー)/.test(cs[0])){ raw = ["<td>" + lastYear + "</td>"].concat(raw); cs = [lastYear].concat(cs); }
      }else if(cs.length === head.length - 2 && !/^(通算|通　算|NPB|日本|MLB|メジャー)/.test(cs[0])){
        raw = ["<td>" + lastYear + "</td>", "<td>" + lastTeam + "</td>"].concat(raw); cs = [lastYear, lastTeam].concat(cs);
      }
      const isYear = /^(19|20)\d\d/.test(cs[0]);
      const isTotal = /^(通算|通　算|NPB|日本)/.test(cs[0]);
      if(!isYear && !isTotal) continue;
      if(isYear){ lastYear = cs[0]; if(cs[1]) lastTeam = cs[1]; }
      const off = isTotal ? head.length - cs.length : 0;
      const row = {};
      let bold = 0;
      for(const [k, i] of Object.entries(idx)){
        const ci = i - off; if(ci < 0 || ci >= cs.length) continue;
        const n = num(cs[ci]); if(n !== null) row[k] = n;
        if(isYear && /<b>|<strong>|font-weight:\s*bold/.test(raw[ci] || "") && (isPit ? BOLD_P : BOLD_B).includes(k)) bold++;
      }
      if(isYear){ row.year = Number(cs[0].slice(0, 4)); row.team = cs[1] || ""; row.bold = bold; yrs.push(row); }
      else if(!totals.length || /^NPB|^日本/.test(cs[0])) totals.push(row);
    }
    if(yrs.length) return {yrs, total: totals[0] || null};
  }
  return null;
}
function pickBest(rows, isPit){
  let best = null, bs = -1e9;
  rows.forEach(r => {
    if(!frOf(r.team)) return;   // MLBなど日本以外の年は査定に使わない
    let s;
    if(isPit){
      const ip = r.ip || 0, w = r.w || 0, sv = r.sv || 0, hld = r.hld || 0, era = r.era || 9, so = r.so || 0;
      if(!(ip >= 120 || w >= 10 || sv + hld >= 15)) return;
      s = w * 3 + so * 0.15 + sv * 1.6 + hld * 1.2 + Math.max(0, 5 - era) * 12 + r.bold * 20;
    }else{
      const g = r.g || 0, ab = r.ab || 0;
      if(!(g >= 100 || ab >= 350)) return;
      const ops = r.ops || ((r.obp || 0) + (r.slg || 0)) || (r.avg || 0) * 2.4;
      s = ops * 100 + (r.hr || 0) * 0.8 + (r.rbi || 0) * 0.25 + (r.sb || 0) * 0.4 + r.bold * 20;
    }
    if(s > bs){ bs = s; best = r; }
  });
  return best;
}
async function freePhoto(title){
  const j = await ja("action=query&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=" + encodeURIComponent(title));
  const pg = (((j.query || {}).pages) || [])[0];
  const file = pg && pg.pageimage; if(!file) return null;
  await sleep(200);
  const c = await api("commons.wikimedia.org", "action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=200&iiextmetadatafilter=LicenseShortName|Artist&titles=" + encodeURIComponent("File:" + file));
  const p = (((c.query || {}).pages) || [])[0];
  if(!p || !p.imageinfo || !p.imageinfo[0]) return null;
  const ii = p.imageinfo[0], e = ii.extmetadata || {};
  const lic = strip((e.LicenseShortName || {}).value), author = strip((e.Artist || {}).value).slice(0, 60);
  if(!/(public domain|pd|cc0|cc by|cc-by|attribution|gfdl)/i.test(lic)) return null;
  return {url: ii.thumburl || ii.url, page: ii.descriptionurl, lic, author: author || "Unknown author"};
}
async function download(url, dest){
  const res = await fetch(url, {headers:{"User-Agent": UA}});
  if(!res.ok) throw new Error("HTTP " + res.status);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}
async function candidates(){
  const cats = ["首位打者 (NPB)","本塁打王 (NPB)","打点王 (NPB)","盗塁王 (NPB)","最多勝利 (NPB)","最優秀防御率 (NPB)","最多奪三振 (NPB)","沢村栄治賞","最優秀選手 (NPB)","最優秀中継ぎ投手 (NPB)","最高出塁率 (NPB)","最多安打 (NPB)","最多セーブ投手 (NPB)","最多セーブ (NPB)","最優秀救援投手 (NPB)","最優秀新人 (NPB)","日本プロ野球名球会","ベストナイン (NPB)","ゴールデングラブ賞受賞者"];
  const names = new Set();
  for(const c of cats){
    let cont = "";
    for(let k = 0; k < 8; k++){
      const j = await ja("action=query&list=categorymembers&cmnamespace=0&cmlimit=500&cmtitle=" + encodeURIComponent("Category:" + c) + cont);
      ((j.query || {}).categorymembers || []).forEach(m => { if(!/最多|最優秀|首位|王$|賞|名球会|一覧|ベストナイン|ゴールデン|受賞者/.test(m.title)) names.add(m.title); });
      if(!(j.continue && j.continue.cmcontinue)) break;
      cont = "&cmcontinue=" + encodeURIComponent(j.continue.cmcontinue);
      await sleep(200);
    }
    await sleep(200);
  }
  return [...names];
}
function loadDB(){
  const src = fs.readFileSync(path.join(ROOT, "players.js"), "utf8");
  const g = {}; new Function("g", src.replace(/^const /gm, "g.") + "\nreturn 0;")(g);
  return {src, DB: g.DB || [], MLB: g.MLB_DB || []};
}
const norm = s => String(s).replace(/\s|　/g, "").replace(/\([^)]*\)$/, "").replace(/（[^）]*）$/, "");

(async function main(){
  const {src, DB} = loadDB();
  const have = new Set(DB.filter(p => p.cat !== "M").map(p => norm(p.name)));
  // 外国人は名鑑では姓だけ(バース、クロマティ)のことが多い。姓が一致すれば同じ人とみなす
  const haveLast = new Set([...have].map(n => n.split("・").pop()));
  const dup = n => { const k = norm(n); if(have.has(k)) return true; const parts = k.split("・"); return parts.length > 1 && haveLast.has(parts[parts.length - 1]); };
  let names = ONLY || await candidates();
  names = names.filter(n => !dup(n));
  console.log("候補 " + names.length + "人(名鑑に無い人)");
  if(LIMIT) names = names.slice(0, LIMIT);
  let nextPh = Math.max(0, ...DB.map(p => p.ph || 0), ...fs.readdirSync(FACE).map(f => Number(f.replace(/\D/g, "")) || 0)) + 1;
  const added = [], skipped = [], doneNames = new Set();
  const prevLog = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : [];
  for(let i = 0; i < names.length; i++){
    const title = names[i];
    try{
      const ib = await infobox(title); await sleep(250);
      const posRaw = ib.posRaw || "";
      const isPit = /投手/.test(posRaw) && !/内野手|外野手|捕手|一塁手/.test(posRaw);
      let pos = "";
      Object.keys(POS_MAP).forEach(k => { if(posRaw.indexOf(k) >= 0 && POS_MAP[k] !== "P") pos += POS_MAP[k]; });
      pos = [...new Set([...pos])].join("");
      if(!isPit && !pos){ skipped.push([title, "位置不明"]); continue; }
      const st = await seasons(ib.title, isPit); await sleep(250);
      if(!st){ skipped.push([title, "成績表なし"]); continue; }
      const best = pickBest(st.yrs, isPit);
      if(!best){ skipped.push([title, "規定に届く年なし"]); continue; }
      const titles = st.yrs.reduce((a, r) => a + (frOf(r.team) ? r.bold : 0), 0);
      const photo = NOPHOTO ? null : await freePhoto(ib.title);
      if(!photo && !NOPHOTO){ skipped.push([title, "自由な写真なし"]); await sleep(200); continue; }
      const name = norm(ib.title);
      if(doneNames.has(name) || have.has(name)){ skipped.push([title, "重複"]); continue; }
      doneNames.add(name);
      const e = {name, cat: isPit ? "P" : "B", team: teamShort(best.team), fr: frOf(best.team), year: best.year};
      if(isPit){
        const sv = best.sv || 0, hld = best.hld || 0;
        e.role = sv >= 15 ? "CL" : (hld >= 15 || (best.ip || 0) < 100) ? "RP" : "SP";
        e.w = best.w || 0; e.era = best.era || 4.5; e.so = best.so || 0; e.sv = sv; e.hld = hld;
        e.desc = best.year + "年は" + e.team + "で" + e.w + "勝・防御率" + Number(e.era).toFixed(2) + "・" + e.so + "奪三振" + (sv >= 15 ? "・" + sv + "セーブ" : hld >= 15 ? "・" + hld + "ホールド" : "") + "。" + (titles ? "リーグ1位の成績を" + titles + "度残した。" : "");
      }else{
        e.pos = pos || "外"; e.avg = best.avg || 0.25; e.hr = best.hr || 0; e.rbi = best.rbi || 0; e.sb = best.sb || 0;
        e.desc = best.year + "年は" + e.team + "で打率" + String(e.avg.toFixed(3)).replace(/^0/, "") + "・" + e.hr + "本塁打・" + e.rbi + "打点" + (e.sb >= 15 ? "・" + e.sb + "盗塁" : "") + "。" + (titles ? "リーグ1位の成績を" + titles + "度残した。" : "");
      }
      e.titles = titles;
      if(ib.th) e.th = ib.th; if(ib.bh) e.bh = ib.bh;
      if(ib.y) e.y = ib.y; if(ib.b) e.b = ib.b; if(ib.d) e.d = ib.d;
      if(ib.f){
        let f = ib.f;
        if(!/[都道府県]$/.test(f)){
          const nat = ib.nat || "";
          f = /アメリカ/.test(nat + f) && !/ハワイ/.test(f) ? "アメリカ合衆国" : /韓国/.test(nat) ? "大韓民国" : /台湾|中華民国/.test(nat) ? "台湾" : /ドミニカ/.test(nat) ? "ドミニカ共和国" : /キューバ/.test(nat) ? "キューバ" : /ベネズエラ/.test(nat) ? "ベネズエラ" : /プエルトリコ/.test(nat) ? "プエルトリコ" : /ハワイ/.test(f) ? "ハワイ" : f.replace(/[（(].*$/, "").slice(0, 8);
        }
        e.f = f;
      }
      if(st.total){ const t = st.total; e.car = isPit ? {g:t.g, w:t.w, l:t.l, ip:t.ip, so:t.so, era:t.era, whip:t.whip, yr: st.yrs.length} : {g:t.g, ab:t.ab, h:t.h, hr:t.hr, rbi:t.rbi, sb:t.sb, avg:t.avg, ops:t.ops, obp:t.obp, slg:t.slg, yr: st.yrs.length}; Object.keys(e.car).forEach(k => { if(e.car[k] === undefined) delete e.car[k]; }); }
      if(photo){
        e.ph = nextPh; e.pa = photo.author; e.pl = photo.lic; e.pu = photo.page;
        if(!DRY) await download(photo.url, path.join(FACE, nextPh + ".jpg"));
        nextPh++;
      }
      added.push(e);
      console.log((i + 1) + "/" + names.length, "OK", e.name, e.cat, e.team, e.year, isPit ? (e.w + "勝 " + e.era + " " + e.so + "K sv" + e.sv) : (e.avg + " " + e.hr + "本 " + e.rbi + "点"), "T" + titles, photo ? "📷" : "");
    }catch(err){ skipped.push([title, "ERR " + String(err).slice(0, 60)]); }
    await sleep(250);
  }
  console.log("追加 " + added.length + "人 / 見送り " + skipped.length + "人");
  skipped.slice(0, 40).forEach(x => console.log("  -", x[0], x[1]));
  if(!DRY && added.length){
    const ins = added.map(e => JSON.stringify(e)).join(",\n");
    const a = src.indexOf("const DB = ["); const b = src.indexOf("];", a);
    if(a < 0 || b < 0) throw new Error("DB block not found");
    fs.writeFileSync(path.join(ROOT, "players.js"), src.slice(0, b) + ",\n" + ins + "\n" + src.slice(b), "utf8");
    fs.writeFileSync(LOG, JSON.stringify(prevLog.concat(added.map(e => ({name: e.name, cat: e.cat, year: e.year, ph: e.ph}))), null, 1), "utf8");
    console.log("players.js に追記しました");
  }
})();
