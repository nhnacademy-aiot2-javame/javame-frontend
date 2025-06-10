// /admin/js/dashboardDetail.js

import { createServiceComparisonChart } from './chartUtils.js';
import { getAverageData, getAvailableServices } from './iotSensorApi.js';

// ★★★ 전역 변수 ★★★
const chartInstances = {};
let COMPANY_DOMAIN = null;
let SERVICES = []; // ★★★ 동적으로 로드 ★★★
let selectedServices = new Set();
let currentMeasurement = 'cpu_utilization_percent';
let realtimeUpdateTimer = null;

const SERVICE_MEASUREMENTS = [
    'cpu_utilization_percent',
    'gc_g1_young_generation_count',
    'memory_old_gen_used_bytes',
    'memory_total_heap_used_bytes',
    'process_open_file_descriptors_count',
    'thread_active_count'
];

const selectedDateRange = {
    startDate: null,
    endDate: null,
    isRealtime: true
};

// ★★★ 서비스 목록 동적 로드 ★★★
async function loadAvailableServices() {
    try {
        console.log('서비스 목록 로드 시작...');

        const result = await getAvailableServices('server_data', 'service_resource_data');

        if (result.error || !result.services || result.services.length === 0) {
            console.warn('사용 가능한 서비스가 없습니다:', result);
            SERVICES = [];
            renderServiceSelectorError('서비스를 찾을 수 없습니다.');
            return false;
        }

        // ★★★ 서버에서 받은 서비스 목록 그대로 사용 (번역/색상 포함) ★★★
        SERVICES = result.services.map((gatewayId, index) => ({
            gatewayId,
            label: result.translatedLabels?.[gatewayId] || gatewayId, // 서버 번역 사용
            color: getServiceColorFromUtils(index) // chartUtils.js의 색상 사용
        }));

        selectedServices = new Set(SERVICES.map(s => s.gatewayId));

        console.log(`서비스 목록 로드 완료: ${SERVICES.length}개`, SERVICES);
        return true;

    } catch (error) {
        console.error('서비스 목록 로드 실패:', error);
        SERVICES = [];
        renderServiceSelectorError(error.message);
        return false;
    }
}

// ★★★ chartUtils.js의 색상 함수 활용 ★★★
function getServiceColorFromUtils(index) {
    // chartUtils.js에서 export한 getServiceColor 함수 사용
    if (typeof getServiceColor === 'function') {
        return getServiceColor(index);
    }
    // 폴백 색상
    const fallbackColors = ['#4682B4', '#DC3545', '#28A745', '#FFC107', '#6F42C1'];
    return fallbackColors[index % fallbackColors.length];
}

// ★★★ 에러 상태 렌더링 ★★★
function renderServiceSelectorError(errorMessage) {
    const container = document.getElementById('serviceSelector');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center p-4">
            <div class="text-danger mb-3">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
            </div>
            <h6 class="text-danger">서비스 목록을 불러올 수 없습니다</h6>
            <small class="text-muted">${errorMessage}</small>
            <div class="mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-1"></i>새로고침
                </button>
            </div>
        </div>
    `;
}

// ★★★ WebSocket 클래스 ★★★
class ServiceWebSocket {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.serviceData = new Map();
    }

    connect() {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        if (!token) {
            console.error('JWT 토큰이 없습니다.');
            return;
        }

        try {
            this.socket = new WebSocket(`ws://localhost:10279/api/v1/ws/environment?token=${token}`);

            this.socket.onopen = () => {
                console.log('WebSocket 연결 성공');
                this.isConnected = true;
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.socket.onclose = () => {
                console.log('WebSocket 연결 종료');
                this.isConnected = false;
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
            };

        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
        }
    }

    async handleMessage(data) {
        if (data.type === 'connection') {
            COMPANY_DOMAIN = data.companyDomain;
            console.log(`WebSocket 연결 확인 - 회사: ${COMPANY_DOMAIN}`);

            // ★★★ 서비스 목록 로드 후 UI 렌더링 ★★★
            const servicesLoaded = await loadAvailableServices();
            if (servicesLoaded) {
                renderServiceSelector();
                updateServiceCount();
                setTimeout(() => this.subscribeToServices(), 1000);
            }

        } else if (data.type === 'realtime') {
            const { measurement, gatewayId } = data;
            if (data.data && data.data.length > 0) {
                const latestValue = data.data[data.data.length - 1].value;
                const dataKey = `${gatewayId}:${measurement}`;
                this.serviceData.set(dataKey, {
                    gatewayId,
                    measurement,
                    value: latestValue,
                    timestamp: data.data[data.data.length - 1].time
                });
            }
        }
    }

    subscribeToServices() {
        if (SERVICES.length === 0) {
            console.warn('구독할 서비스가 없습니다.');
            return;
        }

        SERVICES.forEach(service => {
            SERVICE_MEASUREMENTS.forEach(measurement => {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        action: 'subscribe',
                        measurement: measurement,
                        gatewayId: service.gatewayId,
                        interval: 15
                    }));
                }
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
    }
}

