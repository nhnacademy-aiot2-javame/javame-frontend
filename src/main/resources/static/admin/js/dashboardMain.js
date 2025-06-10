// dashboardMain.js - 적극적 데이터 재수집 버전
import {
    getServiceCount,
    getSensorCount,
    getServerCount,
    getOutboundTraffic,
} from './iotSensorApi.js';

import {
    createGaugeChart,
    updateGaugeChart
} from './chartUtils.js';

import {
    fetchWithAuth
} from '/index/js/auth.js';

// 차트 인스턴스 관리 객체
const chartInstances = {};

// 동적 companyDomain
let COMPANY_DOMAIN = null;

// ★★★ 적극적 재수집이 포함된 WebSocket 관리 객체 ★★★
class DashboardWebSocket {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.subscriptions = new Map();
        this.isConnected = false;
        this.companyDomain = null;
        this.refreshTimer = null;

        // ★★★ 데이터 관리 ★★★
        this.chartData = new Map(); // 차트별 최신 데이터
        this.dataBuffer = new Map(); // 실시간 데이터 버퍼
        this.maxBufferSize = 10;

        // ★★★ 필수 측정값 (4개) ★★★
        this.requiredCharts = [
            { id: 'gauge1', measurement: 'usage_user', gatewayId: 'cpu', title: 'CPU 사용률', unit: '%' },
            { id: 'gauge2', measurement: 'used_percent', gatewayId: 'mem', title: '메모리 사용량', unit: '%' },
            { id: 'gauge3', measurement: 'used_percent', gatewayId: 'disk', title: '디스크 사용량', unit: '%' },
            { id: 'gauge4', measurement: 'temp_input', gatewayId: 'sensors', title: '서버 온도', unit: '°C' }
        ];

        // ★★★ 적극적 재수집 로직 ★★★
        this.missingDataRetry = new Map(); // 누락된 데이터 재시도 관리
        this.maxRetryAttempts = 5; // 최대 재시도 횟수
        this.retryIntervals = [2000, 4000, 8000, 16000, 32000]; // exponential backoff (2, 4, 8, 16, 32초)
        this.activeRetryTimers = new Map(); // 활성 재시도 타이머

        // ★★★ 초기화 상태 ★★★
        this.isInitialized = false;
        this.initializationTimer = null;
        this.initializationTimeout = 15000; // 15초 타임아웃

