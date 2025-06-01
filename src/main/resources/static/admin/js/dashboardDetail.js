// /admin/js/dashboardDetail.js

import { fetchWithAuth } from '/index/js/auth.js';

// 차트 인스턴스 저장
const chartInstances = {};
let COMPANY_DOMAIN = null;

// ★★★ 서비스별 고정 측정 항목 ★★★
const SERVICE_MEASUREMENTS = [
    'cpu_utilization_percent',           // CPU 사용률(%)
    'gc_g1_young_generation_count',      // Garbage Collector 실행 횟수
    'memory_old_gen_used_bytes',         // GC 대상 메모리 사용량(Byte)
    'memory_total_heap_used_bytes',      // Heap 사용량(Byte)
    'process_open_file_descriptors_count', // 열린 파일 수
    'thread_active_count'                // 활성 스레드 수
];

// ★★★ 서비스 목록 ★★★
const SERVICES = [
    { gatewayId: 'javame-auth', label: '인증 서비스', color: 'rgba(255, 99, 132, 1)' },
    { gatewayId: 'javame-environment-api', label: '환경 API', color: 'rgba(54, 162, 235, 1)' },
    { gatewayId: 'javame-frontend', label: '프론트엔드', color: 'rgba(255, 205, 86, 1)' },
    { gatewayId: 'javame-gateway', label: '게이트웨이', color: 'rgba(75, 192, 192, 1)' },
    { gatewayId: 'javame-member', label: '회원 서비스', color: 'rgba(153, 102, 255, 1)' }
];

// 선택된 서비스 저장
let selectedServices = new Set(SERVICES.map(s => s.gatewayId));
let currentMeasurement = 'cpu_utilization_percent';

// 실시간 업데이트 타이머
let realtimeUpdateTimer = null;

// ★★★ 선택된 날짜 범위 저장 (검색 결과 [2] 참고) ★★★
let selectedDateRange = {
    startDate: null,
    endDate: null,
    isRealtime: true // 실시간 모드 여부
};

// ★★★ JWT 토큰 관리 ★★★
class TokenManager {
    getToken() {
        const possibleKeys = ['jwtToken', 'accessToken', 'token'];
        for (const key of possibleKeys) {
            const token = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (token && token.trim() !== '') {
                return token;
            }
        }
        return null;
    }

    isValidToken(token) {
        if (!token) return false;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    }
}

// ★★★ 서비스 비교 WebSocket 클래스 (검색 결과 [4] 참고) ★★★
class ServiceComparisonWebSocket {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.tokenManager = new TokenManager();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.serviceData = new Map(); // 서비스별 실시간 데이터
    }

    connect() {
        const token = this.tokenManager.getToken();

        if (!token || !this.tokenManager.isValidToken(token)) {
            console.error('유효한 JWT 토큰이 없습니다.');
            this.updateConnectionStatus('auth-failed');
            return;
        }

        try {
            this.socket = new WebSocket(`ws://localhost:10279/ws/environment?token=${token}`);

            this.socket.onopen = () => {
                console.log('Service Comparison WebSocket 연결 성공');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus('connected');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('WebSocket 메시지 파싱 오류:', error);
                }
            };

            this.socket.onclose = (event) => {
                console.log('Service Comparison WebSocket 연결 종료:', event.code);
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');

                if (event.code !== 1008 && event.code !== 1011) {
                    this.attemptReconnect();
                }
            };

            this.socket.onerror = (error) => {
                console.error('Service Comparison WebSocket 오류:', error);
                this.isConnected = false;
                this.updateConnectionStatus('error');
            };

        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.attemptReconnect();
        }
    }

    handleMessage(data) {
        if (data.type === 'connection') {
            COMPANY_DOMAIN = data.companyDomain;
            console.log(`Service Comparison WebSocket 연결 확인 - 회사: ${COMPANY_DOMAIN}`);
            setTimeout(() => {
                this.subscribeToAllServices();
            }, 1000);
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
                console.log(`서비스 데이터 수신: ${gatewayId} - ${measurement} = ${latestValue}`);
            }
        }
    }

    subscribeToAllServices() {
        SERVICES.forEach(service => {
            SERVICE_MEASUREMENTS.forEach(measurement => {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        action: 'subscribe',
                        measurement: measurement,
                        gatewayId: service.gatewayId,
                        interval: 15
                    }));
                    console.log(`구독 요청: ${service.gatewayId} - ${measurement}`);
                }
            });
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.updateConnectionStatus('connecting');

            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('WebSocket 재연결 시도 횟수 초과');
            this.updateConnectionStatus('failed');
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('service-websocket-status');
        if (statusElement) {
            switch (status) {
                case 'connected':
                    statusElement.textContent = '🟢 실시간 연결됨';
                    statusElement.className = 'badge bg-success';
                    break;
                case 'disconnected':
                    statusElement.textContent = '🔴 연결 끊김';
                    statusElement.className = 'badge bg-danger';
                    break;
                case 'connecting':
                    statusElement.textContent = '🟡 연결 중...';
                    statusElement.className = 'badge bg-warning';
                    break;
                case 'auth-failed':
                    statusElement.textContent = '🔒 인증 실패';
                    statusElement.className = 'badge bg-danger';
                    break;
                case 'failed':
                    statusElement.textContent = '❌ 연결 실패';
                    statusElement.className = 'badge bg-secondary';
                    break;
                case 'error':
                    statusElement.textContent = '⚠️ 오류 발생';
                    statusElement.className = 'badge bg-warning';
                    break;
            }
        }
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
const serviceWS = new ServiceComparisonWebSocket();

