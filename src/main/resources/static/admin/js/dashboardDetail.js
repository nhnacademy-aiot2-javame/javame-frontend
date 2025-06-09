// /admin/js/dashboardDetail.js

import { createServiceComparisonChart } from './chartUtils.js';
import { getAverageData } from './iotSensorApi.js';
import { fetchWithAuth } from '/index/js/auth.js';

// ★★★ 전역 변수 ★★★
const chartInstances = {};
let COMPANY_DOMAIN = null;
let selectedServices = new Set(['javame-auth', 'javame-environment-api', 'javame-frontend', 'javame-gateway', 'javame-member']);
let currentMeasurement = 'cpu_utilization_percent';
let realtimeUpdateTimer = null;

// ★★★ 핵심 설정 ★★★
const SERVICE_MEASUREMENTS = [
    'cpu_utilization_percent',
    'gc_g1_young_generation_count',
    'memory_old_gen_used_bytes',
    'memory_total_heap_used_bytes',
    'process_open_file_descriptors_count',
    'thread_active_count'
];

const SERVICES = [
    { gatewayId: 'javame-auth', label: '인증 서비스', color: '#4682B4' },
    { gatewayId: 'javame-environment-api', label: '환경 API', color: '#DC3545' },
    { gatewayId: 'javame-frontend', label: '프론트엔드', color: '#28A745' },
    { gatewayId: 'javame-gateway', label: '게이트웨이', color: '#FFC107' },
    { gatewayId: 'javame-member', label: '회원 서비스', color: '#6F42C1' }
];

const selectedDateRange = {
    startDate: null,
    endDate: null,
    isRealtime: true
};

// ★★★ WebSocket 클래스 (간소화) ★★★
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
            this.socket = new WebSocket(`wss://javame.live/api/v1/ws/environment?token=${token}`);

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

    handleMessage(data) {
        if (data.type === 'connection') {
            COMPANY_DOMAIN = data.companyDomain;
            console.log(`WebSocket 연결 확인 - 회사: ${COMPANY_DOMAIN}`);
            setTimeout(() => this.subscribeToServices(), 1000);
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
                console.log(`실시간 데이터: ${gatewayId} - ${measurement} = ${latestValue}`);
            }
        }
    }

    subscribeToServices() {
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

// ★★★ 전역 WebSocket 인스턴스 ★★★
const serviceWS = new ServiceWebSocket();

// ★★★ 서비스 데이터 가져오기 ★★★
async function fetchServiceData(measurement, timeRange = '1h') {
    const servicesData = [];

    for (const service of SERVICES) {
        if (!selectedServices.has(service.gatewayId)) continue;

        try {
            const filters = {
                gatewayId: service.gatewayId,
                location: 'service_resource_data'
            };

            const data = await getAverageData('server_data', measurement, filters, timeRange);

            servicesData.push({
                serviceName: service.label,
                gatewayId: service.gatewayId,
                data: data.timeSeriesAverage || [],
                overallAverage: data.overallAverage || 0,
                hasData: data.hasData || false,
                color: service.color
            });

        } catch (error) {
            console.error(`서비스 ${service.label} 데이터 요청 실패:`, error);
            servicesData.push({
                serviceName: service.label,
                gatewayId: service.gatewayId,
                data: [],
                overallAverage: 0,
                hasData: false,
                color: service.color
            });
        }
    }

    return servicesData;
}

// ★★★ 시간 라벨 생성 ★★★
function generateTimeLabels() {
    const labels = [];
    const now = new Date();

    if (selectedDateRange.isRealtime) {
        // 실시간 모드: 24시간
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time.toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }));
        }
    } else {
        // 날짜 범위 모드
        const start = new Date(selectedDateRange.startDate);
        const end = new Date(selectedDateRange.endDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
            // 1일: 1시간 간격
            for (let i = 0; i < 24; i++) {
                const time = new Date(start.getTime() + i * 60 * 60 * 1000);
                labels.push(time.toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit'
                }));
            }
        } else {
            // 여러 일: 1일 간격
            for (let i = 0; i <= diffDays; i++) {
                const time = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
                labels.push(time.toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit'
                }));
            }
        }
    }

    return labels;
}

