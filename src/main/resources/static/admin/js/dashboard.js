// dashboardMain.js (paste.txt HTML 구조에 맞춘 버전)

// API 함수 import (iotSensorApi.js 경로 확인)
import {
    getCurrentSensorValue,
    startSensorDataStream, // 또는 getChartDataForSensor 등 시계열용 함수
    getOrigins, // 만약 필터링을 나중에 추가한다면 필요
    getDropdownValues,
    getMeasurementList
} from './iotSensorApi.js';

// Chart Utils 함수 import (chartUtils.js 경로 확인)
import {
    createGaugeChart,
    createBarChart // 또는 createAreaChart
} from './chartUtils.js';

// 차트 인스턴스 관리
const chartInstances = {};
const COMPANY_DOMAIN = 'javame'; // 고정값 또는 동적 설정

// HTML ID와 매칭되는 지표 설정
// 각 게이지와 바 차트에 어떤 데이터를 표시할지 여기서 정의합니다.
// origin, location, measurement 등은 실제 MQTT 토픽/백엔드 스키마에 정확히 맞춰야 합니다.
const DASHBOARD_METRICS_CONFIG = {
    // 게이지 차트 설정 (HTML의 gauge1, gauge2, gauge3, gauge4 에 해당)
    gauge1: { // 예시: CPU 사용률
        type: 'gauge',
        canvasId: 'gauge1',
        valueTextId: 'gauge1-value',
        title: 'CPU 사용률',
        apiParams: { origin: 'server_data', location: 'cpu', measurement: 'usage_user' }, // getCurrentSensorValue용 파라미터
        unit: '%'
    },
    gauge2: { // 예시: 메모리 사용률
        type: 'gauge',
        canvasId: 'gauge2',
        valueTextId: 'gauge2-value',
        title: '메모리 사용률',
        apiParams: { origin: 'server_data', location: 'memory', measurement: 'used_percent' },
        unit: '%'
    },
    gauge3: { // 예시: 디스크 사용률
        type: 'gauge',
        canvasId: 'gauge3',
        valueTextId: 'gauge3-value',
        title: '디스크 사용률',
        apiParams: { origin: 'server_data', location: 'disk', measurement: 'used_percent' },
        unit: '%'
    },
    gauge4: { // 예시: 특정 센서 온도 (예: 서버룸 입구 온도)
        type: 'gauge',
        canvasId: 'gauge4',
        valueTextId: 'gauge4-value',
        title: '서버룸 입구 온도',
        apiParams: { origin: 'server_room', location: '입구', measurement: 'temperature' }, // 예시 토픽 구조 참고
        unit: '°C'
    },
    // 바 차트 설정 (HTML의 barChart1, barChart2, barChart3, barChart4 에 해당)
    // 바 차트는 보통 시계열 데이터나 카테고리별 집계 데이터를 표시합니다.
    // 여기서는 각 게이지와 관련된 시계열 데이터를 보여준다고 가정합니다.
    barChart1: { // 예시: CPU 사용률 시계열
        type: 'bar', // 또는 'line'/'area'
        canvasId: 'barChart1',
        title: 'CPU 사용률 추이',
        streamParams: { origin: 'server_data', location: 'cpu', _measurement: 'usage_user', /* _field: 'value' */ }, // startSensorDataStream용
        yAxisLabel: '사용률 (%)'
    },
    barChart2: { // 예시: 메모리 사용률 시계열
        type: 'bar',
        canvasId: 'barChart2',
        title: '메모리 사용률 추이',
        streamParams: { origin: 'server_data', location: 'memory', _measurement: 'used_percent' },
        yAxisLabel: '사용률 (%)'
    },
    barChart3: { // 예시: 디스크 사용률 시계열
        type: 'bar',
        canvasId: 'barChart3',
        title: '디스크 사용률 추이',
        streamParams: { origin: 'server_data', location: 'disk', _measurement: 'used_percent' },
        yAxisLabel: '사용률 (%)'
    },
    barChart4: { // 예시: 서버룸 입구 온도 시계열
        type: 'bar',
        canvasId: 'barChart4',
        title: '서버룸 입구 온도 추이',
        streamParams: { origin: 'server_room', location: '입구', _measurement: 'temperature' },
        yAxisLabel: '온도 (°C)'
    },
    // 상단 요약 카드 설정 (HTML의 card-1, card-2, card-3 에 해당)
    summaryCard1: {
        cardId: 'card-1', // 이 ID 내부의 .card-body 내용을 업데이트
        title: '총 활성 서버',
        apiParams: { /* 활성 서버 수를 가져오는 API 파라미터 */ },
        // getValue: async (params) => { /* API 호출하여 값 반환 */ return 10; } // 값을 가져오는 함수
    },
    summaryCard2: {
        cardId: 'card-2',
        title: '오늘 발생 경고',
        apiParams: { /* 오늘 발생 경고 수를 가져오는 API 파라미터 */ },
        // getValue: async (params) => { return 5; }
    },
    summaryCard3: {
        cardId: 'card-3',
        title: '평균 응답 시간',
        apiParams: { /* 평균 응답 시간을 가져오는 API 파라미터 */ },
        // getValue: async (params) => { return '120ms'; }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard (paste.txt based) page loaded. Initializing metrics...");
    initializeDashboard();

    // 주기적 업데이트 (선택 사항)
    // setInterval(fetchAllMetricData, 30000); // 30초마다 모든 데이터 업데이트
});