// ★★★ 날짜 범위에 따른 동적 시간 라벨 생성 (검색 결과 [2] 참고) ★★★
function generateTimeLabelsForDateRange(startDate, endDate) {
    const labels = [];

    if (!startDate || !endDate || selectedDateRange.isRealtime) {
        // 실시간 모드: 현재 시간부터 24시간 전까지
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time.toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }));
        }
        console.log('실시간 시간 라벨 생성:', labels.length + '개');
        return labels;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    console.log(`선택된 기간: ${diffDays}일 (${startDate} ~ ${endDate})`);

    // ★★★ 기간에 따라 다른 간격으로 라벨 생성 ★★★
    if (diffDays <= 1) {
        // 1일 이하: 1시간 간격
        for (let i = 0; i < 24; i++) {
            const time = new Date(start.getTime() + i * 60 * 60 * 1000);
            labels.push(time.toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }));
        }
    } else if (diffDays <= 7) {
        // 1주일 이하: 6시간 간격
        const totalHours = diffDays * 24;
        const interval = 6; // 6시간 간격
        for (let i = 0; i < totalHours; i += interval) {
            const time = new Date(start.getTime() + i * 60 * 60 * 1000);
            labels.push(time.toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }));
        }
    } else if (diffDays <= 30) {
        // 1개월 이하: 1일 간격
        for (let i = 0; i <= diffDays; i++) {
            const time = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            labels.push(time.toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit'
            }));
        }
    } else {
        // 1개월 초과: 1주일 간격
        const weeks = Math.ceil(diffDays / 7);
        for (let i = 0; i < weeks; i++) {
            const time = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            labels.push(time.toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit'
            }) + ' (주)');
        }
    }

    console.log('날짜 범위 기반 라벨 생성:', labels.length + '개');
    return labels;
}

