/* SS: rewind the clock, then follow the recorded career to the reveal. */
const ldArchiveRender=ssRender;
const ldArchiveNext=ssNext;
function ldStoryYear(text,fallback){const match=String(text).match(/(?:18|19|20)\d{2}/);return match?Number(match[0]):fallback;}
function ldStoryEvents(p){const rows=ssLore(p).chron||[];return rows.length?rows.map(text=>({year:ldStoryYear(text,p.year),text})): [{year:p.year,text:p.team+'・収録シーズン'}];}
ssShow=function(x,done){
  if(ssCtx){ssQueue.push([x,done]);return;}
  ssCtx={x,done,page:0,t0:Date.now(),eventIndex:0,storyFrame:0};
  if(sndOn){const audio=ac();if(audio){[440,330,247,165].forEach((f,i)=>tone(audio.currentTime+i*.18,f,.18,.06,'triangle'));}}
  $('ss-bg').classList.add('show');ssRender();
};
ssTap=function(){};
ssNext=function(){
  if(!ssCtx)return;
  if(ssCtx.page===1&&ssCtx.eventIndex+1<ldStoryEvents(ssCtx.x.p).length){ssCtx.eventIndex++;ssRender();return;}
  ldArchiveNext();
};
function ldStoryCard(){if(!ssCtx||ssCtx.page===4)return;ssCtx.page=4;ssRender();seFanfare();}
function ldStorySchedule(c,frame,fn,ms){ldDelay(()=>{if(ssCtx===c&&c.storyFrame===frame)fn();},ms);}
ssRender=function(){
  const c=ssCtx;if(!c)return;
  const p=c.x.p,events=ldStoryEvents(p),frame=++c.storyFrame;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const controls='<div class="archive-controls"><button type="button" onclick="event.stopPropagation();ldStoryCard()">紹介を飛ばす</button><button type="button" class="archive-next" onclick="event.stopPropagation();ssNext()">'+(c.page===0?'経歴へ':c.page===1&&c.eventIndex+1<events.length?'次の記録':c.page===1?'受賞歴へ':c.page===2?'成績へ':'選手カードへ')+' →</button></div>';
  const panel=$('ss-panel'),bg=$('ss-bg');
  if(c.page<2){
    const event=events[c.eventIndex];
    const start=new Date().getFullYear(),destination=events[0].year;
    const progress=c.page===0?0:(c.eventIndex+1)/events.length;
    panel.innerHTML='<section class="archive-story '+(c.page===0?'archive-rewind':'archive-event')+'"><header><span>球史の記憶</span><b>SS 特別紹介</b></header><div class="archive-screen">'+'<div class="archive-copy"><span class="archive-chapter">'+(c.page===0?'時を巻き戻す':String(c.eventIndex+1).padStart(2,'0')+' / '+String(events.length).padStart(2,'0')+'　経歴')+'</span><div class="archive-year" id="archive-year">'+(c.page===0?start:event.year)+'</div><h2>'+(c.page===0?'あの時代に、ひとりの名選手がいた。':esc(event.text))+'</h2>'+(c.page===0?'<p>記録をたどり、その足跡へ。</p>':'')+'</div></div><div class="archive-track" aria-hidden="true"><i style="width:'+progress*100+'%"></i></div><div class="archive-years" aria-hidden="true">'+events.map((e,i)=>'<span class="'+(c.page===1&&i===c.eventIndex?'current':'')+'">'+e.year+'</span>').join('')+'</div>'+controls+'</section>';
    bg.className='show archive-mode p'+c.page;
    if(c.page===0){
      const frames=reduced?1:24;
      for(let i=1;i<=frames;i++)ldStorySchedule(c,frame,()=>{const year=$('archive-year');if(year)year.textContent=String(Math.round(start+(destination-start)*(1-Math.pow(1-i/frames,2))));},reduced?0:i*28);
      ldStorySchedule(c,frame,ssNext,reduced?400:900);
    }else if(!reduced){
      ldStorySchedule(c,frame,ssNext,Math.max(1000,Math.min(1900,event.text.length*28)));
    }
  }else{
    ldArchiveRender();bg.classList.add('archive-mode');
    panel.querySelectorAll('.ss-tap,.ss-get-stamp,.ss-face').forEach(el=>el.remove());
    const heading=panel.querySelector('.ss-k');if(heading)heading.textContent=c.page===2?'球史に残した栄誉':'数字が語る、その凄み';
    panel.querySelectorAll('.ss-name').forEach(el=>el.textContent='記録の主は、このあと');
    if(c.page<4){panel.insertAdjacentHTML('beforeend',controls);if(!reduced)ldStorySchedule(c,frame,ssNext,c.page===2?1700:1900);}
  }
  bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label','SS選手の経歴紹介');
  panel.querySelector('.archive-next,.ss-get')?.focus();
};
document.addEventListener('keydown',e=>{
  if(!ssCtx)return;
  if(e.key==='Escape'){e.preventDefault();ldStoryCard();}
  if(e.key==='Tab'){
    const buttons=[...$('ss-panel').querySelectorAll('button')];if(!buttons.length)return;
    const index=buttons.indexOf(document.activeElement),next=(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length;
    e.preventDefault();buttons[next].focus();
  }
});