const serviceWS = new ServiceWebSocket();

// ★★★ 서비스 데이터 가져오기 (x,y 좌표 형식으로 변경) ★★★
async function fetchServiceData(measurement, timeRange = '1h') {
    const servicesData = [];

    for (const service of SERVICES) {
        if (!selectedServices.has(service.gatewayId)) continue;

        try {
            const filters = {
                gatewayId: service.gatewayId,
                location: 'service_resource_data'
            };

            // ★★★ 날짜 범위가 선택된 경우 startTime, endTime 추가 ★★★
            if (!selectedDateRange.isRealtime && selectedDateRange.startDate && selectedDateRange.endDate) {
                filters.startTime = selectedDateRange.startDate + 'T00:00:00';
                filters.endTime = selectedDateRange.endDate + 'T23:59:59';
            }

            const data = await getAverageData('server_data', measurement, filters, timeRange);

            // ★★★ 선택된 날짜 범위 기준으로 시간 라벨 생성 ★★★
            const timeLabels = generateTimeLabelsFromDateRange();

            // ★★★ 시간 라벨과 데이터 매핑 ★★★
            const chartData = [];
            if (data.timeSeriesAverage && data.timeSeriesAverage.length > 0) {
                // 데이터 포인트 수와 시간 라벨 수를 맞춤
                const dataPoints = data.timeSeriesAverage;
                const labelCount = timeLabels.length;

                for (let i = 0; i < Math.min(dataPoints.length, labelCount); i++) {
                    chartData.push({
                        x: timeLabels[i], // ★★★ 실제 선택된 날짜 범위의 시간 ★★★
                        y: dataPoints[i]
                    });
                }
            }

            servicesData.push({
                serviceName: service.label,
                gatewayId: service.gatewayId,
                data: chartData,
                overallAverage: data.overallAverage || 0,
                hasData: data.hasData || false,
                color: service.color
            });

        } catch (error) {
            console.error(`서비스 ${service.label} 데이터 요청 실패:`, error);
        }
    }

    return servicesData;
}



// ★★★ 서비스 선택 UI 렌더링 ★★★
function renderServiceSelector() {
    const container = document.getElementById('serviceSelector');
    if (!container) return;

    if (SERVICES.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary mb-2"></div>
                <div>서비스 목록을 불러오는 중...</div>
                <small class="text-muted">현재 도메인: ${COMPANY_DOMAIN || '확인 중...'}</small>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    SERVICES.forEach((service, index) => {
        const isChecked = selectedServices.has(service.gatewayId);
        const serviceDiv = document.createElement('div');
        serviceDiv.className = `service-item ${isChecked ? 'selected' : ''}`;

        serviceDiv.innerHTML = `
            <div class="measurement-header">
                <div class="form-check">
                    <input class="form-check-input service-checkbox" type="checkbox" 
                           value="${service.gatewayId}" id="service${index}" ${isChecked ? 'checked' : ''}>
                    <label class="form-check-label fw-bold" for="service${index}">
                        <span class="legend-color d-inline-block me-2" style="background-color: ${service.color}"></span>
                        ${service.label}
                    </label>
                </div>
            </div>
            <div class="service-checkbox-group">
                <small class="text-muted">Gateway ID: ${service.gatewayId}</small>
                <div class="mt-2">
                    <span class="badge bg-light text-dark me-1">CPU</span>
                    <span class="badge bg-light text-dark me-1">Memory</span>
                    <span class="badge bg-light text-dark me-1">GC</span>
                    <span class="badge bg-light text-dark me-1">Thread</span>
                    <span class="badge bg-light text-dark me-1">File</span>
                    <span class="badge bg-light text-dark">Heap</span>
                </div>
            </div>
        `;

        container.appendChild(serviceDiv);
    });

    // ★★★ 체크박스 이벤트 ★★★
    document.querySelectorAll('.service-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const serviceId = e.target.value;
            const serviceItem = e.target.closest('.service-item');

            if (e.target.checked) {
                selectedServices.add(serviceId);
                serviceItem.classList.add('selected');
            } else {
                selectedServices.delete(serviceId);
                serviceItem.classList.remove('selected');
            }

            updateServiceCount();
            renderCurrentChart();
        });
    });

    updateServiceCount();
}

