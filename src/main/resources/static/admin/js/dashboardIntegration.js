// /admin/js/dashboardIntegration.js

import {
    getTree,
    getAverageData,
    startSensorDataWebSocket,
    closeSensorDataWebSocket
} from './iotSensorApi.js';

import {
    createComboBarLineChart
} from './chartUtils.js';

// ★★★ 전역 변수 ★★★
let selectedMeasurement = null;
let currentRealtimeData = new Map();
let chartInstances = {
    hourly: null,
    daily: null,
    weekly: null
};
let updateInterval = null;

// ★★★ 핵심 측정 항목만 선별 ★★★
const IMPORTANT_MEASUREMENTS = {
    'server_resource_data': {
        'cpu': ['usage_user', 'usage_system'],
        'mem': ['used_percent'],
        'net': ['bytes_sent', 'bytes_recv']
    },
    'power_meter': {
        'modbus': ['power_watts', 'temperature_celsius']
    }
};

// ★★★ 카테고리 매핑 ★★★
const CATEGORY_MAPPING = {
    'server_resource_data': {
        'cpu': '🖥️ CPU 성능',
        'mem': '💾 메모리',
        'net': '🌐 네트워크'
    },
    'power_meter': {
        'modbus': '⚡ 전력 계측'
    }
};

// ★★★ 페이지 로드 시 초기화 ★★★
document.addEventListener('DOMContentLoaded', () => {
    console.log('통합 차트 페이지 로드 완료');
    initializeIntegrationPage();
    setupEventListeners();
});

// ★★★ 페이지 초기화 ★★★
async function initializeIntegrationPage() {
    try {
        console.log('통합 차트 페이지 초기화 시작...');
        initializeEmptyCharts();
        await loadMeasurementSelector();

        console.log('통합 차트 페이지 초기화 완료');

    } catch (error) {
        console.error('페이지 초기화 실패:', error);
    }
}

// ★★★ 이벤트 리스너 설정 ★★★
function setupEventListeners() {
    window.addEventListener('beforeunload', () => {
        closeSensorDataWebSocket();
        if (updateInterval) {
            clearInterval(updateInterval);
        }
    });
}

// ★★★ 측정값 선택기 로딩 ★★★
async function loadMeasurementSelector() {
    const container = document.getElementById('measurementCheckboxContainer');
    if (!container) return;

    try {
        console.log('측정값 선택기 로딩 시작...');

        showLoadingState(container);

        const treeData = await getTree();
        if (!treeData) {
            throw new Error('트리 데이터를 가져올 수 없습니다');
        }

        const importantMeasurements = extractImportantMeasurements(treeData);
        renderMeasurementSelector(container, importantMeasurements);

        console.log('측정값 선택기 로딩 완료');

    } catch (error) {
        console.error('측정값 선택기 로딩 실패:', error);
        showErrorState(container);
    }
}

// ★★★ 로딩 상태 표시 ★★★
function showLoadingState(container) {
    container.innerHTML = '';
    const loadingDiv = createLoadingElement();
    container.appendChild(loadingDiv);
}

// ★★★ 에러 상태 표시 ★★★
function showErrorState(container) {
    container.innerHTML = '';
    const errorDiv = createErrorElement();
    container.appendChild(errorDiv);
}

// ★★★ 로딩 요소 생성 ★★★
function createLoadingElement() {
    const div = document.createElement('div');
    div.className = 'text-center text-muted p-4';

    const spinner = document.createElement('div');
    spinner.className = 'spinner-border text-primary me-2';

    const text = document.createElement('span');
    text.textContent = '측정값 로딩 중...';

    div.appendChild(spinner);
    div.appendChild(text);

    return div;
}

// ★★★ 에러 요소 생성 ★★★
function createErrorElement() {
    const div = document.createElement('div');
    div.className = 'text-center text-danger p-4';

    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-triangle me-2';

    const text = document.createElement('span');
    text.textContent = '측정값을 로딩할 수 없습니다';

    div.appendChild(icon);
    div.appendChild(text);

    return div;
}

// ★★★ 측정값 선택기 UI 렌더링 ★★★
function renderMeasurementSelector(container, measurementsByCategory) {
    container.innerHTML = '';

    const categoryOrder = ['🖥️ CPU 성능', '💾 메모리', '🌐 네트워크', '⚡ 전력 계측'];

    categoryOrder.forEach(category => {
        const measurements = measurementsByCategory[category];
        if (!measurements || measurements.length === 0) return;

        const categorySection = createCategorySection(category, measurements);
        container.appendChild(categorySection);
    });

    const selectionDisplay = createSelectionDisplay();
    container.appendChild(selectionDisplay);
}

