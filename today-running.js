const todayRunKey = 'pace-note.today-run.v1';
const todayRunTips = {
  이지런:'대화를 이어갈 수 있는 강도로 달리세요.',
  템포런:'가볍게 몸을 푼 뒤, 짧은 문장을 말할 수 있는 정도로 템포 구간을 시작하세요.',
  인터벌:'가볍게 몸을 풀고 빠른 구간을 시작하세요. 반복 사이에는 걷거나 천천히 뛰며 회복하세요.',
  '긴 이지런':'초반부터 편하게 달리고, 익숙한 거리 안에서 일정한 강도를 유지하세요.',
  회복런:'평소 이지런보다 여유 있게 달리세요.',
  자유주:'페이스는 몸 상태에 맞춰 고르고 처음에는 천천히 출발하세요.',
  휴식:'달리기를 쉬어가는 날입니다.'
};

function runningNote(type, forecast){
  if(!type) return '훈련을 선택하면 오늘 참고할 강도가 표시됩니다.';
  const tip = todayRunTips[type];
  if(type === '휴식') return tip;
  const fast = type === '템포런' || type === '인터벌';
  const adjustments = [];
  if(forecast && forecast.rain > 0){
    adjustments.push(fast ? '강수 예보가 있어 빠른 구간은 실내 트레드밀을 고려하세요.' : '강수 예보가 있어 미끄러운 구간을 피하고 보폭을 줄이세요.');
  }
  if(forecast && forecast.wind >= 8){
    adjustments.push('바람이 강한 편입니다. 맞바람에서는 평소 페이스보다 체감 강도를 기준으로 달리세요.');
  }
  if(forecast && forecast.feelsLike >= 28){
    adjustments.push(fast ? '체감온도가 높아 서늘한 시간이나 실내에서 강도 훈련을 하는 편이 좋습니다.' : '체감온도가 높습니다. 평소보다 천천히 달리고 수분을 챙기세요.');
  }
  if(forecast && forecast.feelsLike <= 0){
    adjustments.push('체감온도가 낮습니다. 초반에는 충분히 몸을 풀고 노면 상태를 확인하세요.');
  }
  return [tip, ...adjustments].join(' ');
}

function todayPace(type, paces){
  if(type === '템포런') return {value:time(paces.tempo)+' /km', detail:'템포 구간'};
  if(type === '인터벌') return {value:time(paces.interval)+' /km', detail:'빠른 반복 구간'};
  if(type === '회복런') return {value:time(paces.easySlow)+' /km 또는 더 느리게', detail:'회복하기 편한 강도'};
  if(type === '긴 이지런') return {value:time(paces.easySlow)+' /km 부근', detail:'이지런 범위의 느린 쪽'};
  return {value:paceRange(paces), detail:type === '자유주' ? '편하게 달릴 때의 참고 범위' : '대화가 가능한 강도'};
}

function readTodayRun(date){
  try{
    const saved = JSON.parse(localStorage.getItem(todayRunKey) || 'null');
    if(saved?.date === date && Object.hasOwn(todayRunTips, saved.type)) return saved.type;
  }catch{}
  return '';
}

