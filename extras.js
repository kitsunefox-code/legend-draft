// 引き継ぎ演出の上に重ねる小さな補助。デンジャー(D)の開封で落胆音を鳴らす
(function(){
  const prev = gachaReveal;
  gachaReveal = function(i){
    prev(i);
    const x = state.gacha && state.gacha.pulls ? state.gacha.pulls[i] : null;
    if(x && x.rank === "D" && x.p) setTimeout(seDanger, 1900);
  };
})();

// ---- スマホ: ペナントの操作ボタン(1週進める/再開/速度/音)を画面上部から親指の届く下の帯へ(2026-09-12 本人要望) ----
(function(){
  function makeDock(){
    if(document.getElementById("s-dock")) return;
    if(!window.matchMedia || !matchMedia("(max-width:700px)").matches) return;
    var scr = document.getElementById("scr-season"); if(!scr) return;
    var speed = document.getElementById("s-speed"), play = document.getElementById("s-play"), skip = document.getElementById("s-skip");
    var snd = document.querySelector("#scr-season .month-head .snd-btn");
    if(!speed || !play || !skip) return;
    var dock = document.createElement("div"); dock.id = "s-dock";
    dock.appendChild(speed); dock.appendChild(skip); dock.appendChild(play); if(snd) dock.appendChild(snd);
    scr.appendChild(dock);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", makeDock); else makeDock();
})();


// ---- デンジャー(残念助っ人)を引いたら、当時のスポーツ紙の記事のような一枚を出す(2026-09-12 本人要望) ----
// 事実の記録だけを見出しにする。人格を笑う文言は書かない
(function(){
  function headlineOf(p){
    const yr = p.year ? p.year + "年" : "";
    if(p.cat === "P"){
      const g = p.g || p.games;
      if(p.era >= 9) return p.name + "、防御率" + Number(p.era).toFixed(2) + "の衝撃";
      return p.name + "、" + (p.w||0) + "勝" + (p.l||0) + "敗で" + yr + "を終える";
    }
    if(p.hr === 0 && (p.avg||0) < .24) return p.name + "、本塁打ゼロ・打率" + avg3(p.avg);
    return p.name + "、期待の打棒は打率" + avg3(p.avg) + "・" + (p.hr||0) + "本";
  }
  function leadOf(p){
    const d = String(p.desc || "");
    const cut = d.indexOf("。");
    return cut > 0 && cut < 60 ? d.slice(0, cut + 1) : d.slice(0, 60);
  }
  function statsOf(p){
    if(p.cat === "P") return [["防御率", Number(p.era||0).toFixed(2)], ["勝敗", (p.w||0) + "勝" + (p.l||0) + "敗"], ["セーブ", p.sv||0], ["奪三振", p.so||0]];
    return [["打率", avg3(p.avg)], ["本塁打", p.hr||0], ["打点", p.rbi||0], ["盗塁", p.sb||0]];
  }
  window.dangerArticle = function(p){
    if(!p) return;
    let bg = document.getElementById("dg-bg");
    if(!bg){ bg = document.createElement("div"); bg.id = "dg-bg"; document.body.appendChild(bg); }
    const face = (typeof faceThumb === "function") ? faceThumb(p, 92, 112) : "";
    bg.innerHTML =
      '<div id="dg-paper" onclick="event.stopPropagation()">' +
        '<div class="dg-mast"><span class="dg-gogai">号外</span><b>スポーツ球史</b><span class="dg-date">' + esc(String(p.year || "")) + '年　' + esc(p.team || "") + '</span></div>' +
        '<div class="dg-kicker">鳴り物入りの助っ人、無念の帰国</div>' +
        '<h2 class="dg-head">' + esc(headlineOf(p)) + '</h2>' +
        '<div class="dg-body">' +
          '<div class="dg-photo">' + face + '<span class="dg-cap">' + esc(p.name) + '（' + esc(p.team || "") + '）</span></div>' +
          '<p class="dg-txt">' + esc(String(p.desc || "")) + '</p>' +
        '</div>' +
        '<div class="dg-stats">' + statsOf(p).map(function(s){ return '<span><small>' + s[0] + '</small><b>' + s[1] + '</b></span>'; }).join("") + '</div>' +
        '<div class="dg-seal">残念助っ人</div>' +
        '<button type="button" class="btn dg-close" onclick="dangerArticleClose()">記事を閉じる</button>' +
      '</div>';
    bg.onclick = window.dangerArticleClose;
    bg.className = "show";
    if(typeof seDanger === "function") try{ seDanger(); }catch(e){}
  };
  window.dangerArticleClose = function(){ const bg = document.getElementById("dg-bg"); if(bg) bg.className = ""; };
  // 開封の演出(約2秒)が終わってから記事を出す
  const prev2 = gachaReveal;
  gachaReveal = function(i){
    prev2(i);
    const x = state.gacha && state.gacha.pulls ? state.gacha.pulls[i] : null;
    if(x && x.rank === "D" && x.p) setTimeout(function(){ if(state.gacha && state.gacha.pulls && state.gacha.pulls[i] === x) dangerArticle(x.p); }, 2300);
  };
})();