// ★★★ 카테고리 섹션 생성 ★★★
function createCategorySection(category, measurements) {
    const section = document.createElement('div');
    section.className = 'mb-4';

    const header = createCategoryHeader(category, measurements.length);
    section.appendChild(header);

    const radioContainer = createRadioContainer(measurements);
    section.appendChild(radioContainer);

    return section;
}

// ★★★ 카테고리 헤더 생성 ★★★
function createCategoryHeader(category, count) {
    const header = document.createElement('div');
    header.className = 'mb-3';

    const title = document.createElement('h6');
    title.className = 'mb-1';
    title.textContent = category;

    const subtitle = document.createElement('small');
    subtitle.className = 'text-muted';
    subtitle.textContent = `${count}개 측정값`;

    header.appendChild(title);
    header.appendChild(subtitle);

    return header;
}

// ★★★ 라디오 버튼 컨테이너 생성 ★★★
function createRadioContainer(measurements) {
    const container = document.createElement('div');

    measurements.forEach(measurement => {
        const radioItem = createRadioItem(measurement);
        container.appendChild(radioItem);
    });

    return container;
}

// ★★★ 라디오 버튼 아이템 생성 ★★★
function createRadioItem(measurement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'measurement-item';

    const radioId = `measurement_${measurement.location}_${measurement.gatewayId}_${measurement.measurement}`;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'selectedMeasurement';
    radio.id = radioId;
    radio.value = measurement.measurement;
    radio.className = 'form-check-input me-2';
    radio.dataset.gatewayId = measurement.gatewayId;
    radio.dataset.location = measurement.location;
    radio.dataset.label = measurement.label;

    const label = document.createElement('label');
    label.htmlFor = radioId;
    label.className = 'form-check-label';

    const title = document.createElement('strong');
    title.textContent = measurement.label;

    const subtitle = document.createElement('small');
    subtitle.className = 'text-muted d-block';
    subtitle.textContent = `${measurement.gatewayId} - ${measurement.location}`;

    label.appendChild(title);
    label.appendChild(subtitle);

    wrapper.appendChild(radio);
    wrapper.appendChild(label);

    // ★★★ 수정된 이벤트 리스너 ★★★
    radio.addEventListener('change', (e) => {
        if (e.target.checked) {
            handleMeasurementSelection(measurement);
            updateMeasurementItemStyles(wrapper);
        }
    });

    // wrapper 클릭 시 라디오 버튼 선택
    wrapper.addEventListener('click', (e) => {
        // 이미 라디오 버튼이나 라벨을 직접 클릭한 경우는 제외
        if (e.target === radio || e.target === label || label.contains(e.target)) {
            return;
        }

        // 라디오 버튼 선택
        radio.checked = true;

        // change 이벤트 수동 발생
        const changeEvent = new Event('change', { bubbles: true });
        radio.dispatchEvent(changeEvent);
    });

    return wrapper;
}

// ★★★ 측정값 선택 처리 ★★★
function handleMeasurementSelection(measurement) {
    selectedMeasurement = {
        measurement: measurement.measurement,
        gatewayId: measurement.gatewayId,
        location: measurement.location,
        label: measurement.label
    };

    console.log('측정값 선택됨:', selectedMeasurement);
    updateSelectedMeasurementDisplay();
    generateComparisonCharts();
}

// ★★★ 측정값 아이템 스타일 업데이트 ★★★
function updateMeasurementItemStyles(selectedWrapper) {
    // 모든 아이템에서 selected 클래스 제거
    document.querySelectorAll('.measurement-item').forEach(item => {
        item.classList.remove('selected');
    });

    // 선택된 아이템에 selected 클래스 추가
    selectedWrapper.classList.add('selected');
}

// ★★★ 선택 상태 표시 영역 생성 ★★★
function createSelectionDisplay() {
    const display = document.createElement('div');
    display.id = 'selectedMeasurementDisplay';
    display.className = 'mt-4 p-3 bg-light rounded';
    display.style.display = 'none';

    return display;
}

// ★★★ 선택된 측정값 표시 업데이트 ★★★
function updateSelectedMeasurementDisplay() {
    const display = document.getElementById('selectedMeasurementDisplay');
    if (!display || !selectedMeasurement) return;

    display.style.display = 'block';
    display.innerHTML = '';

    const content = createSelectedMeasurementContent();
    display.appendChild(content);
}

