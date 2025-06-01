// dashboardMain.js

import {
    createGaugeChart
} from './chartUtils.js';

// 차트 인스턴스 관리 객체
const chartInstances = {};

// ★★★ 동적 companyDomain (하드코딩 제거) ★★★
let COMPANY_DOMAIN = null;

// ★★★ WebSocket 관리 객체 ★★★
class DashboardWebSocket {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.subscriptions = new Map();
        this.isConnected = false;
        this.companyDomain = null;
        this.lastDataReceived = new Map(); // ★★★ 마지막 수신 데이터 저장 ★★★
        this.refreshTimer = null; // ★★★ 10초 타이머 ★★★
    }

    connect() {
        try {
            const possibleTokenKeys = [
                'jwtToken', 'accessToken', 'token', 'authToken',
                'JWT_TOKEN', 'ACCESS_TOKEN', 'TOKEN'
            ];

            let token = null;

            // localStorage에서 토큰 찾기
            for (const key of possibleTokenKeys) {
                token = localStorage.getItem(key);
                if (token) {
                    console.log(`토큰 발견 (localStorage.${key}):`, token.substring(0, 20) + '...');
                    break;
                }
            }

            // sessionStorage에서 토큰 찾기
            if (!token) {
                for (const key of possibleTokenKeys) {
                    token = sessionStorage.getItem(key);
                    if (token) {
                        console.log(`토큰 발견 (sessionStorage.${key}):`, token.substring(0, 20) + '...');
                        break;
                    }
                }
            }

            if (!token) {
                console.error('JWT 토큰을 찾을 수 없습니다.');
                return;
            }

            // WebSocket 연결
            this.socket = new WebSocket(`ws://localhost:10279/ws/environment?token=${token}`);

            this.socket.onopen = () => {
                console.log('Dashboard WebSocket 연결 성공');
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
                console.log('Dashboard WebSocket 연결 종료:', event.code);
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');
                this.stopRefreshTimer();
                this.attemptReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('Dashboard WebSocket 오류:', error);
                this.isConnected = false;
                this.updateConnectionStatus('error');
                this.stopRefreshTimer();
            };

        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.attemptReconnect();
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('websocket-status');
        if (statusElement) {
            switch (status) {
                case 'connected':
                    statusElement.textContent = '🟢 실시간 연결됨';
                    statusElement.className = 'status connected';
                    break;
                case 'disconnected':
                    statusElement.textContent = '🔴 연결 끊김';
                    statusElement.className = 'status disconnected';
                    break;
                case 'connecting':
                    statusElement.textContent = '🟡 연결 중...';
                    statusElement.className = 'status connecting';
                    break;
                case 'error':
                    statusElement.textContent = '🔴 연결 오류';
                    statusElement.className = 'status error';
                    break;
            }
        }
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
            console.error('WebSocket 재연결 시도 횟수 초과.');
            this.updateConnectionStatus('error');
        }
    }

    // ★★★ 구독 로직 (인터벌 10초) ★★★
    subscribe(measurement, gatewayId) {
        const subscriptionKey = `${measurement}:${gatewayId}`;
        this.subscriptions.set(subscriptionKey, { measurement, gatewayId });

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket이 연결되지 않았습니다. 구독 요청을 대기열에 추가합니다.');
            return;
        }

        const subscribeMessage = {
            action: 'subscribe',
            measurement: measurement,
            gatewayId: gatewayId,
            interval: 10 // ★★★ 10초 간격 ★★★
        };

        this.socket.send(JSON.stringify(subscribeMessage));
        console.log(`구독 요청: ${measurement} (${gatewayId}) - 10초 간격`);
    }

    resubscribeAll() {
        this.subscriptions.forEach(({ measurement, gatewayId }) => {
            this.subscribe(measurement, gatewayId);
        });
    }

    handleMessage(data) {
        console.log('WebSocket 메시지 수신:', data.type, data);

        switch (data.type) {
            case 'connection':
                this.companyDomain = data.companyDomain;
                COMPANY_DOMAIN = data.companyDomain;
                console.log(`WebSocket 연결 확인 - 회사: ${this.companyDomain}`);

                setTimeout(() => {
                    this.startSubscriptions();
                    this.startRefreshTimer(3000, 10000);
                }, 1000);
                break;

            case 'subscribe':
                console.log(`구독 성공: ${data.measurement} (${data.gatewayId})`);
                break;

            case 'realtime':
                this.handleRealtimeData(data);
                break;

            case 'error':
                console.error(`서버 오류: ${data.message}`);
                break;
        }
    }

    startSubscriptions() {
        console.log(`${this.companyDomain} 회사의 모든 지표 구독 시작...`);
        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const { measurement, gatewayId } = metricConfig.gauge.apiParams;
                this.subscribe(measurement, gatewayId);
            }
        });
    }

    // ★★★ 10초마다 모든 차트 애니메이션 새로고침 타이머 ★★★
    startRefreshTimer(firstDelay = 3000, intervalDelay = 10000) {
        this.stopRefreshTimer(); // 기존 타이머 정리

        // 첫 번째 새로고침
        setTimeout(() => {
            console.log(`🚀 첫 번째 새로고침: ${firstDelay/1000}초 후 모든 게이지 애니메이션 시작`);
            this.refreshAllGaugesWithAnimation();

            // 이후 정기 새로고침
            this.refreshTimer = setInterval(() => {
                console.log(`🔄 정기 새로고침: ${intervalDelay/1000}초 타이머 - 모든 게이지 애니메이션`);
                this.refreshAllGaugesWithAnimation();
            }, intervalDelay);

            console.log(`✅ 정기 ${intervalDelay/1000}초 새로고침 타이머 시작`);

        }, firstDelay);

        console.log(`⏰ 첫 새로고침 ${firstDelay/1000}초 타이머 시작`);
    }

    stopRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('❌ 10초 새로고침 타이머 중지');
        }
    }

    // ★★★ 모든 게이지를 애니메이션과 함께 새로고침 ★★★
    refreshAllGaugesWithAnimation() {
        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const { measurement, gatewayId } = metricConfig.gauge.apiParams;
                const dataKey = `${measurement}:${gatewayId}`;

                // 마지막 수신 데이터가 있으면 사용, 없으면 기본값
                const lastData = this.lastDataReceived.get(dataKey);
                if (lastData) {
                    console.log(`🔄 애니메이션 새로고침: ${metricConfig.gauge.title} = ${lastData.textDisplay}`);
                    this.updateGaugeWithAnimation(metricConfig.gauge, lastData.gaugeDisplayValue, lastData.textDisplay);
                } else {
                    console.log(`🔄 애니메이션 새로고침: ${metricConfig.gauge.title} = 데이터 없음`);
                    this.updateGaugeWithAnimation(metricConfig.gauge, 0, '데이터 없음');
                }
            }
        });
    }

    // ★★★ 실시간 데이터 처리 (데이터만 저장, 즉시 업데이트 안함) ★★★
    handleRealtimeData(data) {
        if (!data.data || data.data.length === 0) {
            console.warn(`실시간 데이터가 비어있습니다: ${data.measurement} (${data.gatewayId})`);
            return;
        }

        const latestData = data.data[data.data.length - 1];
        const { measurement, gatewayId } = data;
        const value = latestData.value;

        console.log(`📥 실시간 데이터 수신: ${measurement} (${gatewayId}) = ${value}`);

        // ★★★ 데이터만 저장하고 즉시 업데이트하지 않음 ★★★
        const metricKey = this.findMetricKey(measurement, gatewayId);
        if (metricKey) {
            const gaugeConfig = DASHBOARD_CONFIG[metricKey].gauge;
            const { gaugeDisplayValue, textDisplay } = this.convertValueForGauge(value, gaugeConfig.unit);

            const dataKey = `${measurement}:${gatewayId}`;
            this.lastDataReceived.set(dataKey, { gaugeDisplayValue, textDisplay });

            console.log(`💾 데이터 저장: ${gaugeConfig.title} = ${textDisplay} (다음 10초 타이머에서 업데이트)`);
        }
    }

    // ★★★ 애니메이션과 함께 게이지 업데이트 ★★★
    updateGaugeWithAnimation(gaugeConfig, gaugeDisplayValue, textDisplay) {
        const canvasId = gaugeConfig.canvasId;

        // 텍스트 업데이트
        updateTextContent(gaugeConfig.valueTextId, textDisplay);

        // ★★★ 차트 완전 재생성 (애니메이션 포함) ★★★
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        // 새로운 차트 생성 (애니메이션 활성화)
        chartInstances[canvasId] = createGaugeChart(
            canvasId,
            gaugeDisplayValue,
            textDisplay,
            gaugeConfig.title
        );

        console.log(`✨ 애니메이션 차트 생성: ${canvasId} = ${gaugeDisplayValue}% (${textDisplay})`);
    }

    findMetricKey(measurement, gatewayId) {
        for (const [key, config] of Object.entries(DASHBOARD_CONFIG)) {
            if (config.gauge &&
                config.gauge.apiParams.measurement === measurement &&
                config.gauge.apiParams.gatewayId === gatewayId) {
                return key;
            }
        }
        return null;
    }

    convertValueForGauge(value, unit) {
        let gaugeDisplayValue = 0;
        let textDisplay = `--${unit || ''}`;

        if (typeof value === 'number' && !isNaN(value)) {
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
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.subscriptions.clear();
            this.lastDataReceived.clear();
            this.isConnected = false;
            this.stopRefreshTimer();
            this.updateConnectionStatus('disconnected');
        }
    }
}

