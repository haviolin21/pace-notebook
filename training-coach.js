const raceRecordKey = 'pace-note.race';
const raceDistances = {5:'5km',10:'10km',21.0975:'하프',42.195:'풀코스'};

function trainingPaces(distance, clock){
  const seconds = duration(clock);
  const racePace = seconds / distance;
  if(!Object.hasOwn(raceDistances, distance) || racePace < 135 || racePace > 1200) return null;
  const minutes = seconds / 60;
  const velocity = distance * 1000 / minutes;
  // Daniels' race VO2 estimate and intensity fractions, evaluated at running speed in m/min.
  const oxygenCost = -4.6 + .182258 * velocity + .000104 * velocity ** 2;
  const raceFraction = .8 + .1894393 * Math.exp(-.012778 * minutes) + .2989558 * Math.exp(-.1932605 * minutes);
  const score = oxygenCost / raceFraction;
  if(score <= 0) return null;
  const paceAt = fraction => 60000 / ((Math.sqrt(.182258 ** 2 + 4 * .000104 * (4.6 + fraction * score)) - .182258) / .000208);
  return {score, racePace, easyFast:paceAt(.79), easySlow:paceAt(.65), tempo:paceAt(.88), interval:paceAt(.98)};
}

function readRaceRecord(){
  try{
    const record = JSON.parse(localStorage.getItem(raceRecordKey) || 'null');
    if(record && typeof record.t === 'string' && trainingPaces(record.d, record.t)) return record;
  }catch{}
  return {d:'10',t:'',frequency:'2'};
}

function paceRange(paces){
  return time(paces.easyFast) + '–' + time(paces.easySlow) + ' /km';
}