// ★★★ 차트 렌더링 ★★★
// ★★★ 차트 렌더링 (labels 제거) ★★★
async function renderChart(canvasId, measurement) {
    try {
        console.log(`차트 렌더링: ${canvasId} - ${measurement}`);

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        showLoading(canvasId, true);

        const timeRange = selectedDateRange.isRealtime ? '1h' : '24h';
        const servicesData = await fetchServiceData(measurement, timeRange);

        // ★★★ labels 없이 차트 생성 (x,y 데이터 사용) ★★★
        chartInstances[canvasId] = createServiceComparisonChart(
            canvasId,
            [], // ★★★ 빈 배열 전달 ★★★
            servicesData,
            { name: measurement, label: getMeasurementLabel(measurement) }
        );

        console.log(`차트 렌더링 완료: ${canvasId}`);

    } catch (error) {
        console.error(`차트 렌더링 실패: ${canvasId}`, error);
    } finally {
        showLoading(canvasId, false);
    }
}

// ★★★ 날짜 범위 기반 시간 라벨 생성 함수 추가 ★★★
function generateTimeLabelsFromDateRange() {
    const labels = [];

    if (selectedDateRange.isRealtime) {
        // 실시간 모드: 현재 시간 기준
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time);
        }
    } else {
        // 날짜 선택 모드: 선택된 날짜 범위 기준
        const start = new Date(selectedDateRange.startDate + 'T00:00:00');
        const end = new Date(selectedDateRange.endDate + 'T23:59:59');
        const now = new Date();

        // ★★★ 종료 시간이 미래라면 현재 시간으로 제한 ★★★
        const actualEnd = end > now ? now : end;

        const diffDays = Math.ceil((actualEnd - start) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
            // 1일 이하: 1시간 간격
            const diffHours = Math.ceil((actualEnd - start) / (1000 * 60 * 60));
            for (let i = 0; i < diffHours; i++) {
                const time = new Date(start.getTime() + i * 60 * 60 * 1000);
                if (time <= now) { // ★★★ 미래 시간 제외 ★★★
                    labels.push(time);
                }
            }
        } else {
            // 1일 초과: 1일 간격
            for (let i = 0; i <= diffDays; i++) {
                const time = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
                if (time <= now) { // ★★★ 미래 시간 제외 ★★★
                    labels.push(time);
                }
            }
        }
    }

    console.log('생성된 시간 라벨:', labels.map(l => l.toLocaleString('ko-KR')));
    return labels;
}