// ★★★ 전역 WebSocket 인스턴스 ★★★
const dashboardWS = new DashboardWebSocket();

// ★★★ DASHBOARD_CONFIG ★★★
const DASHBOARD_CONFIG = {
    cpu: {
        gauge: {
            canvasId: 'gauge1',
            valueTextId: 'gauge1-value',
            title: 'CPU 사용률',
            apiParams: {
                origin: 'server_data',
                location: 'server_resource_data',
                gatewayId: 'cpu',
                measurement: 'usage_user'
            },
            unit: '%'
        },
    },
    memory: {
        gauge: {
            canvasId: 'gauge2',
            valueTextId: 'gauge2-value',
            title: '메모리 사용량',
            apiParams: {
                origin: 'server_data',
                location: 'server_resource_data',
                gatewayId: 'mem',
                measurement: 'used_percent'
            },
            unit: '%'
        },
    },
    disk: {
        gauge: {
            canvasId: 'gauge3',
            valueTextId: 'gauge3-value',
            title: '역률 평균',
            apiParams: {
                origin: 'server_data',
                location: 'power_meter',
                gatewayId: 'modbus',
                measurement: 'power_factor_avg_percent'
            },
            unit: '%'
        },
    },
    temperature: {
        gauge: {
            canvasId: 'gauge4',
            valueTextId: 'gauge4-value',
            title: '서버 온도',
            apiParams: {
                origin: 'server_data',
                location: 'power_meter',
                gatewayId: 'modbus',
                measurement: 'temperature_celsius'
            },
            unit: '°C'
        },
    }
};

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

