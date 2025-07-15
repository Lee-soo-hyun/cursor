// NEIS OpenAPI 키를 코드 내에 직접 상수로 선언
const API_KEY = '6fcb21a1a40940eeab06ef6148822823';

// 학교명으로 학교 검색 (NEIS OpenAPI)
async function searchSchoolByName(schoolName) {
  const baseUrl = 'https://open.neis.go.kr/hub/schoolInfo';
  const params = [
    `KEY=${API_KEY}`,
    'Type=json',
    `SCHUL_NM=${encodeURIComponent(schoolName)}`
  ];
  const url = `${baseUrl}?${params.join('&')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('학교 검색 API 요청 실패');
  const data = await res.json();
  if (!data.schoolInfo) return [];
  return data.schoolInfo[1].row;
}

// 급식 정보 조회 함수
async function fetchMeal({ officeCode, schoolCode, date }) {
  const baseUrl = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
  const params = [
    `KEY=${API_KEY}`,
    'Type=json',
    `ATPT_OFCDC_SC_CODE=${encodeURIComponent(officeCode)}`,
    `SD_SCHUL_CODE=${encodeURIComponent(schoolCode)}`
  ];
  if (date) params.push(`MLSV_YMD=${encodeURIComponent(date)}`);
  const url = `${baseUrl}?${params.join('&')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('급식 API 요청 실패');
  const data = await res.json();
  return data;
}

function renderMealResult(data) {
  if (!data.mealServiceDietInfo) {
    return '<span style="color:red">급식 정보를 찾을 수 없습니다.</span>';
  }
  const rows = data.mealServiceDietInfo[1].row;
  return rows.map(row => `
    <div class="meal-block">
      <div><b>학교명:</b> ${row.SCHUL_NM}</div>
      <div><b>급식일자:</b> ${row.MLSV_YMD}</div>
      <div><b>식사명:</b> ${row.MMEAL_SC_NM}</div>
      <div><b>요리명:</b><br>${row.DDISH_NM.replace(/<br\/>/g, '<br>')}</div>
      <div><b>칼로리정보:</b> ${row.CAL_INFO || '-'}</div>
      <div><b>영양정보:</b> ${row.NTR_INFO || '-'}</div>
    </div>
  `).join('<hr>');
}

window.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const schoolNameInput = document.getElementById('schoolName');
  const schoolSelectArea = document.getElementById('schoolSelectArea');
  const schoolSelect = document.getElementById('schoolSelect');
  const mealForm = document.getElementById('mealForm');
  const resultDiv = document.getElementById('result');

  let selectedSchool = null;

  // 학교명 검색 함수 (공통화)
  async function doSchoolSearch(schoolName) {
    resultDiv.innerHTML = '';
    schoolSelectArea.style.display = 'none';
    mealForm.style.display = 'none';
    schoolSelect.innerHTML = '';
    selectedSchool = null;
    if (!schoolName) return;
    resultDiv.innerHTML = '학교 검색 중...';
    try {
      const schools = await searchSchoolByName(schoolName);
      if (schools.length === 0) {
        resultDiv.innerHTML = '<span style="color:red">학교를 찾을 수 없습니다.</span>';
        return;
      }
      // select 옵션 생성
      schools.forEach((school, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${school.SCHUL_NM} (${school.ATPT_OFCDC_SC_NM}, ${school.SD_SCHUL_CODE})`;
        schoolSelect.appendChild(opt);
      });
      schoolSelectArea.style.display = '';
      mealForm.style.display = '';
      // 서울특별시교육청 우선 선택
      let defaultIdx = 0;
      for (let i = 0; i < schools.length; i++) {
        if (schools[i].ATPT_OFCDC_SC_NM === '서울특별시교육청') {
          defaultIdx = i;
          break;
        }
      }
      schoolSelect.selectedIndex = defaultIdx;
      selectedSchool = schools[defaultIdx];
      schoolSelect.onchange = () => {
        selectedSchool = schools[schoolSelect.value];
      };
      resultDiv.innerHTML = '학교를 선택하고 급식 정보를 조회하세요.';
    } catch (err) {
      resultDiv.innerHTML = `<span style='color:red'>오류: ${err.message}</span>`;
    }
  }

  // 폼 submit 이벤트
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await doSchoolSearch(schoolNameInput.value.trim());
  });

  // 급식 조회
  mealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultDiv.innerHTML = '조회 중...';
    if (!selectedSchool) {
      resultDiv.innerHTML = '<span style="color:red">학교를 먼저 선택하세요.</span>';
      return;
    }
    const date = mealForm.date.value.trim();
    try {
      const data = await fetchMeal({
        officeCode: selectedSchool.ATPT_OFCDC_SC_CODE,
        schoolCode: selectedSchool.SD_SCHUL_CODE,
        date
      });
      resultDiv.innerHTML = renderMealResult(data);
    } catch (err) {
      resultDiv.innerHTML = `<span style='color:red'>오류: ${err.message}</span>`;
    }
  });

  // 페이지 로드시 자동 검색
  if (schoolNameInput.value.trim() === '광문고등학교') {
    doSchoolSearch('광문고등학교');
  }
});
