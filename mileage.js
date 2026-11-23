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
function mountMileage(today,onChange){
  const yesterday=shiftPlanDate(today,-1);
  tool('내 마일리지',`<div class="mileage-period" role="group" aria-label="집계 기간"></div>
    <div class="mileage-number" aria-live="polite"></div><p id="mileage-summary"></p>
    <ol class="week-track"></ol><p id="run-receipt"></p>
    <details id="past-runs"><summary>지난 러닝 추가</summary>
      <form id="past-form"><div id="past-rows"></div>
      <div class="actions"><button type="button" id="past-add">다른 날짜 추가</button><button type="submit">기록 저장</button></div></form>
      </details><p role="status" id="past-status"></p><h4>날짜별 러닝 기록</h4><div id="past-list"></div><button type="button" id="past-more" hidden>이전 기록 더 보기</button>`);
  const form=$('#past-form'),period=$('.mileage-period');
  let current='월간',visibleCount=7;
  $('#past-more').onclick=()=>{visibleCount+=14;render();};
  function updatedRun(old,km){
    return {...old,type:old?.type||'자유주',km,pace:old?.elapsed?Math.round(old.elapsed/km):old?.km===km?old.pace:null};
  }
  function render(){
    const runs=loggedRuns(today),week=periodStats(runs,planMonday(today),today);
    const start=current==='주간'?planMonday(today):current==='올해'?today.slice(0,4)+'-01-01':monthStart(today);
    const stats=periodStats(runs,start,today);
    $('.mileage-number').textContent=(current==='월간'?'이번 달':current==='주간'?'이번 주':'올해')+' '+kmText(stats.km)+' km';
    $('#mileage-summary').textContent=stats.count+'회 러닝 · 이번 주 '+kmText(week.km)+' km';
    for(const b of period.children)b.setAttribute('aria-pressed',String(b.textContent===current));
    const list=$('#past-list');list.replaceChildren();
    const past=runs.filter(r=>r.date<today);
    $('#past-more').hidden=past.length<=visibleCount;
    if(!past.length)list.textContent='아직 저장한 지난 러닝이 없습니다.';
    for(const run of past.slice(0,visibleCount)){
      const item=document.createElement('details');
      item.innerHTML='<summary><time></time><strong></strong><span>수정</span></summary><form><label>달린 거리 (km)<input type="number" name="km" min="0.01" step="0.01" inputmode="decimal" required></label><div class="actions"><button type="submit">변경 저장</button><button type="button">취소</button></div></form>';
      item.querySelector('time').textContent=run.date;
      item.querySelector('strong').textContent=kmText(run.km)+' km';
      const editor=item.querySelector('form'),field=editor.elements.km;
      field.value=run.km;
      item.ontoggle=()=>{if(!item.open)field.value=run.km;};
      editor.querySelector('[type=button]').onclick=()=>{item.open=false;item.querySelector('summary').focus();};
      editor.onsubmit=e=>{
        e.preventDefault();
        const km=field.valueAsNumber;
        try{localStorage.setItem(journalPrefix+run.date,JSON.stringify(updatedRun(runOn(run.date),km)));}
        catch{status.textContent='거리를 저장하지 못했습니다.';return;}
        for(const row of rows.children){
          if(row.elements.date.value===run.date && row.elements.km.value===row.dataset.original)row.elements.date.onchange();
        }
        onChange();
        status.textContent=run.date+' · '+kmText(km)+' km로 수정했습니다.';
      };
      list.append(item);
    }
  }
  for(const name of ['주간','월간','올해']){
    const b=document.createElement('button');b.textContent=name;b.onclick=()=>{current=name;render();};period.append(b);
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
        const run=updatedRun(old,km);
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
    onChange();rows.replaceChildren();addRow(next);
    $('#past-runs').open=false;
    status.textContent=Array.from(entries,([date,{run}])=>date+' · '+kmText(run.km)+' km').join(' / ')+' 저장했습니다.';
  };
  addRow(yesterday);return render;
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