window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard 페이지 로드 완료.");

    if (!checkAuthStatus()) {
        return;
    }

    console.log("인증 확인 완료. WebSocket 실시간 모니터링 시작...");
    initializeAllCharts();

    // WebSocket 연결
    dashboardWS.connect();
});

window.addEventListener('beforeunload', () => {
    dashboardWS.disconnect();
});

/**
 * 모든 차트의 틀을 초기화
 */
function initializeAllCharts() {
    Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
        if (metricConfig.gauge) {
            const gc = metricConfig.gauge;
            if (chartInstances[gc.canvasId]) {
                chartInstances[gc.canvasId].destroy();
            }
            chartInstances[gc.canvasId] = createGaugeChart(gc.canvasId, 0, '--', gc.title);
            updateTextContent(gc.valueTextId, `--${gc.unit || ''}`);
        }
    });

    console.log("차트 초기화 완료. WebSocket 연결을 기다립니다...");
}

function updateTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// ★★★ 디버깅 함수들 ★★★
window.refreshDashboard = function() {
    console.log('대시보드 수동 새로고침...');
    dashboardWS.disconnect();
    setTimeout(() => {
        dashboardWS.connect();
    }, 1000);
};

window.debugDashboard = function() {
    console.log('=== Dashboard 디버깅 정보 ===');
    console.log('WebSocket 연결 상태:', dashboardWS.isConnected);
    console.log('Company Domain:', COMPANY_DOMAIN);
    console.log('구독 목록:', Array.from(dashboardWS.subscriptions.entries()));
    console.log('마지막 수신 데이터:', Array.from(dashboardWS.lastDataReceived.entries()));
    console.log('차트 인스턴스:', Object.keys(chartInstances));
    console.log('새로고침 타이머 상태:', dashboardWS.refreshTimer ? ' 활성' : '비활성');
};

window.testWebSocket = function() {
    console.log('WebSocket 테스트 시작...');
    if (dashboardWS.socket && dashboardWS.socket.readyState === WebSocket.OPEN) {
        dashboardWS.socket.send(JSON.stringify({ action: 'ping' }));
        console.log('Ping 메시지 전송');
    } else {
        console.log('WebSocket이 연결되지 않았습니다.');
    }
};

// ★★★ 수동 새로고침 테스트 함수 ★★★
window.testRefresh = function() {
    console.log('🔄 수동 새로고침 테스트 시작...');
    dashboardWS.refreshAllGaugesWithAnimation();
};
