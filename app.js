const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>';
const hero=(a,b)=>'<div class="hero">'+a+'<strong>'+b+'</strong></div>';
function time(s){s=Math.round(s);return (s>=3600?Math.floor(s/3600)+':':'')+String(Math.floor(s/60)%60).padStart(s>=3600?2:1,'0')+':'+String(s%60).padStart(2,'0')}
const distances=[5,10,21.0975,42.195], names=['5km','10km','하프','풀코스'];
const distanceOptions=distances.map((d,i)=>'<option value="'+d+'">'+names[i]+'</option>').join('');
let speed=12;
// Representative level-running speeds (mph) and METs from the 2024 Adult Compendium.
const runningIntensity = [[3.15,3.3],[4.1,6.5],[4.55,7.8],[5.1,8.5],[5.65,9],[6.15,9.3],[6.7,10.5],[7,11],[7.5,11.8],[8,12],[8.6,12.5],[9,13],[9.45,14.8],[10,14.8],[11,16.8],[12,18.5],[13,19.8],[14,23]];
function activeKcalPerKm(kph,kg){
  const mph = kph/1.609344;
  if(!Number.isFinite(mph) || mph<2.6 || mph>14 || !(kg>0)) return null;
  const closest = runningIntensity.reduce((a,b)=>Math.abs(mph-a[0])<=Math.abs(mph-b[0])?a:b);
  return (closest[1]-1)*kg/kph;
}

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
  tool('페이스별 예상 활동 칼로리', `
    <div class="layout"><p id="weight-summary"></p>
    <label>달린 거리 (km)<input id="kcal-distance" type="number" min="0.01" step="any" inputmode="decimal" value="5"></label></div>
    <p id="kcal-result" role="status"></p>
    <small>평지에서 달리는 성인의 평균 추정치입니다. 현재 속도와 가장 가까운 강도에서 휴식 소모량을 뺀 값으로 계산합니다. <a href="https://pacompendium.com/running/">달리기 강도 기준</a></small>`);
  const weight = Number(coachProfile().weight), distanceField = $('#kcal-distance');
  $('#weight-summary').textContent = weight>0 ? '현재 체중 '+weight+' kg · ' : '';
  const weightLink = document.createElement('a');
  weightLink.href = '#profile';
  weightLink.textContent = weight>0 ? '내 정보 수정' : '내 정보에서 체중 입력';
  $('#weight-summary').append(weightLink);
  let displayedSpeed;
  function renderCalories(){
    const rate = activeKcalPerKm(displayedSpeed,weight);
    let message = '체중을 입력하면 현재 페이스의 예상 칼로리가 표시됩니다.';
    if(weight>0){
      if(!Number.isFinite(displayedSpeed)) message = '페이스 또는 속도를 확인해 주세요.';
      else if(!rate) message = '칼로리 추정 범위는 약 4.2–22.5 km/h입니다.';
      else {
        message = time(3600/displayedSpeed)+'/km 기준 · 1km당 약 '+Math.round(rate)+' kcal';
        if(distanceField.valueAsNumber>0 && distanceField.validity.valid)
          message += ' · '+distanceField.value+'km 총 약 '+Math.round(rate*distanceField.valueAsNumber)+' kcal';
      }
    }
    $('#kcal-result').textContent = message;
  }
  distanceField.oninput = renderCalories;
  function output(value){
    displayedSpeed = value;
    renderCalories();
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
    else {
      const type = currentRunType();
      const record = readRaceRecord();
      const options = coachProfile().mode==='beginner' ? [] : paceChoices(type,trainingPaces(record.d,record.t));
      if(options.length){
        const group = document.createElement('div');
        group.className = 'pace-presets';
        const caption = document.createElement('small');
        caption.textContent = '오늘의 '+type+' 페이스';
        group.append(caption);
        for(const seconds of options){
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.textContent = time(seconds);
          chip.onclick = () => { input.value = chip.textContent; update(); };
          group.append(chip);
        }
        entry.append(group);
      }
    }
  }
  $('#mode').value = mode;
  $('#mode').onchange = event => { mode = event.target.value; fields(); };
  fields();
  mountSplits();
}
const shoePhotos = {
  "everyday": "https://cdn11.bigcommerce.com/s-21x65e8kfn/images/stencil/original/products/76245/402233/ASI15672_1000_3__31148.1739553593.jpg",
  "stable": "https://0990b9.a-cdn.akinoncloud.com/products/2025/08/06/7485083/1242d795-d05c-48f4-bcf6-a055038bee3d.jpg",
  "cushion": "https://gambol.in/cdn/shop/files/7_030551fb-ed78-4dd7-aa7e-c63545abee1a.jpg?v=1761547343",
  "bounce": "https://thelooprunning.com/cdn/shop/files/IMG_5047.png?v=1776187047",
  "speed": "https://static.netshoes.com.br/produtos/tenis-adidas-adizero-evo-sl-masculino/28/FBA-6207-028/FBA-6207-028_zoom1.jpg?ts=1781239974",
  "race": "https://cdn.media.amplience.net/i/sportinglife/25922892_WHITE-BLUE-YELLOW_0/Mens-Adizero-Adios-Pro-4-Running-Shoe-WHITE-BLUE-YELLOW?%24default%24=&fmt=auto",
  "trail": "https://assets.adidas.com/images/h_2000%2Cf_auto%2Cq_auto%2Cfl_lossy%2Cc_fill%2Cg_auto/455bb02ca4d0437cbb7c1bd7b2344f2c_9366/Chaussure_de_trail_running_Terrex_Agravic_3_Blanc_JI0955_HM1.jpg",
  "peg": "https://cdn.hiconsumption.com/wp-content/uploads/2024/06/Nike-Pegasus-41-0-Hero.jpg",
  "ghost": "https://www.fit2run.com/cdn/shop/files/110418_125_1_358439d4-f755-4b3e-80bf-e746ddca3c6e.png?v=1723737649&width=1200",
  "speed4": "images/saucony-endorphin-speed-4.webp",
  "chall": "https://runpacers.com/cdn/shop/files/Mens-HOKA-ONE-ONE-Challenger-ATR-7-Bellwether-Blue-Stone-Blue.jpg?v=1727204241&width=2200"
};
const shoeGuideSource = 'https://www.asics.com/us/en-us/blog/gel-kayano-gel-nimbus-and-gel-cumulus-which-shoe-is-right-for-me/';
const shoeModels = {
  peg:['Nike Pegasus 41','도로에서 걷기와 조깅을 번갈아 하고, 익숙해지면 같은 신발로 거리를 늘리고 싶은 분의 후보입니다.','천천히 달릴 때 앞발로 넘어가는 느낌을 고스트와 비교해 보세요.','https://www.nike.com/gb/t/pegasus-41-mens-road-running-shoes-tThEi9vS'],
  ghost:['Brooks Ghost 16','평소 편한 속도의 조깅과 롱런을 한 켤레로 소화할 때 비교할 도로용 중립화입니다.','발볼과 발등을 살피고 뒤꿈치가 걸을 때마다 들리지 않는지 보세요.','https://www.brooksrunning.com/en_us/ghost-16/1104181D020.130.html'],
  speed4:['Saucony Endorphin Speed 4','나일론 플레이트가 들어간 템포 훈련·대회 겸용 후보입니다.','목표 속도로 올렸다가 회복 조깅으로 낮추면서 두 속도 모두 자연스럽게 느껴지는지 보세요.','https://www.saucony.com/RO/en_RO/endorphin-speed-4/58852M.html'],
  chall:['HOKA Challenger ATR 7','집 앞 포장길에서 출발해 흙길로 이어지는 코스를 한 켤레로 달릴 때 비교할 모델입니다.','평소 코스처럼 단단한 바닥과 흙길을 번갈아 밟아 착지감을 확인하세요.','https://stores.hoka.com/product/1480027/hoka-mens-challenger-atr-7'],
  everyday:['ASICS GEL-CUMULUS 27','걷기와 달리기를 섞는 첫날부터 평소 조깅까지 두루 쓰는 도로용 데일리화입니다.','가볍게 걸은 뒤 천천히 뛰어 보세요. 보폭을 바꾸지 않아도 발이 자연스럽게 굴러가는지 확인하세요.',shoeGuideSource],
  stable:['ASICS GEL-KAYANO 32','발을 디딜 때 지지감이 뚜렷한 착화감을 선호한다면 비교할 안정화입니다.','같은 사이즈의 중립화와 번갈아 신으세요. 발 안쪽을 받치는 느낌이 편한 쪽을 고르세요.',shoeGuideSource],
  cushion:['ASICS GEL-NIMBUS 27','포장도로에서 여유 있게 오래 달릴 때 부드러운 쿠션을 선호하는 러너의 후보입니다.','부드러움과 함께 방향을 바꿀 때 발이 신발 안에서 밀리는지도 확인하세요.',shoeGuideSource],
  bounce:['ASICS NOVABLAST 5','평소 조깅과 조금 빠른 달리기를 한 켤레로 소화하면서 탄력 있는 느낌을 원하는 경우에 어울립니다.','천천히 뛸 때와 속도를 조금 높였을 때 모두 발뒤꿈치가 안정적인지 확인하세요.',shoeGuideSource],
  speed:['adidas Adizero EVO SL','도로 템포런처럼 속도를 바꾸는 훈련에 쓸 가벼운 신발을 찾을 때의 후보입니다.','목표 페이스뿐 아니라 준비운동 속도와 코너에서도 발을 편하게 디딜 수 있는지 보세요.','https://www.adidas.com/us/adizero_evo_sl-lightstrikepro-speed-shoes'],
  race:['adidas Adizero Adios Pro 4','대회용 한 켤레를 별도로 두려는 러너가 비교할 장거리 레이싱화입니다.','대회 전에 목표 페이스 훈련에서 먼저 신어 보세요. 발가락과 발등에 쓸리는 지점이 있는지 확인하세요.','https://www.adidas.com/us/adizero_adios_pro'],
  trail:['adidas Terrex Agravic 3','흙길과 비포장 구간에서 접지력을 우선해 고르는 트레일화입니다.','내리막처럼 체중을 앞으로 실어도 발가락이 앞에 닿지 않는지, 뒤꿈치가 들리지 않는지 보세요.','https://www.adidas.com/us/terrex-agravic-3-trail-running-shoes/ID0343.html']
};
const shoeUses = {
  first:['첫 한 켤레','일주일에 가장 자주 뛰게 될 길을 기준으로 고르세요. 걷기와 느린 조깅에서 모두 편해야 손이 자주 갑니다.',['everyday','peg','stable','ghost']],
  easy:['이지런·롱런','오래 신을 신발은 쿠션의 양과 착화감을 함께 비교하세요. 편하게 달릴 때 자연스러운 쪽이 좋은 출발점입니다.',['cushion','ghost','everyday','bounce']],
  tempo:['템포런·인터벌','이미 편한 조깅화가 있다면 빠른 구간에서 어떤 느낌을 더 원하는지 비교하세요.',['speed','speed4','bounce']],
  race:['도로 대회','첫 완주가 목표라면 익숙한 훈련화도 선택지입니다. 기록을 노려 별도 신발을 고른다면 목표 속도로 시험해 보세요.',['race','speed4','speed']]
};
function shoes(){
  tool('어디에서, 어떻게 달리세요?', `
    <div class="layout"><label>주로 달리는 곳<select id="shoe-surface"><option value="road">도로·공원 포장길</option><option value="indoor">러닝머신</option><option value="trail">흙길·산길</option></select></label>
    <label>이번 신발의 용도<select id="shoe-use">${Object.entries(shoeUses).map(([v,[label]])=>'<option value="'+v+'">'+label+'</option>').join('')}</select></label></div>
    <label>발볼<select id="shoe-width"><option>보통 또는 잘 모르겠어요</option><option>넓은 편이에요</option><option>좁은 편이에요</option></select></label>
    <div id="shoe-match" aria-live="polite"></div>`);
  tool('매장에서 3분 시착',`<ol class="guide-steps"><li><b>양발을 모두 신기</b><p>평소 러닝 양말을 신고 큰 쪽 발에 맞추세요. 서 있을 때 가장 긴 발가락 앞에 엄지손가락 한 폭 정도 여유가 있는지 보세요.</p></li><li><b>끈을 묶고 걷기</b><p>발등이 눌리거나 뒤꿈치가 매번 들리면 같은 길이의 다른 폭이나 모델도 비교해 보세요.</p></li><li><b>평소 속도로 뛰기</b><p>가능하면 짧게 조깅해 보세요. 두 후보 중 발가락·뒤꿈치·발등이 모두 편했던 쪽을 고르세요.</p></li></ol><small><a href="https://www.rei.com/learn/expert-advice/how-should-running-shoes-fit.html">REI 러닝화 피팅 가이드</a></small>`);
  tool('언제 교체할까요?',`<p><b>일반 훈련화는 한 켤레로 약 480–800km</b>를 달렸을 때 교체를 검토하세요. 주 40km를 모두 같은 신발로 뛰면 약 12–20주, 주 20km면 약 24–40주입니다.</p>
    <p>밑창 고무가 한쪽만 닳아 폼이 드러나거나, 예전과 달리 쿠션이 꺼지고 발을 잡아주지 못하면 거리보다 상태를 먼저 보세요. 여러 켤레를 번갈아 신으면 각 신발로 달린 거리만 따로 셉니다.</p><small><a href="https://www.brooksrunning.com/en_us/blog/gear-maintenance/when-to-replace-your-running-shoes.html">Brooks 교체 가이드</a></small>`);
  tool('뛰고 난 뒤 관리',`<ol class="guide-steps"><li><b>흙이 묻었을 때</b><p>부드러운 솔로 흙을 털고, 젖은 천과 순한 세제로 오염된 곳을 손세척하세요.</p></li><li><b>비에 젖었을 때</b><p>깔창을 빼고 안에 마른 종이나 수건을 넣으세요. 젖으면 갈아 주고 통풍되는 그늘에서 말리세요.</p></li><li><b>다음 러닝 전</b><p>안쪽까지 말랐는지, 밑창이 들뜨거나 고무가 벗겨진 곳은 없는지 확인하세요. 세탁기·건조기와 난방기의 직접 열은 피하세요.</p></li></ol><small><a href="https://support.brooksrunning.com/hc/en-us/articles/19532248117019-What-is-the-best-way-to-clean-my-shoes">Brooks 세척 가이드</a></small>`);
  function update(){
    const surface=$('#shoe-surface').value, use=$('#shoe-use').value;
    const [label,reason,roadModels]=shoeUses[use];
    const trail=surface==='trail';
    const models=trail?['trail','chall']:surface==='indoor' && use==='race'?['speed','speed4','bounce']:roadModels;
    const widthTips=['평소 사이즈부터 신어 보고 발가락을 펼 수 있는지 확인하세요.','길이를 늘리기 전에 같은 길이의 와이드 옵션을 비교하세요. 폭 옵션은 모델·국가별로 다릅니다.','뒤꿈치가 들리면 길이를 줄이기 전에 같은 길이에서 뒤꿈치와 중족부가 더 밀착되는 모델도 비교하세요.'];
    const terrain=trail?'비포장에서는 밑창 돌기의 간격과 내리막에서 발을 잡아주는 느낌부터 보세요.':surface==='indoor'?'벨트에서 주로 뛴다면 도로용 운동화부터 비교하세요.':'아스팔트와 포장된 공원길에서 사용할 후보입니다.';
    const useNote=trail?({first:'첫 트레일화는 자주 가는 길의 흙과 돌 상태에 맞춰 고르세요.',easy:'긴 산길이라면 내리막에서 앞발 여유를 특히 확인하세요.',tempo:'빠른 구간은 방향 전환 시 발이 좌우로 움직이지 않는지 확인하세요.',race:'대회 코스와 비슷한 노면에서 미리 신어 보세요.'})[use]:reason;
    $('#shoe-match').innerHTML='<div class="coach-summary"><b>'+label+' 추천</b><p>'+terrain+' '+useNote+'</p><p>'+widthTips[$('#shoe-width').selectedIndex]+'</p></div><div class="coach-sessions">'+models.map(key=>{
      const [name,why,fit,url]=shoeModels[key];
      return '<article><img class="shoe-photo" src="'+shoePhotos[key]+'" alt="'+name+' 제품 사진" loading="lazy" referrerpolicy="no-referrer"><h3>'+name+'</h3><p>'+why+'</p><p><b>시착 포인트</b> '+fit+'</p><a href="'+url+'">제조사 설명</a></article>';
    }).join('')+'</div>';
  }
  for(const id of ['#shoe-surface','#shoe-use','#shoe-width']) $(id).onchange=update;
  update();
}