/**
 * 대시보드 초기화: 빈 차트 생성 및 초기 데이터 로드
 */
function initializeDashboard() {
    // 빈 차트 프레임 생성
    Object.values(DASHBOARD_METRICS_CONFIG).forEach(config => {
        if (config.type === 'gauge' && config.canvasId) {
            if (chartInstances[config.canvasId]) chartInstances[config.canvasId].destroy();
            chartInstances[config.canvasId] = createGaugeChart(config.canvasId, 0, '--', config.title);
            updateTextContent(config.valueTextId, `--${config.unit || ''}`);
        } else if (config.type === 'bar' && config.canvasId) { // 또는 line/area
            if (chartInstances[config.canvasId]) chartInstances[config.canvasId].destroy();
            // createBarChart는 (canvasId, labels, data, title, yAxisLabel) 등을 받는다고 가정
            chartInstances[config.canvasId] = createBarChart(config.canvasId, [], [], config.title, config.yAxisLabel);
        }
    });
    // 초기 데이터 로드
    fetchAllMetricData();
}

/**
 * 모든 지표 데이터를 가져와서 차트 및 텍스트를 업데이트합니다.
 */
async function fetchAllMetricData() {
    console.log("Fetching and updating all metric data...");
    for (const key in DASHBOARD_METRICS_CONFIG) {
        const config = DASHBOARD_METRICS_CONFIG[key];
        if (config.type === 'gauge') {
            await loadAndRenderSingleGauge(config);
        } else if (config.type === 'bar') { // 또는 line/area
            // 바 차트는 SSE 또는 주기적 API 호출로 업데이트
            // 여기서는 SSE 스트림 시작/재시작 로직을 예시로 사용
            // 실제로는 각 차트별 데이터 소스 및 업데이트 주기에 맞춰 조정
            const streamParams = { companyDomain: COMPANY_DOMAIN, ...config.streamParams };
            startSensorDataStream(streamParams, (streamData) => {
                let records = [];
                if (Array.isArray(streamData)) {
                    records = streamData;
                } else if (streamData && streamData[config.streamParams._measurement]) {
                    records = streamData[config.streamParams._measurement];
                }
                updateSingleBarChart(config, records);
            });
        } else if (config.cardId) { // 요약 카드 데이터 업데이트
            await updateSummaryCard(config);
        }
    }
}

/**
 * 단일 게이지 차트 데이터 로드 및 렌더링
 * @param {object} gaugeConfig
 */