        // ★★★ 동적 서버 관리 ★★★
        this.selectedServer = 'all';
        this.serverList = [];
        this.connectionStatus = {
            server: 'unknown',
            sensor: 'unknown',
            service: 'unknown'
        };
    }

    connect() {
        try {
            const token = sessionStorage.getItem('accessToken');
            if (!token) {
                console.error('JWT 토큰을 찾을 수 없습니다.');
                return;
            }

            // ★★★ 모든 차트를 로딩 상태로 초기화 ★★★
            this.initializeLoadingCharts();

            this.socket = new WebSocket(`wss://javame.live/api/v1/ws/environment?token=${token}`);

            this.socket.onopen = () => {
                console.log('Dashboard WebSocket 연결 성공');
                this.isConnected = true;
                this.reconnectAttempts = 0;
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
                console.log('Dashboard WebSocket 연결 종료:', event.code);
                this.isConnected = false;
                this.stopRefreshTimer();
                this.clearAllRetryTimers();
                this.attemptReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('Dashboard WebSocket 오류:', error);
                this.isConnected = false;
                this.stopRefreshTimer();
                this.clearAllRetryTimers();
            };

        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.attemptReconnect();
        }
    }

    // ★★★ 로딩 차트 초기화 ★★★
    initializeLoadingCharts() {
        this.requiredCharts.forEach(chart => {
            if (!chartInstances[chart.id]) {
                chartInstances[chart.id] = createGaugeChart(
                    chart.id,
                    0,
                    '연결중...',
                    chart.title
                );
                console.log(`🔄 로딩 차트 생성: ${chart.title}`);
            }
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('WebSocket 재연결 시도 횟수 초과.');
            this.showConnectionError();
        }
    }

    showConnectionError() {
        this.requiredCharts.forEach(chart => {
            if (chartInstances[chart.id]) {
                updateGaugeChart(chartInstances[chart.id], 0, '연결실패', false);
            }
        });
    }

    handleMessage(data) {
        console.log('WebSocket 메시지 수신:', data.type);

        switch (data.type) {
            case 'connection':
                this.handleConnectionMessage(data);
                break;
            case 'subscribe':
                console.log('구독 성공:', data.measurement, data.gatewayId);
                break;
            case 'realtime':
                this.handleRealtimeData(data);
                break;
            default:
                console.log('알 수 없는 메시지 타입:', data.type);
        }
    }

    handleConnectionMessage(data) {
        let cleanDomain = data.companyDomain;
        if (cleanDomain && cleanDomain.endsWith('.com')) {
            cleanDomain = cleanDomain.substring(0, cleanDomain.length - 4);
        }

        this.companyDomain = cleanDomain;
        COMPANY_DOMAIN = cleanDomain;

        const serverTitle = `${cleanDomain}.com`;
        console.log(`WebSocket 연결 확인 - 회사: ${this.companyDomain}`);

        const mainTitle = document.getElementById('totalDomain');
        if (mainTitle) {
            mainTitle.textContent = serverTitle;
        }

        // ★★★ 서버 목록 로드 ★★★
        setTimeout(() => {
            this.loadServerList();
        }, 500);

        // 서비스/센서 카운트 업데이트
        setTimeout(() => {
            updateServiceAndSensorCount();
        }, 1000);

        // ★★★ 구독 시작 ★★★
        setTimeout(() => {
            this.startSubscriptions();
            this.startInitializationTimer();
        }, 1000);
    }

    // ★★★ 서버 목록 로드 (단순화) ★★★
    async loadServerList() {
        try {
            const url = '/rule/servers/cp/companyDomain';
            const serverResponse = await fetchWithAuth(url);
            const serverData = await serverResponse.json();

            this.serverList = [
                {
                    id: 'all',
                    name: '전체 서버',
                    status: 'online',
                    description: '모든 서버의 종합 상태'
                }
            ];

            serverData.forEach((server, index) => {
                const autoIndex = index + 1;
                this.serverList.push({
                    id: `server-${autoIndex}`,
                    name: `서버 ${autoIndex}`,
                    status: 'online',
                    ip: server.iphost,
                    serverNo: server.serverNo,
                    autoIndex: autoIndex,
                    description: `서버 ${autoIndex} (${server.iphost})`
                });
            });

            this.renderServerTabs();

        } catch (error) {
            console.error('서버 목록 로드 실패:', error);
            this.serverList = [
                { id: 'all', name: '전체 서버', status: 'online', description: '모든 서버의 종합 상태' },
                { id: 'server-1', name: '서버 1', status: 'online', description: '메인 서버' }
            ];
            this.renderServerTabs();
        }
    }

    // ★★★ 서버 탭 렌더링 (단순화) ★★★
    renderServerTabs() {
        const tabsContainer = document.getElementById('serverTabs');
        const contentContainer = document.getElementById('serverTabContent');

        if (!tabsContainer || !contentContainer) return;

        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        this.serverList.forEach((server, index) => {
            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';

            const isActive = index === 0 ? 'active' : '';
            const iconClass = server.id === 'all' ? 'fas fa-globe' : 'fas fa-server';

            tabItem.innerHTML = `
                <button class="nav-link ${isActive}" 
                        id="${server.id}-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#${server.id}" 
                        type="button" 
                        role="tab" 
                        data-server-id="${server.id}">
                    <i class="${iconClass} me-2"></i>
                    ${server.name}
                    <span class="server-status-indicator online"></span>
                    ${server.id === 'all' ? `<span class="badge bg-primary server-info-badge">${this.serverList.length - 1}</span>` : ''}
                </button>
            `;

            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
            tabContent.id = server.id;

            if (server.id === 'all') {
                tabContent.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <small class="text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                ${server.description}
                            </small>
                        </div>
                        <div class="col-md-6 text-end">
                            <span class="badge bg-success me-2">
                                <i class="fas fa-check-circle me-1"></i>정상 운영중
                            </span>
                        </div>
                    </div>
                `;
            } else {
                tabContent.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <small class="text-muted">
                                <i class="fas fa-server me-1"></i>
                                ${server.description}
                            </small>
                        </div>
                        <div class="col-md-6 text-end">
                            <span class="badge bg-success me-2">
                                <i class="fas fa-check-circle me-1"></i>온라인
                            </span>
                        </div>
                    </div>
                `;
            }

            tabsContainer.appendChild(tabItem);
            contentContainer.appendChild(tabContent);
        });

        console.log('서버 탭 렌더링 완료:', this.serverList.length, '개 서버');
    }

    // ★★★ 초기화 타이머 ★★★
    startInitializationTimer() {
        if (this.initializationTimer) {
            clearTimeout(this.initializationTimer);
        }

        this.initializationTimer = setTimeout(() => {
            if (!this.isInitialized) {
                console.log('🕐 초기화 타임아웃 - 누락된 데이터 적극 재수집 시작');
                this.startAggressiveRetryForMissingData();
                this.forceInitializeCharts();
            }
        }, this.initializationTimeout);
    }

    // ★★★ 누락된 데이터 적극 재수집 ★★★
    startAggressiveRetryForMissingData() {
        const missingCharts = this.requiredCharts.filter(chart => {
            const dataKey = `${chart.measurement}:${chart.gatewayId}`;
            return !this.chartData.has(dataKey);
        });

        if (missingCharts.length > 0) {
            console.log(`🔄 누락된 데이터 적극 재수집 시작: ${missingCharts.map(c => c.title).join(', ')}`);

            missingCharts.forEach(chart => {
                this.startRetryForChart(chart);
            });
        }
    }

    // ★★★ 특정 차트에 대한 재시도 시작 ★★★
    startRetryForChart(chart) {
        const dataKey = `${chart.measurement}:${chart.gatewayId}`;

        // 기존 재시도 타이머가 있으면 취소
        if (this.activeRetryTimers.has(dataKey)) {
            clearTimeout(this.activeRetryTimers.get(dataKey));
        }

        // 재시도 횟수 초기화
        if (!this.missingDataRetry.has(dataKey)) {
            this.missingDataRetry.set(dataKey, 0);
        }

        this.scheduleRetryForChart(chart, dataKey);
    }

    // ★★★ 차트 재시도 스케줄링 (exponential backoff) ★★★
    scheduleRetryForChart(chart, dataKey) {
        const currentAttempt = this.missingDataRetry.get(dataKey) || 0;

        if (currentAttempt >= this.maxRetryAttempts) {
            console.warn(`❌ ${chart.title} 최대 재시도 횟수 초과`);
            return;
        }

        const delay = this.retryIntervals[currentAttempt] || 32000; // 최대 32초

        console.log(`⏰ ${chart.title} 재시도 예약: ${delay/1000}초 후 (${currentAttempt + 1}/${this.maxRetryAttempts})`);

        const timerId = setTimeout(() => {
            this.retrySubscriptionForChart(chart, dataKey);
        }, delay);

        this.activeRetryTimers.set(dataKey, timerId);
    }

    // ★★★ 차트 재구독 실행 ★★★
    retrySubscriptionForChart(chart, dataKey) {
        console.log(`🔄 ${chart.title} 재구독 실행`);

        // 재시도 횟수 증가
        const currentAttempt = this.missingDataRetry.get(dataKey) || 0;
        this.missingDataRetry.set(dataKey, currentAttempt + 1);

        // 재구독 실행
        this.subscribe(chart.measurement, chart.gatewayId);

        // 다음 재시도 스케줄링 (데이터가 아직 없으면)
        setTimeout(() => {
            if (!this.chartData.has(dataKey)) {
                this.scheduleRetryForChart(chart, dataKey);
            } else {
                console.log(`✅ ${chart.title} 재시도 성공으로 중단`);
                this.activeRetryTimers.delete(dataKey);
            }
        }, 3000); // 3초 후 확인
    }

    // ★★★ 모든 재시도 타이머 정리 ★★★
    clearAllRetryTimers() {
        this.activeRetryTimers.forEach((timerId, dataKey) => {
            clearTimeout(timerId);
        });
        this.activeRetryTimers.clear();
        this.missingDataRetry.clear();
        console.log('🧹 모든 재시도 타이머 정리 완료');
    }

    // ★★★ 강제 초기화 ★★★
    forceInitializeCharts() {
        this.isInitialized = true;

        this.requiredCharts.forEach(chart => {
            const dataKey = `${chart.measurement}:${chart.gatewayId}`;
            const latestData = this.chartData.get(dataKey);

            if (latestData) {
                const converted = this.convertValueForGauge(latestData.value, chart.unit);
                updateGaugeChart(chartInstances[chart.id], converted.gaugeDisplayValue, converted.textDisplay, true);
                console.log(`✅ 초기화: ${chart.title} = ${converted.textDisplay}`);
            } else {
                updateGaugeChart(chartInstances[chart.id], 0, '수집중...', false);
                console.log(`🔄 초기화: ${chart.title} = 수집중... (재시도 진행중)`);
            }
        });

        // 정기 새로고침 시작
        this.startRefreshTimer();
        console.log('🎉 대시보드 초기화 완료!');
    }

    // ★★★ 실시간 데이터 처리 (재시도 중단 로직 포함) ★★★
    handleRealtimeData(data) {
        const { measurement, gatewayId } = data;

        if (!measurement || !gatewayId) return;

        let value = null;
        let hasValidData = false;

        if (data.data && data.data.length > 0) {
            const latestData = data.data[data.data.length - 1];
            value = latestData.value;
            hasValidData = true;
        }

        const dataKey = `${measurement}:${gatewayId}`;

        // ★★★ 데이터 수신 시 재시도 중단 ★★★
        if (hasValidData && this.activeRetryTimers.has(dataKey)) {
            console.log(`✅ ${measurement} 데이터 수신으로 재시도 중단`);
            clearTimeout(this.activeRetryTimers.get(dataKey));
            this.activeRetryTimers.delete(dataKey);
            this.missingDataRetry.delete(dataKey);
        }

        // ★★★ 데이터 버퍼 관리 ★★★
        if (hasValidData) {
            // 최신 데이터 저장
            this.chartData.set(dataKey, {
                measurement,
                gatewayId,
                value,
                timestamp: Date.now()
            });

            // 버퍼에 추가 (크기 제한)
            if (!this.dataBuffer.has(dataKey)) {
                this.dataBuffer.set(dataKey, []);
            }

            const buffer = this.dataBuffer.get(dataKey);
            buffer.push({ value, timestamp: Date.now() });

            if (buffer.length > this.maxBufferSize) {
                buffer.shift();
            }

            console.log(`📊 데이터 수신: ${measurement} = ${value}`);

            // ★★★ 즉시 차트 업데이트 ★★★
            if (this.isInitialized) {
                this.updateSingleChart(dataKey);
            } else {
                this.checkInitializationComplete();
            }
        }
    }

    // ★★★ 초기화 완료 확인 ★★★
    checkInitializationComplete() {
        const collectedCount = this.chartData.size;
        const requiredCount = this.requiredCharts.length;

        console.log(`📊 데이터 수집 상태: ${collectedCount}/${requiredCount}`);

        if (collectedCount >= requiredCount) {
            console.log('🎯 모든 필수 데이터 수집 완료!');
            this.forceInitializeCharts();

            if (this.initializationTimer) {
                clearTimeout(this.initializationTimer);
                this.initializationTimer = null;
            }

            // 모든 재시도 중단
            this.clearAllRetryTimers();
        }
    }

    // ★★★ 개별 차트 업데이트 ★★★
    updateSingleChart(dataKey) {
        const chartConfig = this.requiredCharts.find(chart =>
            `${chart.measurement}:${chart.gatewayId}` === dataKey
        );

        if (!chartConfig) return;

        const latestData = this.chartData.get(dataKey);
        if (!latestData) return;

        const converted = this.convertValueForGauge(latestData.value, chartConfig.unit);

        if (chartInstances[chartConfig.id]) {
            updateGaugeChart(chartInstances[chartConfig.id], converted.gaugeDisplayValue, converted.textDisplay, true);
            console.log(`🔄 차트 업데이트: ${chartConfig.title} = ${converted.textDisplay}`);
        }
    }

    // ★★★ 구독 시작 ★★★
    startSubscriptions() {
        console.log('📡 모든 지표 구독 시작...');

        this.requiredCharts.forEach(chart => {
            this.subscribe(chart.measurement, chart.gatewayId);
        });
    }

    subscribe(measurement, gatewayId) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket이 연결되지 않았습니다.');
            return;
        }

        const subscribeMessage = {
            action: 'subscribe',
            measurement: measurement,
            gatewayId: gatewayId,
            interval: 3 // ★★★ 3초 간격으로 더 단축 ★★★
        };

        this.socket.send(JSON.stringify(subscribeMessage));
        console.log(`📡 구독 요청: ${measurement} (${gatewayId}) - 3초 간격`);
    }

    // ★★★ 정기 새로고침 ★★★
    startRefreshTimer() {
        this.stopRefreshTimer();

        this.refreshTimer = setInterval(() => {
            console.log('🔄 정기 새로고침 시작');
            this.refreshAllCharts();

            // ★★★ 정기 새로고침 시에도 누락된 데이터 확인 ★★★
            this.checkForMissingDataAndRetry();
        }, 30000); // 30초마다

        console.log('⏰ 30초 정기 새로고침 타이머 시작');
    }

    // ★★★ 누락된 데이터 확인 및 재시도 ★★★
    checkForMissingDataAndRetry() {
        const missingCharts = this.requiredCharts.filter(chart => {
            const dataKey = `${chart.measurement}:${chart.gatewayId}`;
            return !this.chartData.has(dataKey);
        });

        if (missingCharts.length > 0) {
            console.log(`🔍 정기 점검: 누락된 데이터 발견 ${missingCharts.map(c => c.title).join(', ')}`);
            missingCharts.forEach(chart => {
                this.startRetryForChart(chart);
            });
        }
    }

    refreshAllCharts() {
        let updateCount = 0;

        this.requiredCharts.forEach(chart => {
            const dataKey = `${chart.measurement}:${chart.gatewayId}`;
            const latestData = this.chartData.get(dataKey);

            if (latestData) {
                const converted = this.convertValueForGauge(latestData.value, chart.unit);
                updateGaugeChart(chartInstances[chart.id], converted.gaugeDisplayValue, converted.textDisplay, false);
                updateCount++;
            }
        });

        console.log(`✅ 정기 새로고침 완료: ${updateCount}개 차트 업데이트`);
    }

    stopRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // ★★★ 연결 상태 업데이트 ★★★
    updateConnectionStatus(type, status) {
        this.connectionStatus[type] = status;
        this.renderConnectionStatus();
    }

    renderConnectionStatus() {
        const statusElements = {
            server: document.getElementById('serverConnectionStatus'),
            sensor: document.getElementById('sensorConnectionStatus'),
            service: document.getElementById('serviceConnectionStatus')
        };

        Object.entries(this.connectionStatus).forEach(([type, status]) => {
            const element = statusElements[type];
            if (!element) return;

            let badgeClass, text, icon;

            switch (status) {
                case 'connected':
                    badgeClass = 'bg-success-status';
                    text = '연결 정상';
                    icon = 'fa-check-circle';
                    break;
                case 'error':
                    badgeClass = 'bg-danger-status';
                    text = '연결 실패';
                    icon = 'fa-times-circle';
                    break;
                default:
                    badgeClass = 'bg-secondary-status';
                    text = '확인중...';
                    icon = 'fa-circle';
            }

            element.className = `badge ${badgeClass}`;
            element.innerHTML = `<i class="fas ${icon} me-1"></i>${text}`;
        });
    }

    convertValueForGauge(value, unit) {
        let gaugeDisplayValue = 0;
        let textDisplay = '데이터없음';

        if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
            if (unit === '%') {
                gaugeDisplayValue = Math.max(0, Math.min(100, value));
                textDisplay = `${value.toFixed(1)}%`;
            } else if (unit === '°C') {
                gaugeDisplayValue = Math.max(0, Math.min(100, value));
                textDisplay = `${value.toFixed(1)}°C`;
            } else {
                gaugeDisplayValue = Math.max(0, Math.min(100, value));
                textDisplay = `${value.toFixed(1)}${unit || ''}`;
            }
        }

        return { gaugeDisplayValue, textDisplay };
    }

    disconnect() {
        this.stopRefreshTimer();
        this.clearAllRetryTimers();

        if (this.initializationTimer) {
            clearTimeout(this.initializationTimer);
            this.initializationTimer = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.isConnected = false;
        console.log('WebSocket 연결 해제');
    }

    // ★★★ 디버깅 함수 ★★★
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            isConnected: this.isConnected,
            chartDataCount: this.chartData.size,
            missingDataRetry: Object.fromEntries(this.missingDataRetry),
            activeRetryTimers: this.activeRetryTimers.size,
            bufferSizes: Array.from(this.dataBuffer.entries()).map(([key, buffer]) => ({
                key,
                size: buffer.length
            })),
            serverList: this.serverList.length,
            connectionStatus: this.connectionStatus
        };
    }
}

