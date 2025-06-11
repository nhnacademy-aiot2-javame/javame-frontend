// admin/js/dashboardPrediction.js

import { createMixedLineChart, createMultiLineChart } from './chartUtils.js';
import {fetchWithAuth} from '/index/js/auth.js';

const chartInstances = {};

// API 베이스 URL (iotSensorApi.js와 동일한 패턴)
const API_BASE_URL = '/environment/companyDomain/forecast';

// 사용 가능한 디바이스 ID 가져오기
async function getAvailableDeviceId() {
    try {
        // 디버그 API를 통해 사용 가능한 디바이스 목록 조회
        const debugResponse = await fetchWithAuth(`${API_BASE_URL}/debug?deviceId=192.168.71.74`);
        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('=== 사용 가능한 디바이스 정보 ===', debugData);

            if (debugData.availableData && debugData.availableData.length > 0) {
                // 첫 번째 사용 가능한 디바이스 ID 반환
                console.error('디바이스 ID 조회:', debugData.availableData[0].deviceId);
                return debugData.availableData[0].deviceId;
            }
        }

        // 폴백: 고정 디바이스 ID
        return '192.168.71.74';
    } catch (error) {
        console.error('디바이스 ID 조회 실패:', error);
        return '192.168.71.74';
    }
}

// DOM 로드 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Prediction page loaded. Initializing AI prediction charts...");

    // 바로 차트들을 그리기
    drawAllPredictionCharts();

    // 60초마다 자동 새로고침 (실시간 효과)
    setInterval(() => {
        console.log("Auto refreshing prediction charts...");
        drawAllPredictionCharts();
    }, 60000);
});

/**
 * 모든 예측 차트를 그립니다
 */
async function drawAllPredictionCharts() {
    console.log('=== 모든 예측 차트 그리기 시작 ===');

    try {
        // 모든 차트를 동시에 그리기 (병렬 처리)
        await Promise.all([
            drawMainPredictionChart(),      // CPU (24시간)
            drawMemoryPredictionChart(),    // 메모리 (24시간)
            drawDiskPredictionChart(),      // 디스크 (24시간)
            drawMonthlyWattsPredictionChart(), // 전력량
            drawAccuracyChart()            // 정확도
        ]);

        console.log('=== 모든 예측 차트 그리기 완료 ===');

        // 차트 통계 정보 출력
        logChartStatistics();

    } catch (error) {
        console.error('차트 그리기 중 오류 발생:', error);
    }
}

/**
 * 차트 통계 정보 로깅
 */
function logChartStatistics() {
    console.log('=== 차트 렌더링 통계 ===');
    Object.entries(chartInstances).forEach(([canvasId, chart]) => {
        if (chart && chart.data && chart.data.datasets) {
            const datasets = chart.data.datasets;
            console.log(`${canvasId}:`);
            datasets.forEach(dataset => {
                if (dataset.label !== '연결선' && dataset.data) {
                    const validData = dataset.data.filter(v => v !== null);
                    if (validData.length > 0) {
                        const avg = validData.reduce((a, b) => a + b, 0) / validData.length;
                        const max = Math.max(...validData);
                        const min = Math.min(...validData);
                        console.log(`  - ${dataset.label}: 평균=${avg.toFixed(1)}%, 최대=${max.toFixed(1)}%, 최소=${min.toFixed(1)}%, 포인트수=${validData.length}`);
                    }
                }
            });
        }
    });
}

/**
 * CPU 예측 차트 (메인 차트)
 */
async function drawMainPredictionChart() {
    const canvasId = 'mainPredictionMixedChart';
    const canvas = document.getElementById(canvasId);

    console.log(`[CPU 차트] 캔버스 요소:`, canvas);

    try {
        // 사용 가능한 디바이스 ID 가져오기
        const deviceId = await getAvailableDeviceId();
        console.log('[CPU 차트] 사용할 deviceId:', deviceId);

        // API 호출 (companyDomain은 URL 경로에 포함되어 게이트웨이가 처리)
        const response = await fetchWithAuth(`${API_BASE_URL}/cpu?` + new URLSearchParams({
            deviceId: deviceId,
            hoursBack: 12,      // 과거 12시간
            hoursForward: 24    // 미래 24시간 요청
        }));

        console.log(`[CPU 차트] API 응답 상태:`, response.status);

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();

        // 30분 단위 시간 라벨 생성
        const labels = [];

        // 과거 데이터 라벨
        data.historicalData.forEach(point => {
            const time = new Date(point.timestamp);
            labels.push(time.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }));
        });

        // 예측 데이터 라벨 (있는 만큼만)
        data.predictedData.forEach(point => {
            const time = new Date(point.timestamp);
            labels.push(time.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }));
        });

        // 데이터 추출
        const currentData = data.historicalData.map(point => point.value);
        const predictedData = data.predictedData.map(point => point.value);

        console.log(`[CPU 차트] 과거 데이터 포인트: ${currentData.length}개`);
        console.log(`[CPU 차트] 예측 데이터 포인트: ${predictedData.length}개`);

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: currentData.length
        };

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        const chartTitle = `CPU 사용률 현재 + AI 예측 분석`;

        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            chartTitle
        );

        console.log(`✅ CPU 차트 렌더링 완료`);

    } catch (error) {
        console.error(`❌ CPU 차트 API 호출 실패:`, error);
        console.error(`[CPU 차트] 에러 상세:`, error.stack);
    }
}

