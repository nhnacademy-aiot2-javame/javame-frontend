// /admin/js/dashboardIntegration.js

import { createMultiLineChart } from './chartUtils.js';
// 실제 API 함수들은 하드코딩 시 사용하지 않으므로 주석 처리 또는 제거 가능
// import { getOrigins, getMeasurementList /*, getAggregatedTimeSeriesData, getCurrentSensorValue */ } from './iotSensorApi.js';

const COMPANY_DOMAIN = 'javame'; // 또는 실제 값
const chartInstances = {}; // 차트 인스턴스 관리

// --- 페이지 로드 시 초기화 ---
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Dashboard Integration page loaded. Initializing...");

    // 1. Datepicker 초기화 (HTML 하단 인라인 스크립트에서 처리)

    // 2. Origin 드롭다운 채우기 (하드코딩된 값 사용)
    populateHardcodedOriginDropdown(); // ★★★ 함수 이름 변경 및 내용 수정 ★★★

    // 3. Y축 단위 선택 시 이벤트 리스너
    const yAxisUnitSelector = document.getElementById('yAxisUnitSelector');
    if (yAxisUnitSelector) {
        yAxisUnitSelector.addEventListener('change', () => {
            const selectedUnit = yAxisUnitSelector.value;
            document.getElementById('selectedUnitDisplay').textContent = selectedUnit ? `${selectedUnit === 'percentage' ? '%' : (selectedUnit === 'celsius' ? '°C' : selectedUnit)}` : '미선택';
            // 단위 변경 시 테이블 자동 업데이트를 원하면 loadMeasurementTable 호출
        });
    }

    // 4. "조회" 버튼 이벤트 리스너
    const applyFiltersButton = document.getElementById('applyFiltersButton');
    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', async () => {
            console.log("Apply filters button clicked.");
            await loadMeasurementTableAndDrawChart();
        });
    }

    // 5. 측정 항목 테이블 내 체크박스 변경 시 차트 업데이트
    const measurementTableBody = document.getElementById('measurementTableBody');
    if (measurementTableBody) {
        measurementTableBody.addEventListener('change', async (event) => {
            if (event.target.type === 'checkbox' && event.target.classList.contains('measurement-checkbox')) {
                console.log(`Checkbox for ${event.target.value} changed.`);
                await drawIntegrationChartFromTableSelection();
            }
        });
    }

    // 6. 전체 선택 체크박스 이벤트 리스너
    const selectAllCheckbox = document.getElementById('selectAllMeasurements');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('click', async (event) => {
            document.querySelectorAll('#measurementTableBody .measurement-checkbox').forEach(cb => {
                cb.checked = event.target.checked;
            });
            await drawIntegrationChartFromTableSelection();
        });
    }

    // 초기 차트 로드
    initializeEmptyChart();
});

/**
 * 하드코딩된 Origin 목록으로 드롭다운을 채웁니다.
 */
function populateHardcodedOriginDropdown() { // ★★★ 함수 이름 변경 및 내용 수정 ★★★
    const originSelector = document.getElementById('originSelector');
    if (!originSelector) return;

    // 기존 옵션 제거 (기본 "전체 Origin" 옵션 제외)
    // originSelector.innerHTML = '<option value="" selected>전체 Origin</option>'; // 이렇게 하면 기본 선택이 유지됨
    // 또는 모든 옵션을 지우고 새로 채우려면:
    while (originSelector.options.length > 1) { // 첫 번째 "전체 Origin" 옵션은 남김
        originSelector.remove(1);
    }
    // 아니면, HTML에서 "전체 Origin" 옵션만 남기고, JS에서는 추가만 하도록 할 수 있음.
    // 여기서는 HTML에 <option value="" selected>전체 Origin</option>이 이미 있다고 가정하고,
    // 그 뒤에 하드코딩된 origin들을 추가합니다.

    const hardcodedOrigins = [
        'server_data',    // 서버 관련 데이터
        'server_room',    // 서버룸 환경 센서 데이터
        'service_A_jvm',  // 서비스 A의 JVM 메트릭
        'service_B_db'    // 서비스 B의 DB 메트릭 (예시)
        // 필요에 따라 더 많은 Origin 추가
    ];

    if (hardcodedOrigins.length > 0) {
        hardcodedOrigins.forEach(origin => {
            const option = document.createElement('option');
            option.value = origin;
            option.textContent = origin;
            originSelector.appendChild(option);
        });
        console.log("Populated origin dropdown with hardcoded values:", hardcodedOrigins);
    } else {
        console.log("No hardcoded origins to populate.");
    }
}


