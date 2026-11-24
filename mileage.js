const kmText=n=>Number(n.toFixed(2)).toLocaleString('ko-KR');
function loggedRuns(today=planToday()){
  const runs=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key?.startsWith(journalPrefix))continue;
      const date=key.slice(journalPrefix.length);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today)continue;
      const run=runOn(date);
      if(run)runs.push({...run,date});
    }
  }catch{}
  return runs.sort((a,b)=>b.date.localeCompare(a.date));
}
function periodStats(runs,start,end){
  const list=runs.filter(r=>r.date>=start && r.date<=end);
  return {count:list.length,km:list.reduce((s,r)=>s+r.km,0),longest:list.reduce((v,r)=>Math.max(v,r.km),0)};
}
function monthStart(day){return day.slice(0,7)+'-01';}
function shiftMonth(first,offset){
  const date=new Date(first+'T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth()+offset,1);
  return date.toISOString().slice(0,10);
}
function mountMileage(today){
  const yesterday=shiftPlanDate(today,-1),thisMonth=monthStart(today);
  let month=thisMonth,selected='';
  tool('월별 마일리지',`<div id="months"><div class="month-heading"><button type="button" id="prev-month" aria-label="이전 달">‹</button><h4 id="month-label"></h4><button type="button" id="next-month" aria-label="다음 달">›</button></div>
    <strong id="month-total"></strong><p id="month-compare"></p><div id="month-bars" aria-label="월별 거리 비교"></div>
    <div class="month-grid" id="month-days"></div><small id="other-totals"></small></div><button type="button" id="jump-log">지난 러닝 기록하기</button><ul id="month-runs" aria-label="날짜별 기록"></ul>
    <details id="past-runs"><summary>여러 날짜 입력</summary><form id="past-form"><div id="past-rows"></div>
    <div class="actions"><button type="button" id="past-add">다른 날짜 추가</button><button type="submit">기록 저장</button></div></form></details>
    <p role="status" id="past-status"></p>
    <dialog id="day-dialog" aria-labelledby="dialog-date"><form id="calendar-edit"><h3 id="dialog-date"></h3><p id="dialog-plan"></p><label id="past-date-label" hidden>러닝 날짜<input type="date" name="runDate" required></label>
    <label>달린 거리 (km)<input type="number" name="km" min=".01" step=".01" inputmode="decimal" required></label>
    <label>운동 시간 (선택)<input name="elapsed" placeholder="예: 48:59" inputmode="numeric"></label>
    <label>평균 페이스 (선택)<input name="pace" placeholder="예: 4:53" inputmode="numeric"></label>
    <label>스크린샷으로 입력<input type="file" name="photo" accept="image/*"></label><small class="photo-status" role="status"></small>
    <label><input type="checkbox" name="different"> 다르게 달렸어요</label><label id="calendar-type" hidden>실제 훈련<select name="type"></select></label>
    <div class="actions"><button type="submit">저장</button><button id="calendar-cancel" type="button">취소</button></div><p role="status"></p></form></dialog>`);
  const form=$('#past-form'),edit=$('#calendar-edit'),dialog=$('#day-dialog');
  const resetPhoto=mountScreenshotImport(edit);
  dialog.addEventListener('close',resetPhoto);
  function updatePace(){
    const seconds=duration(edit.elements.elapsed.value,true), km=edit.elements.km.valueAsNumber;
    edit.elements.pace.disabled=seconds>0 && km>0;
    if(edit.elements.pace.disabled)edit.elements.pace.value=time(Math.round(seconds/km));
  }
  edit.addEventListener('input',updatePace);
  runTypes.forEach(t=>edit.elements.type.add(new Option(t,t)));
  edit.elements.different.onchange=()=>{$('#calendar-type').hidden=!edit.elements.different.checked;};
  function updatedRun(old,km,date){
    const planned=old && Object.hasOwn(old,'planned')?old.planned:plannedOn(date);
    return {...old,planned,type:old?.type||planned?.type||'자유주',km,pace:old?.elapsed?Math.round(old.elapsed/km):old?.km===km?old.pace:null};
  }
  const dateTitle=date=>Number(date.slice(0,4))+'년 '+Number(date.slice(5,7))+'월';
  function loadDate(date){
    resetPhoto();
    selected=date;
    const run=runOn(date);
    $('#dialog-date').textContent=date+' · '+(run?'기록 수정':'러닝 추가');
    const planned=run && Object.hasOwn(run,'planned')?run.planned:plannedOn(date);
    $('#dialog-plan').textContent=planned?'예정 · '+planned.type+' '+sessionDose(planned):'';
    edit.elements.km.value=run?.km??'';
    edit.elements.elapsed.value=run?.elapsed?time(run.elapsed):'';
    edit.elements.pace.value=run?.pace?time(run.pace):'';
    updatePace();
    edit.elements.different.checked=!!run?.different;
    edit.elements.type.value=runTypes.includes(run?.type)?run.type:'자유주';
    edit.elements.different.onchange();
    edit.querySelector('[role=status]').textContent='';
  }
  function openDate(date,quick=false){
    $('#past-date-label').hidden=!quick;
    edit.elements.runDate.disabled=!quick;
    edit.elements.runDate.max=yesterday;
    edit.elements.runDate.value=date;
    loadDate(date);
    dialog.showModal();edit.elements.km.focus();
  }
  edit.elements.runDate.onchange=()=>loadDate(edit.elements.runDate.value);
  $('#jump-log').onclick=()=>openDate(yesterday,true);
  $('#calendar-cancel').onclick=()=>dialog.close();
  edit.onsubmit=e=>{
    e.preventDefault();
    const old=runOn(selected),run=updatedRun(old,edit.elements.km.valueAsNumber,selected);
    for(const key of ['elapsed','pace']){
      const field=edit.elements[key];
      const value=field.value.trim();
      const seconds=duration(value,key==='elapsed');
      if(value && !seconds){edit.querySelector('[role=status]').textContent='입력한 시간을 확인해 주세요.';field.focus();return;}
      run[key]=seconds || null;
    }
    run.different=edit.elements.different.checked;
    const planned=run.planned;
    if(run.different)run.type=edit.elements.type.value;
    else if(planned && (!old || old.different))run.type=planned.type;
    try{localStorage.setItem(journalPrefix+selected,JSON.stringify(run));}
    catch{edit.querySelector('[role=status]').textContent='거리를 저장하지 못했습니다.';return;}
    for(const row of rows.children){
      if(row.elements.date.value===selected && row.elements.km.value===row.dataset.original)row.elements.date.onchange();
    }
    month=monthStart(selected);dialog.close();render();
    $('#month-days [data-date="'+selected+'"]').focus({preventScroll:true});
    status.textContent=selected+' · '+kmText(run.km)+' km 저장했습니다.';
  };
  function showMonth(first){month=first;render();}
  $('#prev-month').onclick=()=>showMonth(shiftMonth(month,-1));
  $('#next-month').onclick=()=>showMonth(shiftMonth(month,1));
  function render(){
    const runs=loggedRuns(today),next=shiftMonth(month,1),last=shiftPlanDate(next,-1);
    const stats=periodStats(runs,month,last),prior=shiftMonth(month,-1),priorLast=shiftPlanDate(month,-1);
    const partial=month===thisMonth;
    const priorEnd=partial?prior.slice(0,8)+(today.slice(8)<priorLast.slice(8)?today.slice(8):priorLast.slice(8)):priorLast;
    const previous=periodStats(runs,prior,priorEnd);
    $('#month-label').textContent=dateTitle(month);$('#next-month').disabled=partial;
    $('#month-total').textContent=stats.count?kmText(stats.km)+' km · '+stats.count+'회':'기록 없음';
    const diff=stats.km-previous.km;
    $('#month-compare').textContent=(partial?'전월 1–'+Number(priorEnd.slice(8))+'일':'전월 전체')+
      (previous.count?(stats.count?' 대비 '+kmText(Math.abs(diff))+' km '+(diff<0?'감소':diff>0?'증가':'차이'):' · '+kmText(previous.km)+' km'):' · 기록 없음');
    const bars=$('#month-bars');bars.replaceChildren();
    const end=month<shiftMonth(thisMonth,-5)?month:thisMonth;
    const months=Array.from({length:6},(_,i)=>shiftMonth(end,i-5));
    const totals=months.map(m=>periodStats(runs,m,shiftPlanDate(shiftMonth(m,1),-1)));
    const max=Math.max(1,...totals.map(s=>s.km));
    months.forEach((m,i)=>{
      const b=document.createElement('button'),s=totals[i];
      b.type='button';b.setAttribute('aria-pressed',String(m===month));
      b.setAttribute('aria-label',dateTitle(m)+' '+(s.count?kmText(s.km)+' km':'기록 없음'));
      b.innerHTML='<small>'+ (s.count?kmText(s.km):'—')+'</small><i></i><span>'+Number(m.slice(5,7))+'월</span>';
      b.style.setProperty('--height',Math.round(34*s.km/max)+'px');b.onclick=()=>showMonth(m);bars.append(b);
    });
    const list=$('#month-runs');list.replaceChildren();
    for(const run of runs.filter(run=>run.date>=month && run.date<next)){
      const item=document.createElement('li'), button=document.createElement('button');
      button.textContent=run.date.slice(5).replace('-','/')+'　'+run.type+'　'+kmText(run.km)+' km'+(run.elapsed?' · '+time(run.elapsed):'');
      button.onclick=()=>openDate(run.date);item.append(button);list.append(item);
    }
    const grid=$('#month-days');grid.replaceChildren();
    for(const day of planDays){const label=document.createElement('small');label.textContent=day;grid.append(label);}
    const offset=(new Date(month+'T00:00:00Z').getUTCDay()+6)%7;
    for(let i=0;i<offset;i++)grid.append(document.createElement('span'));
    for(let date=month;date<next;date=shiftPlanDate(date,1)){
      const run=runOn(date),b=document.createElement('button');
      b.type='button';b.dataset.date=date;b.disabled=date>today;
      b.innerHTML='<span>'+Number(date.slice(8))+'</span>'+(run?'<small>'+kmText(run.km)+' km</small>':'');
      b.setAttribute('aria-label',date+' '+(run?kmText(run.km)+' km 수정':'기록 추가'));
      if(date===today)b.setAttribute('aria-current','date');
      if(run)b.className='logged';b.onclick=()=>openDate(date);grid.append(b);
    }
    $('#other-totals').textContent='이번 주 '+kmText(periodStats(runs,planMonday(today),today).km)+' km · 올해 '+kmText(periodStats(runs,today.slice(0,4)+'-01-01',today).km)+' km';
  }
  const rows=$('#past-rows'),status=$('#past-status');
  function addRow(date){
    const row=document.createElement('fieldset');
    row.innerHTML='<legend>지난 러닝</legend><div class="actions"><button type="button" data-days="1">어제</button><button type="button" data-days="2">그제</button></div><div class="layout"><label>날짜<input type="date" name="date" required></label><label>달린 거리 (km)<input type="number" name="km" min="0.01" step="0.01" inputmode="decimal" required></label></div><small></small><button type="button" class="remove-row">입력 줄 삭제</button>';
    rows.append(row);
    const day=row.elements.date,km=row.elements.km;
    day.max=yesterday;
    function load(value){
      day.value=value;
      const existing=runOn(value);
      km.value=existing?.km ?? '';
      row.dataset.original=km.value;
      row.querySelector('small').textContent=existing?'저장된 거리 '+kmText(existing.km)+' km · 수정 가능':'';
      status.textContent='';
    }
    day.onchange=()=>load(day.value);
    for(const button of row.querySelectorAll('[data-days]')){
      button.onclick=()=>{load(shiftPlanDate(today,-Number(button.dataset.days)));km.focus();};
    }
    row.querySelector('.remove-row').onclick=()=>{
      row.remove();
      if(!rows.children.length)addRow(yesterday);
    };
    load(date);
    return row;
  }
  $('#past-add').onclick=()=>{
    let date=rows.lastElementChild.elements.date.value||today;
    const dates=new Set(Array.from(rows.children,r=>r.elements.date.value));
    do{date=shiftPlanDate(date,-1);}while(dates.has(date));
    addRow(date).elements.km.focus();
  };
  form.onsubmit=e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const entries=new Map(),written=[];
    try{
      for(const row of rows.children){
        const date=row.elements.date.value,km=row.elements.km.valueAsNumber;
        if(entries.has(date)){status.textContent='같은 날짜가 두 번 있습니다. 날짜를 확인해 주세요.';row.elements.date.focus();return;}
        const key=journalPrefix+date,old=runOn(date);
        const run=updatedRun(old,km,date);
        entries.set(date,{key,previous:localStorage.getItem(key),run});
      }
      for(const entry of entries.values()){
        localStorage.setItem(entry.key,JSON.stringify(entry.run));written.push(entry);
      }
    }catch{
      for(const {key,previous} of written.reverse()){
        if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);
      }
      status.textContent='저장하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.';return;
    }
    const next=shiftPlanDate([...entries.keys()].sort()[0],-1);
    month=monthStart([...entries.keys()].sort().at(-1));render();rows.replaceChildren();addRow(next);
    $('#past-runs').open=false;
    status.textContent=Array.from(entries,([date,{run}])=>date+' · '+kmText(run.km)+' km').join(' / ')+' 저장했습니다.';
  };
  addRow(yesterday);render();
}
const raceGoals={
  '5km':{distance:5,guide:'NHS 첫 5K는 주 3회 걷기와 달리기로 시작해 9주 동안 연속 30분 달리기를 목표로 합니다.',url:'https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/'},
  '10km':{distance:10,guide:'B.A.A. 첫 10K 계획의 첫 주에는 20–25분의 편안한 달리기가 포함됩니다.',url:'https://www.baa.org/races/boston-10k/info-for-athletes/b-a-a-10k-training/'},
  '하프':{distance:21.0975,guide:'B.A.A. 하프 초급 계획의 첫 주 긴 러닝은 약 8km입니다. 최근 최장 거리와 비교해 보세요.',url:'https://www.baa.org/races/boston-half/info-for-athletes/boston-half-training/'},
  '풀코스':{distance:42.195,guide:'B.A.A. 보스턴 풀코스 초급 계획은 주 약 40km에서 시작하며, 후반 긴 러닝은 약 26–29km입니다.',url:'https://www.baa.org/races/boston-marathon/info-for-athletes/boston-marathon-training/'}
};
const raceGoalKey='pace-note.race-goal.v1';
function savedRaceGoal(){
  try{const x=JSON.parse(localStorage.getItem(raceGoalKey));return x && Object.hasOwn(raceGoals,x.name)?x:null;}catch{return null;}
}
function mountRaceGoal(startPlan){
  const today=planToday(), runs=loggedRuns(today),since=shiftPlanDate(today,-27);
  const stats=periodStats(runs,since,today);
  const first=runs.at(-1)?.date;
  const days=first?Math.min(28,1+(Date.parse(today)-Date.parse(first))/86400000):0;
  const weeks=Math.max(1,days/7),avg=stats.km/weeks,freq=stats.count/weeks;
  const saved=savedRaceGoal();
  const suggested=days>=21 && avg>=40 && freq>=3 && stats.longest>=16?'풀코스':
    days>=21 && avg>=20 && freq>=2 && stats.longest>=8?'하프':
    stats.longest>=5 && stats.count>=3?'10km':'5km';
  tool('내 기록으로 대회 준비하기',`<p id="goal-stats"></p><p id="goal-suggestion"></p>
    <div class="layout"><label>목표 거리<select id="goal-distance"></select></label>
    <label>대회 날짜 (선택)<input id="goal-date" type="date" min="${today}"></label></div>
    <p id="goal-comparison"></p><p id="goal-calendar"></p>
    <small>거리 제안은 최근 기록을 바탕으로 한 훈련 목표 후보입니다. <a id="goal-guide">참고 훈련 계획</a></small>
    <div class="actions"><button class="primary" id="goal-start"></button><a href="#races" id="goal-events">이 거리의 대회 보기</a></div><p id="goal-note" role="status"></p>`);
  const select=$('#goal-distance'),date=$('#goal-date');
  for(const name of Object.keys(raceGoals))select.add(new Option(name,name));
  select.value=saved?.name||suggested;date.value=saved?.date>=today?saved.date:'';
  $('#goal-stats').textContent=stats.count?'최근 28일 중 기록 기간 '+days+'일 · 주평균 '+kmText(avg)+'km · 주 '+kmText(freq)+'회 · 최장 '+kmText(stats.longest)+'km':
    '최근 28일간 저장된 러닝이 없습니다. 오늘 탭에서 지난 러닝을 추가하거나 직접 목표를 선택하세요.';
  $('#goal-suggestion').textContent=days<14 || stats.count<3
    ? '기록이 적어 아직 거리 추천을 보류합니다. 원하는 목표를 직접 골라 보세요.'
    : '기록으로 살펴볼 다음 목표 · '+suggested;
  function show(){
    const info=raceGoals[select.value];$('#goal-guide').href=info.url;
    const personal=stats.count ? (select.value==='풀코스'?'내 주평균 '+kmText(avg)+'km · 최근 최장 '+kmText(stats.longest)+'km. ':
      select.value==='하프'?'내 최근 최장 '+kmText(stats.longest)+'km. ':
      '최근 '+stats.count+'회 달렸고 가장 긴 기록은 '+kmText(stats.longest)+'km입니다. ') : '';
    $('#goal-comparison').textContent=personal+info.guide;
    const remain=(Date.parse(date.value)-Date.parse(today))/86400000;
    $('#goal-calendar').textContent=Number.isFinite(remain)?(remain<0?'오늘 이후의 날짜를 선택하세요.':remain===0?'대회 당일입니다.':'대회까지 '+Math.floor(remain/7)+'주 '+remain%7+'일 · '+(remain<7?'이번 주에는 목표 거리를 채우려고 훈련량을 늘리지 마세요.':'이번 주 계획부터 구성하세요.')):'';
    $('#goal-start').textContent=select.value+' 준비 계획 만들기';
  }
  select.onchange=date.oninput=show;show();
  $('#goal-events').onclick=()=>{raceListFilter=select.value;};
  $('#goal-start').onclick=()=>{
    if(!date.reportValidity())return;
    const target={name:select.value,date:date.value};
    try{localStorage.setItem(raceGoalKey,JSON.stringify(target));}
    catch{$('#goal-note').textContent='목표를 저장하지 못했습니다.';return;}
    startPlan(target,{avg,freq,days});
  };
}
let raceListFilter='';