/**
 * 메모리 예측 차트
 */
async function drawMemoryPredictionChart() {
    const canvasId = 'memoryPredictionChart';
    const canvas = document.getElementById(canvasId);

    console.log(`[메모리 차트] 캔버스 요소:`, canvas);

    try {
        // 사용 가능한 디바이스 ID 가져오기
        const deviceId = await getAvailableDeviceId();
        console.log('[메모리 차트] 사용할 deviceId:', deviceId);

        // API 호출
        const response = await fetchWithAuth(`${API_BASE_URL}/memory?` + new URLSearchParams({
            deviceId: deviceId,
            hoursBack: 12,      // 과거 12시간
            hoursForward: 24    // 미래 24시간 요청
        }));

        console.log(`[메모리 차트] API 응답 상태:`, response.status);

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();

        // 30분 단위 시간 라벨 생성
        const labels = [];
        const formatDateTime = (timestamp) => {
            const time = new Date(timestamp);
            return time.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        };

        // 과거 데이터 라벨
        data.historicalData.forEach(point => {
            labels.push(formatDateTime(point.timestamp));
        });

        // 예측 데이터 라벨
        data.predictedData.forEach(point => {
            labels.push(formatDateTime(point.timestamp));
        });

        console.log(`[메모리 차트] 데이터 포인트: 과거 ${data.historicalData.length}개, 예측 ${data.predictedData.length}개`);

        // 데이터 추출
        const currentData = data.historicalData.map(point => point.value);
        const predictedData = data.predictedData.map(point => point.value);

        const splitIndex = currentData.length;

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: splitIndex
        };

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        const chartTitle = `메모리 사용률 현재 + AI 예측 분석`;

        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            chartTitle
        );

        // 평균 신뢰도 계산 및 표시
        if (data.predictedData.length > 0) {
            const avgConfidence = data.predictedData.reduce((sum, point) =>
                sum + (point.confidenceScore || 0.9), 0) / data.predictedData.length;
            console.log(`✅ 메모리 차트 렌더링 완료 (평균 신뢰도: ${(avgConfidence * 100).toFixed(1)}%)`);
        } else {
            console.log(`✅ 메모리 차트 렌더링 완료 (예측 데이터 없음)`);
        }

    } catch (error) {
        console.error(`❌ 메모리 차트 API 호출 실패:`, error);
        console.error(`[메모리 차트] 에러 상세:`, error.stack);
    }
}

/**
 * 디스크 예측 차트
 */
async function drawDiskPredictionChart() {
    const canvasId = 'cpuPredictionChart';
    const canvas = document.getElementById(canvasId);

    console.log(`[디스크 차트] 캔버스 요소:`, canvas);

    try {
        // 사용 가능한 디바이스 ID 가져오기
        const deviceId = await getAvailableDeviceId();
        console.log('[디스크 차트] 사용할 deviceId:', deviceId);

        // API 호출
        const response = await fetchWithAuth(`${API_BASE_URL}/disk?` + new URLSearchParams({
            deviceId: deviceId,
            hoursBack: 12,      // 과거 12시간
            hoursForward: 24    // 미래 24시간 요청
        }));

        console.log(`[디스크 차트] API 응답 상태:`, response.status);

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();

        // 30분 단위 시간 라벨 생성
        const labels = [];

        // 시간 포맷 함수
        const formatTime = (timestamp) => {
            const time = new Date(timestamp);
            return time.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        };

        // 과거 데이터 라벨
        data.historicalData.forEach(point => {
            labels.push(formatTime(point.timestamp));
        });

        // 예측 데이터 라벨
        data.predictedData.forEach(point => {
            labels.push(formatTime(point.timestamp));
        });

        // 데이터 추출
        const currentData = data.historicalData.map(point => point.value);
        const predictedData = data.predictedData.map(point => point.value);

        console.log(`[디스크 차트] 과거 데이터: ${currentData.length}개, 예측 데이터: ${predictedData.length}개`);

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: currentData.length
        };

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        const chartTitle = `디스크 사용률 예측`;

        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            chartTitle
        );

        console.log(`✅ 디스크 차트 렌더링 완료`);

    } catch (error) {
        console.error(`❌ 디스크 차트 API 호출 실패:`, error);
        console.error(`[디스크 차트] 에러 상세:`, error.stack);
    }
}

