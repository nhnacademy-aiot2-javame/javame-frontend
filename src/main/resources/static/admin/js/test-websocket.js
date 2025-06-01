// src/main/resources/static/admin/js/test-websocket.js

import {
    createAreaChart
} from './chartUtils.js';

class WebSocketTester {
    constructor() {
        this.socket = null;
        this.chart = null;
        this.chartData = {
            labels: [],
            data: []
        };
        this.maxDataPoints = 20; // 최대 20개 데이터 포인트만 표시
        this.initChart();
    }

    initChart() {
        // ★★★ createAreaChart 함수 사용 ★★★
        this.chart = createAreaChart(
            'realtimeChart',
            this.chartData.labels,
            this.chartData.data,
            '실시간 센서 데이터'
        );

        if (!this.chart) {
            console.error('차트 초기화 실패');
            return;
        }

        // 검색 결과 [3][4]에서 보듯이 Chart.js 옵션 추가 설정
        this.chart.options.responsive = true;
        this.chart.options.maintainAspectRatio = false;
        this.chart.options.animation = { duration: 500 };
        this.chart.options.plugins = {
            title: {
                display: true,
                text: '실시간 센서 데이터',
                font: { size: 16, weight: 'bold' }
            },
            legend: {
                display: true,
                position: 'top'
            }
        };
    }