// ★★★ 선택된 측정값 콘텐츠 생성 ★★★
function createSelectedMeasurementContent() {
    const container = document.createElement('div');
    container.className = 'd-flex align-items-center justify-content-between';

    const info = createSelectedMeasurementInfo();
    const button = createClearButton();

    container.appendChild(info);
    container.appendChild(button);

    const badges = createTimeBadges();

    const wrapper = document.createElement('div');
    wrapper.appendChild(container);
    wrapper.appendChild(badges);

    return wrapper;
}

// ★★★ 선택된 측정값 정보 생성 ★★★
function createSelectedMeasurementInfo() {
    const info = document.createElement('div');

    const title = document.createElement('h6');
    title.className = 'mb-1';

    const icon = document.createElement('i');
    icon.className = 'fas fa-chart-line text-primary me-2';

    const text = document.createElement('strong');
    text.textContent = selectedMeasurement.label;

    title.appendChild(icon);
    title.appendChild(document.createTextNode('선택된 측정값: '));
    title.appendChild(text);

    const subtitle = document.createElement('small');
    subtitle.className = 'text-muted';
    subtitle.textContent = `${selectedMeasurement.gatewayId} - ${selectedMeasurement.location}`;

    info.appendChild(title);
    info.appendChild(subtitle);

    return info;
}

// ★★★ 선택 해제 버튼 생성 ★★★
function createClearButton() {
    const button = document.createElement('button');
    button.className = 'btn btn-sm btn-outline-danger';
    button.onclick = clearMeasurementSelection;

    const icon = document.createElement('i');
    icon.className = 'fas fa-times me-1';

    button.appendChild(icon);
    button.appendChild(document.createTextNode('선택 해제'));

    return button;
}

// ★★★ 시간 배지 생성 ★★★
function createTimeBadges() {
    const container = document.createElement('div');
    container.className = 'mt-2';

    const badges = [
        { text: '1시간 (10분 간격)', class: 'bg-primary' },
        { text: '24시간 (1시간 간격)', class: 'bg-success' },
        { text: '1주 (1일 간격)', class: 'bg-warning' }
    ];

    badges.forEach(badge => {
        const span = document.createElement('span');
        span.className = `badge ${badge.class} me-1`;
        span.textContent = badge.text;
        container.appendChild(span);
    });

    return container;
}

// ★★★ 빈 차트 초기화 ★★★
function initializeEmptyCharts() {
    chartInstances.hourly = createComboBarLineChart(
        'currentStateBarChart', [], [], '현재값', '1시간 평균', []
    );

    chartInstances.daily = createComboBarLineChart(
        'dailyComboChart', [], [], '현재값', '24시간 평균', []
    );

    chartInstances.weekly = createComboBarLineChart(
        'weeklyComboChart', [], [], '현재값', '1주 평균', []
    );

    console.log('빈 차트 초기화 완료');
}

// ★★★ 비교 차트 생성 ★★★
async function generateComparisonCharts() {
    if (!selectedMeasurement) {
        console.warn('선택된 측정값이 없습니다');
        return;
    }

    try {
        console.log('Period-over-period 비교 차트 생성 시작:', selectedMeasurement);

        showChartLoading(true);

        const filters = {
            gatewayId: selectedMeasurement.gatewayId,
            location: selectedMeasurement.location
        };

        const [hourlyData, dailyData, weeklyData] = await Promise.all([
            getAverageData('server_data', selectedMeasurement.measurement, filters, '1h'),
            getAverageData('server_data', selectedMeasurement.measurement, filters, '24h'),
            getAverageData('server_data', selectedMeasurement.measurement, filters, '1w')
        ]);

        await updateComparisonChart('hourly', hourlyData, '1시간', 10);
        await updateComparisonChart('daily', dailyData, '24시간', 60);
        await updateComparisonChart('weekly', weeklyData, '1주', 1440);

        startRealtimeUpdates();

        console.log('Period-over-period 비교 차트 생성 완료');

    } catch (error) {
        console.error('비교 차트 생성 실패:', error);
        alert('차트 생성 중 오류가 발생했습니다.');
    } finally {
        showChartLoading(false);
    }
}

// ★★★ 비교 차트 업데이트 ★★★
async function updateComparisonChart(chartKey, data, timeRangeLabel, intervalMinutes) {
    if (!chartInstances[chartKey] || !data) return;

    const timeLabels = generateTimeLabels(intervalMinutes);
    const currentPeriodData = data.timeSeriesAverage || [];
    const pastPeriodData = await fetchPastPeriodData(selectedMeasurement, intervalMinutes, timeLabels.length);

    if (chartInstances[chartKey]) {
        chartInstances[chartKey].destroy();
    }

    const canvasId = getCanvasIdForChartKey(chartKey);
    chartInstances[chartKey] = createComboBarLineChart(
        canvasId,
        currentPeriodData,
        pastPeriodData,
        `현재 ${timeRangeLabel}`,
        `과거 ${timeRangeLabel}`,
        timeLabels
    );

    console.log(`${chartKey} 차트 업데이트 완료`);
}

