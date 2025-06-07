// admin/js/dashboardPrediction.js (수정된 버전)

import { createMixedLineChart, createMultiLineChart } from './chartUtils.js';
import {fetchWithAuth} from '/index/js/auth.js';

const chartInstances = {};

// 현재 회사 도메인과 디바이스 ID 가져오기
async function getCurrentContext() {
    try {
        // 현재 사용자 정보에서 companyDomain 가져오기
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
        const companyDomain = userInfo.companyDomain || 'javame';

        // 첫 번째 사용 가능한 서버의 deviceId 가져오기
        const treeResponse = await fetchWithAuth('/environment/companyDomain/tree');
        if (!treeResponse.ok) throw new Error('트리 데이터 로드 실패');

        const treeData = await treeResponse.json();
        let deviceId = null;

        // 트리에서 첫 번째 서버의 deviceId 찾기
        if (treeData.origins && treeData.origins.length > 0) {
            const firstOrigin = treeData.origins[0];
            if (firstOrigin.children && firstOrigin.children.length > 0) {
                deviceId = firstOrigin.children[0].value;
            }
        }

        return { companyDomain, deviceId: deviceId || '192.168.71.74' };
    } catch (error) {
        console.error('컨텍스트 정보 가져오기 실패:', error);
        return { companyDomain: 'javame', deviceId: '192.168.71.74' };
    }
}

// DOM 로드 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Prediction page loaded. Initializing AI prediction charts...");

    // ★★★ HTML에 없는 요소들에 대한 이벤트 리스너 제거 ★★★
    // 바로 차트들을 그리기
    drawAllPredictionCharts();

    // 5초마다 자동 새로고침 (실시간 효과)
    setInterval(() => {
        console.log("Auto refreshing prediction charts...");
        drawAllPredictionCharts();
    }, 60000);
});

/**
 * 모든 예측 차트를 그립니다 (HTML 구조에 맞춤)
 */
async function drawAllPredictionCharts() {
    console.log('=== 모든 예측 차트 그리기 시작 ===');

    try {
        // 모든 차트를 동시에 그리기 (병렬 처리)
        await Promise.all([
            drawMainPredictionChart(),      // CPU
            drawMemoryPredictionChart(),    // 메모리
            drawDiskPredictionChart(),      // 디스크
            drawMonthlyWattsPredictionChart(), // 전력량
            drawAccuracyChart()            // 정확도
        ]);

        console.log('=== 모든 예측 차트 그리기 완료 ===');
    } catch (error) {
        console.error('차트 그리기 중 오류 발생:', error);
    }
}
/**
 * CPU 예측 차트 (메인 차트)
 */
async function drawMainPredictionChart() {
    const canvasId = 'mainPredictionMixedChart';
    const canvas = document.getElementById(canvasId);

    console.log(`[CPU 차트] 캔버스 요소:`, canvas);

    try {
        // ★★★ 실제 API 호출 ★★★
        const response = await fetchWithAuth('/environment/forecast/cpu?' + new URLSearchParams({
            companyDomain: 'javame.net',  // 실제 도메인으로 변경 필요
            deviceId: 'server01',         // 실제 디바이스 ID로 변경 필요
            hoursBack: 6,
            hoursForward: 6
        }));

        console.log(`[CPU 차트] API 응답 상태:`, response.status);

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[CPU 차트] 받은 전체 데이터:`, data);
        console.log(`[CPU 차트] historicalData:`, data.historicalData);
        console.log(`[CPU 차트] predictedData:`, data.predictedData);
        console.log(`[CPU 차트] splitTime:`, data.splitTime);

        // 시간 라벨 생성
        const labels = [];

        // 과거 데이터 라벨
        data.historicalData.forEach(point => {
            const time = new Date(point.timestamp);
            labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
        });

        // 예측 데이터 라벨
        data.predictedData.forEach(point => {
            const time = new Date(point.timestamp);
            labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
        });

        console.log(`[CPU 차트] 생성된 라벨:`, labels);

        // 데이터 추출
        const currentData = data.historicalData.map(point => point.value);
        const predictedData = data.predictedData.map(point => point.value);

        console.log(`[CPU 차트] currentData 값:`, currentData);
        console.log(`[CPU 차트] predictedData 값:`, predictedData);

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: currentData.length
        };

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            'CPU 사용률 현재 + AI 예측 분석'
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
        // ★★★ 실제 API 호출 ★★★
        const response = await fetchWithAuth('/environment/forecast/memory?' + new URLSearchParams({
            companyDomain: 'javame.net',  // 실제 도메인으로 변경 필요
            deviceId: 'server01',         // 실제 디바이스 ID로 변경 필요
            hoursBack: 168,               // 7일 = 168시간
            hoursForward: 72              // 3일 = 72시간
        }));

        console.log(`[메모리 차트] API 응답 상태:`, response.status);

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[메모리 차트] 받은 전체 데이터:`, data);
        console.log(`[메모리 차트] historicalData 개수:`, data.historicalData?.length);
        console.log(`[메모리 차트] predictedData 개수:`, data.predictedData?.length);

        // 일별로 데이터 그룹화 (일 평균 계산)
        const dailyData = {};
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        // 과거 데이터 처리
        data.historicalData.forEach(point => {
            const date = new Date(point.timestamp);
            const dayKey = date.toLocaleDateString('ko-KR');

            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    values: [],
                    dayName: dayNames[date.getDay()],
                    isPredicted: false
                };
            }
            dailyData[dayKey].values.push(point.value);
        });

        // 예측 데이터 처리
        data.predictedData.forEach(point => {
            const date = new Date(point.timestamp);
            const dayKey = date.toLocaleDateString('ko-KR');

            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    values: [],
                    dayName: dayNames[date.getDay()],
                    isPredicted: true
                };
            }
            dailyData[dayKey].values.push(point.value);
            dailyData[dayKey].isPredicted = true;
        });

        console.log(`[메모리 차트] 일별 그룹화된 데이터:`, dailyData);

        // 라벨과 데이터 배열 생성
        const labels = [];
        const currentData = [];
        const predictedData = [];

        Object.entries(dailyData).forEach(([date, data]) => {
            const avgValue = data.values.reduce((a, b) => a + b, 0) / data.values.length;
            labels.push(data.dayName);

            if (data.isPredicted) {
                currentData.push(null);
                predictedData.push(avgValue);
            } else {
                currentData.push(avgValue);
                predictedData.push(null);
            }
        });

        console.log(`[메모리 차트] 최종 labels:`, labels);
        console.log(`[메모리 차트] 최종 currentData:`, currentData);
        console.log(`[메모리 차트] 최종 predictedData:`, predictedData);

        const splitIndex = currentData.filter(v => v !== null).length;

        const mixedData = {
            currentData: currentData.filter(v => v !== null),
            predictedData: predictedData.filter(v => v !== null),
            splitIndex: splitIndex
        };

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels.slice(0, 7), // 최대 7일만 표시
            mixedData,
            '주간 메모리 사용량 예측 (%)'
        );

        console.log(`✅ 메모리 차트 렌더링 완료`);

    } catch (error) {
        console.error(`❌ 메모리 차트 API 호출 실패:`, error);
        console.error(`[메모리 차트] 에러 상세:`, error.stack);
    }
}