// ★★★ 전역 WebSocket 인스턴스 ★★★
const dashboardWS = new DashboardWebSocket();

// ★★★ 유틸리티 함수들 (기존과 동일) ★★★
function checkAuthStatus() {
    if (window.location.pathname.includes('/auth/login')) {
        return false;
    }

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        console.warn('인증 토큰이 없습니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/auth/login';
        return false;
    }
    return true;
}

async function loadWatchAlarmData() {
    try {
        const result = await fetchWithAuth('/warnify/list/companyDomain?page=1&size=100');
        const json = await result.json();

        const statusCounts = json.content.reduce((acc, item) => {
            const status = item.resolve || '데이터부족';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        updateWatchAlarmCard({
            resolved: statusCounts['해결'] || 0,
            unresolved: statusCounts['미해결'] || 0,
            noData: statusCounts['데이터부족'] || 0
        });

    } catch (error) {
        console.error('Watch Alarm 데이터 로드 실패:', error);
        updateWatchAlarmCard({ resolved: 0, unresolved: 0, noData: 1 });
    }
}

function updateWatchAlarmCard(counts) {
    const elements = {
        resolved: document.getElementById('alarm안정Count'),
        unresolved: document.getElementById('alarm발생Count'),
        noData: document.getElementById('alarm데이터부족Count')
    };

    if (elements.resolved) elements.resolved.textContent = counts.resolved;
    if (elements.unresolved) elements.unresolved.textContent = counts.unresolved;
    if (elements.noData) elements.noData.textContent = counts.noData;
}

async function updateServiceAndSensorCount() {
    try {
        const [serviceCount, sensorCount, serverCount, trafficData] = await Promise.all([
            getServiceCount(),
            getSensorCount(),
            getServerCount(),
            getOutboundTraffic()
        ]);

        dashboardWS.updateConnectionStatus('service', serviceCount > 0 ? 'connected' : 'error');
        dashboardWS.updateConnectionStatus('sensor', sensorCount > 0 ? 'connected' : 'error');
        dashboardWS.updateConnectionStatus('server', serverCount > 0 ? 'connected' : 'error');

        const elements = {
            service: document.getElementById('totalServicesCount'),
            sensor: document.getElementById('totalSensorsCount'),
            server: document.getElementById('totalServersCount'),
            traffic: document.getElementById('outboundTrafficValue')
        };

        if (elements.service) elements.service.textContent = serviceCount;
        if (elements.sensor) elements.sensor.textContent = sensorCount;
        if (elements.server) elements.server.textContent = serverCount;
        if (elements.traffic) elements.traffic.textContent = trafficData.formattedValue || '0.0 MB';

    } catch (error) {
        console.error('카운트 업데이트 실패:', error);
        dashboardWS.updateConnectionStatus('service', 'error');
        dashboardWS.updateConnectionStatus('sensor', 'error');
        dashboardWS.updateConnectionStatus('server', 'error');
    }
}

function updateLastUpdateTime() {
    const element = document.getElementById('lastUpdateTime');
    if (element) {
        element.textContent = new Date().toLocaleTimeString('ko-KR');
    }
}

// ★★★ 이벤트 리스너 및 초기화 ★★★
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard 페이지 로드 완료.");

    if (!checkAuthStatus()) return;

    loadWatchAlarmData();
    setInterval(loadWatchAlarmData, 60000);
    setInterval(updateLastUpdateTime, 10000);
    updateLastUpdateTime();

    dashboardWS.connect();
});

window.addEventListener('beforeunload', () => {
    dashboardWS.disconnect();
});

// ★★★ 전역 함수들 ★★★
window.dashboardWS = dashboardWS;

window.debugDashboard = function() {
    console.log('=== Dashboard 디버깅 정보 ===');
    console.log(dashboardWS.getDebugInfo());
};

window.refreshDashboard = function() {
    console.log('대시보드 수동 새로고침...');
    dashboardWS.disconnect();
    setTimeout(() => dashboardWS.connect(), 1000);
};

// ★★★ 수동 재시도 함수 ★★★
window.retryMissingData = function() {
    console.log('🔄 수동 누락 데이터 재시도');
    dashboardWS.startAggressiveRetryForMissingData();
};