function showLoading(canvasId, isLoading) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const container = canvas.parentElement;

    if (isLoading) {
        container.style.position = 'relative';
        if (!container.querySelector('.chart-loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'chart-loading-overlay';
            overlay.style.cssText = `
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(255, 255, 255, 0.8);
                display: flex; align-items: center; justify-content: center;
                z-index: 1000;
            `;
            overlay.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary mb-2"></div>
                    <div>데이터 로딩 중...</div>
                </div>
            `;
            container.appendChild(overlay);
        }
    } else {
        const overlay = container.querySelector('.chart-loading-overlay');
        if (overlay) overlay.remove();
    }
}

function updateServiceCount() {
    const countElement = document.getElementById('selectedServiceCount');
    if (countElement) {
        countElement.textContent = selectedServices.size;
    }
}

async function renderCurrentChart() {
    const canvasId = getCanvasId(currentMeasurement);
    if (canvasId) {
        await renderChart(canvasId, currentMeasurement);
    }
}

function getCanvasId(measurement) {
    const mapping = {
        'cpu_utilization_percent': 'cpuMultiLineChart',
        'gc_g1_young_generation_count': 'gcMultiLineChart',
        'memory_old_gen_used_bytes': 'memoryMultiLineChart',
        'memory_total_heap_used_bytes': 'heapMultiLineChart',
        'process_open_file_descriptors_count': 'filesMultiLineChart',
        'thread_active_count': 'threadsMultiLineChart'
    };
    return mapping[measurement];
}

function getMeasurementLabel(measurement) {
    const mapping = {
        'cpu_utilization_percent': 'CPU 사용률',
        'gc_g1_young_generation_count': 'GC 실행 횟수',
        'memory_old_gen_used_bytes': 'GC 대상 메모리',
        'memory_total_heap_used_bytes': 'Heap 사용량',
        'process_open_file_descriptors_count': '열린 파일 수',
        'thread_active_count': '활성 스레드 수'
    };
    return mapping[measurement] || measurement;
}

// ★★★ 전역 함수들 (HTML에서 호출) ★★★
window.updateDateRangeDisplay = function() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    if (startDate && endDate) {
        selectedDateRange.startDate = startDate;
        selectedDateRange.endDate = endDate;
        selectedDateRange.isRealtime = false;

        $('#chartDateRange').text(`${startDate} ~ ${endDate}`);
        console.log('날짜 범위 업데이트:', `${startDate} ~ ${endDate}`);

        renderCurrentChart();
    }
};

window.switchToRealtimeMode = function() {
    selectedDateRange.isRealtime = true;
    selectedDateRange.startDate = null;
    selectedDateRange.endDate = null;

    $('#startDate').val('');
    $('#endDate').val('');
    $('#chartDateRange').text('실시간');

    console.log('실시간 모드로 전환');
    renderCurrentChart();
};

// ★★★ DOM 로드 완료 후 실행 ★★★
document.addEventListener('DOMContentLoaded', () => {
    console.log("서비스별 성능 비교 페이지 로드 완료");

    // ★★★ 초기 로딩 상태 표시 ★★★
    renderServiceSelector();

    // ★★★ WebSocket 연결 (자동으로 서비스 목록 로드) ★★★
    serviceWS.connect();

    // ★★★ 측정 항목 탭 이벤트 ★★★
    document.querySelectorAll('.measurement-tab').forEach(tab => {
        tab.addEventListener('click', (event) => {
            document.querySelectorAll('.measurement-tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            currentMeasurement = event.target.dataset.measurement;

            // 모든 차트 숨기기
            document.querySelectorAll('canvas[id$="MultiLineChart"]').forEach(canvas => {
                canvas.style.display = 'none';
            });

            // 선택된 차트만 표시
            const canvasId = getCanvasId(currentMeasurement);
            if (canvasId) {
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    canvas.style.display = 'block';
                }
            }

            renderCurrentChart();
        });
    });

    // ★★★ 전체 선택 버튼 ★★★
    document.getElementById('selectAllServicesBtn')?.addEventListener('click', () => {
        if (SERVICES.length === 0) return;

        const allSelected = selectedServices.size === SERVICES.length;

        if (allSelected) {
            selectedServices.clear();
        } else {
            selectedServices = new Set(SERVICES.map(s => s.gatewayId));
        }

        renderServiceSelector();
        renderCurrentChart();
    });

    // ★★★ 필터 적용 버튼 ★★★
    document.getElementById('applyFiltersButton')?.addEventListener('click', () => {
        const startDate = $('#startDate').val();
        const endDate = $('#endDate').val();

        if (startDate && endDate) {
            selectedDateRange.startDate = startDate;
            selectedDateRange.endDate = endDate;
            selectedDateRange.isRealtime = false;
            renderCurrentChart();
        } else {
            switchToRealtimeMode();
        }
    });
});

// ★★★ 페이지 종료 시 정리 ★★★
window.addEventListener('beforeunload', () => {
    serviceWS.disconnect();
    if (realtimeUpdateTimer) {
        clearInterval(realtimeUpdateTimer);
    }
});

// ★★★ 디버깅 함수 ★★★
window.debugServiceComparison = function() {
    console.log('=== 서비스 비교 디버깅 ===');
    console.log('WebSocket 연결:', serviceWS.isConnected);
    console.log('로드된 서비스:', SERVICES);
    console.log('선택된 서비스:', Array.from(selectedServices));
    console.log('현재 측정 항목:', currentMeasurement);
    console.log('날짜 범위:', selectedDateRange);
    console.log('차트 인스턴스:', Object.keys(chartInstances));
};
