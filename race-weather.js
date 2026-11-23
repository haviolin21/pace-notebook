const raceDistributions = [
  {"name": "2026 MBN 서울마라톤", "url": "https://runpick.co.kr/races/Aa", "courses": {"10km": [[0, 40, 1.01, 0.97, 0.04], [40, 50, 14.16, 12.69, 1.47], [50, 60, 36.49, 23.07, 13.42], [60, 70, 29.45, 12.66, 16.8], [70, 80, 13.9, 5.16, 8.74], [80, 90, 4.01, 1.38, 2.63], [90, 100, 0.74, 0.27, 0.47], [100, 110, 0.12, 0.07, 0.05], [110, 120, 0.07, 0.03, 0.04], [120, null, 0.05, 0.04, 0.01]], "하프": [[0, 80, 0.39, 0.38, 0.01], [80, 90, 4.65, 4.58, 0.07], [90, 100, 11.46, 10.97, 0.49], [100, 110, 19.34, 16.97, 2.36], [110, 120, 22.84, 17.73, 5.1], [120, 130, 16.56, 10.97, 5.59], [130, 140, 12.53, 7.33, 5.21], [140, 150, 7.44, 4.13, 3.31], [150, 160, 3.11, 1.85, 1.26], [160, 170, 1.22, 0.73, 0.49], [170, 180, 0.37, 0.19, 0.19], [180, 190, 0.08, 0.07, 0.01], [190, null, 0.01, 0.01, 0.01]]}},
  {"name": "2026 김대중마라톤대회", "url": "https://runpick.co.kr/races/e0086cf237842e98bf65858f", "courses": {"5km": [[0, 20, 0.87, 0.87, 0.0], [20, 30, 12.47, 8.78, 3.69], [30, 40, 40.55, 18.16, 22.39], [40, 50, 32.1, 12.06, 20.04], [50, 60, 10.99, 4.76, 6.23], [60, 70, 2.55, 0.8, 1.74], [70, 80, 0.47, 0.13, 0.34]], "10km": [[0, 40, 3.25, 3.19, 0.07], [40, 50, 21.07, 18.4, 2.67], [50, 60, 40.83, 29.39, 11.44], [60, 70, 20.94, 10.66, 10.27], [70, 80, 9.82, 5.01, 4.81], [80, 90, 3.64, 1.37, 2.28], [90, null, 0.46, 0.13, 0.33]], "하프": [[0, 80, 1.4, 1.4, 0.0], [80, 90, 3.44, 3.44, 0.0], [90, 100, 11.73, 10.71, 1.02], [100, 110, 18.88, 17.73, 1.15], [110, 120, 25.0, 22.07, 2.93], [120, 130, 15.05, 12.76, 2.3], [130, 140, 11.48, 9.06, 2.42], [140, 150, 5.87, 4.85, 1.02], [150, 160, 3.06, 2.42, 0.64], [160, 170, 3.19, 2.17, 1.02], [170, 180, 0.89, 0.64, 0.26]]}},
  {"name": "2026 무주반딧불평화마라톤", "url": "https://runpick.co.kr/races/b5e27566e04d1ed6726a46ed", "courses": {"5km": [[0, 20, 2.92, 2.92, 0.0], [20, 30, 17.3, 12.58, 4.72], [30, 40, 37.08, 16.63, 20.45], [40, 50, 29.21, 13.03, 16.18], [50, 60, 8.76, 3.82, 4.94], [60, 70, 3.6, 1.57, 2.02], [70, null, 1.12, 0.45, 0.67]], "하프": [[0, 80, 1.3, 1.3, 0.0], [80, 90, 5.86, 5.86, 0.0], [90, 100, 12.38, 11.07, 1.3], [100, 110, 22.15, 21.5, 0.65], [110, 120, 22.48, 19.87, 2.61], [120, 130, 18.24, 12.38, 5.86], [130, 140, 9.77, 7.17, 2.61], [140, 150, 5.21, 3.26, 1.95], [150, 160, 2.61, 1.3, 1.3]]}},
  {"name": "2026 자이스 스마일 레이스", "url": "https://runpick.co.kr/races/1bc5afb2df258cf53147248e", "courses": {"5km": [[0, 20, 0.25, 0.25, 0.0], [20, 30, 10.74, 7.72, 3.02], [30, 40, 49.92, 21.14, 28.78], [40, 50, 29.53, 10.74, 18.79], [50, 60, 6.71, 2.1, 4.61], [60, 70, 2.68, 1.01, 1.68], [70, null, 0.17, 0.0, 0.17]], "10km": [[0, 40, 0.89, 0.89, 0.0], [40, 50, 14.91, 13.98, 0.93], [50, 60, 41.72, 34.21, 7.52], [60, 70, 27.45, 16.93, 10.52], [70, 80, 11.78, 6.0, 5.79], [80, 90, 3.21, 1.77, 1.44], [90, null, 0.04, 0.0, 0.04]]}},
  {"name": "2026 통큰런", "url": "https://runpick.co.kr/races/bf956b3fa2c0ed310922a115", "courses": {"3km": [[0, 20, 3.49, 3.49, 0.0], [20, 30, 40.95, 40.95, 0.0], [30, 40, 36.19, 36.19, 0.0], [40, 50, 16.83, 16.83, 0.0], [50, 60, 2.54, 2.54, 0.0]], "5km": [[0, 30, 13.32, 13.32, 0.0], [30, 40, 52.73, 52.46, 0.27], [40, 50, 27.16, 26.9, 0.27], [50, 60, 5.33, 5.33, 0.0], [60, 70, 1.46, 1.46, 0.0]], "10km": [[0, 40, 0.22, 0.22, 0.0], [40, 50, 9.25, 9.25, 0.0], [50, 60, 33.22, 33.11, 0.11], [60, 70, 31.66, 31.55, 0.11], [70, 80, 16.5, 16.5, 0.0], [80, 90, 7.92, 7.92, 0.0], [90, 100, 1.23, 1.23, 0.0]]}},
  {"name": "AR SPEED TRACK 2027", "url": "https://runpick.co.kr/races/smartchip-202650000353", "courses": {"10km": [[0, 40, 71.97, 67.42, 4.55], [40, 50, 28.03, 4.55, 23.48]]}}
];
function ranking(){
  tool('내 완주 기록 비교', `
    <label>대회<select id="rank-event"></select></label>
    <div class="layout"><label>종목<select id="rank-km"></select></label>
    <label>비교 그룹<select id="group"><option>전체</option><option>남성</option><option>여성</option></select></label></div>
    <label>내 기록 (분:초 또는 시:분:초)<input id="rank-time" inputmode="numeric" maxlength="12" placeholder="예: 4859" aria-describedby="rank-feedback"></label>
    <small id="rank-feedback" role="status"></small><div id="rank-result"></div>
    <small>선택한 그룹의 완주 시간 분포를 기준으로 계산합니다. 연령별 집계는 제공되지 않습니다. <a id="rank-source">대회별 계측 통계</a></small>`);
  const race = $('#rank-event'), course = $('#rank-km'), group = $('#group');
  raceDistributions.forEach((item,i)=>race.add(new Option(item.name,i)));
  function setCourses(){
    const chosen = raceDistributions[race.selectedIndex], previous = course.value;
    course.replaceChildren(...Object.keys(chosen.courses).map(name=>new Option(name,name)));
    if(chosen.courses[previous]) course.value = previous;
    $('#rank-source').href = chosen.url;
  }
  function update(seconds){
    const rows = raceDistributions[race.selectedIndex].courses[course.value];
    const column = 2 + group.selectedIndex;
    const total = rows.reduce((sum,r)=>sum+r[column],0);
    if(!total){ $('#rank-result').textContent = '이 그룹은 집계된 기록이 없습니다.'; return; }
    let cumulative = 0, summary = seconds ? '공개된 기록 구간 밖입니다.' : '기록을 입력하면 내 구간이 표시됩니다.';
    const table = rows.map(r=>{
      const [low,high] = r;
      const start = cumulative;
      cumulative += r[column];
      const band = (100*start/total).toFixed(1)+'–'+(100*cumulative/total).toFixed(1)+'%';
      const selected = seconds>0 && seconds>=low*60 && (high===null || seconds<high*60);
      if(selected) summary = hero('내 기록의 상위 비율 범위',band);
      const label = high===null ? low+'분 이상' : (low ? low+'분 이상 · ' : '')+high+'분 미만';
      return '<div class="row '+(selected?'selected':'')+'"><span>'+label+'</span><b>'+band+'</b></div>';
    }).join('');
    $('#rank-result').innerHTML = summary+'<h3>기록별 티어 표</h3>'+table;
  }
  const useProfile = profile => { group.selectedIndex = profile.sex==='female'?2:profile.sex==='male'?1:0; };
  setCourses(); useProfile(coachProfile());
  const refresh = mountDurationInput($('#rank-time'),$('#rank-feedback'),update);
  race.onchange = ()=>{setCourses();refresh();};
  group.onchange = course.onchange = refresh;

}