    connect() {
        const token = document.getElementById('tokenInput').value.trim();
        const wsUrl = document.getElementById('wsUrlInput').value.trim();

        if (!token) {
            this.addLog('error', 'JWT 토큰을 입력해주세요.');
            return;
        }

        this.updateStatus('connecting', '연결 중...');
        this.addLog('info', `WebSocket 연결 시도: ${wsUrl}?token=${token.substring(0, 20)}...`);

        try {
            this.socket = new WebSocket(`${wsUrl}?token=${token}`);

            this.socket.onopen = (event) => {
                this.updateStatus('connected', '연결됨');
                this.addLog('success', 'WebSocket 연결 성공!');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    this.addLog('error', `메시지 파싱 오류: ${error.message}`);
                }
            };

            this.socket.onclose = (event) => {
                this.updateStatus('disconnected', '연결 안됨');
                this.addLog('warning', `WebSocket 연결 종료: ${event.code} - ${event.reason}`);
            };

            this.socket.onerror = (error) => {
                this.updateStatus('disconnected', '연결 오류');
                this.addLog('error', `WebSocket 오류: ${error}`);
            };

        } catch (error) {
            this.updateStatus('disconnected', '연결 실패');
            this.addLog('error', `연결 실패: ${error.message}`);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.updateStatus('disconnected', '연결 해제됨');
            this.addLog('info', 'WebSocket 연결을 해제했습니다.');
        }
    }

    subscribe() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.addLog('error', 'WebSocket이 연결되지 않았습니다.');
            return;
        }

        const measurement = document.getElementById('measurementSelect').value;
        const gatewayId = document.getElementById('gatewayIdSelect').value;
        const interval = parseInt(document.getElementById('intervalSelect').value);

        const message = {
            action: 'subscribe',
            measurement: measurement,
            gatewayId: gatewayId,
            interval: interval
        };

        this.socket.send(JSON.stringify(message));
        this.addLog('info', `구독 요청: ${measurement} (${gatewayId}) - ${interval}초 간격`);

        // ★★★ 차트 제목 업데이트 (검색 결과 [3][4] 참고) ★★★
        if (this.chart) {
            this.chart.options.plugins.title.text = `${measurement} (${gatewayId}) - 실시간 데이터`;
            this.chart.update();
        }
    }

    unsubscribe() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.addLog('error', 'WebSocket이 연결되지 않았습니다.');
            return;
        }

        const measurement = document.getElementById('measurementSelect').value;
        const gatewayId = document.getElementById('gatewayIdSelect').value;

        const message = {
            action: 'unsubscribe',
            measurement: measurement,
            gatewayId: gatewayId
        };

        this.socket.send(JSON.stringify(message));
        this.addLog('info', `구독 해제: ${measurement} (${gatewayId})`);
    }

    sendPing() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.addLog('error', 'WebSocket이 연결되지 않았습니다.');
            return;
        }

        const message = { action: 'ping' };
        this.socket.send(JSON.stringify(message));
        this.addLog('info', 'Ping 전송');
    }

    handleMessage(data) {
        console.log('수신된 메시지:', data); // 디버깅용

        switch (data.type) {
            case 'connection':
                this.addLog('success', `연결 확인: ${data.status} (회사: ${data.companyDomain})`);
                break;

            case 'subscribe':
                this.addLog('success', `구독 성공: ${data.measurement} (${data.gatewayId})`);
                break;

            case 'unsubscribe':
                this.addLog('info', '구독 해제 완료');
                break;

            case 'pong':
                this.addLog('success', 'Pong 응답 받음');
                break;

            case 'realtime':
                this.handleRealtimeData(data);
                break;

            case 'error':
                this.addLog('error', `서버 오류: ${data.message}`);
                break;

            default:
                this.addLog('info', `알 수 없는 메시지: ${JSON.stringify(data)}`);
        }
    }

    handleRealtimeData(data) {
        this.addLog('info', `실시간 데이터 수신: ${data.measurement} (${data.gatewayId}) - ${data.data.length}건`);

        if (data.data && data.data.length > 0 && this.chart) {
            // ★★★ 검색 결과 [3][4]에서 보듯이 Chart.js 데이터 업데이트 방식 ★★★

            // 최신 데이터만 차트에 추가
            const latestData = data.data[data.data.length - 1];
            const time = new Date(latestData.time).toLocaleTimeString();
            const value = latestData.value;

            // 차트 데이터 업데이트
            this.chart.data.labels.push(time);
            this.chart.data.datasets[0].data.push(value);

            // 최대 데이터 포인트 수 제한
            if (this.chart.data.labels.length > this.maxDataPoints) {
                this.chart.data.labels.shift();
                this.chart.data.datasets[0].data.shift();
            }

            // ★★★ Chart.js update() 메소드 사용 (검색 결과 [3][4] 참고) ★★★
            this.chart.update('none'); // 애니메이션 없이 업데이트

            this.addLog('success', `차트 업데이트: ${time} = ${value.toFixed(2)}`);
        } else {
            this.addLog('warning', '차트가 초기화되지 않았거나 데이터가 없습니다.');
        }
    }

    updateStatus(type, message) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.className = `status ${type}`;
        statusElement.textContent = message;
    }

    addLog(type, message) {
        const logContainer = document.getElementById('logContainer');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;

        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    clearLogs() {
        document.getElementById('logContainer').innerHTML = '';
        this.addLog('info', '로그가 지워졌습니다.');
    }

    // ★★★ 차트 재초기화 메소드 추가 ★★★
    resetChart() {
        if (this.chart) {
            this.chart.destroy();
        }
        this.chartData = { labels: [], data: [] };
        this.initChart();
        this.addLog('info', '차트가 재초기화되었습니다.');
    }
}

const wsTester = new WebSocketTester();

// ★★★ 검색 결과 [4][5]에서 제안하는 방식: window 객체에 함수 등록 ★★★
window.connectWebSocket = function() {
    wsTester.connect();
};

window.disconnectWebSocket = function() {
    wsTester.disconnect();
};

window.subscribeData = function() {
    wsTester.subscribe();
};

window.unsubscribeData = function() {
    wsTester.unsubscribe();
};

window.sendPing = function() {
    wsTester.sendPing();
};

window.clearLogs = function() {
    wsTester.clearLogs();
};

window.resetChart = function() {
    wsTester.resetChart();
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart !== 'undefined') {
        wsTester.addLog('info', 'Chart.js 로드 완료');
        wsTester.addLog('info', 'WebSocket 테스터가 준비되었습니다.');
        wsTester.addLog('info', 'JWT 토큰을 입력하고 연결 버튼을 클릭하세요.');
    } else {
        console.error('Chart.js가 로드되지 않았습니다.');
    }
});