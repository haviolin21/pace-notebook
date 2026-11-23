let screenshotEngine;
function loadScreenshotEngine(){
  if(!screenshotEngine){
    screenshotEngine = new Promise((resolve,reject)=>{
      const script = document.createElement('script');
      script.src = 'ocr/tesseract.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    }).catch(error=>{screenshotEngine=null;throw error});
  }
  return screenshotEngine;
}

function mountScreenshotImport(form){
  const picker = form.elements.photo;
  const status = form.querySelector('.photo-status');
  let generation = 0;
  function reset(){
    generation++;
    picker.value = '';
    status.textContent = '';
    form.querySelector('button[type=submit]').disabled = false;
  }
  picker.onchange = async () => {
    const file = picker.files[0];
    if(!file)return;
    const current = ++generation;
    const active = () => current===generation && form.isConnected && !form.hidden;
    const save = form.querySelector('button[type=submit]');
    save.disabled = true;
    status.textContent = '이 기기에서 사진을 읽고 있습니다…';
    let worker;
    const url = URL.createObjectURL(file);
    try{
      const image = new Image();
      image.src = url;
      await image.decode();
      if(!active())return;
      const scale = Math.min(1,2600/Math.max(image.width,image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(image.width*scale));
      canvas.height = Math.max(1,Math.round(image.height*scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      // Fitness uses saturated numbers on black. Preserve the brightest channel.
      const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
      const data = pixels.data;
      let dark = 0, samples = 0;
      for(let i=0;i<data.length;i+=256){
        dark += Math.max(data[i],data[i+1],data[i+2])<100;
        samples++;
      }
      for(let i=0;i<data.length;i+=4){
        const value = Math.max(data[i],data[i+1],data[i+2]);
        data[i]=data[i+1]=data[i+2]=dark>samples/2 ? 255-value : value;
      }
      ctx.putImageData(pixels,0,0);
      await loadScreenshotEngine();
      if(!active())return;
      worker = await window.Tesseract.createWorker('eng',1,{
        workerPath:new URL('ocr/worker.min.js',document.baseURI).href,
        corePath:new URL('ocr/tesseract-core-lstm.wasm.js',document.baseURI).href,
        langPath:new URL('ocr/',document.baseURI).href,
        workerBlobURL:false
      });
      if(!active())return;
      await worker.setParameters({tessedit_pageseg_mode:'11'});
      const result = await worker.recognize(canvas);
      if(!active())return;
      const {km,elapsed,pace} = readWorkoutMetrics(result.data.text);
      form.elements.km.value = km ?? '';
      form.elements.elapsed.value = elapsed ? time(elapsed) : '';
      form.elements.pace.value = pace ? time(pace) : '';
      status.textContent = km && elapsed && pace ? '인식한 값을 사진과 비교한 뒤 저장하세요.' : '확실하게 읽은 값만 채웠습니다. 빈칸은 사진을 보고 입력해 주세요.';
    }catch{
      if(active())status.textContent='사진을 읽지 못했습니다. PNG 또는 JPEG로 다시 선택하거나 직접 입력해 주세요.';
    }finally{
      URL.revokeObjectURL(url);
      if(active())save.disabled = false;
      if(worker)await worker.terminate();
    }
  };
  return reset;
}

const journalPrefix = 'pace-note.run.v1.';
function runOn(date){
  try{
    const run = JSON.parse(localStorage.getItem(journalPrefix + date));
    return run && Number.isFinite(run.km) && run.km > 0 ? run : null;
  }catch{return null}
}

function mountJournal(dateKey, weekday, planned, selectedType){
  tool('이번 주 러닝', '<p id="week-total"></p><ol class="week-track"></ol><p id="run-receipt"></p>');
  const list = $('.week-track');
  function draw(){
    let count = 0, total = 0;
    list.replaceChildren();
    planDays.forEach((day,i) => {
      const date = new Date(dateKey+'T00:00:00Z');
      date.setUTCDate(date.getUTCDate()+i-weekday);
      const run = runOn(date.toISOString().slice(0,10));
      const li = document.createElement('li');
      if(run){count++; total += run.km; li.className = 'finished'}
      if(i === weekday) li.setAttribute('aria-current','date');
      li.innerHTML = '<small>'+day+'</small><b>'+(run?'✓':date.getUTCDate())+'</b>';
      li.setAttribute('aria-label', day+'요일 '+(i===weekday?'오늘 ':'')+(run?run.km+'km 완료':'기록 없음'));
      list.append(li);
    });
    $('#week-total').textContent = count+'회 · '+Number(total.toFixed(2))+' km';
    const run = runOn(dateKey);
    $('#run-receipt').textContent = run ? '오늘 완료 · '+run.type+' '+run.km+'km · '+[run.elapsed && time(run.elapsed),run.pace && time(run.pace)+'/km',run.feel].filter(Boolean).join(' · ') : '';
    $('#open-run').textContent = run ? '완료 기록 수정' : '러닝 완료';
  }
  const form = $('#run-log');
  const resetPhoto = mountScreenshotImport(form);
  for(const name of ['elapsed','pace']){
    const field = form.elements[name];
    field.oninput = () => field.setCustomValidity('');
    field.onblur = () => {
      const seconds = duration(field.value,name==='elapsed');
      if(seconds)field.value = time(seconds);
    };
  }
  $('#open-run').onclick = () => {
    const run = runOn(dateKey);
    form.hidden = !form.hidden;
    resetPhoto();
    if(form.hidden)return;
    for(const name of ['elapsed','pace']){
      form.elements[name].value = run?.[name] ? time(run[name]) : '';
      form.elements[name].setCustomValidity('');
    }
    form.elements.km.value = run?.km ?? (planned && selectedType()===planned.type ? planned.km : '');
    form.elements.feel.value = run?.feel ?? '보통';
    form.elements.km.focus();
  };
  form.onsubmit = event => {
    event.preventDefault();
    const metrics = {};
    for(const name of ['elapsed','pace']){
      const field = form.elements[name];
      if(!field.value.trim())continue;
      const seconds = duration(field.value,name==='elapsed');
      if(!seconds){
        field.setCustomValidity('시간을 분:초 형식으로 확인해 주세요.');
        field.reportValidity();
        return;
      }
      metrics[name] = seconds;
    }
    const previous = runOn(dateKey);
    const type = selectedType();
    try{
      localStorage.setItem(journalPrefix+dateKey,JSON.stringify({
        type:type && type !== '휴식' ? type : previous?.type || '자유주',
        ...metrics,km:form.elements.km.valueAsNumber,feel:form.elements.feel.value
      }));
    }catch{$('#log-status').textContent='저장하지 못했습니다. 브라우저 저장 설정을 확인하세요.';return}
    form.hidden = true;
    draw();
    $('#log-status').textContent='오늘의 완료 기록을 저장했습니다.';
    $('#open-run').focus();
  };
  draw();
}
function paceChoices(type,paces){
  if(!paces || !type || type==='휴식' || type==='첫 러닝')return [];
  if(type==='템포런')return [paces.tempo];
  if(type==='인터벌')return [paces.interval];
  if(type==='긴 이지런'||type==='회복런')return [paces.easySlow];
  return [paces.easyFast,(paces.easyFast+paces.easySlow)/2,paces.easySlow];
}
function currentRunType(){
  const seoul = new Date(Date.now()+9*3600000);
  const override = readTodayRun(seoul.toISOString().slice(0,10));
  if(override)return override;
  try{return readWeeklyPlan()?.find(s=>s.day===(seoul.getUTCDay()+6)%7)?.type || ''}catch{return ''}
}

const todayRunKey = 'pace-note.today-run.v1';
const todayRunTips = {
  '첫 러닝':'천천히 1분 달리고 90초 걸으며 시작하세요.',
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
  let {d,t} = readRaceRecord();
  const profile = coachProfile();
  let paces = profile.mode === "beginner" ? null : trainingPaces(d,t);
  const favorites = readWeatherFavorites();
  const places = favorites.length ? favorites : [{city:'서울',area:''}];

  $('#screen h1').insertAdjacentHTML('afterend','<p class="today-intro">오늘 달릴 훈련을 고르고, 내 페이스와 소비 칼로리를 계산하고, 대회 기록을 비교해 보세요.</p>');
  tool(dateLabel, `
    <div id="today-overview">
      <h4 id="today-session" class="today-session"></h4>
      <div id="pick-session"><p id="pick-prompt">훈련을 고르면 오늘 달릴 강도와 방법을 알려드려요.</p>
        <div class="session-picks">${[['첫 러닝','처음이라 추천받기'],['이지런','가볍게 달리기'],['템포런','템포런'],['인터벌','인터벌']].map(([type,label])=>'<button type="button" data-run="'+type+'">'+label+'</button>').join('')}</div></div>
      <button type="button" id="back-choice" hidden>훈련 선택으로 돌아가기</button>
      <div id="today-pace" class="today-pace" aria-live="polite" hidden>
        <strong id="today-pace-value" hidden></strong>
        <small id="today-pace-context" hidden></small>
        <button id="today-pace-setup" type="button" hidden>내 기록으로 몇 분/km인지 보기</button>
        <div id="today-record" hidden>${recordFields()}</div>
        <div id="today-first" hidden>${firstSessionSteps()}${profileFields()}</div>
      </div>
      <p id="today-weather-line" class="today-weather-line" role="status"></p>
      <button type="button" id="change-session" aria-expanded="false">훈련 변경</button><label class="today-choice" hidden>오늘 할 훈련<select id="today-type">
        <option value="">${plannedType ? '주간 계획 따르기' : '훈련 선택하기'}</option>
        ${[...runTypes,'첫 러닝','휴식'].map(type => '<option>'+type+'</option>').join('')}
      </select></label>
      <div class="run-actions"><button id="open-run" type="button">러닝 완료</button><a href="#pace" id="today-calc">내 페이스로 계산</a></div>
      <form id="run-log" hidden>
      <label>운동 요약 스크린샷 가져오기<input type="file" name="photo" accept="image/*"></label>
      <small>애플 피트니스의 운동 요약을 선택하세요. 사진은 이 기기에서만 읽습니다.</small>
      <p class="photo-status" role="status"></p><label>실제 달린 거리 (km)<input name="km" type="number" step="0.01" min="0.01" inputmode="decimal" required></label><label>운동 시간 (선택)<input name="elapsed" placeholder="예: 4859" inputmode="numeric" maxlength="12"></label>
      <label>평균 페이스 /km (선택)<input name="pace" placeholder="예: 453" inputmode="numeric" maxlength="8"></label>
      <label>달리고 난 느낌<select name="feel"><option>여유</option><option>보통</option><option>힘듦</option></select></label><button type="submit">기록 저장</button></form><small id="log-status" role="status"></small>
      <small id="today-plan" hidden></small>
      <small id="today-save-status" role="status"></small>
    </div>
  `);
  $('#today-overview').closest('section').classList.add('today-card');
  mountJournal(dateKey, day, planned, () => $('#today-type').value || plannedType);
  tool('출발 전 확인', `
    <div class="today-weather">
      <label class="today-region">예보 지역<select id="today-region"></select></label>
      <small id="today-region-empty" hidden><a href="#weather">날씨에서 즐겨찾는 지역 추가하기</a></small>
      <div id="today-windows"></div><p id="today-forecast">예보를 조회하는 중입니다…</p>
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
  let choosing = !(choice || plannedType);
  let forecast = null;
  let requestId = 0;
  const inlineEditor = mountRecordEditor((record,newPaces)=>{
    ({d,t}=record);
    paces = newPaces;
    profile.mode = 'pb';
    try{localStorage.setItem(coachProfileKey,JSON.stringify(profile))}catch{}
    $('#today-record').hidden = true;
    showAdvice();
    $('#today-save-status').textContent = inlineEditor.message();
    session.focus();
  },()=>{
    $('#today-record').hidden = true;
    showAdvice();
    paceSetup.focus();
  });
  session.tabIndex = -1;
  paceSetup.onclick = () => {
    $('#today-record').hidden = false;
    paceSetup.hidden = true;
    inlineEditor.open();
  };
  function showAdvice(){
    const type = select.value || plannedType;
    const overridesPlan = !!select.value && type !== plannedType;
    const first = type==='첫 러닝';
    session.textContent = (overridesPlan ? type : plannedLabel) || '오늘은 어떤 러닝을 하세요?';
    if(choosing)session.textContent = '오늘은 어떤 러닝을 하세요?';
    $('#pick-prompt').textContent = choosing ? '훈련을 고르면 오늘 달릴 강도와 방법을 알려드려요.' : '다른 훈련을 누르면 추천이 바뀝니다.';
    for(const button of document.querySelectorAll('[data-run]')){
      button.setAttribute('aria-pressed',String(!choosing && button.dataset.run===type));
    }
    $('#back-choice').hidden = choosing;
    $('#change-session').textContent = chooser.hidden ? '전체 훈련 보기' : '전체 훈련 접기';
    $('#change-session').hidden = false;
    $('#today-calc').hidden = choosing || !paces || !type || first || type==='휴식';
    $('#today-calc').onclick = () => {
      const options = paceChoices(type,paces);
      if(options.length) speed = 3600/Math.round(options[Math.floor(options.length/2)]);
    };
    planNote.hidden = !overridesPlan || !plannedLabel;
    paceCard.hidden = choosing || !type || type==='휴식';
    if(!paceCard.hidden){
      paceValue.hidden = !paces && !first;
      paceContext.hidden = false;
      paceSetup.textContent = paces ? '적용한 PB 수정' : '내 기록으로 몇 분/km인지 보기';
      paceSetup.hidden = first || !$('#today-record').hidden;
      $('#today-first').hidden = !first;
      if(first){
        const guide = firstRun(profile);
        paceValue.textContent = guide.title;
        paceContext.textContent = guide.detail;
      }else if(!paces){
        paceContext.textContent = todayRunTips[type];
      }else{
        const target = todayPace(type,paces);
        const [range,suffix] = target.value.split(' /km');
        const unit = document.createElement('span');
        unit.textContent = ' /km'+(suffix || '');
        paceValue.replaceChildren(range,unit);
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
  const chooser = select.closest('label');
  $('#back-choice').onclick = () => {
    choosing = true;
    chooser.hidden = true;
    $('#today-record').hidden = true;
    $('#run-log').hidden = true;
    $('#today-save-status').textContent = '';
    $('#change-session').setAttribute('aria-expanded','false');
    showAdvice();
    $('#pick-session button').focus();
  };
  $('#change-session').onclick = () => {
    chooser.hidden = !chooser.hidden;
    $('#change-session').setAttribute('aria-expanded',String(!chooser.hidden));
    showAdvice();
    if(!chooser.hidden) select.focus();
  };
  for(const button of document.querySelectorAll('[data-run]')){
    button.onclick = () => {select.value = button.dataset.run; select.onchange()};
  }
  select.onchange = () => {
    choosing = !(select.value || plannedType);
    $('#today-record').hidden = true;
    chooser.hidden = true;
    $('#change-session').setAttribute('aria-expanded','false');
    session.focus();
    $('#run-log').hidden = true;
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
    $('#today-windows').replaceChildren();
    retry.hidden = true;
    forecast = null;
    showAdvice();
    forecastText.textContent = '예보를 조회하는 중입니다…';
    try{
      const result = await fetchRunningForecast(place);
      if(currentRequest !== requestId || !forecastText.isConnected) return;
      forecast = result;
      renderWindows($('#today-windows'),result.windows);
      weatherLine.textContent = regionName+' · 체감 '+result.feelsLike+'° · '+(result.rain > 0 ? '강수 예보' : '강수 없음')+' · '+outfitAdvice(result.feelsLike).replace('을 고려하세요.','').replace('를 고려하세요.','');
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
