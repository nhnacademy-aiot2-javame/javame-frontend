// admin/js/dashboardPrediction.js (수정된 버전)

import { createMixedLineChart, createMultiLineChart } from './chartUtils.js';
import {fetchWithAuth} from '/index/js/auth.js';

const chartInstances = {};

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
function drawAllPredictionCharts() {
    // HTML에 실제 존재하는 차트들만 그리기
    drawMainPredictionChart();      // mainPredictionMixedChart
    drawMemoryPredictionChart();    // memoryPredictionChart
    drawDiskPredictionChart();      // cpuPredictionChart (실제로는 디스크)
    drawMonthlyWattsPredictionChart();     // ★★★ 전력량 차트 ★★★
    drawAccuracyChart();           // multiMetricComparisonChart
}

/**
 * 메인 예측 차트
 */
function drawMainPredictionChart() {
    const canvasId = 'mainPredictionMixedChart';

    const now = new Date();
    const labels = [];
    for (let i = -6; i <= 6; i++) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    }

    const currentData = [65, 72, 68, 75, 82, 78, 85];
    const predictedData = [85, 88, 92, 89, 86, 83];

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 7
    };

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    try {
        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            'CPU 사용률 현재 + AI 예측 분석'
        );
        console.log(`✅ Main prediction chart (${canvasId}) rendered successfully.`);
    } catch (error) {
        console.error(`❌ Failed to render main prediction chart:`, error);
    }
}

/**
 * 메모리 예측 차트
 */
function drawMemoryPredictionChart() {
    const canvasId = 'memoryPredictionChart';

    const labels = ['월', '화', '수', '목', '금', '토', '일'];
    const currentData = [4.2, 4.8, 5.1, 5.5];
    const predictedData = [5.8, 6.2, 6.0];

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 4
    };

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    try {
        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            '주간 메모리 사용량 예측 (GB)'
        );
        console.log(`✅ Memory prediction chart (${canvasId}) rendered successfully.`);
    } catch (error) {
        console.error(`❌ Failed to render memory prediction chart:`, error);
    }
}

/**
 * 디스크 예측 차트
 */
function drawDiskPredictionChart() {
    const canvasId = 'cpuPredictionChart'; // HTML에서는 디스크지만 ID는 cpu

    const labels = [];
    const currentHour = new Date().getHours();
    for (let i = 0; i < 24; i++) {
        const hour = (currentHour + i) % 24;
        labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    const currentData = Array.from({ length: 12 }, (_, i) => {
        return 45 + Math.sin(i * Math.PI / 6) * 15 + Math.random() * 8;
    });

    const predictedData = Array.from({ length: 12 }, (_, i) => {
        return 50 + Math.sin((i + 12) * Math.PI / 6) * 12 + i * 1.5 + Math.random() * 6;
    });

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 12
    };

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    try {
        chartInstances[canvasId] = createMixedLineChart(
            canvasId,
            labels,
            mixedData,
            '24시간 디스크 사용률 예측 (%)'
        );
        console.log(`✅ Disk prediction chart (${canvasId}) rendered successfully.`);
    } catch (error) {
        console.error(`❌ Failed to render disk prediction chart:`, error);
    }
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