/**
 * 전력량 예측 차트
 */
async function drawMonthlyWattsPredictionChart() {
    const canvasId = 'monthlyWattsPredictionChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`❌ Canvas element not found: ${canvasId}`);
        return;
    }

    try {
        console.log('[전력량 차트] API 호출 시작...');

        const response = await fetchWithAuth('/forecast/monthly', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('[전력량 차트] 응답 상태:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[전력량 차트] 에러 응답 내용:', errorText);
            throw new Error(`서버 오류: ${response.status} - ${errorText}`);
        }

        const responseText = await response.text();
        console.log('[전력량 차트] 원본 응답:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('[전력량 차트] JSON 파싱 에러:', parseError);
            throw new Error('응답 데이터 파싱 실패');
        }

        console.log('[전력량 차트] 파싱된 데이터:', data);

        // 데이터 구조 확인
        if (!data.hasOwnProperty('actual_kWh') || !data.hasOwnProperty('predicted_kWh')) {
            console.error('[전력량 차트] 예상된 데이터 구조가 아님:', Object.keys(data));
            throw new Error('데이터 구조 오류');
        }

        const used = data.actual_kWh;
        const predicted = data.predicted_kWh;

        console.log('[전력량 차트] 실제 사용량:', used, '예측 사용량:', predicted);

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        const ctx = canvas.getContext('2d');
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['6월 총 예상 사용량'],
                datasets: [
                    {
                        label: '실제 사용량',
                        data: [used],
                        backgroundColor: 'rgba(54, 162, 235, 0.9)',
                        borderRadius: 6,
                        barThickness: 30,
                        stack: 'usage'
                    },
                    {
                        label: '예측 사용량',
                        data: [predicted],
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderRadius: 6,
                        barThickness: 30,
                        stack: 'usage'
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: context => {
                                const label = context.dataset.label || '';
                                const value = context.raw?.toFixed(2);
                                return ` ${label}: ${value} kWh`;
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: '사용량 (kWh)'
                        },
                        ticks: {
                            beginAtZero: true
                        }
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            font: { weight: 'bold' }
                        }
                    }
                }
            }
        });

        console.log("✅ 월간 예측 차트 성공");
    } catch (err) {
        console.error("❌ 전력량 차트 로딩 실패:", err);
        console.error('[전력량 차트] 에러 스택:', err.stack);
    }
}

/**
 * 정확도 분석 차트
 */
function drawAccuracyChart() {
    const canvasId = 'multiMetricComparisonChart';

    const labels = ['1주 전', '6일 전', '5일 전', '4일 전', '3일 전', '2일 전', '1일 전'];

    const datasets = [
        {
            label: 'CPU 예측 정확도',
            data: [75.2, 76.8, 77.1, 77.5, 77.9, 78.2, 77.9],
            unit: 'percentage',
            borderColor: '#4682B4'
        },
        {
            label: '메모리 예측 정확도',
            data: [90.5, 91.2, 92.0, 91.8, 92.1, 92.5, 92.1],
            unit: 'percentage',
            borderColor: '#DC3545'
        },
        {
            label: '디스크 예측 정확도',
            data: [76.8, 77.5, 78.1, 77.9, 78.3, 79.0, 78.3],
            unit: 'percentage',
            borderColor: '#28A745'
        },
        {
            label: '전력량 예측 정확도',
            data: [85.2, 86.1, 87.3, 86.8, 87.5, 88.1, 87.5],
            unit: 'percentage',
            borderColor: '#FFC107'
        }
    ];

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    try {
        chartInstances[canvasId] = createMultiLineChart(
            canvasId,
            labels,
            datasets,
            'AI 모델 예측 정확도 추이 분석'
        );
        console.log(`✅ Accuracy analysis chart (${canvasId}) rendered successfully.`);
    } catch (error) {
        console.error(`❌ Failed to render accuracy chart:`, error);
    }
}