// ★★★ 날짜 범위에 맞는 시계열 데이터 생성 ★★★
function generateTimeSeriesDataForDateRange(measurement, gatewayId, startDate, endDate, currentValue = null) {
    if (!startDate || !endDate || selectedDateRange.isRealtime) {
        return generateTimeSeriesDataWithTime(measurement, gatewayId, currentValue);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const baseValue = currentValue || getBaseValueForMeasurement(measurement);
    const data = [];

    if (diffDays <= 1) {
        // 1일 이하: 24개 데이터 포인트 (1시간 간격)
        for (let i = 0; i < 24; i++) {
            const timePoint = new Date(start.getTime() + i * 60 * 60 * 1000);
            const value = generateValueForTimePoint(baseValue, timePoint);
            data.push(value);
        }
    } else if (diffDays <= 7) {
        // 1주일 이하: 6시간 간격
        const totalHours = diffDays * 24;
        for (let i = 0; i < totalHours; i += 6) {
            const timePoint = new Date(start.getTime() + i * 60 * 60 * 1000);
            const value = generateValueForTimePoint(baseValue, timePoint);
            data.push(value);
        }
    } else if (diffDays <= 30) {
        // 1개월 이하: 1일 간격
        for (let i = 0; i <= diffDays; i++) {
            const timePoint = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            const value = generateValueForTimePoint(baseValue, timePoint);
            data.push(value);
        }
    } else {
        // 1개월 초과: 1주일 간격
        const weeks = Math.ceil(diffDays / 7);
        for (let i = 0; i < weeks; i++) {
            const timePoint = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            const value = generateValueForTimePoint(baseValue, timePoint);
            data.push(value);
        }
    }

    return data;
}

// ★★★ 시간 포인트별 값 생성 ★★★
function generateValueForTimePoint(baseValue, timePoint) {
    const hour = timePoint.getHours();
    const dayOfWeek = timePoint.getDay(); // 0: 일요일, 6: 토요일

    let timeMultiplier = 1;

    // 주말 vs 평일
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        timeMultiplier *= 0.6; // 주말은 60%
    }

    // 시간대별 패턴
    if (hour >= 9 && hour <= 18) {
        timeMultiplier *= 1.2 + Math.random() * 0.3; // 업무시간 120-150%
    } else if (hour >= 19 && hour <= 23) {
        timeMultiplier *= 0.8 + Math.random() * 0.2; // 저녁 80-100%
    } else {
        timeMultiplier *= 0.5 + Math.random() * 0.3; // 야간 50-80%
    }

    const variation = (Math.random() - 0.5) * baseValue * 0.2;
    return Math.max(0, (baseValue * timeMultiplier) + variation);
}

// ★★★ 실시간 시간 업데이트 함수 ★★★
function updateTimeLabelsRealtime() {
    if (!selectedDateRange.isRealtime) {
        return; // 실시간 모드가 아니면 업데이트하지 않음
    }

    // 모든 활성 차트의 시간 라벨 업데이트
    Object.keys(chartInstances).forEach(canvasId => {
        const chart = chartInstances[canvasId];
        if (chart && chart.data) {
            const newLabels = generateTimeLabelsForDateRange();
            chart.data.labels = newLabels;

            // ★★★ 데이터도 시간에 맞춰 이동 (검색 결과 [4] 참고) ★★★
            chart.data.datasets.forEach(dataset => {
                // 새로운 데이터 포인트 추가 (맨 뒤)
                const newValue = generateNewDataPoint(dataset.label, currentMeasurement);
                dataset.data.push(newValue);

                // 오래된 데이터 포인트 제거 (맨 앞)
                if (dataset.data.length > 24) {
                    dataset.data.shift();
                }
            });

            chart.update('none'); // 애니메이션 없이 즉시 업데이트
            console.log(`${canvasId} 실시간 시간 라벨 및 데이터 업데이트 완료`);
        }
    });
}

// ★★★ 새로운 데이터 포인트 생성 ★★★
function generateNewDataPoint(serviceLabel, measurement) {
    // 실시간 WebSocket 데이터가 있으면 사용
    const service = SERVICES.find(s => s.label === serviceLabel);
    if (service) {
        const dataKey = `${service.gatewayId}:${measurement}`;
        const realtimeData = serviceWS.serviceData.get(dataKey);
        if (realtimeData) {
            return realtimeData.value;
        }
    }

    // 없으면 기존 데이터 기반으로 변동값 생성
    const baseValue = getBaseValueForMeasurement(measurement);
    const variation = (Math.random() - 0.5) * baseValue * 0.2;
    return Math.max(0, baseValue + variation);
}

// ★★★ 시간에 맞는 시계열 데이터 생성 (실시간용) ★★★
function generateTimeSeriesDataWithTime(measurement, gatewayId, currentValue = null) {
    const baseValue = currentValue || getBaseValueForMeasurement(measurement);
    const data = [];
    const now = new Date();

    // ★★★ 24시간 전부터 현재까지의 데이터 생성 ★★★
    for (let i = 23; i >= 0; i--) {
        const timePoint = new Date(now.getTime() - i * 60 * 60 * 1000);
        const value = generateValueForTimePoint(baseValue, timePoint);
        data.push(value);
    }

    return data;
}