function todayRunning(){
  const now = new Date();
  const date = new Date(now.getTime() + 9*3600000);
  const dateKey = date.toISOString().slice(0,10);
  const day = (date.getUTCDay() + 6) % 7;
  const dateLabel = new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(now);
  let plan = null;
  try{plan = readWeeklyPlan()}catch{}
  const planned = plan?.find(session => session.day === day);
  const plannedType = planned?.type ?? (plan ? '휴식' : '');
  const choice = readTodayRun(dateKey);
  const {d,t} = readRaceRecord();
  const paces = trainingPaces(d,t);
  const favorites = readWeatherFavorites();
  const places = favorites.length ? favorites : [{city:'서울',area:''}];

  tool(dateLabel, `
    <div id="today-overview">
      <h4 id="today-session" class="today-session"></h4>
      <div id="today-pace" class="today-pace" aria-live="polite" hidden>
        <strong id="today-pace-value" hidden></strong>
        <small id="today-pace-context" hidden></small>
        <a id="today-pace-setup" href="#training" hidden>PB 기록 입력하기</a>
      </div>
      <p id="today-weather-line" class="today-weather-line" role="status"></p>
      <label class="today-choice">오늘 할 훈련<select id="today-type">
        <option value="">${plannedType ? '주간 계획 따르기' : '훈련 선택하기'}</option>
        ${[...runTypes,'휴식'].map(type => '<option>'+type+'</option>').join('')}
      </select></label>
      <small id="today-plan" hidden></small>
      <small id="today-save-status" role="status"></small>
    </div>
  `);
  $('#today-overview').closest('section').classList.add('today-card');
  tool('상세 예보', `
    <div class="today-weather">
      <label class="today-region">예보 지역<select id="today-region"></select></label>
      <small id="today-region-empty" hidden><a href="#weather">날씨에서 즐겨찾는 지역 추가하기</a></small>
      <p id="today-forecast">예보를 조회하는 중입니다…</p>
      <button type="button" id="today-weather-retry" hidden>예보 다시 조회</button>
    </div>
    <div class="today-advice">
      <h4>오늘의 훈련 팁</h4>
      <p id="today-tip"></p>
    </div>
    <div id="today-outfit" class="today-advice" hidden>
      <h4>오늘의 복장</h4>
      <p id="today-clothing"></p>
      <p id="today-past-outfit" class="plan-msg" hidden></p>
    </div>
    <div class="today-links"><a href="#plan">주간 계획</a><a href="#training">PB 기반 훈련 페이스</a><a href="#weather">날씨와 복장</a></div>
  `);
  const select = $('#today-type'), forecastText = $('#today-forecast');
  const retry = $('#today-weather-retry'), outfit = $('#today-outfit');
  const region = $('#today-region'), weatherLine = $('#today-weather-line');
  places.forEach((place, index) => {
    const label = weatherLocationLabel(place.city,place.area);
    region.add(new Option(favorites.length ? label : label+' · 도시 기준', String(index)));
  });
  $('#today-region-empty').hidden = favorites.length > 0;
  const paceCard = $('#today-pace'), paceValue = $('#today-pace-value');
  const paceContext = $('#today-pace-context'), paceSetup = $('#today-pace-setup');
  const planNote = $('#today-plan');
  const plannedLabel = planned ? planned.type+' '+planned.km+'km' : plannedType;
  planNote.textContent = plannedLabel ? '주간 계획 · '+plannedLabel : '';
  const session = $('#today-session');
  select.value = choice;
  let forecast = null;
  let requestId = 0;
  function showAdvice(){
    const type = select.value || plannedType;
    const overridesPlan = !!select.value && type !== plannedType;
    session.textContent = (overridesPlan ? type : plannedLabel) || '오늘 훈련을 골라보세요';
    planNote.hidden = !overridesPlan || !plannedLabel;
    paceCard.hidden = !type || type === '휴식';
    if(!paceCard.hidden){
      paceValue.hidden = paceContext.hidden = !paces;
      paceSetup.hidden = !!paces;
      if(paces){
        const target = todayPace(type,paces);
        paceValue.textContent = target.value;
        paceContext.textContent = target.detail+' · 적용된 PB '+raceDistances[d]+' '+time(duration(t));
      }
    }
    $('#today-tip').textContent = runningNote(type,forecast);
    outfit.hidden = !forecast || !type || type === '휴식';
    if(outfit.hidden) return;
    $('#today-clothing').textContent = outfitAdvice(forecast.feelsLike) +
      (forecast.rain > 0 || forecast.wind >= 8 ? ' 바람이나 비를 막을 얇은 겉옷을 고려하세요.' : '');
    let matching;
    try{matching = readOutfits().find(entry => Math.abs(entry.temp - forecast.feelsLike) <= 2)}catch{}
    const history = $('#today-past-outfit');
    history.hidden = !matching;
    if(matching) history.textContent = '비슷한 날의 기록 · '+matching.clothes+' · '+(matching.feel || '체감 미기록');
  }
  select.onchange = () => {
    try{
      if(select.value) localStorage.setItem(todayRunKey, JSON.stringify({date:dateKey,type:select.value}));
      else localStorage.removeItem(todayRunKey);
      $('#today-save-status').textContent = '';
    }catch{$('#today-save-status').textContent = '이 브라우저에 오늘의 선택을 저장하지 못했습니다.'}
    showAdvice();
  };
  async function load(){
    const currentRequest = ++requestId;
    const place = places[Number(region.value)];
    const regionName = weatherLocationLabel(place.city,place.area);
    weatherLine.textContent = regionName+' · 예보 조회 중';
    retry.hidden = true;
    forecast = null;
    showAdvice();
    forecastText.textContent = '예보를 조회하는 중입니다…';
    try{
      const result = await fetchRunningForecast(place);
      if(currentRequest !== requestId || !forecastText.isConnected) return;
      forecast = result;
      weatherLine.textContent = regionName+' · 체감 '+result.feelsLike+'° · '+(result.rain > 0 ? '강수 예보' : '강수 없음');
      forecastText.textContent = result.hour.slice(11)+' 예보 · 체감 '+result.feelsLike+'°C · 바람 '+result.wind+'m/s · 강수 '+result.rain+'mm';
      showAdvice();
    }catch{
      if(currentRequest !== requestId || !forecastText.isConnected) return;
      weatherLine.textContent = regionName+' · 예보 조회 실패';
      forecastText.textContent = '예보를 불러오지 못했습니다.';
      retry.hidden = false;
    }
  }
  retry.onclick = load;
  region.onchange = load;
  load();
}