// ★★★ 과거 기간 데이터 가져오기 ★★★
async function fetchPastPeriodData(measurement, intervalMinutes, dataPoints) {
    if (!measurement) return [];

    try {
        const filters = {
            gatewayId: measurement.gatewayId,
            location: measurement.location
        };

        let timeRange, offsetHours;

        if (intervalMinutes === 10) {
            timeRange = '1h';
            offsetHours = 1;
        } else if (intervalMinutes === 60) {
            timeRange = '24h';
            offsetHours = 24;
        } else if (intervalMinutes === 1440) {
            timeRange = '1w';
            offsetHours = 168;
        }

        const now = new Date();
        const pastEndTime = new Date(now.getTime() - offsetHours * 60 * 60 * 1000);

        let pastStartTime;
        if (timeRange === '1h') {
            pastStartTime = new Date(pastEndTime.getTime() - 60 * 60 * 1000);
        } else if (timeRange === '24h') {
            pastStartTime = new Date(pastEndTime.getTime() - 24 * 60 * 60 * 1000);
        } else if (timeRange === '1w') {
            pastStartTime = new Date(pastEndTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const filtersWithTime = {
            ...filters,
            startTime: pastStartTime.toISOString(),
            endTime: pastEndTime.toISOString()
        };

        const pastData = await getAverageData('server_data', measurement.measurement, filtersWithTime, timeRange);
        return pastData.timeSeriesAverage || [];

    } catch (error) {
        console.error('과거 기간 데이터 가져오기 실패:', error);
        return [];
    }
}

// ★★★ 시간 라벨 생성 ★★★
function generateTimeLabels(intervalMinutes) {
    const labels = [];
    const now = new Date();

    let periods, format;

    if (intervalMinutes === 10) {
        periods = 6;
        format = 'HH:mm';
    } else if (intervalMinutes === 60) {
        periods = 24;
        format = 'MM/dd HH:mm';
    } else if (intervalMinutes === 1440) {
        periods = 7;
        format = 'MM/dd';
    }

    for (let i = periods - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
        labels.push(time.toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: format.includes('HH') ? '2-digit' : undefined,
            minute: format.includes('mm') ? '2-digit' : undefined
        }));
    }

    return labels;
}

// ★★★ 실시간 데이터 구독 시작 ★★★
function startRealtimeUpdates() {
    if (!selectedMeasurement) return;

    closeSensorDataWebSocket();
    currentRealtimeData.clear();

    const wsParams = {
        origin: 'server_data',
        measurements: [selectedMeasurement.measurement],
        gatewayIds: [selectedMeasurement.gatewayId]
    };

    startSensorDataWebSocket(wsParams, (realtimeData) => {
        handleRealtimeData(realtimeData);
    });

    if (updateInterval) {
        clearInterval(updateInterval);
    }
    updateInterval = setInterval(() => {
        updateChartsWithRealtimeData();
    }, 30000);

    console.log('실시간 데이터 구독 시작:', selectedMeasurement.measurement);
}

// ★★★ 실시간 데이터 처리 ★★★
function handleRealtimeData(realtimeData) {
    if (!Array.isArray(realtimeData) || !selectedMeasurement) return;

    realtimeData.forEach(dataPoint => {
        if (dataPoint.measurement === selectedMeasurement.measurement &&
            dataPoint.value !== undefined) {
            currentRealtimeData.set(dataPoint.measurement, dataPoint.value);
            console.log(`실시간 데이터 업데이트: ${dataPoint.measurement} = ${dataPoint.value}`);
        }
    });

    updateChartsWithRealtimeData();
}

// ★★★ 실시간 데이터로 차트 업데이트 ★★★
function updateChartsWithRealtimeData() {
    if (!selectedMeasurement || currentRealtimeData.size === 0) return;

    const realtimeValue = currentRealtimeData.get(selectedMeasurement.measurement);
    if (realtimeValue === undefined) return;

    Object.entries(chartInstances).forEach(([key, chart]) => {
        if (chart && chart.data && chart.data.datasets) {
            const currentDataset = chart.data.datasets.find(ds => ds.label.includes('현재'));
            if (currentDataset && currentDataset.data.length > 0) {
                currentDataset.data[currentDataset.data.length - 1] = realtimeValue;
                chart.update('none');
            }
        }
    });

    console.log('실시간 데이터로 현재 기간 업데이트 완료:', realtimeValue);
}

