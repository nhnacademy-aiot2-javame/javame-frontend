// dashboardMain.js

import {
    getCurrentSensorValue,
    startSensorDataStream
} from './iotSensorApi.js'; // 실제 경로로 수정

import {
    createGaugeChart,
    createBarChart, // 또는 createAreaChart 등 사용하시는 시계열 차트 함수
    createAreaChart
} from './chartUtils.js'; // 실제 경로로 수정

// 차트 인스턴스 관리 객체
const chartInstances = {};
const COMPANY_DOMAIN = 'javame';

const DASHBOARD_CONFIG = {
    cpu: { // 'cpu'는 논리적인 지표 이름, 실제 HTML ID와는 다를 수 있음
        gauge: {
            canvasId: 'gauge1', // HTML의 ID와 일치
            valueTextId: 'gauge1-value',
            title: 'CPU 사용률',
            apiParams: { origin: 'server_data', location: 'server_resource_data', gatewayId: 'cpu', measurement: 'usage_user' }, // 고정 필터
            unit: '%'
        },
    },
    // 예시: 메모리 관련 지표 설정 (gauge2와 barChart2 사용)
    memory: {
        gauge: {
            canvasId: 'gauge2', // HTML의 ID와 일치
            valueTextId: 'gauge2-value', // HTML의 ID와 일치
            title: '메모리 사용량',
            apiParams: { origin: 'server_data', location: 'server_resource_data', gatewayId: 'mem', measurement: 'used_percent' }, // << 중요!
            unit: '%'
        },
    },
    // disk (gauge3, barChart3), network (gauge4, barChart4) 설정도 유사하게 작성
    disk: {
        gauge: { canvasId: 'gauge3', valueTextId: 'gauge3-value', title: '디스크 사용률', apiParams: { origin: 'server_data', location: 'server_resource_data', gatewayId: 'disk', measurement: 'used_percent' }, unit: '%' },
    },
    network_or_temp: { // HTML의 gauge4, barChart4에 매핑할 지표 (예: 서버룸 온도)
        gauge: { canvasId: 'gauge4', valueTextId: 'gauge4-value', title: '서버 온도', apiParams: { origin: 'server_data', location: 'power_meter', gatewayId: 'modbus', measurement: 'temperature_celsius' }, unit: '°C' },
    }
};


window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard (using paste.txt HTML) page loaded. Initializing metrics...");
    initializeAllCharts();
});

/**
 * 모든 차트의 틀을 초기화하고 초기 데이터를 로드합니다.
 */
function initializeAllCharts() {
    Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
        // 게이지 차트 초기화
        if (metricConfig.gauge) {
            const gc = metricConfig.gauge;
            if (chartInstances[gc.canvasId]) chartInstances[gc.canvasId].destroy();
            chartInstances[gc.canvasId] = createGaugeChart(gc.canvasId, 0, '--', gc.title);
            updateTextContent(gc.valueTextId, `--${gc.unit || ''}`);
        }
        // 시계열 차트 (바/라인) 초기화
        if (metricConfig.timeseries) {
            const tc = metricConfig.timeseries;
            if (chartInstances[tc.canvasId]) chartInstances[tc.canvasId].destroy();
            if (tc.chartType === 'bar') {
                chartInstances[tc.canvasId] = createBarChart(tc.canvasId, [], [], tc.title, tc.yAxisLabel);
            } else { // 기본은 라인/영역 차트로 가정
                chartInstances[tc.canvasId] = createAreaChart(tc.canvasId, [], [], tc.title, tc.yAxisLabel);
            }
        }
    });
    // 초기 데이터 로드 시작
    fetchAllDataAndUpdateCharts();
}

/**
 * 모든 지표 데이터를 가져와서 차트 및 텍스트를 업데이트합니다.
 */
async function fetchAllDataAndUpdateCharts() {
    console.log("Fetching and updating all metric data...");
    for (const key in DASHBOARD_CONFIG) {
        const config = DASHBOARD_CONFIG[key];

        // 게이지 데이터 업데이트
        if (config.gauge) {
            await loadAndRenderSingleGauge(config.gauge);
        }

        // 시계열 데이터 스트림 시작/재시작
        if (config.timeseries) {
            const streamParams = { companyDomain: COMPANY_DOMAIN, ...config.timeseries.streamParams };
            // 각 시계열 차트별로 SSE 스트림 시작 (기존 연결은 startSensorDataStream 내부에서 관리 가정)
            startSensorDataStream(streamParams, (streamData) => {
                let records = [];
                const measurementKey = config.timeseries.streamParams._measurement;
                if (Array.isArray(streamData)) {
                    records = streamData;
                } else if (streamData && streamData[measurementKey]) {
                    records = streamData[measurementKey];
                }
                updateSingleTimeseriesChart(config.timeseries, records);
            });
        }
    }
    // 요약 카드 업데이트 로직 (필요시)
    // await updateAllSummaryCards();
}

