// /admin/js/dashboardIntegration.js

import { createComboBarLineChart } from './chartUtils.js';
import { getHourlyAverages, get24HourAverages, getWeeklyAverages, startSensorDataWebSocket, closeSensorDataWebSocket } from './iotSensorApi.js';

// 차트 인스턴스 저장
const chartInstances = {};

// 회사 도메인 (WebSocket 연결 후 설정)
let COMPANY_DOMAIN = null;

// 측정 항목 정보 (category 정보 추가)
const ALL_MEASUREMENTS = [
    { measurement: 'usage_user', gatewayId: 'cpu', name: 'CPU 사용률', category: 'CPU' },
    { measurement: 'used_percent', gatewayId: 'mem', name: '메모리 사용률', category: '메모리' },
    { measurement: 'temperature_celsius', gatewayId: 'modbus', name: '서버 온도', category: '환경' },
    { measurement: 'power_factor_avg_percent', gatewayId: 'modbus', name: '역률 평균', category: '전력' }
];

class IntegrationWebSocket {
    constructor() {
        this.currentData = new Map();
        this.selectedMeasurements = new Set(['usage_user', 'used_percent', 'temperature_celsius', 'power_factor_avg_percent']); // 기본 선택
        this.isConnected = false;
        this.refreshTimer = null;
    }

    // WebSocket 연결 및 데이터 수신 처리
    connect() {
        COMPANY_DOMAIN = 'javame'; // 실제로는 동적으로 설정해야 함

        const params = {
            companyDomain: COMPANY_DOMAIN,
            origin: 'server_data',
            // measurement: 'all', // 서버에서 "all"을 지원하지 않는다면 제거
            interval: 15
        };

        startSensorDataWebSocket(COMPANY_DOMAIN, (messageObject) => {
            this.isConnected = true;
            this.updateConnectionStatus('connected');
            this.processWebSocketMessage(messageObject); // 메시지 처리 함수 호출
            this.refreshAllCharts(); // 데이터 수신 후 차트 업데이트
        });

        // 주기적으로 차트 갱신 (테스트 용도, 실제는 WebSocket 데이터 기반으로만 갱신하는 것이 좋음)
        this.refreshTimer = setInterval(() => {
            if (this.isConnected) {
                console.log('🔄 정기 차트 새로고침');
                this.refreshAllCharts();
            }
        }, 20000);
    }

    // WebSocket 메시지 처리
    processWebSocketMessage(messageObject) {
        if (messageObject && messageObject.type === 'realtime' && messageObject.data) { // 필수 필드 확인
            const measurement = messageObject.measurement;
            const gatewayId = messageObject.gatewayId;
            const data = messageObject.data; // TimeSeriesDataDto 객체

            // console.log("[Integration] processWebSocketMessage - Raw data:", messageObject); // 전체 메시지 로그

            if (measurement && gatewayId && data.value !== undefined) {
                const key = `${measurement}:${gatewayId}`;
                const value = parseFloat(data.value);
                this.currentData.set(key, value); // 데이터 저장

                console.log(`[Integration] Realtime Data: ${key} = ${value}`); // 저장 로그
            } else {
                console.warn('[Integration] Invalid data format:', messageObject); // 데이터 문제 발생 시 로그
            }
        }
    }

    // 모든 차트 새로고침
    async refreshAllCharts() {
        if (!COMPANY_DOMAIN) {
            console.warn('COMPANY_DOMAIN이 설정되지 않았습니다.');
            return;
        }

        try {
            await this.updateComboChart('currentStateBarChart', '1h');
            await this.updateComboChart('dailyComboChart', '24h');
            await this.updateComboChart('weeklyComboChart', '1w');
        } catch (error) {
            console.error('차트 업데이트 실패:', error);
        }
    }

    // 콤보 차트 업데이트 (1h, 24h, 1w 지원)
    async updateComboChart(canvasId, timeRange) {
        const selectedItems = this.getSelectedMeasurements(); // 선택된 측정항목 가져오기

        if (selectedItems.length === 0) {
            console.warn('선택된 측정 항목이 없습니다.');
            return;
        }

        const labels = [];
        const currentValues = [];
        const averageValues = [];

        // 각 측정항목별로 현재값과 평균값을 가져와 배열에 저장
        for (const { measurement, gatewayId, name, category } of selectedItems) {
            labels.push(`${name} (${category})`);

            const currentValue = this.currentData.get(`${measurement}:${gatewayId}`) || 0;

            let averageData;
            try {
                // 1시간, 24시간, 1주 평균 데이터 요청
                switch (timeRange) {
                    case '1h':
                        averageData = await getHourlyAverages('server_data', measurement, { companyDomain: COMPANY_DOMAIN, gatewayId: gatewayId });
                        break;
                    case '24h':
                        averageData = await get24HourAverages('server_data', measurement, { companyDomain: COMPANY_DOMAIN, gatewayId: gatewayId });
                        break;
                    case '1w':
                        averageData = await getWeeklyAverages('server_data', measurement, { companyDomain: COMPANY_DOMAIN, gatewayId: gatewayId });
                        break;
                    default:
                        console.warn('잘못된 timeRange:', timeRange);
                        continue;
                }

                if (averageData && averageData.overallAverage !== undefined) {
                    averageValues.push(averageData.overallAverage);
                    currentValues.push(currentValue);
                } else {
                    console.warn(`[${timeRange}] ${name} 평균값 데이터 누락 또는 유효하지 않음`);
                    averageValues.push(null); // 또는 다른 적절한 값
                    currentValues.push(null);
                }

            } catch (error) {
                console.error(`[${timeRange}] ${name} 평균값 조회 실패:`, error);
                averageValues.push(null); // 에러 발생 시 null 처리
                currentValues.push(null);
            }
        }

        // 차트 업데이트 또는 생성
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        const timeDisplayName = this.getTimeDisplayName(timeRange);
        chartInstances[canvasId] = createComboBarLineChart(
            canvasId,
            currentValues,
            averageValues,
            '현재값 (실시간)',
            `${timeDisplayName} 평균`,
            labels
        );

        console.log(`✅ ${timeDisplayName} 콤보 차트 업데이트 완료 - ${selectedItems.length}개 항목`);
    }

