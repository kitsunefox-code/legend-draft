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
