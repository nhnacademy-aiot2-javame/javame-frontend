// /admin/js/dashboardIntegration.js

// chartUtils.js에서 콤보 차트 생성 함수 import
import { createComboBarLineChart } from './chartUtils.js';
// iotSensorApi.js는 실제 데이터 연동 시 사용 (지금은 주석 처리)
// import { getMeasurementList, getCurrentSensorValue, getAggregatedTimeSeriesData } from './iotSensorApi.js';

// 차트 인스턴스를 저장할 객체 (여러 차트를 관리할 경우 유용)
const chartInstances = {};

// DOM 로드 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Integration page loaded. Initializing dummy combo chart...");

    // 1. 측정 항목 선택 체크박스 영역 (지금은 더미로 몇 개만 생성)
    initializeDummyMeasurementCheckboxes();

    // 2. "선택 항목 차트 보기" 버튼 이벤트 리스너 (지금은 버튼 클릭 시 더미 차트 생성)
    const applyFilterButton = document.getElementById('applyIntegrationChartFilterButton');
    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            // 실제로는 선택된 체크박스 값을 읽어와야 함
            console.log("Apply filter button clicked. Drawing dummy combo chart...");
            drawDummyComboChart();
        });
    }

    // 3. 페이지 로드 시 바로 더미 콤보 차트 하나를 그려봅니다.
    // (또는 버튼 클릭 시에만 그리도록 할 수 있습니다.)
    drawDummyComboChart(); // << 페이지 로드 시 바로 테스트용 차트 그리기
});

/**
 * 더미 측정 항목 체크박스를 생성합니다.
 * 실제로는 API를 통해 measurement 목록을 가져와야 합니다.
 */
function initializeDummyMeasurementCheckboxes() {
    const container = document.getElementById('measurementCheckboxContainer');
    if (!container) return;

    container.innerHTML = ''; // 기존 "로딩 중..." 메시지 제거

    const dummyMeasurements = ['CPU 사용률', '메모리 사용량', '디스크 I/O'];
    dummyMeasurements.forEach((measurement, index) => {
        const div = document.createElement('div');
        div.classList.add('form-check', 'form-check-inline');
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${measurement}" id="chkMeasurement${index}" checked>
            <label class="form-check-label" for="chkMeasurement${index}">${measurement}</label>
        `;
        container.appendChild(div);
    });
}

/**
 * 더미 데이터를 사용하여 콤보 차트(바 + 라인)를 생성하고 표시합니다.
 * 실제로는 선택된 measurement와 API 응답을 기반으로 데이터를 구성해야 합니다.
 */
function drawDummyComboChart() {
    const canvasId = 'currentStateBarChart'; // HTML에 있는 캔버스 ID

    // 더미 데이터 생성
    const xAxisLabels = ['항목 A', '항목 B', '항목 C', '항목 D', '항목 E'];
    const barDataArray = [120, 190, 150, 210, 180]; // 예: 현재 값들
    const lineDataArray = [100, 170, 130, 190, 160]; // 예: 과거 평균 값들

    const barDatasetLabel = '현재 값 (단위 X)';
    const lineDatasetLabel = '과거 평균 (단위 X)';

    // 기존 차트가 있다면 파괴 (Chart.js v3+ 방식)
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }
    // 또는 if (Chart.getChart(canvasId)) { Chart.getChart(canvasId).destroy(); }

    // chartUtils.js의 createComboBarLineChart 함수 호출
    chartInstances[canvasId] = createComboBarLineChart(
        canvasId,
        barDataArray,
        lineDataArray,
        barDatasetLabel,
        lineDatasetLabel,
        xAxisLabels
    );

    if (chartInstances[canvasId]) {
        console.log(`Dummy combo chart (${canvasId}) rendered successfully.`);
    } else {
        console.error(`Failed to render dummy combo chart (${canvasId}).`);
    }

    // 다른 차트들(일/주/월별 라인 차트)도 유사하게 더미 데이터로 테스트 가능
    // 예: drawDummyLineChart('pastStateDailyLineChart', '일별 추이');
}

/**
 * (선택적) 더미 데이터를 사용하여 단순 라인 차트를 그리는 예시 함수
 */
function drawDummyLineChart(canvasId, chartTitle) {
    // chartUtils.js 에 createLineChart 함수가 정의되어 있다고 가정
    // import { createLineChart } from './chartUtils.js';

    const xAxisLabels = ['월', '화', '수', '목', '금', '토', '일'];
    const dummyData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    // createLineChart 함수가 (canvasId, labels, data, title, yAxisLabel)을 받는다고 가정
    // chartInstances[canvasId] = createLineChart(canvasId, xAxisLabels, dummyData, chartTitle, "값");
    console.log(`Dummy line chart (${canvasId}) would be rendered here.`);
}

// --- 실제 데이터 연동 시 필요한 함수들 (지금은 주석 처리 또는 미구현) ---

// async function loadAndDisplayCharts() {
//     const selectedMeasurements = getSelectedMeasurements();
//     if (selectedMeasurements.length === 0) {
//         alert("표시할 측정 항목을 하나 이상 선택해주세요.");
//         return;
//     }

//     // 1. 현재 상태 바 차트 데이터 가져오기 및 그리기
//     //    - 선택된 measurement 각각에 대해 getCurrentSensorValue 호출
//     //    - 또는 여러 measurement의 현재 값을 한 번에 가져오는 API 필요
//     //    - 가져온 값들로 barDataArray와 xAxisLabels (measurement 이름들) 구성
//     //    - createComboBarLineChart (또는 createBarChart) 호출

//     // 2. 과거 상태 라인 차트 데이터 가져오기 및 그리기 (일/주/월)
//     //    - 선택된 measurement 각각에 대해 getAggregatedTimeSeriesData(interval='daily') 호출
//     //    - createLineChart (또는 콤보 차트의 라인 부분으로 통합) 호출
//     //    - 주별, 월별도 동일한 방식으로 처리
// }

// function getSelectedMeasurements() {
//     const checkboxes = document.querySelectorAll('#measurementCheckboxContainer input[type="checkbox"]:checked');
//     return Array.from(checkboxes).map(cb => cb.value);
// }
