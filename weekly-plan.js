const planDays=['월','화','수','목','금','토','일'];
const runTypes=['이지런','템포런','인터벌','긴 이지런','회복런','자유주'];
const routines=[
  {name:'주 2회 · 가볍게 뛰기',days:[2,6],types:[0,3],weights:[.45,.55]},
  {name:'주 3회 · 균형 있게',days:[1,3,6],types:[0,1,3],weights:[.25,.30,.45]},
  {name:'주 4회 · 거리 나누기',days:[0,2,4,6],types:[0,1,4,3],weights:[.25,.25,.15,.35]}
];
const planKey='pace-note.weekly-plan.v1';
let planDraft=null, planDirty=false, planRoutine=1, planTarget='20';
function suggestedSessions(index,km){
  const routine=routines[index], total=Math.round(km*10);
  let previous=0,cumulative=0;
  return routine.days.map((day,i)=>{
    cumulative+=routine.weights[i];const checkpoint=Math.round(total*cumulative);
    const distance=(checkpoint-previous)/10;previous=checkpoint;
    return {day,type:runTypes[routine.types[i]],km:String(distance)};
  });
}
function planError(list){
  if(!Array.isArray(list)||list.length>7)return '주간 일정은 최대 7일입니다.';
  const days=new Set();
  for(const s of list){
    if(!s||!Number.isInteger(s.day)||s.day<0||s.day>6||!runTypes.includes(s.type))return '요일과 훈련 종류를 확인하세요.';
    if(days.has(s.day))return '요일이 겹칩니다. 다른 요일을 선택하세요.';
    if(!Number.isFinite(Number(s.km))||Number(s.km)<=0)return '훈련 거리는 0보다 큰 숫자로 입력하세요.';
    days.add(s.day);
  }
  return '';
}
function readWeeklyPlan(){
  const raw = localStorage.getItem(planKey);
  if(raw === null) return null;
  const saved = JSON.parse(raw);
  if(planError(saved)) throw Error('Invalid weekly plan');
  return saved;
}
function mountPlanner(){
  const base = document.querySelector('#planner');
  let loadNote = '';
  let selectedDay = null;
  if(planDraft === null){
    try{
      planDraft = readWeeklyPlan();
      if(planDraft !== null) loadNote = '저장한 계획을 불러왔습니다.';
    }catch{ loadNote = '저장한 계획을 읽지 못했습니다.'; }
    planDraft ??= suggestedSessions(1,20);
  }
  base.innerHTML = `
    <section class="runner-tool" aria-labelledby="week-heading">
      <h3 id="week-heading">내 주간 일정</h3>
      <ol class="week-list" id="sessions"></ol>
      <div class="actions">
        <button class="primary" id="save" type="button">계획 저장</button>
        <button id="add" type="button">훈련 추가</button>
      </div>
      <div id="plan-msg" class="plan-msg" role="status"></div>
    </section>
    <section class="runner-tool" aria-labelledby="recommend-heading">
      <h3 id="recommend-heading">이번 주 추천</h3>
      <div class="layout">
        <label>훈련 횟수와 구성<select id="routine"></select></label>
        <label>원하는 주간 거리 (km)<input id="target" inputmode="decimal" type="number" min="1" step="0.1"></label>
      </div>
      <div class="weekly-preview" id="suggestion"></div>
      <div class="actions">
        <button id="apply" type="button">추천 적용</button>
        <button id="blank" type="button">빈 계획으로 시작</button>
      </div>
    </section>
  `;
  const get = selector => base.querySelector(selector);
  function options(select, items, value){
    items.forEach(([v,t]) => select.add(new Option(t,v)));
    select.value = value;
  }
  options(get('#routine'), routines.map((routine,i) => [i,routine.name]), planRoutine);
  get('#target').value = planTarget;
  const message = text => { get('#plan-msg').textContent = text; };
  function preview(){
    planRoutine = Number(get('#routine').value);
    planTarget = get('#target').value;
    const km = Number(planTarget);
    const valid = Number.isFinite(km) && km >= 1 && get('#target').validity.valid;
    get('#apply').disabled = !valid;
    get('#suggestion').innerHTML = valid
      ? suggestedSessions(planRoutine,km).map(s => row(planDays[s.day]+' · '+s.type,s.km+'km')).join('')
      : '주간 거리를 1km 이상, 0.1km 단위로 입력하세요.';
  }
  function summary(){
    const error = planError(planDraft);
    const total = planDraft.reduce((sum,session) => sum + Number(session.km),0);
    get('#week-heading').textContent = error ? '내 주간 일정' : '내 주간 일정 · '+planDraft.length+'회 · '+Number(total.toFixed(2))+'km';
    get('#save').disabled = !!error || selectedDay !== null;
    get('#add').disabled = planDraft.length >= 7;
    message(error || (planDirty ? '변경한 계획을 저장하세요.' : loadNote));
  }
  function showDay(day){
    selectedDay = day;
    draw();
    const target = day === null ? null : get('[data-day="'+day+'"]');
    if(target) target.focus();
  }
  function closeEditor(day){
    showDay(null);
    get('[data-day="'+day+'"]').focus();
  }
  function editorFor(day, session){
    const form = document.createElement('form');
    form.className = 'day-editor';
    form.id = 'edit-day-' + day;
    form.innerHTML = `
      <div class="layout">
        <label>요일<select name="day"></select></label>
        <label>훈련 종류<select name="type"></select></label>
        <label>거리 (km)<input name="km" type="number" min="0" step="any" inputmode="decimal" required></label>
      </div>
      <div class="actions">
        <button type="submit">일정 반영</button>
        <button type="button" data-cancel>취소</button>
        ${session ? '<button type="button" data-remove>이 훈련 삭제</button>' : ''}
      </div>
    `;
    const [dayInput, typeInput] = form.querySelectorAll('select');
    const distance = form.querySelector('input');
    const choices = planDays.flatMap((name, i) => {
      const occupied = planDraft.some(item => item.day === i) && i !== day;
      if(occupied && !session) return [];
      return [[i, name + (occupied ? '요일 (일정 교환)' : '요일')]];
    });
    options(dayInput, choices, day);
    options(typeInput, runTypes.map(type => [type,type]), session?.type ?? runTypes[0]);
    distance.value = session?.km ?? '5';
    form.querySelector('[data-cancel]').onclick = () => closeEditor(day);
    if(session){
      form.querySelector('[data-remove]').onclick = () => {
        planDraft = planDraft.filter(item => item !== session);
        planDirty = true;
        closeEditor(day);
      };
    }
    distance.oninput = () => distance.setCustomValidity('');
    form.onsubmit = event => {
      event.preventDefault();
      if(!(distance.valueAsNumber > 0)){
        distance.setCustomValidity('훈련 거리는 0보다 큰 숫자로 입력하세요.');
        distance.reportValidity();
        return;
      }
      const nextDay = Number(dayInput.value);
      const occupied = planDraft.find(item => item.day === nextDay && item !== session);
      if(occupied) occupied.day = day;
      const updated = {day:nextDay, type:typeInput.value, km:distance.value};
      if(session) Object.assign(session, updated);
      else planDraft.push(updated);
      planDirty = true;
      closeEditor(nextDay);
    };
    return form;
  }
  function draw(){
    const list = get('#sessions');
    list.replaceChildren();
    planDays.forEach((name,day) => {
      const session = planDraft.find(item => item.day === day);
      const item = document.createElement('li');
      const button = document.createElement('button');
      const open = selectedDay === day;
      button.className = 'day-row';
      button.type = 'button';
      button.dataset.day = day;
      button.setAttribute('aria-expanded', String(open));
      button.innerHTML = '<span class="day-name"></span><span></span><span class="day-action"></span>';
      button.children[0].textContent = name + '요일';
      button.children[1].textContent = session ? session.type + ' · ' + session.km + 'km' : '휴식';
      button.children[1].classList.toggle('day-rest', !session);
      button.children[2].textContent = session ? '편집' : '추가';
      button.onclick = () => open ? closeEditor(day) : showDay(day);
      item.append(button);
      if(open){
        button.setAttribute('aria-controls', 'edit-day-' + day);
        item.append(editorFor(day, session));
      }
      list.append(item);
    });
    summary();
  }
  get('#routine').onchange = preview;
  get('#target').oninput = preview;
  get('#apply').onclick = () => {
    planDraft = suggestedSessions(planRoutine, Number(planTarget));
    planDirty = true;
    showDay(null);
  };
  get('#blank').onclick = () => {
    planDraft = [];
    planDirty = true;
    showDay(null);
  };
  get('#add').onclick = () => {
    const day = planDays.findIndex((_, i) => !planDraft.some(session => session.day === i));
    if(day >= 0) showDay(day);
  };
  get('#save').onclick = () => {
    if(planError(planDraft)) return;
    try{
      localStorage.setItem(planKey, JSON.stringify(planDraft));
      planDirty = false;
      loadNote = '이 브라우저에 저장했습니다.';
      summary();
    }catch{ message('저장할 수 없습니다. 브라우저 저장 공간을 확인하세요.'); }
  };
  preview();
  draw();
}
