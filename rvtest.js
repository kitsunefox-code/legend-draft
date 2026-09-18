// リクエスト／ABSチャレンジの試験台。URL に ?rvtest=1 を付けると、本編を始めずに各場面をボタンで呼び出せる。
//   例: https://kusayakyu-navi.com/legend-draft/?rvtest=1
//   ダミーの2球団(名鑑から写真つきの選手を詰める)を作り、rvBuildScene → rvStartScene を直接叩く。
//   試合の結果には何も反映しない(閉じたら試験台の札に戻るだけ)。
(function(){
  if(!/[?&#]rvtest\b/.test(location.search + location.hash)) return;
  const PLAYS = [["first", "一塁のクロスプレー"], ["home", "本塁のクロスプレー"], ["steal", "二塁の盗塁"], ["catch", "外野の捕球"], ["hr", "ポール際(本塁打かファウルか)"], ["abs", "ABSチャレンジ"]];
  let teams = null;
  function build(){
    if(teams) return teams;
    const A = newTeam("テスト球団", "巨人", false, "#c9463a", 0), B = newTeam("相手球団", "阪神", true, "#2c6bd6", 1);
    const used = new Set();
    const pool = PLAYERS.filter(p => p.ph !== undefined).concat(PLAYERS);
    [A, B].forEach(t => {
      SLOT_DEFS.forEach(d => {
        const p = pool.find(x => !used.has(x.id) && eligibleGrp(x, d.grp));
        if(p){ used.add(p.id); t.slots[d.key] = p; }
      });
    });
    state.parts = [A, B]; state.news = state.news || [];
    teams = [A, B];
    return teams;
  }
  // 閉じたら札に戻る(review.js の関数は外から差し替えられないので、覆いが消えたのを見て戻す)
  let watch = 0;
  function watchClose(){
    clearInterval(watch);
    watch = setInterval(function(){ const bg = document.getElementById("rv-bg"); if(bg && !bg.classList.contains("show")){ clearInterval(watch); state.pendingDay = null; panel(true); } }, 300);
  }
  function start(play, batting, wrong){
    const [t, opp] = build();
    // 守備側の場面は相手が点を取っていないと成り立たないので、相手に4点持たせる
    const r = batting ? {A:t, B:opp, rA:2, rB:3} : {A:t, B:opp, rA:3, rB:4};
    window.rvForcePlay = play;
    let c = null;
    for(let k = 0; k < 120 && !c; k++){
      const x = rvBuildScene(r, "A", t, opp, r.rA, r.rB);
      if(x && x.play === play && x.batting === batting) c = x;
    }
    window.rvForcePlay = null;
    if(!c){ alert("この場面は作れませんでした(もう一度押してください)"); return; }
    if(wrong !== null) c.wrong = wrong;
    panel(false);
    state.pendingDay = null;
    rvStartScene(c);
    setTimeout(watchClose, 1500);
  }
  function panel(show){
    let el = document.getElementById("rvtest");
    if(!el){
      el = document.createElement("div"); el.id = "rvtest";
      el.innerHTML = '<style>#rvtest{position:fixed;inset:0;z-index:120;background:#0b1419;color:#edf0ea;font-family:"Noto Sans JP",sans-serif;overflow-y:auto;padding:16px 14px calc(16px + env(safe-area-inset-bottom,0px))}' +
        '#rvtest h1{font-size:15px;margin:0 0 4px;letter-spacing:.08em}#rvtest p{font-size:11px;color:#9fb0b4;margin:0 0 12px;line-height:1.6}' +
        '#rvtest .row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}#rvtest .lab{grid-column:1/-1;font-size:12px;font-weight:700;color:#e4d6b2;margin-top:6px}' +
        '#rvtest button{font:700 13px/1.3 "Noto Sans JP",sans-serif;min-height:46px;border:1px solid #566269;border-radius:3px;background:#17252c;color:#edf0ea;padding:8px 6px;cursor:pointer}' +
        '#rvtest button:active{filter:brightness(1.3)}#rvtest .opt{display:flex;gap:6px;margin:4px 0 12px}#rvtest .opt button{flex:1;min-height:38px;font-size:12px}#rvtest .opt button.on{background:#ddcfab;color:#152129;border-color:#ddcfab}' +
        '#rvtest.hide{display:none}</style>' +
        '<h1>リクエスト／ABS 試験台</h1><p>本編を始めずに場面だけを呼び出します。結果は何にも反映しません。「攻撃」は自分の球団が打つ側、「守備」は守る側で不利な判定を受けた場面です。</p>' +
        '<div class="lab">判定は覆る？</div><div class="opt" id="rvt-wrong"><button data-w="1" class="on">覆る</button><button data-w="0">覆らない</button><button data-w="r">ランダム</button></div>' +
        '<div id="rvt-btns"></div>';
      document.body.appendChild(el);
      let wrong = true;
      el.querySelector("#rvt-wrong").addEventListener("click", e => {
        const b = e.target.closest("button"); if(!b) return;
        el.querySelectorAll("#rvt-wrong button").forEach(x => x.classList.toggle("on", x === b));
        wrong = b.dataset.w === "1" ? true : b.dataset.w === "0" ? false : null;
      });
      const box = el.querySelector("#rvt-btns");
      PLAYS.forEach(([k, label]) => {
        const row = document.createElement("div"); row.className = "row";
        row.innerHTML = '<div class="lab">' + label + '</div>' +
          '<button data-p="' + k + '" data-b="1">' + (k === "abs" ? "打者がチャレンジ" : "攻撃側で申請") + '</button>' +
          '<button data-p="' + k + '" data-b="0">' + (k === "abs" ? "投手がチャレンジ" : "守備側で申請") + '</button>';
        box.appendChild(row);
      });
      box.addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; start(b.dataset.p, b.dataset.b === "1", wrong); });
    }
    el.classList.toggle("hide", !show);
  }
  window.addEventListener("load", function(){ setTimeout(function(){ panel(true); }, 300); });
})();