/**
 * 단일 게이지 차트 데이터 로드 및 렌더링
 * @param {object} gaugeConfig 게이지 설정 객체
 */
async function loadAndRenderSingleGauge(gaugeConfig) {
    const { canvasId, valueTextId, title, apiParams, unit } = gaugeConfig;
    const data = await getCurrentSensorValue(
        COMPANY_DOMAIN,
        apiParams.origin,
        apiParams.location,
        apiParams.measurement
        // apiParams.field // getCurrentSensorValue가 field를 받는다면 추가
    );

    let gaugeDisplayValue = 0;
    let textDisplay = `--${unit || ''}`;

    if (data && typeof data.value === 'number') {
        const currentValue = data.value;
        // 값 변환 로직 (이전 답변의 예시 참고)
        if (unit === '%') {
            gaugeDisplayValue = Math.max(0, Math.min(100, currentValue));
            textDisplay = `${currentValue.toFixed(1)}%`;
        } else if (unit === '°C') {
            gaugeDisplayValue = Math.max(0, Math.min(100, (currentValue / 100) * 100)); // 0-100도 범위 가정
            textDisplay = `${currentValue.toFixed(1)}°C`;
        } else {
            gaugeDisplayValue = currentValue; // 적절한 스케일링 필요
            textDisplay = `${currentValue.toFixed(1)}${unit || ''}`;
        }
        console.log(`${title}: ${textDisplay}`);
    } else {
        console.warn(`${title} 데이터 로드 실패 또는 형식 오류.`, data);
    }

    updateTextContent(valueTextId, textDisplay);
    // 상태 텍스트 업데이트 로직 (필요하다면 HTML에 ID 추가 후 여기서 업데이트)
    // const statusElement = document.getElementById (gaugeConfig.statusTextId);
    // if(statusElement) statusElement.textContent = determineStatus(currentValue, title);

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = createGaugeChart(canvasId, gaugeDisplayValue, textDisplay, title);
}

/**
 * 단일 시계열 차트(바 또는 라인/영역) 업데이트
 * @param {object} tsConfig 시계열 차트 설정
 * @param {Array} records 데이터 레코드 배열
 */
function updateSingleTimeseriesChart(tsConfig, records) {
    const { canvasId, title, yAxisLabel, chartType } = tsConfig;
    const chart = chartInstances[canvasId];
    if (!chart) {
        console.warn(`Chart instance for ${canvasId} not found.`);
        return;
    }

    if (records && records.length > 0) {
        const labels = records.map(d => new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        const values = records.map(d => d.value);

        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.data.datasets[0].label = title;

        // Y축 레이블 설정 (Chart.js 2.x 기준)
        if (chart.options.scales && chart.options.scales.yAxes && chart.options.scales.yAxes[0]) {
            chart.options.scales.yAxes[0].scaleLabel.labelString = yAxisLabel;
            chart.options.scales.yAxes[0].scaleLabel.display = !!yAxisLabel;
        }
    } else {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
    }
    chart.update('none'); // 애니메이션 없이 빠르게 업데이트
}


/**
 * Helper: 텍스트 내용 업데이트
 * @param {string} elementId
 * @param {string} text
 */
function updateTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    } else {
        // console.warn(`Element with ID '${elementId}' not found for text update.`);
    }
}

// 요약 카드 업데이트 함수 (필요시 구현)
// async function updateAllSummaryCards() {
//     const card1Config = DASHBOARD_CONFIG.summaryCards.card1;
//     const card1Element = document.getElementById(card1Config.elementId)?.querySelector('.card-body');
//     // const card1Value = await card1Config.getValue(card1Config.apiParams);
//     if(card1Element) card1Element.innerHTML = `<strong>${card1Config.title}:</strong> ${/*card1Value*/ '10대'}`;
//     // ... card2, card3
// }