/**
 * 디스크 예측 차트
 */
async function drawDiskPredictionChart() {
    const canvasId = 'cpuPredictionChart'; // HTML에서는 디스크지만 ID는 cpu
    const canvas = document.getElementById(canvasId);

    console.log(`[디스크 차트] 캔버스 요소:`, canvas);

    try {
        // ★★★ 실제 API 호출 ★★★
        const response = await fetchWithAuth('/environment/forecast/disk?' + new URLSearchParams({
            companyDomain: 'javame.net',  // 실제 도메인으로 변경 필요
            deviceId: 'server01',         // 실제 디바이스 ID로 변경 필요
            hoursBack: 12,
            hoursForward: 12
        }));

        console.log(`[디스크 차트] API 응답 상태:`, response.status);

        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[디스크 차트] 받은 전체 데이터:`, data);
        console.log(`[디스크 차트] resourceType:`, data.resourceType);
        console.log(`[디스크 차트] historicalData 샘플:`, data.historicalData?.slice(0, 3));
        console.log(`[디스크 차트] predictedData 샘플:`, data.predictedData?.slice(0, 3));

        // 시간 라벨 생성
        const labels = [];

        // 과거 데이터 라벨
        data.historicalData.forEach(point => {
            const time = new Date(point.timestamp);
            labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
        });

        // 예측 데이터 라벨
        data.predictedData.forEach(point => {
            const time = new Date(point.timestamp);
            labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
        });

        // 데이터 추출
        const currentData = data.historicalData.map(point => {
            console.log(`[디스크 차트] historical 데이터 포인트:`, point);
            return point.value;
        });

        const predictedData = data.predictedData.map(point => {
            console.log(`[디스크 차트] predicted 데이터 포인트:`, point);
            return point.value;
        });

        console.log(`[디스크 차트] currentData 최종값:`, currentData);
        console.log(`[디스크 차트] predictedData 최종값:`, predictedData);

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: currentData.length
        };

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            '24시간 디스크 사용률 예측 (%)'
        );

        console.log(`✅ 디스크 차트 렌더링 완료`);

    } catch (error) {
        console.error(`❌ 디스크 차트 API 호출 실패:`, error);
        console.error(`[디스크 차트] 에러 상세:`, error.stack);
    }
}
/**
 * 에러 시 폴백 차트 그리기
 */
function drawFallbackChart(canvasId, resourceType) {
    const now = new Date();
    const labels = [];

    // 12시간 전부터 12시간 후까지
    for (let i = -12; i <= 12; i++) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    }

    // 더미 데이터 생성
    const currentData = Array.from({ length: 13 }, () => Math.random() * 30 + 50);
    const predictedData = Array.from({ length: 12 }, () => Math.random() * 30 + 55);

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 13
    };

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    chartInstances[canvasId] = createMixedLineChart(
        canvasId,
        labels,
        mixedData,
        `${resourceType} 사용률 예측 (데모 데이터)`
    );
}
/**
 * ★★★ 전력량 예측 차트 (핵심!) ★★★
 */
/**
 * ★★★ 전력량 예측 차트 (스마트 리팩터링) ★★★
 */
async function drawMonthlyWattsPredictionChart() {
    const canvasId = 'monthlyWattsPredictionChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`❌ Canvas element not found: ${canvasId}`);
        return;
    }

    try {
        const response = await fetchWithAuth('/environment/forecast/monthly', { method: 'GET' });
        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();
        const used = data.actual_kWh;
        const predicted = data.predicted_kWh;

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
        console.error("❌ 차트 로딩 실패:", err);
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
            data: [85.2, 86.1, 87.3, 86.8, 87.5, 88.1, 87.5],
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
            data: [75.2, 76.8, 77.1, 77.5, 77.9, 78.2, 77.9],
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