// --- 나머지 함수들은 이전 답변과 거의 동일하게 유지 ---
// initializeEmptyChart, loadMeasurementTableAndDrawChart, loadMeasurementTable,
// drawIntegrationChartFromTableSelection, generateDummyMeasurements, generateDateLabels

/**
 * 빈 차트 프레임을 초기화합니다.
 */
// dashboard.js 또는 dashboardIntegration.js
function initializeEmptyChart() {
    const canvasId = 'multiLineChartCanvas';
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }
    // createMultiLineChart는 (canvasId, xAxisLabels, datasets, chartTitle)을 받음
    // datasets 파라미터로 빈 배열 [] 전달
    chartInstances[canvasId] = createMultiLineChart(canvasId, [], [], "항목을 선택하고 조회해주세요.");
    const chartDateRangeEl = document.getElementById('chartDateRange');
    if(chartDateRangeEl) chartDateRangeEl.textContent = "";
}

/**
 * "조회" 버튼 클릭 시 측정 항목 테이블을 로드하고, 초기 선택된 항목으로 차트를 그립니다.
 */
async function loadMeasurementTableAndDrawChart() {
    await loadMeasurementTable();
    await drawIntegrationChartFromTableSelection();
}

/**
 * 선택된 필터 조건에 따라 측정 항목 테이블을 (더미)데이터로 채웁니다.
 */
async function loadMeasurementTable() {
    const tableBody = document.getElementById('measurementTableBody');
    const selectedUnit = document.getElementById('yAxisUnitSelector').value;
    const selectedOrigin = document.getElementById('originSelector').value;

    if (!tableBody) return;
    if (!selectedUnit) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-3">Y축 단위를 먼저 선택해주세요.</td></tr>';
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-3"><i class="fas fa-spinner fa-spin me-2"></i>측정 항목 목록을 불러오는 중...</td></tr>';

    // 더미 데이터 생성 (API 호출 대신)
    // 실제로는 여기서 getMeasurementList(COMPANY_DOMAIN, selectedOrigin, selectedUnit); 등을 호출
    const dummyMeasurements = generateDummyMeasurements(selectedUnit, selectedOrigin);

    if (dummyMeasurements.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-3">선택된 조건에 해당하는 측정 항목이 없습니다.</td></tr>';
        return;
    }

    tableBody.innerHTML = ''; // 기존 내용 지우기
    dummyMeasurements.forEach(m => {
        const row = tableBody.insertRow();
        row.insertCell().innerHTML = `<input type="checkbox" class="form-check-input measurement-checkbox" value="${m.name}" data-unit="${m.unit}" data-origin="${m.origin}" data-location="${m.location}" ${m.checked ? 'checked' : ''}>`;
        row.insertCell().textContent = m.name;
        row.insertCell().textContent = m.currentValue.toFixed(1) + (m.unit === 'percentage' ? '%' : (m.unit === 'celsius' ? '°C' : ''));
        row.insertCell().textContent = m.minValue.toFixed(1) + (m.unit === 'percentage' ? '%' : (m.unit === 'celsius' ? '°C' : ''));
        row.insertCell().textContent = m.maxValue.toFixed(1) + (m.unit === 'percentage' ? '%' : (m.unit === 'celsius' ? '°C' : ''));
        row.insertCell().textContent = m.origin;
        row.insertCell().textContent = m.location;
    });
}

/**
 * 현재 테이블에서 선택된 측정 항목들을 기반으로 통합 차트를 그립니다.
 */
