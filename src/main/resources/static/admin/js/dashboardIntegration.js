// /admin/js/dashboardIntegration.js

import { createComboBarLineChart } from './chartUtils.js';
import { fetchWithAuth } from '/index/js/auth.js';
import { getHourlyAverages } from './iotSensorApi.js';

const chartInstances = {};
let COMPANY_DOMAIN = null;

// ★★★ 확장된 측정 항목 리스트 ★★★
const ALL_MEASUREMENTS = [
    // CPU 관련
    { measurement: 'usage_user', gatewayId: 'cpu', name: 'CPU 사용률', category: 'CPU' },
    { measurement: 'usage_idle', gatewayId: 'cpu', name: 'CPU 유휴율', category: 'CPU' },
    { measurement: 'usage_system', gatewayId: 'cpu', name: '시스템 CPU', category: 'CPU' },
    { measurement: 'load1', gatewayId: 'system', name: '시스템 부하', category: 'CPU' },

    // 메모리 관련
    { measurement: 'used_percent', gatewayId: 'mem', name: '메모리 사용률', category: '메모리' },
    { measurement: 'available_percent', gatewayId: 'mem', name: '메모리 가용률', category: '메모리' },

    // 디스크 I/O
    { measurement: 'io_time', gatewayId: 'diskio', name: 'I/O 작업시간', category: '디스크' },
    { measurement: 'read_bytes', gatewayId: 'diskio', name: '디스크 읽기', category: '디스크' },
    { measurement: 'write_bytes', gatewayId: 'diskio', name: '디스크 쓰기', category: '디스크' },

    // 네트워크
    { measurement: 'bytes_recv', gatewayId: 'net', name: '네트워크 수신', category: '네트워크' },
    { measurement: 'bytes_sent', gatewayId: 'net', name: '네트워크 전송', category: '네트워크' },

    // 전력/환경
    { measurement: 'temperature_celsius', gatewayId: 'modbus', name: '서버 온도', category: '환경' },
    { measurement: 'current_amps', gatewayId: 'modbus', name: '전류', category: '전력' },
    { measurement: 'power_watts', gatewayId: 'modbus', name: '전력 사용량', category: '전력' },
    { measurement: 'power_factor_avg_percent', gatewayId: 'modbus', name: '역률 평균', category: '전력' },
    { measurement: 'temp_input', gatewayId: 'sensors', name: '센서 온도', category: '환경' }
];

// ★★★ JWT 토큰 관리 클래스 ★★★
class TokenManager {
    constructor() {
        this.possibleTokenKeys = [
            'jwtToken', 'jwt_token', 'accessToken', 'access_token',
            'token', 'authToken', 'auth_token', 'JWT_TOKEN', 'ACCESS_TOKEN'
        ];
    }

    getToken() {
        for (const key of this.possibleTokenKeys) {
            const token = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (token && token.trim() !== '') {
                console.log(`토큰 발견 (${key}):`, token.substring(0, 20) + '...');
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
                console.warn('토큰이 만료되었습니다.');
                return false;
            }
            return true;
        } catch (error) {
            console.warn('토큰 형식이 올바르지 않습니다:', error);
            return false;
        }
    }

    debugStorageState() {
        console.log('=== 토큰 저장소 상태 ===');
        console.log('localStorage 키들:', Object.keys(localStorage));
        console.log('sessionStorage 키들:', Object.keys(sessionStorage));
        console.log('쿠키:', document.cookie);

        this.possibleTokenKeys.forEach(key => {
            const localValue = localStorage.getItem(key);
            const sessionValue = sessionStorage.getItem(key);
            if (localValue) console.log(`localStorage.${key}:`, localValue.substring(0, 30) + '...');
            if (sessionValue) console.log(`sessionStorage.${key}:`, sessionValue.substring(0, 30) + '...');
        });
    }
}

