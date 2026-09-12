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
  // 見出しは「名前」と「事実」の二行。名前を伏せるときは「謎の新助っ人」
  function headlineOf(p, who){
    const yr = p.year ? p.year + "年" : "";
    const nm = who || p.name;
    let body;
    if(p.cat === "P"){
      body = p.era >= 9 ? "防御率" + Number(p.era).toFixed(2) + "の衝撃" : (p.w||0) + "勝" + (p.l||0) + "敗で" + yr + "を終える";
    }else if(p.hr === 0 && (p.avg||0) < .24) body = "本塁打ゼロ・打率" + avg3(p.avg);
    else body = "期待の打棒は打率" + avg3(p.avg) + "・" + (p.hr||0) + "本";
    return '<span class="dg-h1">' + esc(nm) + '、</span><br><span class="dg-h2 nw">' + esc(body) + '</span>';
  }
  // 名前を伏せる。カタカナ名は「・」で区切った各部を○○に
  function maskName(txt, p){
    let s = String(txt || "");
    const full = String(p.name || "");
    if(full) s = s.split(full).join("○○");
    full.split(/[・･\s]/).filter(x => x.length >= 2).forEach(x => { s = s.split(x).join("○○"); });
    return s;
  }
  // 本文は文ごとに段落に分ける(改行が読みやすいように)
  function paragraphs(txt){
    return String(txt || "").split(/(?<=。)/).map(x => x.trim()).filter(Boolean).map(x => '<p class="dg-txt">' + esc(x) + '</p>').join("");
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
  window.dangerArticle = function(p, opt){
    if(!p) return;
    opt = opt || {};
    const mask = !!opt.mask;
    let bg = document.getElementById("dg-bg");
    if(!bg){ bg = document.createElement("div"); bg.id = "dg-bg"; document.body.appendChild(bg); }
    const face = (typeof faceThumb === "function") ? faceThumb(p, 92, 112) : "";
    const desc = mask ? maskName(p.desc, p) : String(p.desc || "");
    bg.dataset.mask = mask ? "1" : "";
    window._dgAfter = opt.onClose || null;
    bg.innerHTML =
      '<div id="dg-paper" class="' + (mask ? "masked" : "") + '" onclick="event.stopPropagation()">' +
        '<div class="dg-mast"><span class="dg-gogai">号外</span><b>スポーツ球史</b><span class="dg-date">' + esc(String(p.year || "")) + '年　' + esc(p.team || "") + '</span></div>' +
        '<div class="dg-kicker">鳴り物入りの助っ人、無念の帰国</div>' +
        '<h2 class="dg-head">' + headlineOf(p, mask ? "謎の新助っ人" : null) + '</h2>' +
        '<div class="dg-body">' +
          '<div class="dg-photo">' + face + (mask ? '<span class="dg-q">?</span>' : '') + '<span class="dg-cap">' + (mask ? '本人の写真は<br>入手できず' : esc(p.name)) + '（' + esc(p.team || "") + '）</span></div>' +
          '<div class="dg-col">' + paragraphs(desc) + '</div>' +
        '</div>' +
        '<div class="dg-stats">' + statsOf(p).map(function(s){ return '<span><small>' + s[0] + '</small><b>' + s[1] + '</b></span>'; }).join("") + '</div>' +
        '<div class="dg-seal">残念助っ人</div>' +
        '<button type="button" class="btn dg-close" onclick="dangerArticleClose()">' + (mask ? "この助っ人の正体を見る" : "記事を閉じる") + '</button>' +
      '</div>';
    bg.onclick = window.dangerArticleClose;
    bg.className = "show";
    if(typeof seDanger === "function") try{ seDanger(); }catch(e){}
  };
  window.dangerArticleClose = function(){
    const bg = document.getElementById("dg-bg"); if(bg) bg.className = "";
    const f = window._dgAfter; window._dgAfter = null;
    if(f) try{ f(); }catch(e){}
  };
  // 残念助っ人は、名前を伏せた号外が先。記事を閉じると封が切れて正体が出る(2026-09-13 本人要望)
  const prev2 = gachaReveal;
  gachaReveal = function(i){
    const G = state.gacha;
    const x = G && G.pulls ? G.pulls[i] : null;
    if(x && x.rank === "D" && x.p && !x.open && !x.opening && !x.articled){
      x.articled = true; x.opening = true;
      dangerArticle(x.p, {mask:true, onClose:function(){
        if(state.gacha !== G) return;
        x.opening = false;
        // 別の開封演出の最中なら、終わるのを待ってから封を切る
        const go = function(){ if(state.gacha !== G) return; if(typeof ldBusy !== "undefined" && ldBusy){ setTimeout(go, 300); return; } prev2(i); };
        go();
      }});
      return;
    }
    prev2(i);
  };
})();


// ---- ドラフト会議の操作を下の帯に(スマホ)。上の帯のボタンは画面の外にはみ出して押せなかった(2026-09-13 本人指摘) ----
(function(){
  function makeDraftDock(){
    const scr = document.getElementById("scr-draft");
    if(!scr || document.getElementById("d-dock")) return;
    const dock = document.createElement("div"); dock.id = "d-dock";
    dock.innerHTML =
      '<button type="button" class="btn sm ghost d-only" id="d-roster-btn2" onclick="toggleRosters()">各球団</button>' +
      '<button type="button" class="btn sm ghost" onclick="openMeikan()">名鑑</button>' +
      '<button type="button" class="btn sm ghost" onclick="autoAll()">全員おまかせ</button>' +
      '<button type="button" class="btn sm ghost snd-btn" onclick="toggleSnd()">音:ON</button>';
    scr.appendChild(dock);
    if(typeof updateSndBtns === "function") try{ updateSndBtns(); }catch(e){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", makeDraftDock); else makeDraftDock();
  // 「各球団」の札の文言は両方そろえる
  if(typeof toggleRosters === "function"){
    const prev = toggleRosters;
    toggleRosters = function(){
      prev();
      const on = document.getElementById("scr-draft").classList.contains("show-rosters");
      const b = document.getElementById("d-roster-btn2"); if(b) b.textContent = on ? "閉じる" : "各球団";
    };
  }
})();