async function drawIntegrationChartFromTableSelection() {
    const canvasId = 'multiLineChartCanvas';
    const startDateStr = document.getElementById('startDate').value;
    const endDateStr = document.getElementById('endDate').value;

    if (!startDateStr || !endDateStr) {
        alert("조회 기간을 선택해주세요.");
        initializeEmptyChart();
        return;
    }
    document.getElementById('chartDateRange').textContent = `(${startDateStr} ~ ${endDateStr})`;

    const selectedCheckboxes = document.querySelectorAll('#measurementTableBody .measurement-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        initializeEmptyChart();
        return;
    }

    const xAxisLabels = generateDateLabels(startDateStr, endDateStr);
    const datasetsForChart = [];

    for (const checkbox of selectedCheckboxes) {
        const measurementName = checkbox.value;
        const unit = checkbox.dataset.unit;
        const origin = checkbox.dataset.origin;
        const location = checkbox.dataset.location;

        // 더미 시계열 데이터 생성 (API 호출 대신)
        // 실제로는 여기서 await getAggregatedTimeSeriesData(...) 호출
        const dummyTimeSeriesData = Array.from({ length: xAxisLabels.length }, () =>
            Math.floor(Math.random() * (unit === 'celsius' ? 15 : 60)) + (unit === 'celsius' ? 20 : 30)
        );

        datasetsForChart.push({
            label: `${measurementName} (${origin}/${location})`,
            data: dummyTimeSeriesData,
            unit: unit,
        });
    }

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }
    chartInstances[canvasId] = createMultiLineChart(
        canvasId,
        xAxisLabels,
        datasetsForChart,
        `선택 항목 통합 시계열`
    );
}

// --- 더미 데이터 생성 함수들 (이전과 동일) ---
function generateDummyMeasurements(unit, originFilter) {
    const measurements = [];
    // ... (이전 답변의 generateDummyMeasurements 내용) ...
    if (unit === 'percentage') {
        measurements.push({ name: 'CPU_Usage_User', unit: 'percentage', origin: 'server_data', location: 'cpu', currentValue: Math.random()*100, minValue: 10, maxValue: 90, checked: true });
        measurements.push({ name: 'Memory_Used_Percent', unit: 'percentage', origin: 'server_data', location: 'memory', currentValue: Math.random()*100, minValue: 20, maxValue: 80, checked: true });
        measurements.push({ name: 'Disk_sda1_Used_Percent', unit: 'percentage', origin: 'server_data', location: 'disk_sda1', currentValue: Math.random()*100, minValue: 5, maxValue: 70, checked: false });
        measurements.push({ name: 'ServiceA_Heap_Used_Percent', unit: 'percentage', origin: 'service_A_jvm', location: 'heap', currentValue: Math.random()*100, minValue: 30, maxValue: 95, checked: false });
    } else if (unit === 'celsius') {
        measurements.push({ name: 'CPU_Temp_Package', unit: 'celsius', origin: 'server_data', location: 'cpu', currentValue: 20 + Math.random()*60, minValue: 40, maxValue: 85, checked: true });
        measurements.push({ name: 'ServerRoom_Rack1_Temp', unit: 'celsius', origin: 'server_room', location: 'rack1_front', currentValue: 18 + Math.random()*10, minValue: 18, maxValue: 28, checked: false });
        measurements.push({ name: 'ServerRoom_Entrance_Temp', unit: 'celsius', origin: 'server_room', location: 'main_entrance', currentValue: 20 + Math.random()*10, minValue: 20, maxValue: 30, checked: false });
    }
    if (originFilter && originFilter !== "") { // originFilter가 빈 문자열이 아닐 때만 필터링
        return measurements.filter(m => m.origin === originFilter);
    }
    return measurements;
}

function generateDateLabels(startDateStr, endDateStr) {
    const labels = [];
    let currentDate = new Date(startDateStr);
    const finalEndDate = new Date(endDateStr);

    if (isNaN(currentDate.getTime()) || isNaN(finalEndDate.getTime()) || currentDate > finalEndDate) {
        console.warn("Invalid date range for generating labels.");
        // 기본 라벨 반환 또는 오류 처리
        return ['날짜1', '날짜2', '날짜3', '날짜4', '날짜5', '날짜6', '날짜7'];
    }

    while (currentDate <= finalEndDate) {
        labels.push(`${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`);
        currentDate.setDate(currentDate.getDate() + 1);
        if (labels.length >= 31) break; // 최대 31개 라벨 (한 달치)
    }
    return labels.length > 0 ? labels : ['데이터 없음']; // 날짜 범위가 하루면 라벨이 하나일 수 있음
}
