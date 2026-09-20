// パワプロ流の能力評価(2026-09-13 本人要望)。0〜100 を S/A/B/C/D/E/F/G で見せる。
// 数値は名鑑の成績(その年)から機械的に引く。守備系は守備位置と総合値から。
// S 90〜 / A 80〜 / B 70〜 / C 60〜 / D 50〜 / E 40〜 / F 20〜 / G それ未満(パワプロと同じ刻み)
const AB_GRADE = v => v >= 90 ? "S" : v >= 80 ? "A" : v >= 70 ? "B" : v >= 60 ? "C" : v >= 50 ? "D" : v >= 40 ? "E" : v >= 20 ? "F" : "G";
const AB_COLOR = {S:"#c9a000", A:"#e0342c", B:"#f07c1f", C:"#cfae00", D:"#3aa64a", E:"#35a8d8", F:"#2c62d8", G:"#7c7c8a"};
function abHash(p){ let h = 7; const s = String(p.name) + String(p.year); for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function abClamp(v){ return Math.max(1, Math.min(100, Math.round(v))); }
function abilities(p){
  if(!p) return [];
  if(p._ab && p._abOvr === p.ovr) return p._ab;
  const h = abHash(p), j = k => ((h >> (k * 4)) % 13) - 6;   // -6〜+6 の個人差(同じ選手は毎回同じ)
  let out = [];
  if(p.cat === "B"){
    const avg = p.avg || 0, hr = p.hr || 0, sb = p.sb || 0, pos = p.pos || "";
    const q = (p.ovr || 75) - 80;
    const armBase = {捕:76, 遊:76, 三:72, 外:70, 二:62, 一:50}[pos] || 55;
    const fldBase = {捕:76, 遊:80, 二:76, 三:70, 外:66, 一:56}[pos] || 50;
    out = [
      {k:"ミート", s:"ミ", v:abClamp((avg - 0.180) / 0.19 * 100 + j(5) * 0.5)},      // .300でC、.330でB、.350でA、.370で100
      {k:"パワー", s:"パ", v:abClamp(20 + hr * 1.45 + Math.max(0, (p.rbi || 0) - 90) * 0.08)},   // 30本でC、40本でB、55本で100
      {k:"走力",   s:"走", v:abClamp(30 + sb * 1.5 + (pos === "捕" ? -6 : 0))},        // 20盗塁でC、30でB、47で100
      {k:"肩力",   s:"肩", v:abClamp(armBase + j(1) + q * 0.2)},
      {k:"守備力", s:"守", v:abClamp(fldBase + j(2) + q * 0.3)},
      {k:"捕球",   s:"捕", v:abClamp(fldBase - 4 + j(3))},
    ];
  }else if(p.cat === "P"){
    const sp = p.role === "SP", w = p.w || 0, l = p.l || 0, so = p.so || 0, era = p.era || 4, sv = p.sv || 0, hld = p.hld || 0;
    // 投球回は名鑑にないので勝ち数・セーブ数から見積もる(先発は1勝あたり約11回)
    const ip = sp ? Math.max(100, w * 11 + l * 6) : Math.max(45, 55 + sv * 0.3 + hld * 0.3);
    const k9 = Math.min(12.5, so / ip * 9);
    // 球速: 奪三振率から。今の投手ほど速い時代なので年代で少し上乗せ(2020年代の剛腕で155前後、昔の技巧派は140前後)
    const yr = p.year || 1990, eraUp = yr >= 2020 ? 4 : yr >= 2010 ? 2.5 : yr >= 1995 ? 1 : 0;
    const veloFix = VELO_FIX[p.name] || VELO_FIX[String(p.name).replace(/\(MLB\)$/, "")];
    const velo = veloFix || Math.round(135 + Math.max(0, Math.min(14, (k9 - 4) * 1.8)) + eraUp + j(1) * 0.4);   // 数字だけなら最高でも152前後。剛腕は表で
    out = [
      {k:"球速", s:"球", v:velo, unit:"km/h", g: velo >= 155 ? "S" : velo >= 150 ? "A" : velo >= 146 ? "B" : velo >= 142 ? "C" : velo >= 139 ? "D" : "E"},
      {k:"コントロール", s:"制", v:abClamp(96 - (era - 1.0) * 19 + j(2))},           // 防1.5でA、2.5でB、3.3でC
      {k:"スタミナ", s:"ス", v:abClamp(sp ? ip / 2.4 : 28 + j(3))},
      {k:"変化球", s:"変", v:abClamp(34 + k9 * 4.0 - (sp ? 0 : 4) + j(4))},        // 奪三振率7でC、9でB、11.5でA。救援は母数が小さいので少し辛く
    ];
    p._pt = pitchTypes(p, k9, sp, h);
  }else if(p.cat === "M"){
    const pen = p.pennants || 0, jp = p.japan || 0, wins = p.wins || 0;
    out = [
      {k:"采配", s:"采", v:abClamp(45 + pen * 8 + jp * 4)},
      {k:"実績", s:"実", v:abClamp(20 + wins / 22)},
      {k:"勝負強さ", s:"勝", v:abClamp(40 + jp * 12 + pen * 2)},
    ];
    if(p.danger) out = out.map(x => ({k:x.k, s:x.s, v:abClamp(Math.min(x.v, 18 + (abHash(p) % 8)))}));
  }
  out.forEach(x => { if(!x.g) x.g = AB_GRADE(x.v); });
  p._ab = out; p._abOvr = p.ovr;
  return out;
}
// 札の並び: 大きな等級の字と数値
// 投手の球種。名鑑に球種の記録は無いので、年代・役割・奪三振率から「その時代にありそうな持ち球」を決める(同じ選手は毎回同じ)
const PITCH_POOLS = [
  [1959, ["カーブ","シュート","ドロップ","スライダー"]],
  [1979, ["カーブ","シュート","スライダー","フォーク","シンカー"]],
  [1999, ["スライダー","フォーク","カーブ","シュート","シンカー","チェンジアップ","カットボール"]],
  [9999, ["スライダー","フォーク","カットボール","チェンジアップ","ツーシーム","カーブ","スプリット","シンカー","シュート"]],
];
// 剛腕の最速(名鑑に無いので手で持つ)。載っていない投手は奪三振率から見当
const VELO_FIX = {
  "佐々木朗希":163,"大谷翔平":165,"藤浪晋太郎":162,"山本由伸":158,"ダルビッシュ有":158,"田中将大":155,"松坂大輔":156,"藤川球児":156,"伊良部秀輝":158,
  "五十嵐亮太":158,"山口高志":155,"江夏豊":152,"金田正一":155,"尾崎行雄":150,"平松政次":150,"佐々木主浩":154,"野茂英雄":152,"石井一久":153,
  "由規":161,"則本昂大":155,"千賀滉大":161,"栗林良吏":156,"松井裕樹":155,"山崎康晃":153,"菅野智之":155,"戸郷翔征":155,"高橋宏斗":158,"宮城大弥":150,
  "森下暢仁":154,"才木浩人":157,"伊藤大海":156,"マルティネス":162,"バーランダー":160,"ジャスティン・バーランダー":160,"ノーラン・ライアン":162,
  "アロルディス・チャップマン":169,"ジェイコブ・デグロム":162,"ポール・スキーンズ":163,"ランディ・ジョンソン":160,"ゲリット・コール":159,"ザック・ウィーラー":158,
  "ロジャー・クレメンス":157,"ボブ・ギブソン":155,"サンディ・コーファックス":153,"ペドロ・マルティネス":156,"マリアノ・リベラ":154,"クレイグ・キンブレル":159,
  "マックス・シャーザー":157,"クリス・セール":157,"タリク・スクーバル":159,"ボブ・フェラー":160,"ウォルター・ジョンソン":155,"沢村栄治":150,
};
// 有名投手の決め球(名鑑に無いので手で持つ)。載っていない投手は年代の持ち球から見当
const BEST_PITCH = {
  "佐々木朗希":"フォーク","大谷翔平":"スライダー","ダルビッシュ有":"スライダー","山本由伸":"スプリット","田中将大":"スプリット","前田健太":"スライダー",
  "菅野智之":"スライダー","千賀滉大":"フォーク","今永昇太":"チェンジアップ","上原浩治":"フォーク","野茂英雄":"フォーク","佐々木主浩":"フォーク",
  "岩瀬仁紀":"スライダー","藤川球児":"フォーク","松坂大輔":"スライダー","杉内俊哉":"チェンジアップ","和田毅":"チェンジアップ","涌井秀章":"スライダー",
  "岸孝之":"カーブ","金子千尋":"チェンジアップ","則本昂大":"スライダー","村田兆治":"フォーク","江川卓":"カーブ","堀内恒夫":"カーブ","金田正一":"カーブ",
  "江夏豊":"カーブ","稲尾和久":"スライダー","杉浦忠":"カーブ","山田久志":"シンカー","今村猛":"スライダー","平松政次":"シュート","北別府学":"シュート",
  "東尾修":"シュート","西本聖":"シュート","工藤公康":"カーブ","斎藤雅樹":"スライダー","桑田真澄":"カーブ","野田浩司":"フォーク","佐々岡真司":"フォーク",
  "石井一久":"カーブ","高津臣吾":"シンカー","潮崎哲也":"シンカー","星野伸之":"カーブ","伊藤智仁":"スライダー","黒田博樹":"ツーシーム","岩隈久志":"スプリット",
  "松井裕樹":"スライダー","山崎康晃":"ツーシーム","森下暢仁":"カーブ","宮城大弥":"チェンジアップ","高橋宏斗":"スプリット","戸郷翔征":"フォーク",
  "菊池雄星":"スライダー","藤浪晋太郎":"スライダー","東克樹":"チェンジアップ","才木浩人":"フォーク","大野雄大":"ツーシーム","小川泰弘":"フォーク",
  "村上頌樹":"チェンジアップ","伊藤大海":"カーブ","大瀬良大地":"カットボール","山岡泰輔":"スライダー","栗林良吏":"フォーク","マルティネス":"スプリット",
  "野村弘樹":"カーブ","川崎憲次郎":"シュート","石井弘寿":"フォーク","岡島秀樹":"カーブ","五十嵐亮太":"フォーク","館山昌平":"シュート","成瀬善久":"チェンジアップ",
  "内海哲也":"チェンジアップ","攝津正":"シンカー","摂津正":"シンカー","山井大介":"カットボール","浅尾拓也":"フォーク","久保田智之":"フォーク","小林雅英":"シュート",
  "外木場義郎":"カーブ","鈴木啓示":"スライダー","村山実":"フォーク","小山正明":"パームボール","権藤博":"カーブ","秋山登":"フォーク","米田哲也":"シュート",
  "皆川睦雄":"シンカー","大野豊":"スクリュー","遠藤一彦":"フォーク","郭源治":"フォーク","郭泰源":"スライダー","伊良部秀輝":"フォーク","石毛博史":"シュート",
  "ノーラン・ライアン":"カーブ","サンディ・コーファックス":"カーブ","マリアノ・リベラ":"カットボール","ペドロ・マルティネス":"チェンジアップ","ランディ・ジョンソン":"スライダー",
  "グレッグ・マダックス":"ツーシーム","ロジャー・クレメンス":"スプリット","クレイトン・カーショウ":"カーブ","ジャスティン・バーランダー":"スライダー","マックス・シャーザー":"スライダー",
  "ジェイコブ・デグロム":"スライダー","クリス・セール":"スライダー","マディソン・バムガーナー":"カットボール","ロイ・ハラデイ":"カットボール","カート・シリング":"スプリット",
  "ジョン・スモルツ":"スライダー","トム・グラビン":"チェンジアップ","トレバー・ホフマン":"チェンジアップ","ブルース・スーター":"スプリット","ボブ・ギブソン":"スライダー",
  "トム・シーバー":"スライダー","スティーブ・カールトン":"スライダー","ジム・パーマー":"カーブ","バート・ブライレブン":"カーブ","フィル・ニークロ":"ナックル",
  "ティム・ウェイクフィールド":"ナックル","R.A.ディッキー":"ナックル","デニス・エカーズリー":"スライダー","クレイグ・キンブレル":"カーブ","アロルディス・チャップマン":"スライダー",
  "ポール・スキーンズ":"スプリット","ザック・ウィーラー":"スライダー","ゲリット・コール":"スライダー","タリク・スクーバル":"チェンジアップ","クリス・ブライアント":"",
  "山本由伸(MLB)":"スプリット","ダルビッシュ有(MLB)":"スライダー","野茂英雄(MLB)":"フォーク","佐々木朗希(MLB)":"スプリット","今永昇太(MLB)":"スプリット",
  "千賀滉大(MLB)":"フォーク","黒田博樹(MLB)":"スプリット","田中将大(MLB)":"スプリット","岩隈久志(MLB)":"スプリット","上原浩治(MLB)":"スプリット",
  "松坂大輔(MLB)":"スライダー","大谷翔平(MLB)":"スライダー","菊池雄星(MLB)":"スライダー","前田健太(MLB)":"スライダー",
};
function pitchTypes(p, k9, sp, h){
  const year = p.year || 2000;
  const pool = (PITCH_POOLS.find(x => year <= x[0]) || PITCH_POOLS[3])[1].slice();
  const n = Math.min(pool.length + 1, (sp ? 3 : 2) + ((h >> 7) % 2));
  const out = [];
  const best = BEST_PITCH[p.name];
  if(best){ out.push(best); const bi = pool.indexOf(best); if(bi >= 0) pool.splice(bi, 1); }
  let hh = h;
  while(out.length < n && pool.length){ hh = (hh * 1103515245 + 12345) >>> 0; out.push(pool.splice(hh % pool.length, 1)[0]); }
  // 決め球の格は奪三振率から。以下は一段ずつ落ちる
  const brk = 34 + k9 * 4.0 - (sp ? 0 : 4);
  const top = Math.min(94, Math.round(brk + 7));   // 決め球は「変化球」より一段上まで。以下は一段ずつ落ちる
  return out.map((nm, i) => { const v = abClamp(top - i * 11 + ((h >> (9 + i)) % 5) - 2); return {n:nm, v, g:AB_GRADE(v), best:i === 0}; });
}
function pitchChips(p){
  const pt = p && p._pt; if(!pt || !pt.length) return "";
  return '<div class="ab-chips ab-pt"><span class="ab-lb">球種</span>' + pt.map(x =>
    '<span class="ab pt' + (x.best ? " best" : "") + '" style="--c:' + AB_COLOR[x.g] + '"><i>' + x.g + '</i>' + x.n + (x.best ? '<small>決め球</small>' : '') + '</span>').join("") + '</div>';
}
function abilChips(p){
  const ab = abilities(p);
  if(!ab.length) return "";
  return '<div class="ab-chips">' + ab.map(x =>
    '<span class="ab" style="--c:' + AB_COLOR[x.g] + '"><i>' + x.g + '</i>' + x.k + '<small>' + x.v + (x.unit || "") + '</small></span>').join("") + '</div>' + pitchChips(p);
}
// 一覧の一行ぶん: 「ミA パS 走C 守B」
function abilShort(p){
  const ab = abilities(p);
  if(!ab.length) return "";
  const pick = p.cat === "B" ? [0, 1, 2, 4] : p.cat === "P" ? [0, 1, 2, 3] : [0, 1, 2];
  return '<span class="plr-ab">' + pick.map(i => ab[i]).filter(Boolean).map(x =>
    '<span>' + x.s + '<i style="background:' + AB_COLOR[x.g] + '">' + x.g + '</i>' + (x.unit ? '<small>' + x.v + '</small>' : '') + '</span>').join("") + '</span>';
}
// 並び替えの鍵
const AB_SORT = {meet:["B",0], power:["B",1], run:["B",2], arm:["B",3], field:["B",4], velo:["P",0], ctrl:["P",1], stam:["P",2], brk:["P",3], sai:["M",0], jis:["M",1], sho:["M",2]};
const AB_SORT_LABEL = {ovr:"総合", cost:"コスト", meet:"ミート", power:"パワー", run:"走力", arm:"肩", field:"守備", velo:"球速", ctrl:"制球", stam:"スタミナ", brk:"変化球", sai:"采配", jis:"実績", sho:"勝負強さ", year:"年代", name:"名前"};
function abilVal(p, key){
  const d = AB_SORT[key];
  if(!d) return -1;
  const ab = abilities(p);
  return (p.cat === d[0] && ab[d[1]]) ? ab[d[1]].v : -1;
}
// 同じ札をもう一度押すと昇順・降順が入れ替わる
let poolAsc = false;
function poolSort(key){
  const el = document.getElementById("f-sort");
  const cur = el ? el.value : "ovr";
  if(cur === key) poolAsc = !poolAsc; else poolAsc = false;
  if(el){ if(!Array.from(el.options).some(o => o.value === key)){ const o = document.createElement("option"); o.value = key; o.textContent = AB_SORT_LABEL[key] || key; el.appendChild(o); } el.value = key; }
  if(typeof seTap === "function") seTap();
  if(typeof renderPool === "function") renderPool();
}
// 一覧の上の並び替えの札。いま並んでいる顔ぶれ(監督だけ/投手だけ/野手)に合わせて出す
function poolSortBar(fSlot, list){
  const cur = (document.getElementById("f-sort") || {}).value || "ovr";
  const cats = new Set((list || []).map(p => p.cat));
  const onlyM = cats.size === 1 && cats.has("M"), onlyP = cats.size === 1 && cats.has("P");
  const pit = onlyP || fSlot === "SP" || fSlot === "RP" || fSlot === "CL";
  const keys = (onlyM || fSlot === "MGR") ? ["ovr", "cost", "sai", "jis", "sho"] : pit ? ["ovr", "cost", "velo", "ctrl", "stam", "brk"] : ["ovr", "cost", "meet", "power", "run", "field"];
  return '<div class="pl-sort"><span class="pl-sort-lb">並び</span>' + keys.map(k =>
    '<button type="button" class="pl-sort-b' + (cur === k ? " on" : "") + '" onclick="poolSort(&quot;' + k + '&quot;)">' + AB_SORT_LABEL[k] + (cur === k ? '<i>' + (poolAsc ? "▲" : "▼") + '</i>' : '') + '</button>').join("") + '</div>';
}

// ---- 出来事の文中の選手名を太字に(2026-09-13 本人要望) ----
let _emphRe = null, _emphN = -1;
function emphNames(html){
  if(!html || typeof state === "undefined" || !state.parts) return html;
  const names = [];
  state.parts.forEach(t => { if(t.slots) Object.keys(t.slots).forEach(k => { const p = t.slots[k]; if(p && p.name) names.push(p.name); }); });
  if(!names.length) return html;
  if(_emphN !== names.length || !_emphRe){
    const uniq = Array.from(new Set(names)).sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    _emphRe = new RegExp(uniq.join("|"), "g"); _emphN = names.length;
  }
  // 既にタグの中にある名前は触らない(単純にタグの外だけを置換)
  return html.split(/(<[^>]+>)/).map(seg => seg.charAt(0) === "<" ? seg : seg.replace(_emphRe, m => '<b class="pn">' + m + '</b>')).join("");
}

// ---- ダメ監督(残念助っ人の監督版)。育成は鈍り、開幕はチームの空気が重い ----
(function(){
  if(typeof DANGERS !== "undefined") DANGERS.forEach(p => { if(p.cat === "M"){ p.ovr = 62; if(typeof costOf === "function") p.cost = costOf(p.ovr, "M", false); p.rank = "D"; } });
  if(typeof devMult === "function"){
    const prev = devMult;
    devMult = function(t){ const m = t && t.slots && t.slots.MGR; return (m && m.danger) ? 0.45 : prev(t); };
  }
  if(typeof startSeason === "function"){
    const prev = startSeason;
    startSeason = function(){
      prev.apply(this, arguments);
      try{
        state.parts.forEach(t => { const m = t.slots.MGR; if(m && m.danger){ if(typeof moodSet === "function") moodSet(t, -1.0, 20, "監督への不信"); state.news.unshift({mo:"4月", txt:"【不安】" + t.name + "、" + m.name + "監督の采配に早くも疑問の声"}); } });
      }catch(e){}
    };
  }
})();

// ---- 名前の横の札: MLB選手と残念枠がひと目で分かる(2026-09-13 本人要望) ----
function nameTags(p){
  if(!p) return "";
  return (p.mlb ? '<i class="tg tg-mlb">MLB</i>' : '') + (p.danger ? '<i class="tg tg-dg">' + (p.cat === "M" ? "ダメ" : "残念") + '</i>' : '');
}
function nameHtml(p){ return p ? esc(p.name) + nameTags(p) : ""; }