const coachProfileKey = 'pace-note.coach-profile.v1';
function coachProfile(){
  try{return JSON.parse(localStorage.getItem(coachProfileKey)) || {}}catch{return {}}
}
function firstSessionSteps(){
  return `<h4>오늘은 20분만</h4><ol class="first-steps">
    <li><b>0–5분 · 걷기</b><br>평탄한 길에서 편하게 출발하세요.</li>
    <li><b>5–15분 · 달리기와 걷기 4번</b><br>천천히 1분 달리고 90초 걸으면 한 번입니다. 숨이 차면 남은 구간은 걸어도 됩니다.</li>
    <li><b>15–20분 · 걸어서 마무리</b><br>편하게 걸은 뒤 오늘 달린 거리와 느낌을 남기세요.</li>
  </ol><p><b>다음 러닝은 언제?</b> 하루 쉬고 같은 코스를 다시 해보세요. 이번 주에는 속도보다 편하게 반복할 수 있는지 살펴보세요.</p><a href="#shoes">첫 러닝화 고르기</a>`;
}
function referencePulse(profile){
  const age = Number(profile.age);
  if(!(age>=18 && age<=85)) return '';
  const maximum = profile.sex==='female' && age>=35 ? 206-.88*age : 208-.7*age;
  return Math.round(maximum*.5)+'–'+Math.round(maximum*.7)+'회/분';
}
function profileSummary(profile){
  const age = profile.age ? '만 '+profile.age+'세' : '나이 미입력';
  const pulse = referencePulse(profile) || (profile.age ? '추정 범위 밖' : '미산출');
  return age+' · 참고 심박 '+pulse;
}
function firstRun(profile){
  const age = Number(profile.age);
  const pulse = referencePulse(profile);
  let detail = '대화가 이어지는 속도로 시작하세요. 숨이 차면 걷는 시간을 늘리세요.';
  if(pulse){
    detail += ' 중강도 참고 심박은 약 '+pulse+'입니다. 개인차가 있어 숫자를 맞추려고 속도를 올릴 필요는 없습니다.';
  }
  if(age>=65)detail += ' 걷기가 편해진 뒤 짧은 달리기를 더하세요.';
  return {title:'1분 달리기 · 90초 걷기', detail};
}
function recordFields(){
  return `    <form id="coach-form">
      <div class="layout coach-fields">
        <label>거리<select id="race-dist">${Object.entries(raceDistances).map(([km,name]) => '<option value="'+km+'">'+name+'</option>').join('')}</select></label>
        <label><span id="clock-question"></span><input id="race-time" type="text" inputmode="numeric" enterkeyhint="done"
          placeholder="예: 4859" maxlength="12" autocomplete="off" aria-describedby="race-time-help race-time-preview"></label>
      </div>
      <small id="race-time-help">숫자만 입력해도 됩니다. 4859 → 48:59, 14500 → 1:45:00</small>
      <p id="race-time-preview" class="coach-input-feedback" role="status"></p>
      <div class="pb-actions"><button type="submit">내 훈련 페이스 보기</button><button type="button" id="cancel-pb">이전으로</button></div>
      <label>최근 꾸준히 달린 빈도<select id="race-frequency">
        <option value="1">주 0–1회 또는 복귀 중</option>
        <option value="2">주 2회</option>
        <option value="3">주 3회 이상</option>
      </select></label>
      <p id="race-save-status" class="coach-input-feedback" role="status"></p>
    </form>`;
}
function mountRecordEditor(onApply,onCancel){
  const form = $('#coach-form'), distance = $('#race-dist'), clock = $('#race-time'), frequency = $('#race-frequency');
  const preview = $('#race-time-preview'), saveStatus = $('#race-save-status');
  const saved = readRaceRecord();
  let applied = null;
  distance.value = saved.d;
  clock.value = saved.t ? time(duration(saved.t)) : '';
  frequency.value = ['1','2','3'].includes(saved.frequency) ? saved.frequency : '2';
  function readDraft(){
    const seconds = duration(clock.value);
    const record = {d:distance.value,t:seconds ? time(seconds) : '',frequency:frequency.value};
    return {record,paces:trainingPaces(record.d,record.t)};
  }
  function showInputStatus({record,paces}, requireValue = false){
    const empty = !clock.value.trim();
    const invalid = !paces && (!empty || requireValue);
    clock.setAttribute('aria-invalid', String(invalid));
    preview.classList.toggle('input-error', invalid);
    if(invalid){
      preview.textContent = empty ? '완주 기록을 입력해 주세요.' : '선택한 거리와 기록을 확인해 주세요. 예: 4859 또는 48:59';
    }else if(paces && (!applied || ['d','t','frequency'].some(key => applied[key] !== record[key]))){
      preview.textContent = '입력 확인 · '+raceDistances[record.d]+' / '+record.t+' · 아직 적용 전';
    }else{
      preview.textContent = paces ? '현재 적용된 기록 · '+raceDistances[record.d]+' / '+record.t : '';
    }
  }
  function previewDraft(){
    $('#clock-question').textContent = raceDistances[distance.value]+' 완주 시간은요?';
    saveStatus.textContent = '';
    showInputStatus(readDraft());
  }
  clock.oninput = previewDraft;
  distance.onchange = previewDraft;
  frequency.onchange = previewDraft;
  form.onsubmit = event => {
    event.preventDefault();
    const {record,paces} = readDraft();
    if(!paces){
      showInputStatus({record,paces}, true);
      clock.focus();
      return;
    }
    applied = record;
    clock.value = record.t;
    showInputStatus({record,paces});

    const label = raceDistances[record.d]+' · '+record.t;
    try{
      localStorage.setItem(raceRecordKey, JSON.stringify(record));
      saveStatus.textContent = label+' 기록을 적용했습니다.';
    }catch{
      saveStatus.textContent = label+' 기록으로 계산했습니다. 이 브라우저에 저장하지 못했습니다.';
    }
    onApply(record,paces);
  };
  applied = saved.t ? saved : null;
  previewDraft();
  function resetDraft(){
    const record = applied || saved;
    distance.value = record.d;
    clock.value = record.t;
    frequency.value = record.frequency || '2';
    previewDraft();
  }
  $('#cancel-pb').onclick = () => {resetDraft();onCancel(applied)};
  return {form,message:()=>saveStatus.textContent,open(){resetDraft();form.hidden=false;clock.focus()}};
}
function profileFields(){
  return '<a href="#profile">내 정보에서 참고 심박 설정</a>';
}
function training(){
  const profile = coachProfile();
  const hasPB = !!readRaceRecord().t;
  let beginner = profile.mode==='beginner' || !hasPB;
  tool('어떻게 달릴까요?', `
    <div id="coach-choice" class="track-options">
      <button type="button" id="choose-record">개인 최고기록(PB)으로 추천</button>
      <button type="button" id="choose-first">PB 없이 시작</button>
    </div>
    <div id="first-guide" class="coach-summary">
      <small>첫 러닝</small><h3>1분 달리기 · 90초 걷기</h3>
      ${firstSessionSteps()}
      <p id="first-intensity"></p>
${profileFields()}
      <small><a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/">NHS 첫 러닝 안내</a> · <a href="https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates">미국심장협회 심박 안내</a></small>
    </div>
    <p id="pb-intro">최근 5km·10km·하프·풀코스 중 한 거리의 최고기록을 넣으면 이지런, 템포런, 인터벌 페이스를 볼 수 있어요.</p>
  `);
  tool('내 PB로 훈련 강도 계산', `
    <button id="edit-record" type="button" hidden>기록 수정</button><div id="zones"></div>
${recordFields()}
    <small>최근 전력 기록을 기준으로 추정합니다. 적용한 기록은 이 브라우저에 저장됩니다.</small>
    <small><a href="https://new.vdoto2.com/calculator">V.O2 훈련 강도 안내</a> · <a href="https://tools.empace.app/training-paces/">VDOT 계산식</a></small>
  `);
  const result = $('#zones');
  function renderResult(record,paces){
    const advice = {
      1:'이지런이나 걷기·달리기부터 시작하세요. 빈도와 거리가 안정되면 템포런을 추가해 보세요.',
      2:'두 번 모두 이지런을 기본으로 구성하세요. 여유가 생기면 한 번에 짧은 템포 구간을 넣어보세요.',
      3:'이지런 중심으로 달리고, 강도 훈련은 주 1회 템포런 또는 인터벌 중 하나부터 시작하세요.'
    };
    const kmh = pace => (3600 / pace).toFixed(1);
    result.innerHTML = `
      <div class="coach-summary">
        <p class="coach-applied"><strong>${raceDistances[record.d]} · ${record.t}</strong> 기준</p>
        <small>추정 VDOT ${paces.score.toFixed(1)} · 기록 평균 ${time(paces.racePace)} /km</small>
        <p>${advice[record.frequency]}</p>
      </div>
      <div class="coach-sessions">
        <article><header><h4>이지런 · 회복런 · 긴 이지런</h4><strong>${paceRange(paces)}</strong></header><small>${kmh(paces.easySlow)}–${kmh(paces.easyFast)} km/h</small><p>대화할 수 있는 강도로 달리세요. 회복런이나 긴 이지런은 범위의 느린 쪽에서 시작하세요.</p></article>
        <article><header><h4>템포런</h4><strong>약 ${time(paces.tempo)} /km</strong></header><small>${kmh(paces.tempo)} km/h</small><p>이지런에 익숙하다면 5분 × 2세트부터 시도하세요. 세트 사이에는 2분 가볍게 뛰세요.</p></article>
        <article><header><h4>인터벌</h4><strong>약 ${time(paces.interval)} /km</strong></header><small>${kmh(paces.interval)} km/h</small><p>강도 훈련 경험이 있다면 3분 × 3세트부터 시도하세요. 세트 사이에는 2–3분 가볍게 뛰세요.</p></article>
      </div>
    `;
  }
  const editor = mountRecordEditor((record,paces)=>{
    profile.mode = 'pb';
    remember();
    showRecord(record,paces);
    $('#edit-record').focus();
  },record=>{
    if(record){
      showRecord(record,trainingPaces(record.d,record.t));
      $('#edit-record').focus();
    }else{
      choose(true);
      $('#choose-record').focus();
    }
  });
  function showRecord(record,paces){
    renderResult(record,paces);
    editor.form.hidden = true;
    $('#edit-record').hidden = false;
    result.hidden = false;
  }
  $('#edit-record').onclick = () => {
    result.hidden = true;
    $('#edit-record').hidden = true;
    editor.open();
  };
  if(hasPB){
    const record = readRaceRecord();
    showRecord(record,trainingPaces(record.d,record.t));
  }
  function remember(){
    try{localStorage.setItem(coachProfileKey,JSON.stringify(profile));return true}catch{return false}
  }
  function changeView(){
    $('#choose-first').setAttribute('aria-pressed',String(beginner));
    $('#choose-record').setAttribute('aria-pressed',String(!beginner));
    $('#first-guide').hidden = !beginner;
    $('#pb-intro').hidden = beginner;
    editor.form.closest('section').hidden = beginner;
    $('#first-intensity').textContent = firstRun(profile).detail;
  }
  function choose(first){
    beginner = first;
    profile.mode = first ? 'beginner' : 'pb';
    remember();
    changeView();
  }
  $('#choose-first').onclick = () => choose(true);
  $('#choose-record').onclick = () => {choose(false); if(!editor.form.hidden)editor.open()};
  changeView();
  mountTrack();
}

