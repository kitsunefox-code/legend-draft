// 旧players.js(BATTERS/PITCHERS配列)を新スキーマのdata/seg_base.jsonへ変換
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "players.js"), "utf8");
const sandbox = {};
new Function("exports", src + "\nexports.BATTERS=BATTERS;exports.PITCHERS=PITCHERS;exports.OHTANI_PITCHING=OHTANI_PITCHING;")(sandbox);

// 守備位置の補正(複数ポジション・実態に合わせる)
const POS_FIX = {
  "川上哲治":"一","藤村富美男":"三一","小鶴誠":"外","大下弘":"外","与那嶺要":"外",
  "中西太":"三","豊田泰光":"遊","榎本喜八":"一","山内一弘":"外","長嶋茂雄":"三",
  "王貞治":"一","野村克也":"捕","江藤慎一":"外一","張本勲":"外","福本豊":"外",
  "田淵幸一":"捕一","若松勉":"外","掛布雅之":"三","谷沢健一":"一外","レロン・リー":"外指",
  "山本浩二":"外","ブーマー":"一","宇野勝":"遊","篠塚利夫":"二","衣笠祥雄":"三一",
  "落合博満":"二三","バース":"一","秋山幸二":"外三","正田耕三":"二","門田博光":"指外",
  "ブライアント":"指外","清原和博":"一","デストラーデ":"指一","古田敦也":"捕","イチロー":"外",
  "江藤智":"三一","前田智徳":"外","鈴木尚典":"外","ローズ(R)":"二","ペタジーニ":"一三",
  "ローズ(T)":"外","中村紀洋":"三","小久保裕紀":"三一","カブレラ":"一","松井秀喜":"外",
  "ラミレス":"外","井口資仁":"二","小笠原道大":"三一","松中信彦":"一指","城島健司":"捕",
  "金本知憲":"外","新井貴浩":"三一","ウッズ":"一","山﨑武司":"指三","内川聖一":"外一",
  "青木宣親":"外","和田一浩":"外指","T-岡田":"一外","中村剛也":"三一","阿部慎之助":"捕一",
  "ブランコ":"一","秋山翔吾":"外","柳田悠岐":"外","山田哲人":"二","筒香嘉智":"外",
  "糸井嘉男":"外","大谷翔平":"指","丸佳浩":"外","山川穂高":"一指","浅村栄斗":"二",
  "坂本勇人":"遊","鈴木誠也":"外","森友哉":"捕指","吉田正尚":"外指","村上宗隆":"三一",
  "牧秀悟":"二","岡本和真":"三一","近藤健介":"外捕",
};
const CLOSERS = new Set(["佐々木主浩","岩瀬仁紀","藤川球児","サファテ"]);

const out = [];
for (const r of sandbox.BATTERS) {
  const [name,pos,team,fr,year,avg,hr,rbi,sb,desc] = r;
  const o = {name, cat:"B", pos: POS_FIX[name] || pos, team, fr, year, avg, hr, rbi, sb, desc};
  if (name === "大谷翔平") { o.pos = "指"; o.twoWay = sandbox.OHTANI_PITCHING; }
  out.push(o);
}
for (const r of sandbox.PITCHERS) {
  const [name,team,fr,year,w,era,so,sv,desc] = r;
  out.push({name, cat:"P", role: CLOSERS.has(name) ? "CL" : "SP", team, fr, year, w, era, so, sv, hld:0, desc});
}
fs.mkdirSync(path.join(root,"data"), {recursive:true});
fs.writeFileSync(path.join(root,"data","seg_base.json"), JSON.stringify(out, null, 1), "utf8");
console.log("wrote", out.length, "players");