    // 선택된 측정 항목 가져오기
    getSelectedMeasurements() {
        return ALL_MEASUREMENTS.filter(item => this.selectedMeasurements.has(item.measurement));
    }

    // 시간 범위 표시명
    getTimeDisplayName(timeRange) {
        switch (timeRange) {
            case '1h': return '1시간';
            case '24h': return '24시간';
            case '1w': return '1주';
            default: return timeRange;
        }
    }

    // 연결 상태 업데이트
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('integration-websocket-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    // WebSocket 연결 종료
    disconnect() {
        this.isConnected = false;
        this.updateConnectionStatus('disconnected');
        closeSensorDataWebSocket();
    }

    // 카테고리별 체크박스 생성 (이 부분은 페이지 로드 시 1회만 실행되므로 별도 함수로 분리)
    initializeCategoryCheckboxes() {
        const container = document.getElementById('measurementCheckboxContainer');
        if (!container) return;

        container.innerHTML = ''; // 기존 내용 비우기

        const categories = {}; // 카테고리별로 측정 항목을 그룹화
        ALL_MEASUREMENTS.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push(item);
        });

        // 각 카테고리별로 체크박스 생성
        Object.entries(categories).forEach(([category, items]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mb-3';
            categoryDiv.innerHTML = `<h6 class="text-muted">${category}</h6>`;

            items.forEach(item => {
                const checkboxId = `chk-${item.measurement}-${item.gatewayId}`;
                const div = document.createElement('div');
                div.classList.add('form-check', 'form-check-inline');
                div.innerHTML = `
                    <input class="form-check-input measurement-checkbox" type="checkbox" 
                           value="${item.measurement}" id="${checkboxId}" 
                           data-gateway="${item.gatewayId}" data-category="${item.category}"
                           ${this.selectedMeasurements.has(item.measurement) ? 'checked' : ''}>
                    <label class="form-check-label" for="${checkboxId}">
                        ${item.name}
                    </label>
                `;
                categoryDiv.appendChild(div);
            });
            container.appendChild(categoryDiv);
        });

        // 체크박스 변경 이벤트 리스너 추가
        document.querySelectorAll('.measurement-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                const measurement = event.target.value;
                if (event.target.checked) {
                    this.selectedMeasurements.add(measurement);
                } else {
                    this.selectedMeasurements.delete(measurement);
                }
                console.log('측정 항목 선택 변경:', measurement, event.target.checked);
                this.refreshAllCharts();
            });
        });

        console.log('카테고리별 측정 항목 체크박스 초기화 완료');
    }
}

// ★★★ 전역 WebSocket 인스턴스 ★★★
const integrationWS = new IntegrationWebSocket();

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    console.log("통합 차트 페이지 로드");

    // 카테고리별 체크박스 초기화
    integrationWS.initializeCategoryCheckboxes();

    // WebSocket 연결
    integrationWS.connect();

    // 전체 선택 버튼
    const selectAllButton = document.getElementById('selectAllMeasurementsBtn');
    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            if (integrationWS.selectedMeasurements.size === ALL_MEASUREMENTS.length) {
                integrationWS.selectedMeasurements.clear();
            } else {
                integrationWS.selectedMeasurements = new Set(ALL_MEASUREMENTS.map(item => item.measurement));
            }
            integrationWS.initializeCategoryCheckboxes(); // 체크박스 다시 그리기
            integrationWS.refreshAllCharts(); // 차트 업데이트
        });
    }

    // 차트 업데이트 버튼
    const applyButton = document.getElementById('applyIntegrationChartFilterButton');
    if (applyButton) {
        applyButton.addEventListener('click', () => {
            console.log('차트 업데이트 버튼 클릭');
            integrationWS.refreshAllCharts();
        });
    }
});

// 페이지 종료 시 정리
window.addEventListener('beforeunload', () => {
    integrationWS.disconnect();
});