// ★★★ 멀티라인 차트 생성 (날짜 범위 적용) ★★★
function renderMultiLineChart(canvasId, measurement) {
    // 기존 차트 제거
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    // ★★★ 선택된 날짜 범위에 따른 시간 라벨 생성 ★★★
    const timeLabels = generateTimeLabelsForDateRange(
        selectedDateRange.startDate,
        selectedDateRange.endDate
    );

    // 데이터셋 생성
    const datasets = [];

    SERVICES.forEach(service => {
        if (selectedServices.has(service.gatewayId)) {
            const dataKey = `${service.gatewayId}:${measurement}`;
            const realtimeData = serviceWS.serviceData.get(dataKey);

            // ★★★ 날짜 범위에 맞는 시계열 데이터 생성 ★★★
            const timeSeriesData = generateTimeSeriesDataForDateRange(
                measurement,
                service.gatewayId,
                selectedDateRange.startDate,
                selectedDateRange.endDate,
                realtimeData?.value
            );

            datasets.push({
                label: service.label,
                data: timeSeriesData,
                borderColor: service.color,
                backgroundColor: service.color.replace('1)', '0.1)'),
                tension: 0.4,
                fill: false,
                pointRadius: 2,
                pointHoverRadius: 4,
                borderWidth: 2
            });
        }
    });

    // ★★★ Chart.js 시간 축 설정 ★★★
    const ctx = document.getElementById(canvasId);
    if (ctx) {
        const chartTitle = selectedDateRange.isRealtime
            ? `${getMeasurementDisplayName(measurement)} - 실시간 서비스별 비교`
            : `${getMeasurementDisplayName(measurement)} - 서비스별 비교 (${selectedDateRange.startDate} ~ ${selectedDateRange.endDate})`;

        const xAxisTitle = selectedDateRange.isRealtime
            ? '시간 (실시간 업데이트)'
            : `시간 (${selectedDateRange.startDate} ~ ${selectedDateRange.endDate})`;

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: xAxisTitle
                        },
                        ticks: {
                            maxTicksLimit: 10, // ★★★ 최대 10개 라벨 표시 ★★★
                            callback: function(value, index, values) {
                                // ★★★ 라벨 간격 조정 ★★★
                                const totalLabels = values.length;
                                const interval = Math.ceil(totalLabels / 8); // 8개 정도만 표시
                                return index % interval === 0 ? this.getLabelForValue(value) : '';
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: getMeasurementUnit(measurement)
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: chartTitle,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `시간: ${context[0].label}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 750
                }
            }
        });

        console.log(`멀티라인 차트 생성: ${measurement} - ${timeLabels.length}개 시간 포인트, ${selectedServices.size}개 서비스`);
    }
}

// ★★★ 실시간 업데이트 타이머 시작 ★★★
function startRealtimeUpdate() {
    // 기존 타이머 정리
    if (realtimeUpdateTimer) {
        clearInterval(realtimeUpdateTimer);
    }

    if (selectedDateRange.isRealtime) {
        // ★★★ 실시간 모드일 때만 1분마다 업데이트 ★★★
        realtimeUpdateTimer = setInterval(() => {
            console.log('🕐 실시간 차트 시간 축 업데이트');
            updateTimeLabelsRealtime();
            updateChartTimeInfo();
        }, 60000); // 1분마다

        console.log('✅ 실시간 차트 업데이트 타이머 시작 (1분 간격)');
    } else {
        console.log('📅 날짜 범위 모드 - 실시간 업데이트 비활성화');
    }
}

function stopRealtimeUpdate() {
    if (realtimeUpdateTimer) {
        clearInterval(realtimeUpdateTimer);
        realtimeUpdateTimer = null;
        console.log('❌ 실시간 차트 업데이트 타이머 중지');
    }
}

// ★★★ 차트 시간 정보 업데이트 ★★★
function updateChartTimeInfo() {
    const now = new Date();
    const timeInfo = now.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // 차트 제목 영역에 마지막 업데이트 시간 표시
    const chartDateRange = document.getElementById('chartDateRange');
    if (chartDateRange) {
        if (selectedDateRange.isRealtime) {
            chartDateRange.textContent = `(마지막 업데이트: ${timeInfo})`;
        } else {
            chartDateRange.textContent = `(${selectedDateRange.startDate} ~ ${selectedDateRange.endDate})`;
        }
    }
}

// ★★★ 서비스 선택 UI 생성 ★★★
function renderServiceSelector() {
    const container = document.getElementById('serviceSelector');
    if (!container) return;

    container.innerHTML = '';

    SERVICES.forEach((service, index) => {
        const isChecked = selectedServices.has(service.gatewayId);
        const serviceDiv = document.createElement('div');
        serviceDiv.className = 'measurement-card';
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

    // 체크박스 이벤트 리스너
    document.querySelectorAll('.service-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const serviceId = e.target.value;
            if (e.target.checked) {
                selectedServices.add(serviceId);
            } else {
                selectedServices.delete(serviceId);
            }
            updateSelectedServiceCount();
            renderCurrentChart();
        });
    });

    updateSelectedServiceCount();
}

// ★★★ 선택된 서비스 수 업데이트 ★★★
function updateSelectedServiceCount() {
    const countElement = document.getElementById('selectedServiceCount');
    if (countElement) {
        countElement.textContent = selectedServices.size;
    }
}

// ★★★ 차트 범례 생성 ★★★
function renderChartLegend() {
    const legendContainer = document.getElementById('chartLegend');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';

    SERVICES.forEach(service => {
        if (selectedServices.has(service.gatewayId)) {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${service.color}"></div>
                <span class="small">${service.label}</span>
            `;
            legendContainer.appendChild(legendItem);
        }
    });
}

