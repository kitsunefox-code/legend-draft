/* A tactile draw precedes the existing, single authoritative lottery. */
const ldBoardField=ldField;
let ldPulling=false;
const ldBaseCancel=ldCancel;
ldCancel=function(){ldPulling=false;ldGripState=null;ldBaseCancel();};
ldField=function(){
  if(state.gacha?.pulls)return ldBoardField();
  const total=ldSlots().length;
  return '<section class="ld-machine-stage" aria-label="ガチャマシン"><div class="ld-stage-light" aria-hidden="true"></div><div class="ld-stage-ring" aria-hidden="true"></div><div class="ld-stage-streak" aria-hidden="true"></div><div class="ld-machine-title"><small>歴代名選手ガチャ</small><h2>'+total+'連ガチャ</h2><p>'+(total>=5?'Aランク以上 1人確定':'運命の出会いを、その手で。')+'</p></div><div class="ld-machine-scene"><div class="ld-machine-visual"><img class="ld-machine-art" src="machine.webp" alt="金属の筐体とカプセルが詰まったガラスドームのガチャマシン"><button type="button" class="ld-machine-crank" aria-label="ハンドルを回してガチャを引く" onclick="ldCrankClick(event)" onpointerdown="ldGrip(event)" onpointermove="ldDrag(event)" onpointerup="ldLetGo(event)" onpointercancel="ldLetGo(event,true)"></button></div><div class="ld-dispensed" aria-hidden="true"><img src="capsule.webp" alt=""></div></div><div class="ld-machine-message" role="status" aria-live="polite">金色のハンドルを下へ引く</div><button type="button" class="ld-btn primary ld-machine-go" onclick="gachaPull()">ガチャを回す ↻</button></section>';
};
function ldCharge(input){
  if(ldPulling)return;
  const value=Number(input.value),stage=document.querySelector('.ld-machine-stage');
  stage?.style.setProperty('--charge',value/100);
  const message=document.querySelector('.ld-machine-message');if(message)message.textContent=value>65?'あと少し！ 下まで引ききろう':value>10?'そのまま、下へ引いて…':'金色のハンドルを下へ引く';
  if(value>=95)gachaPull();
}
function ldRelease(input){if(!ldPulling){input.value=0;ldCharge(input);}}
gachaPull=function(auto){
  const G=state.gacha;if(!G||G.pulls||ldBusy||ldPulling||G.phase==='drop')return;
  if(auto){ldOriginalPull(true);return;}
  ldPulling=true;ldBusy=true;
  const stage=document.querySelector('.ld-machine-stage');stage?.classList.add('is-turning');stage?.style.setProperty('--charge',1);
  const lever=document.querySelector('#ld-pull-lever');if(lever){lever.value=100;lever.disabled=true;}
  document.querySelectorAll('.ld-machine-go').forEach(b=>b.disabled=true);
  const message=document.querySelector('.ld-machine-message');if(message)message.textContent='ガラガラ… カプセルを抽選中';
  seRollStart();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ldDelay(()=>{if(state.gacha!==G)return;stage?.classList.add('is-dispensing');seCrack();if(message)message.textContent='カプセル排出！ 守備位置へ届けます';},reduced?80:1650);
  ldDelay(()=>{if(state.gacha!==G)return;seRollStop();ldPulling=false;ldBusy=false;ldOriginalPull();},reduced?180:2950);
};
let ldGripState=null;
function ldGrip(e){
  if(ldPulling||ldBusy||e.isPrimary===false||e.button>0)return;
  ldGripState={id:e.pointerId,y:e.clientY,moved:false,target:e.currentTarget};
  e.currentTarget.dataset.dragged='';e.currentTarget.setPointerCapture(e.pointerId);
}
function ldDrag(e){
  const grip=ldGripState;if(!grip||grip.id!==e.pointerId||ldPulling)return;
  const distance=Math.max(0,e.clientY-grip.y);
  if(Math.abs(e.clientY-grip.y)>6){grip.moved=true;grip.target.dataset.dragged='yes';}
  ldCharge({value:Math.min(100,distance/100*100)});
}
function ldLetGo(e,cancel=false){
  const grip=ldGripState;if(!grip||grip.id!==e.pointerId)return;
  if(cancel)grip.target.dataset.dragged='yes';
  ldGripState=null;
  if(grip.target.hasPointerCapture(e.pointerId))grip.target.releasePointerCapture(e.pointerId);
  if(!ldPulling)ldCharge({value:0});
}
function ldCrankClick(e){
  if(e.detail!==0&&e.currentTarget.dataset.dragged==='yes'){e.currentTarget.dataset.dragged='';return;}
  gachaPull();
}
renderGacha();
