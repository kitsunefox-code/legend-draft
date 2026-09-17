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
    if(p.cat === "M"){
      body = (p.w||0) + "勝" + (p.l||0) + "敗、" + (p.place ? p.place + "位" : "最下位") + "で" + yr + "を終える";
    }else if(p.cat === "P"){
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
    if(p.cat === "M") return [["勝", p.w||0], ["敗", p.l||0], ["順位", (p.place||6) + "位"], ["優勝", p.pennants||0]];
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
        '<div class="dg-kicker">' + (p.cat === "M" ? "期待の新監督、無念の退任" : "鳴り物入りの助っ人、無念の帰国") + '</div>' +
        '<h2 class="dg-head">' + headlineOf(p, mask ? (p.cat === "M" ? "謎の新監督" : "謎の新助っ人") : null) + '</h2>' +
        '<div class="dg-body">' +
          '<div class="dg-photo">' + face + (mask ? '<span class="dg-q">?</span>' : '') + '<span class="dg-cap">' + (mask ? '本人の写真は<br>入手できず' : esc(p.name)) + '（' + esc(p.team || "") + '）</span></div>' +
          '<div class="dg-col">' + paragraphs(desc) + '</div>' +
        '</div>' +
        '<div class="dg-stats">' + statsOf(p).map(function(s){ return '<span><small>' + s[0] + '</small><b>' + s[1] + '</b></span>'; }).join("") + '</div>' +
        '<div class="dg-seal">' + (p.cat === "M" ? "ダメ監督" : "残念助っ人") + '</div>' +
        '<button type="button" class="btn dg-close" onclick="dangerArticleClose()">' + (mask ? (p.cat === "M" ? "この監督の正体を見る" : "この助っ人の正体を見る") : "記事を閉じる") + '</button>' +
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


// ---- キャンプの覚醒を前面に(2026-09-13 本人要望)。開幕直後に一枚で見せる ----
window.showAwakenings = function(woke){
  if(!woke || !woke.length) return;
  let bg = document.getElementById("wake-bg");
  if(!bg){ bg = document.createElement("div"); bg.id = "wake-bg"; document.body.appendChild(bg); bg.onclick = function(ev){ if(ev.target === bg) window.awakeClose(); }; }
  const humanFirst = woke.slice().sort(function(a, b){ return (a.t.cpu ? 1 : 0) - (b.t.cpu ? 1 : 0) || b.up - a.up; });
  bg.innerHTML = '<div id="wake-card">' +
    '<div class="wk-head"><span class="wk-kick">キャンプ速報</span><b>覚醒</b><small>春季キャンプで大化けした選手たち</small></div>' +
    '<div class="wk-list">' + humanFirst.filter(function(w){ return !w.t.cpu; }).map(function(w){
      const m = w.t.slots && w.t.slots.MGR;
      return '<div class="wk-row' + (w.t.cpu ? ' cpu' : '') + '">' + (typeof faceThumb === "function" ? faceThumb(w.p, 52, 64) : '') +
        '<div class="wk-t"><small>' + (typeof teamEmblem === "function" ? teamEmblem(w.t, 16) : '') + esc(w.t.name) + '</small><b>' + esc(w.p.name) + '</b>' +
        '<span>' + esc(roleLabel(w.p)) + '　' + (m ? esc(m.name) + '監督の育成' : 'キャンプの成果') + '</span></div>' +
        '<div class="wk-up"><i>OVR</i><b>' + w.p.ovr + '</b><em>+' + w.up + '</em></div></div>';
    }).join("") + '</div>' +
    (humanFirst.some(function(w){ return w.t.cpu; }) ? '<div class="wk-cpu"><small>CPU球団</small>' + humanFirst.filter(function(w){ return w.t.cpu; }).map(function(w){ return '<span>' + esc(w.p.name) + '<i>+' + w.up + '</i></span>'; }).join("") + '</div>' : '') +
    (humanFirst.some(function(w){ return !w.t.cpu; }) ? '' : '<div class="wk-none">あなたの球団に覚醒はなし</div>') +
    '<button type="button" class="btn wk-close" onclick="awakeClose()">開幕へ</button></div>';
  bg.className = "show";
  if(typeof seFanfare === "function") try{ seFanfare(); }catch(x){}
};
window.awakeClose = function(){ const bg = document.getElementById("wake-bg"); if(bg) bg.className = ""; };

// ---- 編成の札はドラッグでも入れ替えられる(タップの候補一覧に加えて) ----
(function(){
  let drag = null;
  function tileAt(x, y){ const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('#order-body .od-tile[data-key]') : null; }
  document.addEventListener('pointerdown', function(ev){
    const t = ev.target && ev.target.closest ? ev.target.closest('#order-body .od-tile[data-key]') : null;
    if(!t || !state.orderCtx) return;
    drag = {key: t.dataset.key, x: ev.clientX, y: ev.clientY, el: t, ghost: null, moved: false, id: ev.pointerId};
  }, {passive: true});
  document.addEventListener('pointermove', function(ev){
    if(!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if(!drag.moved){
      if(Math.hypot(dx, dy) < 10) return;
      drag.moved = true;
      drag.ghost = drag.el.cloneNode(true); drag.ghost.className += ' od-ghost'; drag.ghost.removeAttribute('onclick');
      document.body.appendChild(drag.ghost); drag.el.classList.add('od-dragging');
    }
    drag.ghost.style.left = ev.clientX + 'px'; drag.ghost.style.top = ev.clientY + 'px';
    const over = tileAt(ev.clientX, ev.clientY);
    document.querySelectorAll('.od-tile.od-over').forEach(function(x){ if(x !== over) x.classList.remove('od-over'); });
    if(over && over !== drag.el) over.classList.add('od-over');
    ev.preventDefault();
  }, {passive: false});
  function end(ev){
    if(!drag) return;
    const d = drag; drag = null;
    if(d.ghost) d.ghost.remove();
    d.el.classList.remove('od-dragging');
    document.querySelectorAll('.od-tile.od-over').forEach(function(x){ x.classList.remove('od-over'); });
    if(!d.moved) return;
    // ドラッグの直後に出るクリック(候補一覧が開く)を一度だけ抑える
    const blocker = function(c){ c.stopPropagation(); c.preventDefault(); document.removeEventListener('click', blocker, true); };
    document.addEventListener('click', blocker, true); setTimeout(function(){ document.removeEventListener('click', blocker, true); }, 400);
    const over = tileAt(ev.clientX, ev.clientY);
    if(over && over.dataset.key !== d.key && state.orderCtx){
      const t = state.parts[state.orderCtx.idx];
      const ok = typeof swapTargets === "function" && swapTargets(t, d.key).some(function(x){ return x.key === over.dataset.key; });
      if(ok) odSwap(d.key, over.dataset.key); else if(typeof announceOd === "function") announceOd("この枠には入れ替えられません(守れる位置・役割が合いません)");
    }
  }
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();


// ---- 起死回生ガチャ(2026-09-15 本人承認)。8月末、最下位の球団だけが引ける逆転の一手 ----
// 伏せたカプセルを3つ並べ、1つだけ開ける。中身は必ずSS・S・Aのどれか。
// 当たった選手は、その選手が守れる枠でいちばん弱い選手と入れ替わり、チームは15日間の逆襲ムード。
// 開けなかった2つの中身も見せる(「そっちがSSだった」で盛り上がる)
(function(){
  const ODDS = [["SS", 0.2], ["S", 0.4], ["A", 0.4]];
  const RC = {SS:"#e0a600", S:"#b9c6d8", A:"#e4432c", B:"#2457b8"};
  const R01 = () => (typeof rnd === "function" ? rnd() : Math.random());
  function gamesBehind(t){
    const s = standingsSorted(), L = s[0];
    return Math.max(0, ((L.W - t.W) + (t.L - L.L)) / 2);
  }
  function candidates(t){
    return POOL.filter(p => p.cat !== "M" && !p.twoWay && !p.danger && !state.taken.has(p.id) &&
      (typeof poolOK !== "function" || poolOK(p)) && !(typeof nameTaken === "function" && nameTaken(p)) &&
      reinforceCan(t, p, true));
  }
  function drawOne(t, used){
    const cands = candidates(t).filter(p => !used.has(p.id) && !used.has("n:" + p.name));
    if(!cands.length) return null;
    const r = R01(); let acc = 0, want = "A";
    for(const [rk, pr] of ODDS){ acc += pr; if(r < acc){ want = rk; break; } }
    const order = want === "SS" ? ["SS", "S", "A", "B"] : want === "S" ? ["S", "A", "SS", "B"] : ["A", "S", "B", "SS"];
    for(const rk of order){
      const b = cands.filter(p => prank(p) === rk);
      if(b.length){ const p = b[Math.floor(R01() * b.length)]; used.add(p.id); used.add("n:" + p.name); return {p, rank: rk}; }
    }
    return null;
  }
  function box(){
    let bg = document.getElementById("ks-bg");
    if(!bg){ bg = document.createElement("div"); bg.id = "ks-bg"; document.body.appendChild(bg); }
    return bg;
  }
  function capHtml(x, i, c){
    const done = c.picked >= 0;
    if(!done){
      return '<button type="button" class="ks-cap" onclick="kaiseiPick(' + i + ')"' + (c.t.cpu ? ' disabled' : '') + ' aria-label="カプセル' + (i + 1) + 'を開ける">' +
        '<img src="capsule.webp" alt="" draggable="false"><span>' + (i + 1) + '</span></button>';
    }
    if(c.picked === i) return '<div class="ks-cap chosen" style="--rc:' + RC[x.rank] + '"><i class="ks-rk">' + x.rank + '</i><small>獲得</small></div>';
    return '<div class="ks-cap miss" style="--rc:' + RC[x.rank] + '"><i class="ks-rk">' + x.rank + '</i><small>' + esc(x.p.name) + '</small></div>';
  }
  function resultHtml(c){
    const x = c.caps[c.picked], r = c.res;
    return '<div class="ks-result">' +
      '<div class="ks-card-wrap">' + cardHtml(x.p, x.rank, {size: "m", pos: slotLabel(r.key), grp: r.grp}) + '</div>' +
      '<div class="ks-swap"><span class="out">退団 ' + esc(r.out.name) + '</span><b>加入 ' + esc(x.p.name) + '</b></div>' +
      '<div class="ks-buff">チーム全体に<b>逆襲ムード</b>(15日間、好調)</div>' +
      (c.caps.length > 1 ? '<div class="ks-miss-lb">開けなかったカプセルの中身も上に出ています</div>' : '') +
      '<button type="button" class="btn ks-go" onclick="kaiseiClose()">' + (c.t.cpu ? "試合再開" : "逆襲開始") + '</button></div>';
  }
  function render(){
    const c = state.eventCtx;
    if(!c || c.type !== "kaisei") return;
    const t = c.t, done = c.picked >= 0, bg = box();
    bg.innerHTML = '<div id="ks-card">' +
      '<div class="ks-head"><span class="ks-kick">8月末・最下位救済</span><h2>起死回生ガチャ</h2>' +
      '<div class="ks-team">' + teamEmblem(t, 22) + '<b>' + esc(t.name) + '</b><span>最下位・首位と' + gamesBehind(t).toFixed(1) + 'ゲーム差</span></div>' +
      '<p class="ks-lead">' + (done ? '' : (t.cpu ? 'CPUが選んでいます' : '3つのうち1つだけ開けられます。<br>中身は必ずSS・S・Aのどれか。')) + '</p></div>' +
      '<div class="ks-caps">' + c.caps.map((x, i) => capHtml(x, i, c)).join("") + '</div>' +
      (done ? resultHtml(c) : '') +
    '</div>';
    bg.className = "show" + (done ? " done" : "");
  }
  window.startKaisei = function(){
    const s = standingsSorted();
    const t = s[s.length - 1];
    if(!t || state.finished){ endEventPhase(); return; }
    const used = new Set();
    const caps = [0, 1, 2].map(() => drawOne(t, used)).filter(Boolean);
    if(!caps.length){ endEventPhase(); return; }
    state.eventCtx = {type: "kaisei", t, caps, picked: -1};
    const go = function(){
      if(!state.eventCtx || state.eventCtx.type !== "kaisei") return;
      render();
      if(typeof seWhoosh === "function") try{ seWhoosh(); }catch(x){}
      if(t.cpu) setTimeout(function(){ window.kaiseiPick(Math.floor(R01() * caps.length), true); }, 1500);
    };
    // 人間の番なら、端末を渡す間を作る
    if(!t.cpu && typeof curtain === "function"){
      curtain("起死回生ガチャ", esc(t.name) + " に端末を渡してください。<br>最下位の球団だけが引ける、逆転の一手です。", "カプセルを選ぶ", go);
    }else go();
  };
  window.kaiseiPick = function(i, byCpu){
    const c = state.eventCtx;
    if(!c || c.type !== "kaisei" || c.picked >= 0 || c.busy) return;
    if(c.t.cpu && !byCpu) return;
    c.busy = true;
    const els = document.querySelectorAll("#ks-bg .ks-cap");
    els.forEach((el, k) => el.classList.add(k === i ? "shake" : "fade"));
    if(typeof seCrack === "function") try{ seCrack(); }catch(x){}
    setTimeout(function(){
      if(state.eventCtx !== c) return;
      const x = c.caps[i], t = c.t;
      const r = reinforceRelease(t, x.p);
      if(!r){ c.busy = false; endEventPhase(); return; }
      state.taken.delete(r.out.id);
      t.slots[r.key] = x.p;
      state.taken.add(x.p.id);
      x.p.joined = true; x.p.kaisei = true;
      statsReplace(r.out, x.p, t, r.grp);
      moodSet(t, 1.0, 15, "起死回生の逆襲");
      c.res = r; c.picked = i; c.busy = false;
      partyNews("逆", "good", "【起死回生】" + t.name + "が" + x.p.name + "を獲得！ " + r.out.name + "に代わって逆襲へ", null, t);
      if(!t.cpu) state.pendingReorder = {t, who: x.p.name};
      render();
      if(typeof gachaFlash === "function") try{ gachaFlash(x.rank === "A" ? "S" : x.rank); }catch(e2){}
      if(x.rank === "SS"){ if(typeof seFanfare === "function") seFanfare(); if(typeof confetti === "function") confetti(); }
      else if(typeof seWin === "function") seWin();
    }, 1000);
  };
  window.kaiseiClose = function(){
    const bg = document.getElementById("ks-bg"); if(bg) bg.className = "";
    if(typeof renderRosterLive === "function") try{ renderRosterLive(); }catch(e){}
    endEventPhase();
  };
})();


// ---- 試合中のリクエスト(2026-09-18 本人要望)。生中継の山場で review.js の場面を差し込む ----
(function(){
  // 台本の中から「終盤・接戦・人間の球団」の打席を一つ選んで印を付ける
  window.liveMarkRequest = function(c){
    if(!c || !c.script || !state.opts || state.opts.review === false) return;
    const g = c.g;
    if(!g || (g.A.cpu && g.B.cpu)) return;
    if(typeof rnd === "function" ? rnd() > 0.5 : Math.random() > 0.5) return;
    let a = 0, b = 0; const cands = [];
    c.script.forEach((e, i) => {
      if(e.t !== "pa") return;
      if(e.inn >= 6 && Math.abs(a - b) <= 2 && e.batP && e.pitP) cands.push(i);
      if(e.runs){ if(e.top) a += e.runs; else b += e.runs; }
    });
    if(!cands.length) return;
    c.script[cands[Math.floor((typeof rnd === "function" ? rnd() : Math.random()) * cands.length)]].rvHook = true;
  };
  // 印の打席に来たら止めて、いまのスコアで場面を作る。閉じたら続きから再開
  window.liveRequestScene = function(e){
    const c = liveCtx; if(!c || typeof rvBuildScene !== "function" || typeof rvStartScene !== "function") return false;
    const g = c.g;
    const humans = [g.A, g.B].filter(t => t && !t.cpu);
    if(!humans.length) return false;
    const t = humans[Math.floor((typeof rnd === "function" ? rnd() : Math.random()) * humans.length)];
    const side = t === g.A ? "A" : "B", opp = side === "A" ? g.B : g.A;
    const my = side === "A" ? (c.curA || 0) : (c.curB || 0), op = side === "A" ? (c.curB || 0) : (c.curA || 0);
    const gc = {A: g.A, B: g.B, rA: c.curA || 0, rB: c.curB || 0, live: true};
    let sc = null;
    // 守備側で相手が無得点だと場面が組めないことがあるので、何度か引き直す
    for(let k = 0; k < 8 && !sc; k++){ try{ sc = rvBuildScene(gc, side, t, opp, my, op); }catch(x){ sc = null; } }
    if(!sc) return false;
    sc.inn = e.inn; sc.top = e.top; sc.liveHook = true;
    if(c.timer){ clearTimeout(c.timer); c.timer = null; }
    c.rvWait = {gc, t};
    wrapClose();
    rvStartScene(sc);
    sc.resume = false;    // 中継の裏でペナントの時計を動かさない
    return true;
  };
  // 場面が閉じたら、覆った得点を中継の試合に反映して続きから。
  // review.js は extras.js より後に読まれるので、包むのは最初に使うとき(遅延)
  function wrapClose(){
    if(!window.rvClose || window.rvClose._live) return;
    const prevClose = window.rvClose;
    const w = function(){
      const c = liveCtx, wait = c && c.rvWait;
      prevClose.apply(this, arguments);
      if(!c || !wait) return;
      c.rvWait = null;
      const dA = wait.gc.rA - (c.curA || 0), dB = wait.gc.rB - (c.curB || 0);
      if(dA || dB){
        c.g.rA = Math.max(0, c.g.rA + dA); c.g.rB = Math.max(0, c.g.rB + dB);
        c.curA = (c.curA || 0) + dA; c.curB = (c.curB || 0) + dB;
        if(typeof pbpAdd === "function") pbpAdd("判定が覆った ―― " + (dA > 0 ? c.g.A.name + "に" + dA + "点" : dB > 0 ? c.g.B.name + "に" + dB + "点" : dA < 0 ? c.g.A.name + "の" + (-dA) + "点が取り消し" : c.g.B.name + "の" + (-dB) + "点が取り消し") + "。" + c.g.A.name + " " + c.curA + "-" + c.curB + " " + c.g.B.name, "chg");
        if(typeof renderLiveBoard === "function") try{ renderLiveBoard(); }catch(x){}
      }else if(typeof pbpAdd === "function") pbpAdd("判定はそのまま。試合再開", "chg");
      c.timer = setTimeout(liveStep, 500);
    };
    w._live = true;
    window.rvClose = w;
  }
})();

// ---- 長押しで詳細(2026-09-18 本人要望)。カード・札・一覧の行・ガチャの札を約0.5秒押すと名鑑が開く ----
(function(){
  let lp = null;
  function pidOf(el){
    if(el.dataset && el.dataset.pid) return el.dataset.pid;
    if(el.classList.contains("od-tile") && el.dataset.key && state.orderCtx){ const t = state.parts[state.orderCtx.idx]; const p = t && t.slots[el.dataset.key]; return p ? p.id : null; }
    const oc = el.getAttribute("onclick") || "";
    let m = oc.match(/cardPop\((\d+)\)/); if(m && state.gacha && state.gacha.pulls){ const x = state.gacha.pulls[Number(m[1])]; return x && x.p ? x.p.id : null; }
    m = oc.match(/poolPick\((?:&quot;|")([^"&]+)/); if(m) return m[1];
    m = oc.match(/openModal\((?:&quot;|'|")([^"'&]+)/); if(m) return m[1];
    return null;
  }
  const SEL = "[data-pid], .od-tile[data-key], .gc-chip, .pl-row, .od-row, .in-chip";
  document.addEventListener("pointerdown", function(ev){
    const el = ev.target && ev.target.closest ? ev.target.closest(SEL) : null;
    if(!el) return;
    const pid = pidOf(el); if(!pid) return;
    lp = {el, pid, x: ev.clientX, y: ev.clientY, id: ev.pointerId, fired: false};
    lp.timer = setTimeout(function(){
      if(!lp) return;
      lp.fired = true;
      const ov = document.querySelector(".ld-reveal"); if(ov) ov._lp = true;
      if(navigator.vibrate) try{ navigator.vibrate(15); }catch(x){}
      if(typeof openModal === "function") openModal(lp.pid);
      // 長押し後の click/ドラッグを一度だけ抑える
      const blocker = function(c){ c.stopPropagation(); c.preventDefault(); document.removeEventListener("click", blocker, true); };
      document.addEventListener("click", blocker, true); setTimeout(function(){ document.removeEventListener("click", blocker, true); if(ov) ov._lp = false; }, 500);
    }, 480);
  }, {passive: true});
  function cancel(ev){ if(!lp) return; if(ev && ev.type === "pointermove" && Math.hypot(ev.clientX - lp.x, ev.clientY - lp.y) < 8) return; clearTimeout(lp.timer); lp = null; }
  document.addEventListener("pointermove", cancel, {passive: true});
  document.addEventListener("pointerup", cancel); document.addEventListener("pointercancel", cancel);
})();