// ★★★ 헬퍼 함수들 ★★★
function getCanvasIdForChartKey(chartKey) {
    const mapping = {
        'hourly': 'currentStateBarChart',
        'daily': 'dailyComboChart',
        'weekly': 'weeklyComboChart'
    };
    return mapping[chartKey];
}

function extractImportantMeasurements(treeData) {
    const measurementsByCategory = {};

    function traverseTree(node, currentPath = []) {
        if (node.tag === 'measurement' && node.value) {
            const location = currentPath.find(p => p.tag === 'location')?.value;
            const gatewayId = currentPath.find(p => p.tag === 'gatewayId')?.value;

            if (isImportantMeasurement(location, gatewayId, node.value)) {
                const category = getCategoryName(location, gatewayId);

                if (!measurementsByCategory[category]) {
                    measurementsByCategory[category] = [];
                }

                measurementsByCategory[category].push({
                    measurement: node.value,
                    label: node.label || node.value,
                    gatewayId: gatewayId,
                    location: location,
                    category: category
                });
            }
        }

        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => {
                traverseTree(child, [...currentPath, node]);
            });
        }
    }

    if (Array.isArray(treeData)) {
        treeData.forEach(rootNode => traverseTree(rootNode));
    } else {
        traverseTree(treeData);
    }

    return measurementsByCategory;
}

function isImportantMeasurement(location, gatewayId, measurement) {
    if (!location || !gatewayId || !measurement) return false;

    const locationConfig = IMPORTANT_MEASUREMENTS[location];
    if (!locationConfig) return false;

    const gatewayConfig = locationConfig[gatewayId];
    if (!gatewayConfig) return false;

    return gatewayConfig.includes(measurement);
}

function getCategoryName(location, gatewayId) {
    return CATEGORY_MAPPING[location]?.[gatewayId] || `${location} - ${gatewayId}`;
}

function showChartLoading(isLoading) {
    const chartContainers = ['currentStateBarChart', 'dailyComboChart', 'weeklyComboChart'];

    chartContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const parent = container.parentElement;

            if (isLoading) {
                parent.style.position = 'relative';
                if (!parent.querySelector('.chart-loading-overlay')) {
                    const overlay = createLoadingOverlay();
                    parent.appendChild(overlay);
                }
            } else {
                const overlay = parent.querySelector('.chart-loading-overlay');
                if (overlay) overlay.remove();
            }
        }
    });
}

function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'chart-loading-overlay';
    overlay.style.cssText = `
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255, 255, 255, 0.8);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000;
    `;

    const content = document.createElement('div');
    content.className = 'text-center';

    const spinner = document.createElement('div');
    spinner.className = 'spinner-border text-primary mb-2';

    const text = document.createElement('div');
    text.textContent = '비교 차트 생성 중...';

    content.appendChild(spinner);
    content.appendChild(text);
    overlay.appendChild(content);

    return overlay;
}

// ★★★ 전역 함수들 ★★★
window.clearMeasurementSelection = function() {
    selectedMeasurement = null;
    currentRealtimeData.clear();

    const radios = document.querySelectorAll('input[name="selectedMeasurement"]');
    radios.forEach(radio => radio.checked = false);

    const items = document.querySelectorAll('.measurement-item');
    items.forEach(item => item.classList.remove('selected'));

    const display = document.getElementById('selectedMeasurementDisplay');
    if (display) {
        display.style.display = 'none';
    }

    initializeEmptyCharts();

    closeSensorDataWebSocket();
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    console.log('측정값 선택 해제 완료');
};

// ★★★ 디버깅 함수 ★★★
window.debugPeriodComparison = function() {
    console.log('=== Period-over-period 비교 디버깅 ===');
    console.log('선택된 측정값:', selectedMeasurement);
    console.log('실시간 데이터:', Object.fromEntries(currentRealtimeData));

    Object.entries(chartInstances).forEach(([key, chart]) => {
        if (chart && chart.data) {
            console.log(`차트 ${key}:`, {
                labels: chart.data.labels?.length || 0,
                datasets: chart.data.datasets?.length || 0
            });
        }
    });
};

// ★★★ 모듈 내보내기 ★★★
export {
    initializeIntegrationPage,
    generateComparisonCharts,
    startRealtimeUpdates
};
