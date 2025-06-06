// admin/js/dashboardPrediction.js (수정된 버전)

import { createMixedLineChart, createMultiLineChart } from './chartUtils.js';
import {fetchWithAuth} from '/index/js/auth.js';

const chartInstances = {};

// 현재 회사 도메인과 디바이스 ID 가져오기
async function getCurrentContext() {
    try {
        // 현재 사용자 정보에서 companyDomain 가져오기
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '{}');
        const companyDomain = userInfo.companyDomain || 'javame.live';

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

        return { companyDomain, deviceId: deviceId || 'server001' };
    } catch (error) {
        console.error('컨텍스트 정보 가져오기 실패:', error);
        return { companyDomain: 'javame.live', deviceId: 'server001' };
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
    // HTML에 실제 존재하는 차트들만 그리기
    await drawCpuPredictionChart(context);
    await drawMemoryPredictionChart(context);
    await drawDiskPredictionChart(context);
    drawMonthlyWattsPredictionChart();     // ★★★ 전력량 차트 ★★★
    drawAccuracyChart();           // multiMetricComparisonChart
}

/**
 * CPU 예측 차트 (메인 차트)
 */
async function drawCpuPredictionChart(context) {
    const canvasId = 'mainPredictionMixedChart';

    try {
        // API 호출
        const response = await fetchWithAuth(`/environment/forecast/cpu?companyDomain=${context.companyDomain}&deviceId=${context.deviceId}&hoursBack=6&hoursForward=6`);

        if (!response.ok) {
            throw new Error('CPU 예측 데이터 로드 실패');
        }

        const data = await response.json();

        // 시간 라벨 생성
        const allData = [...data.historicalData, ...data.predictedData];
        const labels = allData.map(point => {
            const date = new Date(point.timestamp);
            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        });

        // 현재 데이터와 예측 데이터 분리
        const currentData = data.historicalData.map(point => point.value);
        const predictedData = data.predictedData.map(point => point.value);

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: data.historicalData.length
        };

        // 기존 차트 제거
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        // 차트 생성
        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            'CPU 사용률 현재 + AI 예측 분석'
        );

        console.log(`✅ CPU prediction chart rendered successfully.`);

    } catch (error) {
        console.error(`❌ Failed to render CPU prediction chart:`, error);
        // 에러 시 기본 데이터로 차트 표시
        drawFallbackChart(canvasId, 'CPU');
    }
}

/**
 * 메모리 예측 차트
 */
async function drawMemoryPredictionChart(context) {
    const canvasId = 'memoryPredictionChart';

    try {
        // API 호출 (24시간 예측)
        const response = await fetchWithAuth(`/environment/forecast/memory?companyDomain=${context.companyDomain}&deviceId=${context.deviceId}&hoursBack=12&hoursForward=24`);

        if (!response.ok) {
            throw new Error('메모리 예측 데이터 로드 실패');
        }

        const data = await response.json();

        // 시간 라벨 생성 (시간 단위로 표시)
        const allData = [...data.historicalData, ...data.predictedData];
        const labels = allData.map(point => {
            const date = new Date(point.timestamp);
            return date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                hour12: false
            }) + '시';
        });

        // 데이터 변환 (퍼센트를 GB로 가정)
        const currentData = data.historicalData.map(point => (point.value * 0.16).toFixed(1)); // 16GB 기준
        const predictedData = data.predictedData.map(point => (point.value * 0.16).toFixed(1));

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: data.historicalData.length
        };

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            '24시간 메모리 사용량 예측 (GB)'
        );

        console.log(` Memory prediction chart rendered successfully.`);

    } catch (error) {
        console.error(` Failed to render memory prediction chart:`, error);
        drawFallbackChart(canvasId, 'Memory');
    }
}


/**
 * 디스크 예측 차트
 */
async function drawDiskPredictionChart(context) {
    const canvasId = 'cpuPredictionChart'; // HTML ID는 그대로 유지

    try {
        // API 호출 (24시간 예측)
        const response = await fetchWithAuth(`/environment/forecast/disk?companyDomain=${context.companyDomain}&deviceId=${context.deviceId}&hoursBack=12&hoursForward=24`);

        if (!response.ok) {
            throw new Error('디스크 예측 데이터 로드 실패');
        }

        const data = await response.json();

        // 시간 라벨 생성
        const allData = [...data.historicalData, ...data.predictedData];
        const labels = allData.map(point => {
            const date = new Date(point.timestamp);
            return date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                hour12: false
            }) + ':00';
        });

        const currentData = data.historicalData.map(point => point.value);
        const predictedData = data.predictedData.map(point => point.value);

        const mixedData = {
            currentData: currentData,
            predictedData: predictedData,
            splitIndex: data.historicalData.length
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

        console.log(`✅ Disk prediction chart rendered successfully.`);

    } catch (error) {
        console.error(`❌ Failed to render disk prediction chart:`, error);
        drawFallbackChart(canvasId, 'Disk');
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
        const response = await fetchWithAuth('/forecast/monthly', { method: 'GET' });
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