function races(){
  tool('국내 대회','<label>종목<select id="race-filter"><option>전체</option><option>10km</option><option>하프</option><option>풀코스</option></select></label><div id="events"></div><small>일정 확인일 2026.11.23 · 접수 변경 사항은 대회 공식 안내에서 확인하세요.</small>');
  const events=[['2027 서울마라톤','2027.03.21','서울 · 광화문광장(풀), 잠실종합운동장(10km) 예정',['10km','풀코스'],'https://seoul-marathon.com/96','<a href="https://seoul-marathon.com/90">접수 일정</a>'],['2026 MBN 서울마라톤','2026.11.15','서울 · 광화문광장 출발',['10km','하프'],'https://mbn-seoulmarathon.com','<a href="#rank">완주 기록 비교</a>']];
  function render(){const val=$('#race-filter').value;$('#events').innerHTML=events.filter(e=>val==='전체'||e[3].includes(val)).map(([name,date,where,km,url,link])=>'<article class="race"><small>'+date+' · '+km.join(' / ')+'</small><h3>'+name+'</h3><p>'+where+'</p><a href="'+url+'">공식 대회 안내</a> · '+link+'</article>').join('')}
  $('#race-filter').onchange=render;render();
}
const weatherFavoritesKey = 'pace-note.weather-favorites.v1';

