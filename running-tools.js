const $ = selector => document.querySelector(selector);
function tool(title, html) {
  const section = document.createElement('section');
  section.className = 'runner-tool';
  section.innerHTML = '<h3>'+title+'</h3>'+html;
  $('#screen').append(section);
}
function duration(input, allowHours = true) {
  const value = input.normalize('NFKC').trim();
  const compact = /^\d{3,6}$/.test(value);
  const parts = compact
    ? value.padStart(value.length + value.length % 2, '0').match(/\d{2}/g)
    : value.split(':');
  if(parts.length < 2 || parts.length > (allowHours ? 3 : 2) ||
    !parts.every(part => /^\d{1,3}$/.test(part)) ||
    parts.slice(1).some(part => Number(part) >= 60)) return 0;
  return parts.reduce((seconds, part) => seconds * 60 + Number(part), 0);
}

function formatDuration(seconds, allowHours = true){
  seconds = Math.round(seconds);
  if(allowHours) return time(seconds);
  return Math.floor(seconds / 60)+':'+String(seconds % 60).padStart(2,'0');
}

function mountDurationInput(input, feedback, render, {allowHours = true, example = '4859 → 48:59, 14500 → 1:45:00', showConversion = false} = {}){
  function update(){
    const seconds = duration(input.value, allowHours);
    const invalid = !seconds && input.value.trim() !== '';
    input.setAttribute('aria-invalid', String(invalid));
    feedback.classList.toggle('input-error', invalid);
    const formatted = seconds ? formatDuration(seconds, allowHours) : '';
    const raw = input.value.normalize('NFKC').trim();
    feedback.textContent = formatted
      ? showConversion && /^\d+$/.test(raw) ? raw+' → '+formatted : '입력 확인 · '+formatted
      : (invalid ? '시간 형식을 확인해 주세요. 예: ' : '예: ')+example;
    render(seconds);
  }
  function finish(){
    const seconds = duration(input.value, allowHours);
    if(seconds) input.value = formatDuration(seconds, allowHours);
    update();
  }
  input.addEventListener('input', update);
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', event => {
    if(event.key === 'Enter'){
      event.preventDefault();
      input.blur();
    }
  });
  update();
  return update;
}

const splitState={distance:'10',goal:'48:00'};
function checkpoints(distance,seconds) {
  const points=[];
  for(let km=1;km<distance;km++) points.push([km,seconds*km/distance]);
  points.push([distance,seconds]);
  return points;
}
function mountSplits() {
  tool('목표 기록별 통과표','<label>목표 거리<select id="distance"><option value="5">5km</option><option value="10">10km</option><option value="21.0975">하프</option><option value="42.195">풀코스</option></select></label><label>목표 기록 (분:초 또는 시:분:초)<input id="goal" inputmode="numeric" enterkeyhint="done" maxlength="12" placeholder="예: 4859" aria-describedby="goal-feedback"></label><small class="time-feedback" id="goal-feedback" role="status"></small><small>목표 기록을 기준으로 일정하게 달릴 때의 누적 시간입니다.</small><details><summary>1km별 통과 시간 보기</summary><div id="splits" class="split-list"></div></details>');
  const dist=$('#distance'), goal=$('#goal');
  dist.value=splitState.distance;goal.value=splitState.goal;
  function render(sec){
    splitState.distance=dist.value;splitState.goal=goal.value;
    $('#splits').innerHTML=sec?checkpoints(Number(dist.value),sec).map(([km,t])=>row(km+'km',time(t))).join(''):'목표 기록을 입력하면 통과 시간이 표시됩니다.';
  }
  dist.onchange=mountDurationInput(goal,$('#goal-feedback'),render);
}
const trackState={pace:'4:30',meters:400};
function mountTrack(){
  tool('트랙 구간 환산','<label>목표 페이스 (분:초/km)<input id="track-pace" inputmode="numeric" enterkeyhint="done" maxlength="6" placeholder="예: 430" aria-describedby="track-feedback"></label><small class="time-feedback" id="track-feedback" role="status"></small><div class="track-options" id="meters"></div><div id="lap" aria-live="polite"></div>');
  const pace=$('#track-pace');pace.value=trackState.pace;
  function render(sec){
    trackState.pace=pace.value;
    $('#lap').innerHTML=sec?row(trackState.meters+'m 구간 시간',time(sec*trackState.meters/1000)):'페이스를 입력하면 구간 시간이 표시됩니다.';
    for(const b of $('#meters').children)b.setAttribute('aria-pressed',String(Number(b.value)===trackState.meters));
  }
  for(const m of [200,400,800]){
    const b=document.createElement('button');b.textContent=m+'m';b.value=m;
    b.onclick=()=>{trackState.meters=m;update()};$('#meters').append(b);
  }
  const update=mountDurationInput(pace,$('#track-feedback'),render,{allowHours:false,example:'430 → 4:30'});
}
const outfitKey='pace-note.outfits.v1';
function readOutfits(){
  const entries=JSON.parse(localStorage.getItem(outfitKey)||'[]');
  if(!Array.isArray(entries))throw new Error('invalid data');
  return entries.filter(e=>e&&Number.isFinite(e.temp)&&typeof e.clothes==='string'&&typeof e.date==='string');
}
function mountOutfits(){
  tool('나의 복장 기록','<form id="outfit"><label>달릴 때 체감온도 (°C)<input id="temp" type="number" required step="0.1" value="8"></label><label>입었던 옷<input id="clothes" required maxlength="140" placeholder="예: 긴팔, 반바지, 얇은 장갑"></label><label>달리면서 느낀 점<select id="feel"><option>적당함</option><option>추웠음</option><option>더웠음</option></select></label><button type="submit">복장 저장</button><small>이 브라우저에 저장됩니다.</small><div id="saved" role="status"></div></form><h3>비슷한 날의 복장</h3><small>입력한 체감온도의 ±2°C · 최근 기록순</small><div id="history"></div>');
  const temp=$('#temp'),clothes=$('#clothes'),history=$('#history');
  function render(){
    history.replaceChildren();
    if(temp.value===''){history.textContent='체감온도를 입력하세요.';return}
    try{
      const matches=readOutfits().filter(e=>Math.abs(e.temp-Number(temp.value))<=2);
      if(!matches.length)history.textContent='이 온도에 저장한 복장이 아직 없습니다.';
      for(const e of matches){
        const item=document.createElement('div');item.className='outfit-item';
        item.textContent=e.date+' · '+e.temp+'°C · '+e.feel+' — '+e.clothes;history.append(item);
      }
    }catch{history.textContent='저장된 기록을 읽을 수 없습니다.'}
  }
  temp.oninput=render;
  $('#outfit').onsubmit=event=>{
    event.preventDefault();
    if(!clothes.value.trim()){$('#saved').textContent='입었던 옷을 입력하세요.';return}
    try{
      const records=readOutfits();
      records.unshift({date:new Date().toLocaleDateString('ko-KR'),temp:Number(temp.value),clothes:clothes.value.trim(),feel:$('#feel').value});
      localStorage.setItem(outfitKey,JSON.stringify(records));clothes.value='';$('#saved').textContent='저장했습니다.';render();
    }catch{$('#saved').textContent='저장할 수 없습니다. 브라우저 저장 공간을 확인하세요.'}
  };
  render();
}