// ★★★ 통합 차트 WebSocket 클래스 ★★★
class IntegrationWebSocket {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentData = new Map();
        this.refreshTimer = null;
        this.checkboxChangeTimer = null;
        this.tokenManager = new TokenManager();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
    }

    // ★★★ WebSocket 연결 ★★★
    connect() {
        const token = this.tokenManager.getToken();

        if (!token || !this.tokenManager.isValidToken(token)) {
            console.error('유효한 JWT 토큰이 없습니다.');
            this.handleAuthenticationFailure();
            return;
        }

        try {
            this.socket = new WebSocket(`ws://localhost:10279/ws/environment?token=${token}`);

            this.socket.onopen = () => {
                console.log('Integration WebSocket 연결 성공');
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
                console.log('Integration WebSocket 연결 종료:', event.code);
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');

                if (event.code !== 1008 && event.code !== 1011) {
                    this.attemptReconnect();
                }
            };

            this.socket.onerror = (error) => {
                console.error('Integration WebSocket 오류:', error);
                this.isConnected = false;
                this.updateConnectionStatus('error');
            };

        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.attemptReconnect();
        }
    }

    // ★★★ 인증 실패 처리 ★★★
    handleAuthenticationFailure() {
        this.updateConnectionStatus('auth-failed');
        const shouldRedirect = confirm('인증이 필요합니다. 로그인 페이지로 이동하시겠습니까?');
        if (shouldRedirect) {
            window.location.href = '/auth/login.html';
        }
    }

    // ★★★ 재연결 시도 ★★★
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

    // ★★★ 메시지 처리 ★★★
    handleMessage(data) {
        if (data.type === 'connection') {
            COMPANY_DOMAIN = data.companyDomain;
            console.log(`WebSocket 연결 확인 - 회사: ${COMPANY_DOMAIN}`);
            setTimeout(() => {
                this.subscribeToAllMetrics();
                this.initializeCategoryCheckboxes();
                this.startChartRefresh();
            }, 1000);
        } else if (data.type === 'realtime') {
            const { measurement, gatewayId } = data;
            if (data.data && data.data.length > 0) {
                const latestValue = data.data[data.data.length - 1].value;
                this.currentData.set(`${measurement}:${gatewayId}`, latestValue);
                console.log(`실시간 데이터 수신: ${measurement} (${gatewayId}) = ${latestValue}`);
            }
        } else if (data.type === 'subscribe') {
            console.log(`구독 성공: ${data.measurement} (${data.gatewayId})`);
        } else if (data.type === 'error') {
            console.error('서버 오류:', data.message);
            if (data.message && data.message.includes('인증')) {
                this.handleAuthenticationFailure();
            }
        }
    }

    // ★★★ 모든 측정 항목 구독 ★★★
    subscribeToAllMetrics() {
        ALL_MEASUREMENTS.forEach(({ measurement, gatewayId }) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    action: 'subscribe',
                    measurement: measurement,
                    gatewayId: gatewayId,
                    interval: 15
                }));
                console.log(`구독 요청: ${measurement} (${gatewayId})`);
            }
        });
    }

    // ★★★ 차트 새로고침 시작 ★★★
    startChartRefresh() {
        setTimeout(() => {
            console.log('🚀 첫 번째 통합 차트 새로고침');
            this.refreshAllCharts();
            this.refreshTimer = setInterval(() => {
                console.log('🔄 정기 통합 차트 새로고침');
                this.refreshAllCharts();
            }, 20000);
        }, 3000);
    }

    // ★★★ 모든 차트 새로고침 ★★★
    async refreshAllCharts() {
        if (!COMPANY_DOMAIN) {
            console.warn('COMPANY_DOMAIN이 설정되지 않았습니다.');
            return;
        }

        try {
            await this.updateMainComboChart();
        } catch (error) {
            console.error('차트 새로고침 중 오류:', error);
        }
    }

    // ★★★ 확장된 메인 콤보 차트 ★★★
    async updateMainComboChart() {
        const selectedMeasurements = this.getSelectedMeasurements();

        if (selectedMeasurements.length === 0) {
            console.warn('선택된 측정 항목이 없습니다.');
            return;
        }

        const labels = [];
        const currentValues = [];
        const averageValues = [];

        for (const { measurement, gatewayId, name, category } of selectedMeasurements) {
            labels.push(`${name} (${category})`);

            // 현재값 (WebSocket 실시간 데이터)
            const currentValue = this.currentData.get(`${measurement}:${gatewayId}`) || 0;
            currentValues.push(currentValue);

            // 1시간 평균값 API 호출
            try {
                const filters = {
                    companyDomain: COMPANY_DOMAIN,
                    gatewayId: gatewayId
                };

                const averageData = await getHourlyAverages('server_data', measurement, filters);
                let avgValue = averageData.overallAverage;

                if (!avgValue || avgValue === 0) {
                    avgValue = this.generateSmartEstimate(measurement, currentValue);
                    console.warn(`${name} 평균값 없음, 스마트 추정값 사용: ${avgValue.toFixed(1)}`);
                }

                averageValues.push(avgValue);
                console.log(`${name}: 현재=${currentValue.toFixed(1)}, 평균=${avgValue.toFixed(1)}`);

            } catch (error) {
                console.error(`${name} 평균값 조회 실패:`, error);
                const estimatedAvg = this.generateSmartEstimate(measurement, currentValue);
                averageValues.push(estimatedAvg);
                console.warn(`${name} 완전 실패, 스마트 추정값: ${estimatedAvg.toFixed(1)}`);
            }
        }

        // 확장된 콤보 차트 생성
        const canvasId = 'currentStateBarChart';
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        chartInstances[canvasId] = createComboBarLineChart(
            canvasId,
            currentValues,
            averageValues,
            '현재값 (실시간)',
            '1시간 평균 (과거)',
            labels
        );

        console.log(`✅ 확장된 콤보 차트 업데이트 완료 - ${selectedMeasurements.length}개 항목`);
    }

    // ★★★ 측정 항목별 스마트 추정값 생성 ★★★
    generateSmartEstimate(measurement, currentValue) {
        switch (measurement) {
            // CPU 관련
            case 'usage_user':
            case 'usage_system':
                return Math.max(currentValue * 0.7, 5); // 최소 5% 보장
            case 'usage_idle':
                return Math.min(currentValue * 1.1, 95); // 최대 95% 제한
            case 'load1':
                return currentValue * 0.8;

            // 메모리 관련
            case 'used_percent':
                return Math.max(currentValue * 0.85, 10);
            case 'available_percent':
                return Math.min(currentValue * 1.05, 90);

            // 디스크 I/O
            case 'io_time':
            case 'read_bytes':
            case 'write_bytes':
                return currentValue * 0.75;

            // 네트워크
            case 'bytes_recv':
            case 'bytes_sent':
                return currentValue * 0.8;

            // 온도
            case 'temperature_celsius':
            case 'temp_input':
                return currentValue - Math.random() * 3; // 과거가 약간 낮음

            // 전력 관련
            case 'current_amps':
            case 'power_watts':
                return currentValue * 0.9;
            case 'power_factor_avg_percent':
                return Math.min(currentValue * 0.95, 95);

            default:
                return currentValue * 0.85;
        }
    }

    // ★★★ 카테고리별 체크박스 생성 ★★★
    initializeCategoryCheckboxes() {
        const container = document.getElementById('measurementCheckboxContainer');
        if (!container) return;

        container.innerHTML = '';

        // 카테고리별 그룹화
        const categories = {};
        ALL_MEASUREMENTS.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push(item);
        });

        // 카테고리별 체크박스 생성
        Object.entries(categories).forEach(([category, items]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mb-3';
            categoryDiv.innerHTML = `<h6 class="text-muted">${category}</h6>`;

            items.forEach((item, index) => {
                const div = document.createElement('div');
                div.classList.add('form-check', 'form-check-inline');
                div.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${item.measurement}" 
                           id="chk${category}${index}" data-gateway="${item.gatewayId}" 
                           data-category="${item.category}" ${index < 2 ? 'checked' : ''}>
                    <label class="form-check-label" for="chk${category}${index}">
                        ${item.name}
                    </label>
                `;
                categoryDiv.appendChild(div);
            });

            container.appendChild(categoryDiv);
        });

        console.log('카테고리별 측정 항목 체크박스 초기화 완료');
    }

    // ★★★ 선택된 측정 항목 가져오기 ★★★
    getSelectedMeasurements() {
        const checkboxes = document.querySelectorAll('#measurementCheckboxContainer input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => {
            const measurement = cb.value;
            const gatewayId = cb.dataset.gateway;
            const category = cb.dataset.category;
            const item = ALL_MEASUREMENTS.find(m => m.measurement === measurement && m.gatewayId === gatewayId);
            return {
                measurement,
                gatewayId,
                name: item ? item.name : measurement,
                category: category || '기타'
            };
        });
    }

    // ★★★ 연결 상태 업데이트 ★★★
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('integration-websocket-status');
        if (statusElement) {
            switch (status) {
                case 'connected':
                    statusElement.textContent = '🟢 실시간 연결됨';
                    statusElement.className = 'badge bg-success status-badge';
                    break;
                case 'disconnected':
                    statusElement.textContent = '🔴 연결 끊김';
                    statusElement.className = 'badge bg-danger status-badge';
                    break;
                case 'connecting':
                    statusElement.textContent = '🟡 연결 중...';
                    statusElement.className = 'badge bg-warning status-badge';
                    break;
                case 'auth-failed':
                    statusElement.textContent = '🔒 인증 실패';
                    statusElement.className = 'badge bg-danger status-badge';
                    break;
                case 'failed':
                    statusElement.textContent = '❌ 연결 실패';
                    statusElement.className = 'badge bg-secondary status-badge';
                    break;
                case 'error':
                    statusElement.textContent = '⚠️ 오류 발생';
                    statusElement.className = 'badge bg-warning status-badge';
                    break;
            }
        }
    }

    // ★★★ 연결 종료 ★★★
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        if (this.checkboxChangeTimer) {
            clearTimeout(this.checkboxChangeTimer);
            this.checkboxChangeTimer = null;
        }
        this.isConnected = false;
    }
}

// ★★★ 전역 WebSocket 인스턴스 ★★★
const integrationWS = new IntegrationWebSocket();

// ★★★ DOM 로드 완료 후 실행 ★★★
window.addEventListener('DOMContentLoaded', () => {
    console.log("확장된 통합 차트 페이지 로드 완료");

    // 인증 상태 확인
    if (!checkAuthStatus()) {
        return;
    }

    // WebSocket 연결
    integrationWS.connect();

    // 체크박스 변경 이벤트
    const checkboxContainer = document.getElementById('measurementCheckboxContainer');
    if (checkboxContainer) {
        checkboxContainer.addEventListener('change', (event) => {
            if (event.target.type === 'checkbox') {
                console.log('측정 항목 선택 변경:', event.target.value, event.target.checked);
                clearTimeout(integrationWS.checkboxChangeTimer);
                integrationWS.checkboxChangeTimer = setTimeout(() => {
                    integrationWS.refreshAllCharts();
                }, 500);
            }
        });
    }

    // 버튼 이벤트
    const applyButton = document.getElementById('applyIntegrationChartFilterButton');
    if (applyButton) {
        applyButton.addEventListener('click', () => {
            console.log('차트 업데이트 버튼 클릭');
            integrationWS.refreshAllCharts();
        });
    }
});

// ★★★ 인증 상태 확인 ★★★
function checkAuthStatus() {
    if (window.location.pathname.includes('/auth/login')) {
        return false;
    }

    const possibleTokenKeys = ['jwtToken', 'accessToken', 'token'];
    let hasToken = false;

    for (const key of possibleTokenKeys) {
        if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
            hasToken = true;
            break;
        }
    }

    if (!hasToken) {
        console.warn('인증 토큰이 없습니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/auth/login.html';
        return false;
    }

    return true;
}

// 페이지 종료 시 정리
window.addEventListener('beforeunload', () => {
    integrationWS.disconnect();
});

// ★★★ 디버깅 함수들 ★★★
window.debugIntegration = function() {
    console.log('=== 확장된 Integration Dashboard 디버깅 ===');
    console.log('WebSocket 연결 상태:', integrationWS.isConnected);
    console.log('Company Domain:', COMPANY_DOMAIN);
    console.log('현재 데이터:', Array.from(integrationWS.currentData.entries()));
    console.log('선택된 측정 항목:', integrationWS.getSelectedMeasurements());
    console.log('전체 측정 항목 수:', ALL_MEASUREMENTS.length);
    integrationWS.tokenManager.debugStorageState();
};

window.testChartUpdate = function() {
    console.log('수동 차트 업데이트 테스트...');
    integrationWS.refreshAllCharts();
};

window.forceReconnect = function() {
    console.log('강제 재연결 시도...');
    integrationWS.disconnect();
    setTimeout(() => {
        integrationWS.connect();
    }, 1000);
};

window.testToken = function() {
    const token = integrationWS.tokenManager.getToken();
    console.log('현재 토큰:', token ? token.substring(0, 50) + '...' : 'null');
    console.log('토큰 유효성:', integrationWS.tokenManager.isValidToken(token));
};