const groups = [
  {label:'오늘', pages:[['today','오늘의 러닝',todayRunning]]},
  {label:'계산', pages:[['pace','페이스 계산기',calculator]]},
  {label:'훈련', pages:[
    ['plan','훈련 계획',() => {
      $('#screen').insertAdjacentHTML('beforeend','<div id="planner"></div>');
      mountPlanner();
    }],
    ['training','훈련 페이스',training],
    ['stretch','스트레칭 팁',stretchingGuide],
    ['nutrition','식단 추천',nutritionGuide]
  ]},
  {label:'날씨', pages:[['weather','날씨와 복장',weather]]},
  {label:'러닝화', pages:[['shoes','러닝화 추천',shoes]]},
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
  const profileLink = $('.profile-link');
  if(route==='profile'){
    profileLink.setAttribute('aria-current','page');
    primaryLinks.forEach(link=>link.removeAttribute('aria-current'));
    subnav.replaceChildren();
    subnav.hidden=true;
    $('#screen').innerHTML='<h1>내 정보</h1><p class="profile-intro">한 번 저장하면 훈련 추천, 칼로리 계산, 대회 기록 비교에 함께 사용해요.</p>';
    runnerSettings();
    return;
  }
  profileLink.removeAttribute('aria-current');
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
  if(page[0]==='plan') $('#screen h1').className='sr-heading';
  page[2]();
}
window.addEventListener('hashchange', () => {
  display();
  window.scrollTo(0, 0);
});
display();