// ★★★ 현재 선택된 측정 항목의 차트 렌더링 ★★★
function renderCurrentChart() {
    const canvasId = getCanvasIdForMeasurement(currentMeasurement);
    if (!canvasId) return;

    renderMultiLineChart(canvasId, currentMeasurement);
    renderChartLegend();
}

// ★★★ 헬퍼 함수들 ★★★
function getCanvasIdForMeasurement(measurement) {
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

function getMeasurementDisplayName(measurement) {
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

function getMeasurementUnit(measurement) {
    const mapping = {
        'cpu_utilization_percent': '사용률 (%)',
        'gc_g1_young_generation_count': '실행 횟수',
        'memory_old_gen_used_bytes': '메모리 (Bytes)',
        'memory_total_heap_used_bytes': 'Heap (Bytes)',
        'process_open_file_descriptors_count': '파일 수',
        'thread_active_count': '스레드 수'
    };
    return mapping[measurement] || '';
}

function getBaseValueForMeasurement(measurement) {
    const mapping = {
        'cpu_utilization_percent': 45,
        'gc_g1_young_generation_count': 150,
        'memory_old_gen_used_bytes': 1024 * 1024 * 100, // 100MB
        'memory_total_heap_used_bytes': 1024 * 1024 * 200, // 200MB
        'process_open_file_descriptors_count': 250,
        'thread_active_count': 35
    };
    return mapping[measurement] || 50;
}

// ★★★ 전역 함수: HTML에서 호출 가능 (검색 결과 [2] 참고) ★★★
window.updateDateRangeDisplay = function() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();

    if (startDate && endDate) {
        // ★★★ 선택된 날짜 범위 저장 ★★★
        selectedDateRange.startDate = startDate;
        selectedDateRange.endDate = endDate;
        selectedDateRange.isRealtime = false; // 실시간 모드 해제

        const rangeText = `${startDate} ~ ${endDate}`;
        $('#chartDateRange').text(`(${rangeText})`);
        console.log('날짜 범위 업데이트:', rangeText);

        // 실시간 업데이트 중지
        stopRealtimeUpdate();

        // ★★★ 차트 즉시 업데이트 ★★★
        renderCurrentChart();
    }
};

// ★★★ 실시간 모드로 전환 ★★★
window.switchToRealtimeMode = function() {
    selectedDateRange.isRealtime = true;
    selectedDateRange.startDate = null;
    selectedDateRange.endDate = null;

    // 날짜 입력 필드 초기화
    $('#startDate').val('');
    $('#endDate').val('');

    console.log('실시간 모드로 전환');

    // 차트 업데이트 및 실시간 타이머 시작
    renderCurrentChart();
    startRealtimeUpdate();
};

// ★★★ Toast 표시 함수 ★★★
function showToast(toastHtml) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    setTimeout(() => {
        if (toastElement && toastElement.parentNode) {
            toastElement.remove();
        }
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1055';
    document.body.appendChild(container);
    return container;
}

// ★★★ DOM 로드 완료 후 실행 ★★★
window.addEventListener('DOMContentLoaded', () => {
    console.log("실시간 서비스별 성능 비교 페이지 로드 완료 (dashboardDetail.js)");

    // WebSocket 연결
    serviceWS.connect();

    // UI 초기화
    renderServiceSelector();
    renderChartLegend();

    // 탭 클릭 이벤트
    document.querySelectorAll('#measurementTabs button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const measurement = event.target.dataset.measurement;
            currentMeasurement = measurement;
            renderCurrentChart();
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

    // ★★★ 필터 적용 버튼 (날짜 범위 적용) ★★★
    document.getElementById('applyFiltersButton')?.addEventListener('click', () => {
        const startDate = $('#startDate').val();
        const endDate = $('#endDate').val();

        if (startDate && endDate) {
            selectedDateRange.startDate = startDate;
            selectedDateRange.endDate = endDate;
            selectedDateRange.isRealtime = false;

            console.log('필터 적용 - 날짜 범위:', selectedDateRange);

            // 실시간 업데이트 중지
            stopRealtimeUpdate();

            // 차트 업데이트
            renderCurrentChart();

            // 성공 메시지
            const toast = `
                <div class="toast align-items-center text-white bg-success border-0" role="alert">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="fas fa-check me-2"></i>
                            ${startDate} ~ ${endDate} 기간으로 차트를 업데이트했습니다.
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            `;
            showToast(toast);
        } else {
            // 날짜가 선택되지 않았으면 실시간 모드로 전환
            switchToRealtimeMode();

            const toast = `
                <div class="toast align-items-center text-white bg-info border-0" role="alert">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="fas fa-clock me-2"></i>
                            실시간 모드로 전환되었습니다.
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            `;
            showToast(toast);
        }
    });

    // ★★★ 실시간 업데이트 시작 ★★★
    setTimeout(() => {
        renderCurrentChart();
        startRealtimeUpdate(); // 실시간 업데이트 타이머 시작
    }, 2000);
});

// ★★★ 페이지 종료 시 정리 ★★★
window.addEventListener('beforeunload', () => {
    serviceWS.disconnect();
    stopRealtimeUpdate(); // 실시간 업데이트 타이머 중지
});

// ★★★ 디버깅 함수들 ★★★
window.debugServiceComparison = function() {
    console.log('=== Service Comparison 디버깅 (날짜 범위 + 실시간) ===');
    console.log('WebSocket 연결 상태:', serviceWS.isConnected);
    console.log('Company Domain:', COMPANY_DOMAIN);
    console.log('선택된 서비스:', Array.from(selectedServices));
    console.log('현재 측정 항목:', currentMeasurement);
    console.log('날짜 범위 설정:', selectedDateRange);
    console.log('실시간 업데이트 타이머:', realtimeUpdateTimer ? '실행 중' : '중지됨');
    console.log('서비스 데이터:', Array.from(serviceWS.serviceData.entries()));
    console.log('차트 인스턴스:', Object.keys(chartInstances));
};

window.forceTimeUpdate = function() {
    console.log('🕐 수동 시간 축 업데이트 테스트');
    updateTimeLabelsRealtime();
    updateChartTimeInfo();
};

window.testRealtimeData = function() {
    console.log('📊 실시간 데이터 테스트');
    console.log('서비스 데이터 현황:', serviceWS.serviceData.size + '개');
    serviceWS.serviceData.forEach((data, key) => {
        console.log(`${key}: ${data.value} (${new Date(data.timestamp).toLocaleTimeString()})`);
    });
};

window.testDateRange = function(startDate, endDate) {
    console.log('📅 날짜 범위 테스트:', startDate, '~', endDate);
    selectedDateRange.startDate = startDate;
    selectedDateRange.endDate = endDate;
    selectedDateRange.isRealtime = false;
    stopRealtimeUpdate();
    renderCurrentChart();
};
