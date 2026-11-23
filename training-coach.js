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

function training(){
  tool('내 PB로 훈련 강도 계산', `
    <form id="coach-form">
      <div class="layout coach-fields">
        <label>거리<select id="race-dist">${Object.entries(raceDistances).map(([km,name]) => '<option value="'+km+'">'+name+'</option>').join('')}</select></label>
        <label>완주 기록<input id="race-time" type="text" inputmode="numeric" enterkeyhint="done"
          placeholder="예: 4859" maxlength="12" autocomplete="off" aria-describedby="race-time-help race-time-preview"></label>
      </div>
      <small id="race-time-help">숫자만 입력해도 됩니다. 4859 → 48:59, 14500 → 1:45:00</small>
      <p id="race-time-preview" class="coach-input-feedback" role="status"></p>
      <label>최근 꾸준히 달린 빈도<select id="race-frequency">
        <option value="1">주 0–1회 또는 복귀 중</option>
        <option value="2">주 2회</option>
        <option value="3">주 3회 이상</option>
      </select></label>
      <button type="submit">기록 적용</button>
      <p id="race-save-status" class="coach-input-feedback" role="status"></p>
    </form>
    <div id="zones"></div>
    <small>최근 전력 기록을 기준으로 추정합니다. 적용한 기록은 이 브라우저에 저장됩니다.</small>
    <small><a href="https://new.vdoto2.com/calculator">V.O2 훈련 강도 안내</a> · <a href="https://tools.empace.app/training-paces/">VDOT 계산식</a></small>
  `);
  const form = $('#coach-form'), distance = $('#race-dist'), clock = $('#race-time'), frequency = $('#race-frequency');
  const preview = $('#race-time-preview'), saveStatus = $('#race-save-status');
  const result = $('#zones'), saved = readRaceRecord();
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
      preview.textContent = raceDistances[record.d]+' · '+record.t+'로 읽었습니다. 기록 적용을 눌러주세요.';
    }else{
      preview.textContent = '';
    }
  }
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
  function previewDraft(){
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
    renderResult(record,paces);
    const label = raceDistances[record.d]+' · '+record.t;
    try{
      localStorage.setItem(raceRecordKey, JSON.stringify(record));
      saveStatus.textContent = label+' 기록을 적용했습니다.';
    }catch{
      saveStatus.textContent = label+' 기록으로 계산했습니다. 이 브라우저에 저장하지 못했습니다.';
    }
  };
  const initial = readDraft();
  if(initial.paces){
    applied = initial.record;
    renderResult(initial.record,initial.paces);
  }
  mountTrack();
}
