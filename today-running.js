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
      form.elements.elapsed.dispatchEvent(new Event('input',{bubbles:true}));
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

  function draw(){

    const last=loggedRuns(dateKey)[0];
    const upcoming=nextScheduledRun(dateKey);
    $('#after-run').textContent=last?(upcoming?'다음 계획 · '+upcoming.date+' '+upcoming.session.type+' '+sessionDose(upcoming.session):
      '다음 러닝은 가능한 요일부터 정해 보세요.'):'';
    $('#last-run').textContent=last?'최근 러닝 · '+last.date+' · '+kmText(last.km)+' km':'';
    const run = runOn(dateKey);
    $('#today-overview').classList.toggle('finished-today',!!run);
    $('#finished-title').hidden=!run;
    $('#finished-title').textContent=run?run.type+' 완료':'';
    $('#run-metrics').hidden=!run;
    if(run){
      $('#done-distance').textContent=kmText(run.km)+' km';
      $('#done-time').textContent=run.elapsed?time(run.elapsed):'미입력';
      $('#done-pace').textContent=run.pace?time(run.pace)+'/km':'미입력';

    }
    $('.today-weather').closest('section').hidden=!!run;
    $('#record-link').hidden=!run;
    $('#open-run').textContent=run?'기록 수정':planned?'러닝 기록하기':'자유 러닝 기록하기';
  }
  const form = $('#run-log');
  const resetPhoto = mountScreenshotImport(form);
  const actual=form.elements.actualType,different=form.elements.different;
  runTypes.forEach(t=>actual.add(new Option(t,t)));
  different.onchange=()=>{$('#actual-type').hidden=!different.checked;};
  function updatePace(){
    const seconds=duration(form.elements.elapsed.value),km=form.elements.km.valueAsNumber;
    const auto=seconds>0 && km>0;
    $('#manual-pace').hidden=auto;
    form.elements.pace.disabled=auto;
    $('#pace-preview').textContent=auto?'평균 페이스 '+time(Math.round(seconds/km))+' /km':'';
  }
  form.addEventListener('input',updatePace);
  for(const name of ['elapsed','pace']){
    const field = form.elements[name];
    field.oninput = () => field.setCustomValidity('');
    field.onblur = () => {
      const seconds = duration(field.value,name==='elapsed');
      if(seconds)field.value = time(seconds);
    };
  }
  $('#open-run').onclick = () => {
    $('#first-question').hidden=true;
    const run = runOn(dateKey);
    form.hidden = !form.hidden;
    resetPhoto();
    if(form.hidden)return;
    for(const name of ['elapsed','pace']){
      form.elements[name].value = run?.[name] ? time(run[name]) : '';
      form.elements[name].setCustomValidity('');
    }
    form.elements.km.value = run?.km ?? (planned && selectedType()===planned.type ? (planned.km ?? '') : '');
    form.elements.feel.value = run?.feel ?? '';
    different.checked=!!run?.different || !!(planned && (run?.type || selectedType())!==planned.type && !((run?.type || selectedType())==='첫 러닝' && planned.type==='걷기·달리기'));
    actual.value=runTypes.includes(run?.type)?run.type:runTypes.includes(selectedType())?selectedType():'자유주';
    different.onchange();
    $('#run-details').open=true;
    updatePace();
    form.elements.km.focus();
  };
  form.onsubmit = event => {
    event.preventDefault();
    const metrics = {};
    for(const name of ['elapsed','pace']){
      const field = form.elements[name];
      if(field.disabled || !field.value.trim())continue;
      const seconds = duration(field.value,name==='elapsed');
      if(!seconds){
        field.setCustomValidity('시간을 분:초 형식으로 확인해 주세요.');
        $('#run-details').open=true;
        field.reportValidity();
        return;
      }
      metrics[name] = seconds;
    }
    if(metrics.elapsed)metrics.pace=Math.round(metrics.elapsed/form.elements.km.valueAsNumber);
    const previous = runOn(dateKey);
    const type = different.checked?actual.value:(planned?.type || previous?.type || selectedType());
    try{
      localStorage.setItem(journalPrefix+dateKey,JSON.stringify({
        type:!planned && !selectedType()?'자유주':type && type !== '휴식' ? type : previous?.type || '자유주',
        planned:previous && Object.hasOwn(previous,'planned')?previous.planned:planned || null,
        different:different.checked,...metrics,km:form.elements.km.valueAsNumber,feel:form.elements.feel.value
      }));
    }catch{$('#log-status').textContent='저장하지 못했습니다. 브라우저 저장 설정을 확인하세요.';return}
    form.hidden = true;
    draw();
    const month=periodStats(loggedRuns(dateKey),monthStart(dateKey),dateKey);
    $('#log-status').textContent=dateKey+' · '+kmText(form.elements.km.valueAsNumber)+'km를 '+(previous?'수정':'기록')+'했습니다. 이번 달 누적 '+kmText(month.km)+'km입니다.';
    $('#open-run').focus();
  };
  draw();
}
function paceChoices(type,paces){
  if(!paces || !type || type==='휴식' || type==='첫 러닝')return [];
  if(type==='걷기·달리기')return [];
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
  '걷기·달리기':'편하게 걷다가 짧게 달리고, 숨이 차면 다시 걸으세요.',
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
  const recent=loggedRuns(dateKey)[0];
  const newcomer=!plan && !recent;
  const fallback=newcomer?'첫 러닝':'휴식';
  let choice = readTodayRun(dateKey);
  let {d,t} = readRaceRecord();
  const profile = coachProfile();
  let paces = profile.mode === "beginner" ? null : trainingPaces(d,t);
  const favorites = readWeatherFavorites();
  const places = favorites.length ? favorites : [{city:'서울',area:''}];

  let suggestion=null;
  try{
    const saved=JSON.parse(localStorage.getItem(todayRunKey));
    if(saved?.date===dateKey && [15,20,30].includes(saved.minutes))suggestion=saved;
  }catch{}
  tool(dateLabel, `
    <div id="today-overview">
      <h4 class="today-session" id="finished-title" hidden></h4><div id="run-metrics" hidden><div><small>거리</small><strong id="done-distance"></strong></div><div><small>운동 시간</small><strong id="done-time"></strong></div><div><small>평균 페이스</small><strong id="done-pace"></strong></div></div><small id="last-run"></small><small id="after-run"></small><div class="session-heading"><h4 id="today-session" class="today-session"></h4>
        <button type="button" id="change-session" aria-controls="pick-session">훈련 변경</button></div>
      <p id="today-weather-line" class="today-weather-line" role="status"></p>
      <button type="button" id="begin-recommend" hidden>첫 러닝 추천받기</button>
      <form id="first-question" hidden>
        <label>최근에는 어떻게 달렸나요?<select name="experience"><option value="new">처음이거나 한동안 쉬었어요</option><option value="regular">가볍게 달리고 있어요</option></select></label>
        <label>오늘 가능한 시간<select name="minutes"><option>15</option><option selected>20</option><option>30</option></select></label>
        <p id="recommend-preview" aria-live="polite"></p><button type="submit">이대로 선택</button><button type="button" id="cancel-recommend">취소</button>
      </form>
      <div id="pick-session">
        <div class="session-picks first-pick"><button type="button" data-run="첫 러닝">처음이라 추천받기<span>내 경험과 가능한 시간으로 고르기</span></button></div>
        <h4>직접 고르기</h4><div class="session-picks">
          ${[['이지런','편안한 속도로'],['회복런','피곤한 날 짧고 느리게'],['긴 이지런','여유 있게 오래'],['템포런','빠른 속도를 일정하게'],['인터벌','빠르게 뛰고 쉬기를 반복'],['자유주','거리와 속도를 자유롭게'],['휴식','오늘은 쉬어가기']].map(([type,tip])=>'<button type="button" data-run="'+type+'">'+type+'<span>'+tip+'</span></button>').join('')}
        </div><button type="button" id="follow-plan" hidden>주간 계획 따르기</button>
      </div>
      <div id="today-pace" class="today-pace" aria-live="polite" hidden>
        <strong id="today-pace-value" hidden></strong>
        <small id="today-pace-context" hidden></small>
        <button id="today-pace-setup" type="button" hidden>내 기록으로 몇 분/km인지 보기</button>
        <div id="today-record" hidden>${recordFields()}</div>
        <div id="today-first" hidden>${profileFields()}<details><summary>자세한 방법 보기</summary>${firstSessionSteps()}</details></div>
      </div>
      <p id="session-purpose"></p><div id="today-move"></div>

      <div class="run-actions"><a href="#records" id="record-link" hidden>기록 보기</a><button id="open-run" type="button">러닝 완료</button><a href="#pace" id="today-calc">내 페이스로 계산</a></div>
      <div class="today-links"><a href="#records">지난 러닝 기록하기</a><a href="#plan">주간 훈련 계획</a></div>
      <form id="run-log" hidden>
      <label>달린 거리 (km)<input name="km" type="number" step="0.01" min="0.01" inputmode="decimal" required></label>
      <label><input type="checkbox" name="different"> 다르게 달렸어요</label><label hidden id="actual-type">실제 훈련<select name="actualType"></select></label>
      <details id="run-details"><summary>시간 · 느낌 · 사진 추가</summary>
      <label>운동 시간<input name="elapsed" placeholder="4859 → 48분 59초" inputmode="numeric" maxlength="12"></label>
      <small id="pace-preview" role="status"></small>
      <label id="manual-pace">평균 페이스 (선택, 분/km)<input name="pace" placeholder="예: 453" inputmode="numeric" maxlength="8"></label>
      <label>달리고 난 느낌<select name="feel"><option value="">선택 안 함</option><option>여유</option><option>보통</option><option>힘듦</option></select></label>
      <label>운동 요약 스크린샷 가져오기<input type="file" name="photo" accept="image/*"></label>
      <small>애플 피트니스의 운동 요약 사진을 이 기기에서 읽습니다.</small><p class="photo-status" role="status"></p>
      </details><button type="submit">기록 저장</button></form><small id="log-status" role="status"></small>
      <small id="today-plan" hidden></small>
      <small id="today-save-status" role="status"></small>
    </div>
  `);
  $('#today-overview').closest('section').classList.add('today-card');
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
  mountJournal(dateKey, day, planned, () => choice || plannedType || '자유주');
  if(planned)mountMove($('#today-move'),dateKey,planned,dest=>{display();$('#today-save-status').textContent=dest+'로 훈련을 옮겼습니다.';});
  const forecastText = $('#today-forecast');
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
  const plannedLabel = planned ? planned.type+' '+sessionDose(planned) : plannedType;
  planNote.textContent = plannedLabel ? '주간 계획 · '+plannedLabel : '';
  const session = $('#today-session');
  let choosing = !(choice || plannedType || fallback);
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
    const type = choice || plannedType || fallback;
    $('#session-purpose').textContent=choosing?'':planned && type===planned.type?planReason(planned):dayPurpose[type]||'';
    const overridesPlan = !!choice && type !== plannedType;
    const first = type==='첫 러닝';
    const title = suggestion && choice ? choice+' '+suggestion.minutes+'분' :
      first ? '걷기와 짧은 달리기 20분' : type==='휴식' ? '오늘은 예정된 훈련이 없어요' : type;
    const isIntro=newcomer && !choice && !choosing;
    $('#begin-recommend').hidden=!isIntro || !$('#first-question').hidden;
    if(!runOn(dateKey)){
      $('#open-run').textContent=planned || choice?'러닝 기록하기':'자유 러닝 기록하기';
      $('#open-run').classList.toggle('secondary-action',isIntro);
    }
    if(type==='휴식' && !choosing){
      const next=nextScheduledRun(dateKey);
      $('#session-purpose').textContent=next?'다음 훈련 · '+next.date+' · '+next.session.type+' '+sessionDose(next.session):'원하면 자유롭게 달리고 기록을 남기세요.';
    }
    session.textContent = choosing ? '오늘은 어떻게 달릴까요?' :
      (!choice && planned ? '오늘 계획 · '+plannedLabel : title);
    $('#pick-session').hidden = !choosing;
    $('#follow-plan').hidden = !(choice && plannedType);
    const change = $('#change-session');
    change.hidden = !type;
    change.textContent = choosing ? '취소' : isIntro?'직접 고르기':'훈련 변경';
    change.setAttribute('aria-expanded',String(choosing));
    for(const button of document.querySelectorAll('[data-run]')){
      button.setAttribute('aria-pressed',String(button.dataset.run===type));
    }
    $('#today-calc').hidden = choosing || !paces || !type || first || type==='걷기·달리기' || type==='휴식';
    $('#today-calc').onclick = () => {
      const options = paceChoices(type,paces);
      if(options.length) speed = 3600/Math.round(options[Math.floor(options.length/2)]);
    };
    planNote.hidden = !overridesPlan || !plannedLabel;
    paceCard.hidden = isIntro || choosing || !type || type==='휴식';
    if(!paceCard.hidden){
      paceValue.hidden = !paces && !first;
      paceContext.hidden = false;
      paceSetup.textContent = paces ? '적용한 PB 수정' : '내 기록으로 몇 분/km인지 보기';
      paceSetup.hidden = first || !$('#today-record').hidden;
      $('#today-first').hidden = !first;
      if(first){
        paceValue.hidden = true;
        paceContext.textContent = '5분 걷기 → 1분 달리기와 90초 걷기 4회 → 5분 걷기';
      }else if(type==='걷기·달리기'){
        paceValue.hidden = paceSetup.hidden = true;
        paceContext.textContent = todayRunTips[type];
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
    if(suggestion && choice && !choosing){
      paceContext.textContent=suggestionText(choice,suggestion.minutes);
      $('#today-first').hidden=true;
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
  $('#change-session').onclick = () => {
    question.hidden=true;choosing = !choosing;
    $('#today-record').hidden = true;
    $('#run-log').hidden = true;
    showAdvice();
    if(choosing) $('#pick-session button').focus();
    else session.focus();
  };
  const question=$('#first-question');
  function suggestionText(type,minutes){
    if(type==='이지런')return '최근 가볍게 달린 경험을 반영했어요. 5분 걷고 '+(minutes-10)+'분 편하게 달린 뒤 5분 걸으세요.';
    return '첫 러닝이나 복귀를 위한 구성입니다. 5분 걷고 '+(minutes-10)+'분 동안 1분 달리기와 90초 걷기를 반복한 뒤 5분 걸으세요.';
  }
  function previewSuggestion(){
    const type=question.elements.experience.value==='regular'?'이지런':'걷기·달리기';
    const minutes=Number(question.elements.minutes.value);
    $('#recommend-preview').textContent=type+' '+minutes+'분 · '+suggestionText(type,minutes);
    return {type,minutes};
  }
  function openQuestion(){
    choosing=false;question.hidden=false;
    if(suggestion){question.elements.minutes.value=suggestion.minutes;question.elements.experience.value=suggestion.type==='이지런'?'regular':'new';}
    previewSuggestion();showAdvice();question.elements.experience.focus();
  }
  question.onchange=previewSuggestion;
  question.onsubmit=e=>{e.preventDefault();const pick=previewSuggestion();choose(pick.type,pick);};
  $('#begin-recommend').onclick=openQuestion;
  $('#cancel-recommend').onclick=()=>{question.hidden=true;showAdvice();session.focus();};
  function choose(next,pick=null){
    question.hidden=true;suggestion=pick;
    choice = next;
    choosing = false;
    $('#today-record').hidden = true;
    $('#run-log').hidden = true;
    $('#today-first details').open = false;
    try{
      if(choice) localStorage.setItem(todayRunKey,JSON.stringify({date:dateKey,type:choice,...pick}));
      else localStorage.removeItem(todayRunKey);
      $('#today-save-status').textContent = '';
    }catch{$('#today-save-status').textContent = '이 브라우저에 오늘의 선택을 저장하지 못했습니다.'}
    showAdvice();
    session.focus();
  }
  for(const button of document.querySelectorAll('[data-run]')){
    button.onclick = () => button.dataset.run==='첫 러닝'?openQuestion():choose(button.dataset.run);
  }
  $('#follow-plan').onclick = () => choose('');
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
