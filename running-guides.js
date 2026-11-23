function stretchingGuide(){
  tool('달리기 전 · 움직이면서 몸 풀기', `
    <ol class="guide-steps">
      <li><b>빠르게 걷기 또는 가벼운 조깅 · 5–10분</b>
        <p>편하게 대화할 수 있는 강도에서 시작해 속도를 서서히 올리세요.</p></li>
      <li><b>앞뒤로 다리 흔들기 · 한쪽씩 10회</b>
        <p>벽을 짚고 한쪽 다리를 앞뒤로 작게 흔드세요. 몸통은 세우고 편한 범위에서 움직이세요.</p></li>
      <li><b>가벼운 런지 · 한쪽씩 10회</b>
        <p>한 발을 앞으로 내딛고 무릎을 살짝 굽혔다가 돌아오세요. 양쪽을 번갈아 하세요.</p></li>
    </ol>
    <small><a href="https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/exercise/art-20045517">Mayo Clinic 워밍업</a> · <a href="https://health.clevelandclinic.org/when-and-how-to-start-a-running-program">Cleveland Clinic 동적 스트레칭</a></small>
  `);
  tool('달리기 후 · 걷고 나서 천천히 늘리기', `
    <p class="guide-intro">5–10분 걸으면서 속도를 줄인 뒤, 아래 동작을 양쪽 각각 15–20초 유지하세요. 반동 없이 가볍게 당기는 범위에서 멈추세요.</p>
    <ul class="guide-steps">
      <li><b>종아리</b><p>벽을 짚고 한 발을 뒤로 보내세요. 뒤꿈치를 바닥에 붙인 채 앞쪽 무릎을 굽히세요.</p></li>
      <li><b>허벅지 뒤쪽</b><p>누워서 한쪽 허벅지 뒤를 손으로 받치고, 무릎을 편한 만큼 펴면서 다리를 들어 올리세요.</p></li>
      <li><b>허벅지 앞쪽</b><p>벽을 짚고 한쪽 발목을 잡아 뒤꿈치를 엉덩이 쪽으로 당기세요. 양쪽 무릎은 나란히 두세요.</p></li>
    </ul>
    <small><a href="https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/exercise/art-20045517">Mayo Clinic 쿨다운</a> · <a href="https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/">NHS 운동 후 스트레칭</a></small>
  `);
}

const runningMeals = {
  easy: [
    ['달리기 전', '배가 고프면 출발 전에 평소 잘 맞는 바나나나 식빵을 조금 드세요.'],
    ['달리는 중', '1시간 이내의 가벼운 러닝이라면 보통 탄수화물 보급 없이 물로 충분합니다.'],
    ['달리기 후', '다음 식사에서 밥과 달걀, 두부 또는 생선처럼 탄수화물과 단백질을 함께 드세요.']
  ],
  fast: [
    ['달리기 전', '템포런이나 인터벌 2–4시간 전에 밥과 달걀처럼 소화가 편한 식사를 하세요. 시간이 짧으면 식빵이나 바나나를 조금 드세요.'],
    ['달리는 중', '짧은 훈련은 물을 챙기세요. 워밍업과 쿨다운을 포함해 1시간을 넘기면 스포츠음료 같은 탄수화물 보급을 고려하세요.'],
    ['달리기 후', '식사 때까지 시간이 많이 남으면 바나나와 요거트처럼 탄수화물과 단백질이 함께 들어간 간식을 드세요.']
  ],
  long: [
    ['달리기 전', '2–4시간 전에 흰쌀밥이나 토스트를 중심으로 달걀 등을 곁들인 익숙한 식사를 하세요. 속이 예민하면 기름지거나 섬유질이 많은 음식은 줄여보세요.'],
    ['달리는 중', '1시간을 넘는 러닝은 물과 함께 젤이나 스포츠음료 등 탄수화물 보급을 고려하세요. 대회에 쓸 제품은 훈련에서 먼저 시험해 보세요.'],
    ['달리기 후', '밥과 닭고기 또는 두부처럼 탄수화물과 단백질을 함께 챙기고, 물을 마셔 수분을 보충하세요.']
  ]
};

function nutritionGuide(){
  tool('훈련별로 먹는 법', `
    <label>오늘의 러닝<select id="meal-run">
      <option value="easy">가벼운 이지런 · 1시간 이내</option>
      <option value="fast">템포런 · 인터벌</option>
      <option value="long">롱런 · 1시간 초과</option>
    </select></label>
    <div id="meal-guide" class="meal-guide" aria-live="polite"></div>
    <small><a href="https://www.hopkinsmedicine.org/health/wellness-and-prevention/runners-diet">Johns Hopkins Medicine 러닝 식단</a> · <a href="https://www.hopkinsmedicine.org/health/expert-qa/nutrition-for-athletes-what-to-eat-before-a-competition">운동 전후 식사 가이드</a></small>
  `);
  const run = $('#meal-run');
  function render(){
    $('#meal-guide').innerHTML = runningMeals[run.value].map(([title, description]) =>
      '<div><h4>'+title+'</h4><p>'+description+'</p></div>'
    ).join('');
  }
  run.onchange = render;
  render();
}