function readWorkoutMetrics(raw){
  const text = raw.normalize('NFKC').replace(/[′’‘]/g,"'").replace(/[″“”]/g,'"').replace(/(\d),(\d)/g,'$1.$2');
  const distance = /(?:^|[^\d.])(\d{1,3}(?:\.\d{1,3})?)\s*(?:km|킬로미터)\b/i.exec(text);
  const km = distance && Number(distance[1]) > 0 ? Number(distance[1]) : null;
  const paceMatch = /\b(\d{1,2})\s*[:']\s*([0-5]\d)\s*["']?\s*(?:\/|per)\s*(?:km|킬로미터)/i.exec(text);
  const pace = paceMatch ? Number(paceMatch[1])*60+Number(paceMatch[2]) : null;
  const withoutPace = paceMatch ? text.replace(paceMatch[0],' ') : text;
  const clocks = [...withoutPace.matchAll(/\b(?:\d{1,2}:)?\d{1,3}:[0-5]\d\b/g)];
  const seconds = c => c[0].split(':').reduce((s,n)=>s*60+Number(n),0);
  const labeled = clocks.find(c=>/(?:workout time|운동\s*시간)[\s:]*$/i.test(withoutPace.slice(0,c.index)));
  const consistent = km && pace ? clocks.filter(c=>Math.abs(seconds(c)-km*pace)<Math.max(6,km*pace*.025)) : [];
  const clock = labeled || consistent[0] || clocks.find(c=>c[0].split(':').length===3);
  const elapsed = clock ? seconds(clock) : null;
  return {km,elapsed,pace:pace || (elapsed && km ? Math.round(elapsed/km) : null)};
}