// ★★★ 차트 렌더링 (핵심 함수) ★★★
async function renderChart(canvasId, measurement) {
    try {
        console.log(`차트 렌더링: ${canvasId} - ${measurement}`);

        // 기존 차트 제거
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        // 로딩 표시
        showLoading(canvasId, true);

        // 데이터 가져오기
        const timeRange = selectedDateRange.isRealtime ? '1h' : '24h';
        const servicesData = await fetchServiceData(measurement, timeRange);
        const timeLabels = generateTimeLabels();

        // 차트 생성
        chartInstances[canvasId] = createServiceComparisonChart(
            canvasId,
            timeLabels,
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

// ★★★ 로딩 표시 ★★★
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

// ★★★ 서비스 선택 UI ★★★
function renderServiceSelector() {
    const container = document.getElementById('serviceSelector');
    if (!container) return;

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
                <small class="text-muted">측정 항목: ${SERVICE_MEASUREMENTS.length}개</small>
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

    // 체크박스 이벤트
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

// ★★★ 서비스 수 업데이트 ★★★
function updateServiceCount() {
    const countElement = document.getElementById('selectedServiceCount');
    if (countElement) {
        countElement.textContent = selectedServices.size;
    }
}

// ★★★ 현재 차트 렌더링 ★★★
async function renderCurrentChart() {
    const canvasId = getCanvasId(currentMeasurement);
    if (canvasId) {
        await renderChart(canvasId, currentMeasurement);
    }
}

// ★★★ 실시간 업데이트 ★★★
function startRealtimeUpdate() {
    if (realtimeUpdateTimer) {
        clearInterval(realtimeUpdateTimer);
    }

    if (selectedDateRange.isRealtime) {
        realtimeUpdateTimer = setInterval(() => {
            console.log('실시간 차트 업데이트');
            updateChartsWithRealtimeData();
        }, 60000);
        console.log('실시간 업데이트 시작');
    }
}

function stopRealtimeUpdate() {
    if (realtimeUpdateTimer) {
        clearInterval(realtimeUpdateTimer);
        realtimeUpdateTimer = null;
        console.log('실시간 업데이트 중지');
    }
}

function updateChartsWithRealtimeData() {
    if (!selectedDateRange.isRealtime) return;

    Object.keys(chartInstances).forEach(canvasId => {
        const chart = chartInstances[canvasId];
        if (chart && chart.data) {
            // 시간 라벨 업데이트
            chart.data.labels = generateTimeLabels();

            // 각 서비스 데이터셋 업데이트
            chart.data.datasets.forEach(dataset => {
                const service = SERVICES.find(s => s.label === dataset.label);
                if (service) {
                    const dataKey = `${service.gatewayId}:${currentMeasurement}`;
                    const realtimeData = serviceWS.serviceData.get(dataKey);

                    if (realtimeData) {
                        dataset.data.push(realtimeData.value);
                    } else {
                        const lastValue = dataset.data[dataset.data.length - 1] || 0;
                        dataset.data.push(lastValue);
                    }

                    // 24시간 이상 데이터 제거
                    if (dataset.data.length > 24) {
                        dataset.data.shift();
                    }
                }
            });

            chart.update('none');
        }
    });
}

// ★★★ 헬퍼 함수들 ★★★
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

// ★★★ 전역 함수들 ★★★
window.updateDateRangeDisplay = function() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    if (startDate && endDate) {
        selectedDateRange.startDate = startDate;
        selectedDateRange.endDate = endDate;
        selectedDateRange.isRealtime = false;

        $('#chartDateRange').text(`${startDate} ~ ${endDate}`);
        console.log('날짜 범위 업데이트:', `${startDate} ~ ${endDate}`);

        stopRealtimeUpdate();
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
    startRealtimeUpdate();
};

// ★★★ DOM 로드 완료 후 실행 ★★★
document.addEventListener('DOMContentLoaded', () => {
    console.log("서비스별 성능 비교 페이지 로드 완료");

    // WebSocket 연결
    serviceWS.connect();

    // UI 초기화
    renderServiceSelector();

    // ★★★ 측정 항목 탭 클릭 이벤트 (수정됨) ★★★
    document.querySelectorAll('.measurement-tab').forEach(tab => {
        tab.addEventListener('click', (event) => {
            // 모든 탭에서 active 클래스 제거
            document.querySelectorAll('.measurement-tab').forEach(t => t.classList.remove('active'));

            // 클릭된 탭에 active 클래스 추가
            event.target.classList.add('active');

            // 현재 측정 항목 업데이트
            currentMeasurement = event.target.dataset.measurement;

            // 모든 차트 숨기기
            document.querySelectorAll('canvas[id$="MultiLineChart"]').forEach(canvas => {
                canvas.style.display = 'none';
            });

            // 선택된 차트만 보이기
            const canvasId = getCanvasId(currentMeasurement);
            if (canvasId) {
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    canvas.style.display = 'block';
                }
            }

            // 차트 렌더링
            renderCurrentChart();

            console.log('측정 항목 변경:', currentMeasurement);
        });
    });

    // 전체 선택 버튼
    document.getElementById('selectAllServicesBtn')?.addEventListener('click', () => {
        const allSelected = selectedServices.size === SERVICES.length;

        if (allSelected) {
            selectedServices.clear();
        } else {
            selectedServices = new Set(SERVICES.map(s => s.gatewayId));
        }

        renderServiceSelector();
        renderCurrentChart();
    });

    // 필터 적용 버튼
    document.getElementById('applyFiltersButton')?.addEventListener('click', () => {
        const startDate = $('#startDate').val();
        const endDate = $('#endDate').val();

        if (startDate && endDate) {
            selectedDateRange.startDate = startDate;
            selectedDateRange.endDate = endDate;
            selectedDateRange.isRealtime = false;

            stopRealtimeUpdate();
            renderCurrentChart();
        } else {
            switchToRealtimeMode();
        }
    });

    // 초기 차트 렌더링
    setTimeout(() => {
        renderCurrentChart();
        startRealtimeUpdate();
    }, 2000);
});

// ★★★ 페이지 종료 시 정리 ★★★
window.addEventListener('beforeunload', () => {
    serviceWS.disconnect();
    stopRealtimeUpdate();
});

// ★★★ 디버깅 함수 ★★★
window.debugServiceComparison = function() {
    console.log('=== 서비스 비교 디버깅 ===');
    console.log('WebSocket 연결:', serviceWS.isConnected);
    console.log('선택된 서비스:', Array.from(selectedServices));
    console.log('현재 측정 항목:', currentMeasurement);
    console.log('날짜 범위:', selectedDateRange);
    console.log('차트 인스턴스:', Object.keys(chartInstances));
};