function readWeatherFavorites(){
  try{
    const saved = JSON.parse(localStorage.getItem(weatherFavoritesKey) || '[]');
    if(!Array.isArray(saved)) return [];
    return saved.filter(place => place && Object.hasOwn(weatherLocations, place.city) &&
      (place.area === '' || Object.hasOwn(weatherLocations[place.city].areas, place.area)));
  }catch{
    return [];
  }
}

function weatherLocationLabel(city, area){
  return area ? city + ' ' + area : city;
}

async function fetchRunningForecast({city, area}, offset = 0){
  const region = weatherLocations[city];
  const [latitude, longitude] = (area ? region.areas[area] : region.center).split(',');
  const hour = new Date(Date.now() + (9 + offset) * 3600000).toISOString().slice(0,13) + ':00';
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude, longitude, hourly:'temperature_2m,apparent_temperature,wind_speed_10m,precipitation',
    timezone:'Asia/Seoul', forecast_days:'2', wind_speed_unit:'ms'
  });
  const response = await fetch(url,{signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw Error('Forecast unavailable');
  const {hourly} = await response.json();
  const index = hourly.time.indexOf(hour);
  const [temperature, feelsLike, wind, rain] = [
    hourly.temperature_2m[index], hourly.apparent_temperature[index],
    hourly.wind_speed_10m[index], hourly.precipitation[index]
  ];
  if(![temperature, feelsLike, wind, rain].every(Number.isFinite)) throw Error('Incomplete forecast');
  const nowHour = new Date(Date.now()+9*3600000).toISOString().slice(0,13)+':00';
  const evening = nowHour.slice(0,10)+'T18:00';
  const start = nowHour > evening ? nowHour : evening;
  const windows = hourly.time.filter(h => h>=start).filter((_,i)=>i%2===0).slice(0,3).map(h => {
    const i = hourly.time.indexOf(h);
    return {hour:h,feel:hourly.apparent_temperature[i],rain:hourly.precipitation[i],wind:hourly.wind_speed_10m[i]};
  }).filter(w=>[w.feel,w.rain,w.wind].every(Number.isFinite));
  return {hour, temperature, feelsLike, wind, rain, windows};
}

function renderWindows(container,windows){
  container.replaceChildren();
  if(!windows.length)return;
  const day = new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  const label = w => (w.hour.slice(0,10)===day?'':'내일 ')+Number(w.hour.slice(11,13))+'시';
  const heading = document.createElement('h4');
  heading.textContent = '몇 시에 뛸까요?';
  const grid = document.createElement('div');
  grid.className = 'hours';
  for(const w of windows){
    const cell = document.createElement('div');
    cell.innerHTML = '<b>'+label(w)+'</b><strong>체감 '+w.feel+'°</strong><small>강수 '+w.rain+'mm</small><small>바람 '+w.wind+'m/s</small>';
    grid.append(cell);
  }
  const summary = document.createElement('p');
  const dry = windows.find(w=>w.rain===0);
  const calm = windows.reduce((a,b)=>a.wind<=b.wind?a:b);
  if(windows.every(w=>w.rain===0))summary.textContent = '비 예보가 없는 시간대입니다.'+(windows.some(w=>w.wind>calm.wind)?' '+label(calm)+'에 바람이 가장 약해요.':'');
  else if(dry)summary.textContent = label(dry)+'에는 비 예보가 없어요.';
  else summary.textContent = '비가 예보된 시간대입니다. 출발 전 강수량을 확인하세요.';
  container.append(heading,grid,summary);
}

function outfitAdvice(t){
  if(t < 0) return '긴팔 베이스레이어와 방풍 재킷, 긴 타이츠와 장갑을 고려하세요.';
  if(t < 8) return '긴팔과 얇은 겉옷, 긴 타이츠 조합을 고려하세요.';
  if(t < 15) return '얇은 긴팔과 반바지 또는 얇은 타이츠를 고려하세요.';
  if(t < 22) return '가벼운 반팔과 반바지를 고려하세요.';
  return '통풍이 잘되는 얇은 상의와 반바지를 고려하세요.';
}

function weather(){
  tool('출발 시간의 날씨', `
    <div class="weather-favorites" id="weather-favorites" role="group" aria-label="즐겨찾는 지역" hidden></div>
    <p id="forecast-result" role="status"></p>
    <div id="weather-windows"></div><div class="layout weather-fields">
      <label>시·도<select id="city"></select></label>
      <label>구·군 / 시<select id="area"></select></label>
      <label>출발 시각<select id="when">
        <option value="0">지금</option><option value="1">1시간 뒤</option>
        <option value="3">3시간 뒤</option><option value="6">6시간 뒤</option>
      </select></label>
    </div>
    <div class="actions">
      <button type="button" class="primary" id="forecast">예보 조회</button>
      <button type="button" id="save-weather-place">지역 즐겨찾기 추가</button>
    </div>
    <p id="weather-save-status" class="plan-msg" role="status"></p>
    <small><a href="https://open-meteo.com/">Open-Meteo</a> 시간별 예보 · 지역 대표 지점 · 한국 시간</small>
  `);
  tool('기온별 옷차림','<label>체감온도 (°C)<input id="guide-temp" type="number" step="0.1" value="8"></label><div id="guide"></div>');
  mountOutfits();
  const guide=$('#guide-temp'),status=$('#forecast-result'),button=$('#forecast');
  const city=$('#city'),area=$('#area'),when=$('#when');
  const favoritesList = $('#weather-favorites'), savePlace = $('#save-weather-place');
  const saveStatus = $('#weather-save-status');
  let favorites = readWeatherFavorites();
  const matchesSelection = place => place.city === city.value && place.area === area.value;
  Object.keys(weatherLocations).forEach(name => city.add(new Option(name,name)));
  function showAreas(){
    const {areas} = weatherLocations[city.value];
    area.replaceChildren(new Option('도시 기준',''), ...Object.keys(areas).map(name => new Option(name,name)));
  }
  function selectPlace(place){
    city.value = place.city;
    showAreas();
    area.value = place.area;
  }

  function saveFavorites(next){
    try{
      localStorage.setItem(weatherFavoritesKey, JSON.stringify(next));
      favorites = next;
      return true;
    }catch{
      saveStatus.textContent = '즐겨찾기를 저장할 수 없습니다. 브라우저 저장 설정을 확인하세요.';
      return false;
    }
  }

  function renderFavorites(){
    const selected = favorites.some(matchesSelection);
    savePlace.textContent = selected ? '지역 즐겨찾기 해제' : '지역 즐겨찾기 추가';
    favoritesList.hidden = favorites.length === 0;
    const active = favoritesList.contains(document.activeElement);
    const buttons = favorites.map(place => {
      const favorite = document.createElement('button');
      favorite.type = 'button';
      favorite.textContent = weatherLocationLabel(place.city, place.area);
      favorite.setAttribute('aria-pressed', String(matchesSelection(place)));
      favorite.onclick = () => {
        selectPlace(place);
        saveStatus.textContent = '';
        if(favorites[0] !== place){
          saveFavorites([place, ...favorites.filter(other => other !== place)]);
        }
        renderFavorites();
        load();
      };
      return favorite;
    });
    favoritesList.replaceChildren(...buttons);
    if(active) favoritesList.querySelector('[aria-pressed="true"]')?.focus();
  }

  if(favorites.length) selectPlace(favorites[0]);
  else showAreas();
  renderFavorites();
  function clothes(){
    $('#guide').textContent = guide.value === '' ? '체감온도를 입력하세요.' : outfitAdvice(Number(guide.value));
    $('#temp').value=guide.value;
    $('#temp').dispatchEvent(new Event('input'));
  }
  guide.oninput=clothes;clothes();
  let serial=0;
  async function load(){
    const request=++serial;
    const place = {city:city.value, area:area.value};
    const locationLabel = weatherLocationLabel(place.city,place.area);
    $('#weather-windows').replaceChildren();
    status.textContent=locationLabel+' 예보를 조회하는 중입니다…';
    try{
      const {hour, temperature, feelsLike, wind, rain, windows} = await fetchRunningForecast(place,Number(when.value));
      if(request!==serial||!status.isConnected)return;
      status.textContent=locationLabel+' · '+hour.replace('T',' ')+' · 기온 '+temperature+'°C · 체감 '+feelsLike+'°C · 바람 '+wind+'m/s · 강수 '+rain+'mm';
      renderWindows($('#weather-windows'),windows);
      guide.value=feelsLike;clothes();
    }catch{if(request===serial && status.isConnected)status.textContent=locationLabel+' 예보를 불러오지 못했습니다. 다시 조회하거나 체감온도를 직접 입력하세요.'}
  }
  button.onclick=load;
  function changePlace(){
    saveStatus.textContent = '';
    renderFavorites();
    load();
  }
  city.onchange=()=>{showAreas();changePlace()};
  area.onchange=changePlace;
  when.onchange=load;
  savePlace.onclick = () => {
    const current = {city:city.value, area:area.value};
    const wasSaved = favorites.some(matchesSelection);
    const otherPlaces = favorites.filter(place => !matchesSelection(place));
    if(saveFavorites(wasSaved ? otherPlaces : [current, ...otherPlaces])){
      saveStatus.textContent = weatherLocationLabel(current.city, current.area) +
        (wasSaved ? ' 즐겨찾기를 해제했습니다.' : ' 즐겨찾기에 저장했습니다.');
      renderFavorites();
      if(!wasSaved && serial===0) load();
    }
  };
  if(favorites.length) load();
}