function runnerSettings(){
  tool('기본 정보', `
    <form id="runner-settings"><div class="profile-grid">
      <label>만 나이<input name="age" type="number" min="1" max="120" step="1" inputmode="numeric" placeholder="세"></label>
      <label>성별<select name="sex"><option value="">선택 안 함</option><option value="male">남성</option><option value="female">여성</option></select></label>
      <label>키 (cm)<input name="height" type="number" min="1" max="300" step="0.1" inputmode="decimal" placeholder="예: 175"></label>
      <label>몸무게 (kg)<input name="weight" type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="예: 70"></label>
    </div><small>원하는 항목만 입력하세요. 이 브라우저에 저장됩니다.</small>
    <button type="submit">내 정보 저장</button><p class="profile-status" role="status"></p></form>`);
  const form = $('#runner-settings'), fields = ['age','sex','height','weight'];
  const saved = coachProfile();
  fields.forEach(key=>form.elements[key].value=saved[key] || '');
  form.onsubmit = event=>{
    event.preventDefault();
    const profile = coachProfile(), previous = profileSummary(profile);
    fields.forEach(key=>profile[key]=form.elements[key].value);
    const current = profileSummary(profile);
    const status = form.querySelector('[role=status]');
    try{localStorage.setItem(coachProfileKey,JSON.stringify(profile));}
    catch{status.textContent='이 브라우저에 저장하지 못했습니다.';return;}
    status.textContent = previous===current ? '저장했습니다. '+current :
      ['저장했습니다.','이전  '+previous,'반영 후  '+current].join('\n');
  };
  tool('내 러닝 기록', '<p>훈련 페이스를 계산할 때 사용할 최근 대회 기록을 저장하세요.</p>'+recordFields());
  const editor = mountRecordEditor(()=>{},()=>{});
  editor.form.hidden=false;
  editor.form.querySelector('[type=submit]').textContent='러닝 기록 저장';
  $('#cancel-pb').hidden=true;
}
