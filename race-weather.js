const resultSets=[
  {name:'10km',first:40,shares:[[1.01,14.16,36.49,29.45,13.90,4.01,.74,.12,.07,.05],[.97,12.69,23.07,12.66,5.16,1.38,.27,.07,.03,.04],[.04,1.47,13.42,16.80,8.74,2.63,.47,.05,.04,.01]]},
  {name:'하프',first:80,shares:[[.39,4.65,11.46,19.34,22.84,16.56,12.53,7.44,3.11,1.22,.37,.08,.01],[.38,4.58,10.97,16.97,17.73,10.97,7.33,4.13,1.85,.73,.19,.07,.01],[.01,.07,.49,2.36,5.10,5.59,5.21,3.31,1.26,.49,.19,.01,.01]]}
];
function ranking(){
  tool('2026 MBN 서울마라톤','<div class="layout"><label>종목<select id="rank-km"><option>10km</option><option>하프</option></select></label><label>완주자 그룹<select id="group"><option>전체</option><option>남성</option><option>여성</option></select></label></div><label>내 기록 (분:초 또는 시:분:초)<input id="rank-time" inputmode="numeric" enterkeyhint="done" maxlength="12" placeholder="예: 4859" aria-describedby="rank-feedback"></label><small class="time-feedback" id="rank-feedback" role="status"></small><div id="rank-result"></div><small>공개된 10분 단위 분포로 계산한 상위 비율 범위입니다. 성별 선택 시 해당 그룹 안에서 다시 계산합니다. 반올림에 따라 경계가 달라질 수 있습니다. <a href="https://runpick.co.kr/races/Aa">계측 통계 보기</a></small>');
  function update(sec){
    const data=resultSets[$('#rank-km').selectedIndex],shares=data.shares[$('#group').selectedIndex];
    const total=shares.reduce((a,b)=>a+b,0);let sum=0,summary='';
    const table=shares.map((share,i)=>{
      const low=i?data.first+(i-1)*10:0,high=i===shares.length-1?Infinity:data.first+i*10;
      const start=sum;sum+=share;const band=(start*100/total).toFixed(1)+'~'+(sum*100/total).toFixed(1)+'%';
      const selected=sec>0&&sec>=low*60&&sec<high*60;
      if(selected)summary=hero('내 기록의 상위 비율 범위',band);
      return '<div class="row '+(selected?'selected':'')+'"><span>'+(high===Infinity?low+'분 이상':(low?low+'~':'')+high+'분 미만')+'</span><b>'+band+'</b></div>'
    }).join('');
    $('#rank-result').innerHTML=(summary||'<p>기록을 넣으면 해당 구간을 표시합니다.</p>')+'<h3>기록별 티어 표</h3>'+table;
  }
  const refresh = mountDurationInput($('#rank-time'),$('#rank-feedback'),update);
  $('#rank-km').onchange=refresh;$('#group').onchange=refresh;
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
  return {hour, temperature, feelsLike, wind, rain};
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
    <div class="layout weather-fields">
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
    status.textContent=locationLabel+' 예보를 조회하는 중입니다…';
    try{
      const {hour, temperature, feelsLike, wind, rain} = await fetchRunningForecast(place,Number(when.value));
      if(request!==serial||!status.isConnected)return;
      status.textContent=locationLabel+' · '+hour.replace('T',' ')+' · 기온 '+temperature+'°C · 체감 '+feelsLike+'°C · 바람 '+wind+'m/s · 강수 '+rain+'mm';
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
