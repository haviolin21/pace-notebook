const planDays = ['월','화','수','목','금','토','일'];
const runTypes = ['걷기·달리기','이지런','회복런','긴 이지런','템포런','인터벌','자유주'];
const weekPlanKey = 'pace-note.weekly-plan.v2';
const legacyPlanKey = 'pace-note.weekly-plan.v1';
function shiftPlanDate(date,days){
  const value = new Date(date+'T00:00:00Z');
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}
function planToday(){return new Date(Date.now()+9*3600000).toISOString().slice(0,10);}
function planMonday(date=planToday()){
  return shiftPlanDate(date,-((new Date(date+'T00:00:00Z').getUTCDay()+6)%7));
}
function validSessions(list){
  return Array.isArray(list) && list.length<=7 && new Set(list.map(s=>s?.day)).size===list.length &&
    list.every(s=>s && Number.isInteger(s.day) && s.day>=0 && s.day<7 && runTypes.includes(s.type) &&
      Number.isFinite(Number(s.minutes ?? s.km)) && Number(s.minutes ?? s.km)>0);
}
function readPlanBook(){
  const raw = localStorage.getItem(weekPlanKey);
  if(raw){
    const book=JSON.parse(raw);
    if(!book || !Array.isArray(book.routine) || !validSessions(book.routine) || !book.weeks ||
       !Object.values(book.weeks).every(validSessions)) throw Error('Invalid plan');
    return book;
  }
  const old=JSON.parse(localStorage.getItem(legacyPlanKey) || 'null');
  if(old!==null && !validSessions(old)) throw Error('Invalid legacy plan');
  return {routine:old || [],weeks:{},hasRoutine:old!==null};
}
function effectivePlan(book,week){
  return book.weeks[week] ?? (book.hasRoutine ? book.routine : null);
}
function readWeeklyPlan(){return effectivePlan(readPlanBook(),planMonday());}
function sessionDose(s){return s.minutes!=null ? Number(s.minutes)+'분' : Number(s.km)+'km';}
const dayPurpose = {
  '걷기·달리기':'걷기 사이에 짧은 달리기 넣기',이지런:'대화할 수 있는 속도로',
  회복런:'평소보다 여유롭게', '긴 이지런':'편한 속도를 오래 유지하기',
  템포런:'준비 · 일정한 템포 · 마무리',인터벌:'준비 · 빠르게 뛰고 회복하기 · 마무리',자유주:'컨디션에 맞춰 자유롭게'
};
function proposeWeek(days,goal,unit,amount,frequency){
  const length=days.length;
  const types=days.map(()=>goal==='begin'?'걷기·달리기':'이지런');
  if(goal!=='begin' && length>=2) types[length-1]='긴 이지런';
  if(goal==='improve' && length>=2 && frequency!=='1'){
    const quality=days.findIndex((day,i)=>i<length-1 && (days[length-1]-day)>1 && (7-days[length-1]+day)>1);
    if(quality>=0) types[quality]='템포런';
  }
  if(goal!=='begin' && length>=3){
    days.forEach((d,i)=>{if(i>0 && d-days[i-1]===1 && types[i]==='이지런')types[i]='회복런';});
  }
  const weights=types.map(t=>t==='긴 이지런'?1.35:t==='회복런'?.75:1);
  const sum=weights.reduce((a,b)=>a+b,0);
  let allocated=0,weight=0;
  return days.map((day,i)=>{
    if(unit==='min')return {day,type:types[i],goal,minutes:amount};
    weight+=weights[i];
    const end=Math.round(amount*10*weight/sum);
    const km=(end-allocated)/10;
    allocated=end;
    return {day,type:types[i],goal,km};
  });
}
function sessionGuidance(s,paces){
  const timed=s.minutes!=null, amount=Number(s.minutes ?? s.km), unit=timed?'분':'km';
  const quality=s.type==='템포런'||s.type==='인터벌';
  const pace=paces && s.type!=='걷기·달리기' ? todayPace(s.type,paces).value : '';
  const parts=[];
  if(quality){
    const warm=Math.round(amount*0.25*10)/10;
    const main=Math.round((amount-2*warm)*10)/10;
    if(warm>0 && main>0){
      const fast=s.type==='템포런'?'템포':'빠른 구간과 느린 회복';
      parts.push('준비 '+warm+unit+' · '+fast+' '+main+unit+' · 마무리 '+warm+unit);
    }
  }
  parts.push(todayRunTips[s.type]);
  if(pace)parts.push('PB 기준 '+(quality?'빠른 구간 ':'')+'페이스 '+pace);
  if(!timed && pace){
    const easy=(paces.easyFast+paces.easySlow)/2;
    let sec=easy;
    if(s.type==='템포런')sec=(easy+paces.tempo)/2;
    if(s.type==='인터벌')sec=(3*easy+paces.interval)/4;
    if(s.type==='회복런'||s.type==='긴 이지런')sec=paces.easySlow;
    parts.push('예상 약 '+Math.max(1,Math.round(amount*sec/60))+'분');
  }
  return parts.join('<br>');
}
function nextScheduledRun(today){
  let book;
  try{book=readPlanBook();}catch{return null;}
  for(let i=0;i<14;i++){
    const date=shiftPlanDate(today,i),day=(new Date(date+'T00:00:00Z').getUTCDay()+6)%7;
    const session=effectivePlan(book,planMonday(date))?.find(s=>s.day===day);
    if(session && !runOn(date))return {date,session};
  }
  return null;
}
function planOutcome(session,run){
  if(!run)return '기록 없음';
  if(!session)return '계획 외 러닝';
  const actual=run.type==='첫 러닝'?'걷기·달리기':run.type;
  if(run.different || actual!==session.type)return '다르게 달림';
  if(session.minutes && !run.elapsed)return '시간 미입력';
  const matches=session.km!=null?Math.abs(session.km-run.km)<0.005:Math.round(run.elapsed/60)===Number(session.minutes);
  return matches?'계획대로 완료':'다르게 달림';
}
function mountMove(host,date,session,after){
  if(!session || runOn(date))return;
  const today=planToday(),week=planMonday(date);
  const box=document.createElement('details');
  box.innerHTML='<summary>다른 날로 이동</summary><form><label>옮길 날짜<input name="date" type="date" required></label><button type="submit">이날로 이동</button><small role="status"></small></form>';
  host.append(box);
  const form=box.querySelector('form'),input=form.elements.date,msg=box.querySelector('small');
  input.min=today;
  form.onsubmit=e=>{
    e.preventDefault();
    const dest=input.value,toWeek=planMonday(dest),day=(new Date(dest+'T00:00:00Z').getUTCDay()+6)%7;
    try{
      const book=readPlanBook(),from=effectivePlan(book,week)||[],to=effectivePlan(book,toWeek)||[];
      if(runOn(date)||!from.some(s=>JSON.stringify(s)===JSON.stringify(session))){msg.textContent='원래 일정이 변경되었습니다. 다시 열어 주세요.';return;}
      if(dest===date||runOn(dest)||to.some(s=>s.day===day)){msg.textContent='훈련이나 기록이 없는 다른 날짜를 골라 주세요.';return;}
      book.weeks[week]=from.filter(s=>s.day!==session.day);
      book.weeks[toWeek]=[...(week===toWeek?book.weeks[week]:to),{...session,day}].sort((a,b)=>a.day-b.day);
      localStorage.setItem(weekPlanKey,JSON.stringify(book));after(dest);
    }catch{msg.textContent='일정을 저장하지 못했습니다.';}
  };
}
function planReason(s){
  const reason={begin:'첫 러닝에 익숙해지기',regular:'꾸준히 달리기',improve:'기록 향상'};
  return [reason[s.goal],dayPurpose[s.type]].filter(Boolean).join(' · ');
}
function mountPlanner(){
  const base=$('#planner');
  const week=planMonday(), today=planToday();
  const dateLabel=d=>d.slice(5).replace('-','.');
  const record=readRaceRecord(), paces=trainingPaces(record.d,record.t);
  let book;
  try{book=readPlanBook();}catch{base.textContent='저장한 계획을 불러오지 못했습니다. 브라우저 저장 상태를 확인해 주세요.';return;}
  let saved=effectivePlan(book,week), draft=[], editing=false, scope='week', note='';
  const checked=new Set();
  let goal=coachProfile().mode==='beginner' || !record.t?'begin':'regular';
  let unit=goal==='begin'?'min':'km', amount=20;
  const order=(a,b)=>a.day-b.day;
  let target=savedRaceGoal();
  function setup(){
    base.innerHTML=`<section class="runner-tool"><h3>${target?target.name+' 준비 · ':''}이번 주에는 언제 달릴 수 있나요?</h3>
      <p class="plan-date">${dateLabel(week)}–${dateLabel(shiftPlanDate(week,6))}</p>
      <div class="plan-days" role="group" aria-label="달릴 수 있는 요일"></div>
      <div class="layout"><label>이번 주 목적<select id="week-goal"><option value="begin">처음 시작하기</option><option value="regular">꾸준히 달리기</option><option value="improve">기록 향상</option></select></label>
      <label>운동량 기준<select id="week-unit"><option value="min">시간으로</option><option value="km">거리로</option></select></label></div>
      <label><span id="dose-label"></span><input id="week-dose" type="number" inputmode="decimal" required></label>
      <small id="days-summary"></small><div class="actions"><button class="primary" id="propose">내 일정으로 추천받기</button><button id="manual">직접 구성하기</button></div>
      ${saved!==null?'<button id="keep-plan">기존 계획으로 돌아가기</button>':''}</section>`;
    const dose=$('#week-dose'), goalInput=$('#week-goal'), unitInput=$('#week-unit');
    function validate(){
      const valid=checked.size>0 && dose.valueAsNumber>0 && dose.validity.valid;
      $('#propose').disabled=!valid;
      $('#days-summary').textContent=checked.size?'선택한 요일 · 주 '+checked.size+'회':'달릴 수 있는 요일을 선택하세요.';
    }
    function showUnit(){
      $('#dose-label').textContent=unit==='min'?'한 번에 달릴 시간 (분)':'원하는 주간 총 거리 (km)';
      dose.min='1';dose.step=unit==='min'?'1':'0.1';dose.value=amount;validate();
    }
    planDays.forEach((name,i)=>{
      const b=document.createElement('button');b.textContent=name;b.setAttribute('aria-label',name+'요일');b.setAttribute('aria-pressed',String(checked.has(i)));
      b.onclick=()=>{if(checked.has(i))checked.delete(i);else checked.add(i);b.setAttribute('aria-pressed',String(checked.has(i)));validate();};
      $('.plan-days').append(b);
    });
    goalInput.value=goal;goalInput.onchange=()=>{goal=goalInput.value;};
    unitInput.value=unit;unitInput.onchange=()=>{unit=unitInput.value;amount=20;showUnit();};
    dose.oninput=()=>{amount=dose.valueAsNumber;validate();};showUnit();
    $('#propose').onclick=()=>{draft=proposeWeek([...checked].sort((a,b)=>a-b),goal,unit,amount,record.frequency);startDraft();};
    if(saved!==null)$('#keep-plan').onclick=()=>{editing=false;note='';draw();};
    $('#manual').onclick=()=>{draft=[];startDraft();};
  }
  function startDraft(){editing=true;scope=saved===null?'routine':'week';note='';draw();}
  function draw(){
    const sessions=editing?draft:saved;
    const dated=planDays.map((_,i)=>shiftPlanDate(week,i));
    const done=dated.map(d=>runOn(d));
    const next=[...sessions].sort(order).find(s=>dated[s.day]>=today && !done[s.day]);
    const upcoming=editing?null:nextScheduledRun(today);
    const mins=sessions.reduce((a,s)=>a+Number(s.minutes||0),0);
    const kms=sessions.reduce((a,s)=>a+Number(s.km||0),0);
    const total=[kms?Number(kms.toFixed(1))+'km':'',mins?Number(mins.toFixed(1))+'분':''].filter(Boolean).join(' + ');
    base.innerHTML=`<section class="runner-tool">
      ${upcoming?`<header class="next-session"><small>다음 훈련 · ${dateLabel(upcoming.date)}</small><p>${planDays[upcoming.session.day]}요일</p><h2>${upcoming.session.type} ${sessionDose(upcoming.session)}</h2><div id="next-move"></div></header>`:''}
      <div class="week-heading"><h3>${editing?(saved===null?'내 계획 초안':'이번 주 일정 수정'):'이번 주 일정'}</h3>${editing?'':'<button id="edit-plan">훈련 수정</button>'}</div>
      <p class="plan-date">${dateLabel(week)}–${dateLabel(dated[6])} · 주 ${sessions.length}회${total?' · '+total:''}</p>
      <ol class="week-list"></ol>
      ${editing?`<label>저장 범위<select id="plan-scope"><option value="week">이번 주만 적용</option><option value="routine">이번 주와 기본 루틴에 적용</option></select></label>
      <small>기본 루틴은 다음 주부터 같은 요일에 반복됩니다.</small>
      <div class="actions"><button class="primary" id="commit-plan">${saved===null?'이 계획으로 시작':'변경 저장'}</button><button id="cancel-plan">${saved===null?'조건 다시 선택':'취소'}</button></div>`:
      '<div class="actions"><button id="restart-plan">추천 다시 받기</button></div>'}
      <p role="status" id="week-note"></p></section>`;
    $('#week-note').textContent=note;
    function moved(dest){book=readPlanBook();saved=effectivePlan(book,week);note=dest+'로 훈련을 옮겼습니다.';draw();}
    if(upcoming)mountMove($('#next-move'),upcoming.date,upcoming.session,moved);
    planDays.forEach((name,day)=>{
      const session=sessions.find(s=>s.day===day), li=document.createElement('li');
      const title=session?session.type+' · '+sessionDose(session):'휴식';
      const badge=done[day]?planOutcome(session,done[day]):dated[day]<today && session?'기록 없음':dated[day]===today?'오늘':'';
      li.innerHTML=`<details><summary class="plan-day-summary"><span>${name}요일</span><span><b>${title}</b></span><span>${editing?(session?'편집':'추가'):(badge || (session?'예정':''))}</span></summary><div class="plan-day-body"></div></details>`;
      const body=li.querySelector('.plan-day-body');
      if(session){const p=document.createElement('p');p.innerHTML=planReason(session)+'<br>'+sessionGuidance(session,paces);body.append(p);}
      if(done[day]){
        const actual=document.createElement('small');
        actual.className='actual-result';
        actual.textContent=(session?'예정 '+sessionDose(session)+' · ':'')+'실제 '+kmText(done[day].km)+'km'+(done[day].elapsed?' · '+time(done[day].elapsed):'');
        body.append(actual);
        const p=document.createElement('p');p.textContent='실제 훈련 · '+done[day].type;body.append(p);
      }
      if(!editing && session && !done[day] && dated[day]>=today)quickEditor(body,session);
      if(!editing && session && !done[day] && session!==next)mountMove(body,dated[day],session,moved);
      if(editing) dayEditor(body,day,session);
      else if(!session && !done[day])body.textContent='예정된 훈련이 없습니다.';
      $('.week-list').append(li);
    });
    if(!editing){$('#restart-plan').onclick=setup;$('#edit-plan').onclick=()=>{draft=saved.map(s=>({...s}));startDraft();};return;}
    $('#plan-scope').value=scope;$('#plan-scope').onchange=e=>{scope=e.target.value;};
    $('#cancel-plan').onclick=()=>{editing=false;note='';if(saved===null)setup();else draw();};
    $('#commit-plan').onclick=()=>{
      if(!validSessions(draft))return;
      try{
        const latest=readPlanBook();
        if(JSON.stringify(effectivePlan(latest,week))!==JSON.stringify(saved)){
          $('#week-note').textContent='다른 화면에서 계획이 변경됐습니다. 새로고침해 최신 일정을 확인하세요.';return;
        }
        latest.weeks[week]=draft.slice().sort(order);
        if(scope==='routine'){latest.routine=latest.weeks[week];latest.hasRoutine=true;}
        localStorage.setItem(weekPlanKey,JSON.stringify(latest));
        book=latest;saved=effectivePlan(book,week);editing=false;note='계획을 저장했습니다.';draw();
      }catch{$('#week-note').textContent='저장하지 못했습니다. 변경한 초안은 이 화면에 남아 있습니다.';}
    };
  }
  function quickEditor(body,session){
    const form=document.createElement('form');
    form.className='day-editor';
    form.innerHTML='<label>훈련 종류<select name="type"></select></label><div class="layout"><label>운동량<input type="number" min="0.1" step="0.1" inputmode="decimal" name="amount" required></label><label>단위<select name="unit"><option value="minutes">분</option><option value="km">km</option></select></label></div><label><input type="checkbox" name="repeat"> 매주 '+planDays[session.day]+'요일에도 적용</label><button type="submit">이 훈련 저장</button><small role="status"></small>';
    const f=form.elements;
    runTypes.forEach(type=>f.type.add(new Option(type,type)));
    f.type.value=session.type;f.unit.value=session.km!=null?'km':'minutes';f.amount.value=session[f.unit.value];
    form.onsubmit=e=>{
      e.preventDefault();
      const updated={...session,type:f.type.value};
      delete updated.minutes;delete updated.km;
      updated[f.unit.value]=f.amount.valueAsNumber;
      const replaceDay=list=>[...list.filter(s=>s.day!==session.day),updated].sort(order);
      try{
        const latest=readPlanBook(),current=effectivePlan(latest,week)||[];
        if(JSON.stringify(current.find(s=>s.day===session.day))!==JSON.stringify(session)){
          form.querySelector('small').textContent='일정이 변경됐습니다. 화면을 다시 열어 주세요.';return;
        }
        latest.weeks[week]=replaceDay(current);
        if(f.repeat.checked){latest.routine=replaceDay(latest.routine);latest.hasRoutine=true;}
        localStorage.setItem(weekPlanKey,JSON.stringify(latest));
        book=latest;saved=latest.weeks[week];note=planDays[session.day]+'요일 '+updated.type+' '+sessionDose(updated)+' 저장했습니다.';draw();
      }catch{form.querySelector('small').textContent='저장하지 못했습니다. 다시 시도해 주세요.';}
    };
    body.prepend(form);
  }
  function dayEditor(body,day,session){
    const form=document.createElement('form');form.className='day-editor';
    form.innerHTML=`<div class="layout"><label>요일<select name="day"></select></label><label>훈련 종류<select name="type"></select></label></div>
      <div class="layout"><label>단위<select name="unit"><option value="min">분</option><option value="km">km</option></select></label>
      <label>운동량<input type="number" name="amount" min="0.1" step="0.1" required inputmode="decimal"></label></div>
      <div class="actions"><button type="submit">초안에 반영</button>${session?'<button type="button" data-remove>휴식으로 변경</button>':''}</div>`;
    const f=form.elements;
    planDays.forEach((n,i)=>{const occupied=draft.some(s=>s.day===i && i!==day);if(session||!occupied)f.day.add(new Option(n+'요일'+(occupied?' (일정 교환)':''),i));});
    runTypes.forEach(t=>f.type.add(new Option(t,t)));
    f.day.value=day;f.type.value=session?.type || (goal==='begin'?'걷기·달리기':'이지런');
    f.unit.value=session?(session.minutes!=null?'min':'km'):unit;
    f.amount.value=session?(session.minutes ?? session.km):(unit==='min'?20:5);
    form.oninput=()=>{
      $('#commit-plan').disabled=true;
      $('#week-note').textContent='편집 중인 일정을 초안에 반영해 주세요.';
    };
    form.onsubmit=e=>{
      e.preventDefault();
      const target=Number(f.day.value),other=draft.find(s=>s.day===target && target!==day);
      if(other)other.day=day;
      draft=draft.filter(s=>s!==session);
      draft.push({day:target,type:f.type.value,goal:session?.goal||goal,[f.unit.value==='min'?'minutes':'km']:f.amount.valueAsNumber});
      note='초안에 반영했습니다. 계획을 저장하면 적용됩니다.';draw();
    };
    if(session)form.querySelector('[data-remove]').onclick=()=>{draft=draft.filter(s=>s!==session);note='휴식으로 변경했습니다.';draw();};
    body.append(form);
  }
  if(saved===null)setup();else draw();
  mountRaceGoal((selected,stats)=>{
    target=selected;
    const beginner=selected.name==='5km' && (!stats.days || stats.avg<10);
    goal=beginner?'begin':'regular';
    unit=beginner || stats.days<14 || !stats.avg?'min':'km';
    amount=unit==='min'?20:Math.max(1,Math.round(stats.avg));
    checked.clear();
    for(const s of saved||[])checked.add(s.day);
    editing=false;note='';setup();base.scrollIntoView({block:'start'});
  });
}