async function loadAndRenderSingleGauge(gaugeConfig) {
    const { canvasId, valueTextId, title, apiParams, unit } = gaugeConfig;
    const data = await getCurrentSensorValue(COMPANY_DOMAIN, apiParams.origin, apiParams.location, apiParams.measurement);

    let gaugeDisplayValue = 0;
    let textDisplay = `--${unit || ''}`;

    if (data && typeof data.value === 'number') {
        const currentValue = data.value;
        // 값 변환 로직 (이전 답변의 loadAndRenderGauge 함수 로직 참고)
        if (unit === '%') {
            gaugeDisplayValue = Math.max(0, Math.min(100, currentValue));
            textDisplay = `${currentValue.toFixed(1)}%`;
        } else if (unit === '°C') {
            // 온도 범위에 따른 % 변환 예시 (0~100도 범위 가정)
            gaugeDisplayValue = Math.max(0, Math.min(100, (currentValue / 100) * 100));
            textDisplay = `${currentValue.toFixed(1)}°C`;
        } else { // 기타 단위
            gaugeDisplayValue = currentValue; // 또는 적절한 스케일링
            textDisplay = `${currentValue.toFixed(1)}${unit || ''}`;
        }
        console.log(`${title}: ${textDisplay}`);
    } else {
        console.warn(`${title} 데이터 로드 실패 또는 형식 오류.`, data);
    }

    updateTextContent(valueTextId, textDisplay);
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = createGaugeChart(canvasId, gaugeDisplayValue, textDisplay, title);
}

/**
 * 단일 바 차트(또는 라인/영역 차트) 업데이트
 * @param {object} chartConfig
 * @param {Array} records
 */
function updateSingleBarChart(chartConfig, records) {
    const { canvasId, title, yAxisLabel } = chartConfig;
    const chart = chartInstances[canvasId];
    if (!chart) return;

    if (records && records.length > 0) {
        const labels = records.map(d => new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        const values = records.map(d => d.value);
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.data.datasets[0].label = title;
        if (chart.options.scales && chart.options.scales.y) { // Chart.js 3+
            chart.options.scales.y.title = chart.options.scales.y.title || {};
            chart.options.scales.y.title.text = yAxisLabel;
            chart.options.scales.y.title.display = !!yAxisLabel;
        } else if (chart.options.scales && chart.options.scales.yAxes && chart.options.scales.yAxes[0]) { // Chart.js 2.x
            chart.options.scales.yAxes[0].scaleLabel.labelString = yAxisLabel;
            chart.options.scales.yAxes[0].scaleLabel.display = !!yAxisLabel;
        }
    } else {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
    }
    chart.update('none');
}

/**
 * 요약 카드 내용 업데이트 (예시)
 * @param {object} cardConfig
 */
async function updateSummaryCard(cardConfig) {
    const cardElement = document.getElementById(cardConfig.cardId);
    if (!cardElement) return;

    const cardBody = cardElement.querySelector('.card-body');
    if (!cardBody) return;

    // 실제로는 cardConfig.getValue 함수를 호출하거나,
    // cardConfig.apiParams를 사용하여 API 호출 후 값을 가져와야 함.
    // 여기서는 임시 텍스트로 채웁니다.
    let valueToDisplay = "데이터 로딩 중...";
    if (cardConfig.cardId === 'card-1') valueToDisplay = "15대"; // 예시
    else if (cardConfig.cardId === 'card-2') valueToDisplay = "3건";
    else if (cardConfig.cardId === 'card-3') valueToDisplay = "150ms";

    cardBody.innerHTML = `<strong>${cardConfig.title}:</strong> ${valueToDisplay}`;
    console.log(`Summary card ${cardConfig.cardId} updated.`);
}

/**
 * Helper function to update text content of an element
 * @param {string} elementId
 * @param {string} text
 */
function updateTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// HTML에 있는 필터링 버튼 및 센서 트리 로직은 현재 이 JS 파일에서는 직접 사용하지 않습니다.
// 해당 로직은 별도의 파일로 분리하거나, 필요에 따라 이 파일에 통합할 수 있습니다.
// 지금은 고정된 메인 대시보드 항목 표시에만 집중합니다.
