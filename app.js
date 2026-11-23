const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>';
const hero=(a,b)=>'<div class="hero">'+a+'<strong>'+b+'</strong></div>';
function time(s){s=Math.round(s);return (s>=3600?Math.floor(s/3600)+':':'')+String(Math.floor(s/60)%60).padStart(s>=3600?2:1,'0')+':'+String(s%60).padStart(2,'0')}
const distances=[5,10,21.0975,42.195], names=['5km','10km','하프','풀코스'];
const distanceOptions=distances.map((d,i)=>'<option value="'+d+'">'+names[i]+'</option>').join('');
let speed=12;
function calculator(){
  let mode='pace';
  $('#screen').insertAdjacentHTML('beforeend', `
    <section class="panel calculator" aria-label="페이스 계산">
      <div class="pace-readout" aria-live="polite">
        <div class="pace-label">1km 페이스</div>
        <div class="pace-value"><strong id="pace-value"></strong><span class="pace-unit">/km</span></div>
        <div class="calc-message" id="calc-message"></div>
      </div>
      <div class="calc-fields">
        <label>계산 기준<select id="mode">
          <option value="pace">1km 페이스</option>
          <option value="speed">러닝머신 속도</option>
          <option value="finish">목표 완주 기록</option>
        </select></label>
        <div id="entry"></div>
      </div>
    </section>
    <ul class="distance-results" aria-label="거리별 예상 기록">
      ${names.map(name => '<li><span>'+name+'</span><strong></strong></li>').join('')}
    </ul>
  `);
  const records = document.querySelectorAll('.distance-results strong');
  function output(value){
    const valid = Number.isFinite(value) && value > 0;
    const seconds = valid ? 3600 / value : 0;
    if(valid) speed = value;
    $('#pace-value').textContent = valid ? time(seconds) : '—';
    $('#calc-message').textContent = !valid && mode === 'speed' ? '속도를 0.1~30.0 km/h로 입력해 주세요.' : '';
    records.forEach((record, i) => { record.textContent = valid ? time(distances[i] * seconds) : '—'; });
    const converted = $('#converted-speed');
    if(converted) converted.textContent = valid ? '속도 ' + value.toFixed(1) + ' km/h' : '';
  }
  function fields(){
    const entry = $('#entry');
    if(mode === 'speed'){
      entry.innerHTML = `
        <label class="speed-caption" for="speed">속도 (km/h)</label>
        <div class="speed-controls">
          <button id="less" type="button" aria-label="속도 0.1 낮추기">−0.1</button>
          <input id="speed" type="number" min="0.1" max="30" step="0.1" inputmode="decimal" required>
          <button id="more" type="button" aria-label="속도 0.1 높이기">+0.1</button>
        </div>
        <input aria-label="속도 슬라이더 (km/h)" id="slider" type="range" min="0.1" max="30" step="0.1">
        <div class="range-labels" aria-hidden="true"><span>0.1</span><span>30.0</span></div>
      `;
      const number = $('#speed'), slider = $('#slider');
      function set(value){
        const clamped = Math.max(.1, Math.min(30, Math.round(value * 10) / 10));
        number.value = clamped.toFixed(1);
        slider.value = String(clamped);
        output(clamped);
      }
      number.oninput = () => {
        if(!number.validity.valid){ output(NaN); return; }
        slider.value = number.value;
        output(number.valueAsNumber);
      };
      slider.oninput = () => set(slider.valueAsNumber);
      $('#less').onclick = () => set(slider.valueAsNumber - .1);
      $('#more').onclick = () => set(slider.valueAsNumber + .1);
      set(speed);
      return;
    }
    const finish = mode === 'finish';
    const placeholder = finish ? '4859' : '430';
    entry.innerHTML = (finish ? '<label>목표 거리<select id="km">'+distanceOptions+'</select></label>' : '') +
      '<label>'+(finish ? '완주 기록 (분:초 또는 시:분:초)' : '페이스 (분:초/km)')+'<input id="clock" inputmode="numeric" enterkeyhint="done" maxlength="12" placeholder="예: '+placeholder+'" aria-describedby="clock-feedback"></label><small class="time-feedback" id="clock-feedback" role="status"></small><div id="converted-speed"></div>';
    if(finish) $('#km').value = '10';
    const distance = () => finish ? Number($('#km').value) : 1;
    const input = $('#clock');
    input.value = time(3600 * distance() / speed);
    const update = mountDurationInput(input,$('#clock-feedback'),seconds => output(3600 * distance() / seconds),{
      example: finish ? '4859 → 48:59, 14500 → 1:45:00' : '430 → 4:30',
      showConversion:true
    });
    if(finish) $('#km').onchange = update;
  }
  $('#mode').value = mode;
  $('#mode').onchange = event => { mode = event.target.value; fields(); };
  fields();
  mountSplits();
}
const groups = [
  {label:'오늘', pages:[['today','오늘의 러닝',todayRunning]]},
  {label:'계산', pages:[['pace','페이스 계산기',calculator]]},
  {label:'훈련', pages:[
    ['training','훈련 페이스',training],
    ['plan','훈련 계획',() => {
      $('#screen').insertAdjacentHTML('beforeend','<div id="planner"></div>');
      mountPlanner();
    }],
    ['stretch','스트레칭 팁',stretchingGuide],
    ['nutrition','식단 추천',nutritionGuide]
  ]},
  {label:'날씨', pages:[['weather','날씨와 복장',weather]]},
  {label:'대회', pages:[['races','대회 정보',races], ['rank','대회 티어',ranking]]}
];
const nav = $('.tabs'), subnav = $('.subnav');
const primaryLinks = groups.map(group => {
  const link = document.createElement('a');
  link.href = '#' + group.pages[0][0];
  link.textContent = group.label;
  nav.append(link);
  return link;
});
function display(){
  const route = location.hash.slice(1);
  const group = groups.find(item => item.pages.some(([id]) => id === route)) || groups[0];
  const page = group.pages.find(([id]) => id === route) || group.pages[0];
  primaryLinks.forEach((link, i) => {
    if(groups[i] === group) link.setAttribute('aria-current', group.pages.length > 1 ? 'true' : 'page');
    else link.removeAttribute('aria-current');
  });
  const secondaryLinks = group.pages.map(([id, label]) => {
    const link = document.createElement('a');
    link.href = '#' + id;
    link.textContent = label;
    if(id === page[0]) link.setAttribute('aria-current','page');
    return link;
  });
  subnav.replaceChildren(...secondaryLinks);
  subnav.hidden = group.pages.length < 2;
  $('#screen').innerHTML = '<h1>'+page[1]+'</h1>';
  page[2]();
}
window.addEventListener('hashchange', () => {
  display();
  window.scrollTo(0, 0);
});
display();
