// admin/js/dashboardPrediction.js

// chartUtils.js에서 믹스 라인 차트 생성 함수 import
import { createMixedLineChart, createMultiLineChart } from './chartUtils.js';

// 차트 인스턴스를 저장할 객체
const chartInstances = {};

// DOM 로드 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Prediction page loaded. Initializing AI prediction charts...");

    // 1. 예측 대상 선택 체크박스 영역 (더미 데이터)
    initializeDummyPredictionTargets();

    // 2. "AI 예측 차트 생성" 버튼 이벤트 리스너
    const generatePredictionButton = document.getElementById('generatePredictionChartButton');
    if (generatePredictionButton) {
        generatePredictionButton.addEventListener('click', () => {
            console.log("Generate prediction button clicked. Drawing AI prediction charts...");
            drawDummyPredictionCharts();
        });
    }

    // 3. 예측 기간 선택 드롭다운 이벤트
    const predictionPeriodSelect = document.getElementById('predictionPeriodSelect');
    if (predictionPeriodSelect) {
        predictionPeriodSelect.addEventListener('change', (e) => {
            console.log(`Prediction period changed to: ${e.target.value}`);
            updatePredictionPeriod(e.target.value);
        });
    }

    // 4. 새로고침 버튼 이벤트
    const refreshPredictionButton = document.getElementById('refreshPredictionButton');
    if (refreshPredictionButton) {
        refreshPredictionButton.addEventListener('click', () => {
            console.log("Refresh prediction button clicked.");
            drawDummyPredictionCharts();
        });
    }

    // 5. 페이지 로드 시 바로 더미 예측 차트들을 그려봅니다
    drawDummyPredictionCharts();
});

/**
 * 더미 예측 대상 체크박스를 생성합니다.
 */
function initializeDummyPredictionTargets() {
    const container = document.getElementById('predictionTargetCheckboxContainer');
    if (!container) return;

    container.innerHTML = ''; // 기존 내용 제거

    const dummyTargets = [
        { id: 'cpu_usage', name: 'CPU 사용률', unit: '%' },
        { id: 'memory_usage', name: '메모리 사용량', unit: 'GB' },
        { id: 'disk_usage', name: '디스크 사용량', unit: '%' },
        { id: 'power_watts', name: '전력 소비량', unit: 'W' }  // ★★★ 전력량 추가 ★★★
    ];

    dummyTargets.forEach((target, index) => {
        const div = document.createElement('div');
        div.classList.add('form-check', 'form-check-inline', 'mb-2');
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${target.id}" 
                   id="chkTarget${index}" ${index < 3 ? 'checked' : ''}>
            <label class="form-check-label" for="chkTarget${index}">
                ${target.name} (${target.unit})
            </label>
        `;
        container.appendChild(div);
    });
}

/**
 * 더미 데이터를 사용하여 AI 예측 차트들을 생성합니다.
 */
function drawDummyPredictionCharts() {
    // HTML에 맞춰 실제 존재하는 차트들만 그리기
    drawDummyMainMixedChart();      // mainPredictionMixedChart
    drawDummyMemoryPredictionChart(); // memoryPredictionChart
    drawDummyCpuPredictionChart();   // cpuPredictionChart (디스크로 표시되지만 ID는 cpu)
    drawDummyWattsPredictionChart(); // wattsPredictionMixedChart ★★★ 전력량 차트 추가 ★★★
    drawDummyAccuracyChart();       // multiMetricComparisonChart (정확도 분석)
}

/**
 * 메인 믹스 라인 차트 (현재 데이터 + AI 예측 데이터)
 */
function drawDummyMainMixedChart() {
    const canvasId = 'mainPredictionMixedChart';

    // 시간 라벨 생성 (현재 시간 기준 과거 6시간 + 미래 6시간)
    const now = new Date();
    const labels = [];
    for (let i = -6; i <= 6; i++) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    }

    // 더미 현재 데이터 (과거 6시간 + 현재 1시간)
    const currentData = [65, 72, 68, 75, 82, 78, 85];

    // 더미 AI 예측 데이터 (현재부터 미래 6시간)
    const predictedData = [85, 88, 92, 89, 86, 83];

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 7
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

    console.log(`Main mixed chart (${canvasId}) rendered successfully.`);
}

/**
 * 메모리 사용량 예측 차트
 */
function drawDummyMemoryPredictionChart() {
    const canvasId = 'memoryPredictionChart';

    // 일주일 예측 (일별)
    const labels = ['월', '화', '수', '목', '금', '토', '일'];

    // 현재 데이터 (과거 3일 + 오늘)
    const currentData = [4.2, 4.8, 5.1, 5.5];

    // 예측 데이터 (내일부터 3일)
    const predictedData = [5.8, 6.2, 6.0];

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 4
    };

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    chartInstances[canvasId] = createMixedLineChart(
        canvasId,
        labels,
        mixedData,
        '주간 메모리 사용량 예측 (GB)'
    );

    console.log(`Memory prediction chart (${canvasId}) rendered.`);
}

/**
 * CPU/디스크 예측 차트 (HTML에서는 디스크로 표시되지만 ID는 cpuPredictionChart)
 */
function drawDummyCpuPredictionChart() {
    const canvasId = 'cpuPredictionChart';

    // 24시간 예측 데이터
    const labels = [];
    const currentHour = new Date().getHours();
    for (let i = 0; i < 24; i++) {
        const hour = (currentHour + i) % 24;
        labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // 디스크 사용률 더미 데이터 (현재 12시간)
    const currentData = Array.from({ length: 12 }, (_, i) => {
        return 45 + Math.sin(i * Math.PI / 6) * 15 + Math.random() * 8;
    });

    // 디스크 예측 데이터 (미래 12시간) - 점진적 증가 트렌드
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

    chartInstances[canvasId] = createMixedLineChart(
        canvasId,
        labels,
        mixedData,
        '24시간 디스크 사용률 예측 (%)'
    );

    console.log(`CPU/Disk prediction chart (${canvasId}) rendered.`);
}

/**
 * ★★★ 전력량 예측 차트 (새로 추가) ★★★
 */
function drawDummyWattsPredictionChart() {
    const canvasId = 'wattsPredictionMixedChart';

    // 12시간 전력 소비량 예측
    const labels = [];
    const currentHour = new Date().getHours();
    for (let i = -6; i <= 6; i++) {
        const hour = (currentHour + i + 24) % 24;
        labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // 현재 전력 소비량 데이터 (과거 6시간 + 현재 1시간) - Watts 단위
    const currentData = [1250, 1180, 1320, 1450, 1380, 1290, 1420];

    // 예측 전력 소비량 데이터 (미래 6시간) - 업무시간 증가 패턴
    const predictedData = [1480, 1520, 1580, 1650, 1590, 1510];

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 7
    };

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    chartInstances[canvasId] = createMixedLineChart(
        canvasId,
        labels,
        mixedData,
        '전력 소비량 예측 분석 (Watts)'
    );

    console.log(`Watts prediction chart (${canvasId}) rendered successfully.`);
}

/**
 * 정확도 분석 차트 (다중 메트릭 비교에서 정확도 분석으로 변경)
 */
function drawDummyAccuracyChart() {
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

    chartInstances[canvasId] = createMultiLineChart(
        canvasId,
        labels,
        datasets,
        'AI 모델 예측 정확도 추이 분석'
    );

    console.log(`Accuracy analysis chart (${canvasId}) rendered.`);
}

/**
 * 예측 기간 변경 시 차트 업데이트
 */
function updatePredictionPeriod(period) {
    console.log(`Updating prediction period to: ${period}`);

    switch (period) {
        case '1hour':
            drawDummyShortTermPrediction();
            break;
        case '6hours':
            drawDummyMainMixedChart(); // 기본 6시간 예측
            break;
        case '24hours':
            drawDummyCpuPredictionChart(); // 24시간 예측
            break;
        case '7days':
            drawDummyMemoryPredictionChart(); // 7일 예측
            break;
        default:
            drawDummyMainMixedChart();
    }

    // 전력량 차트도 기간에 맞춰 업데이트
    drawDummyWattsPredictionChart();
}

/**
 * 단기 예측 (1시간) 차트
 */
function drawDummyShortTermPrediction() {
    const canvasId = 'mainPredictionMixedChart';

    // 분 단위 라벨 (과거 30분 + 미래 30분)
    const labels = [];
    const now = new Date();
    for (let i = -30; i <= 30; i += 5) { // 5분 간격
        const time = new Date(now.getTime() + i * 60 * 1000);
        labels.push(time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    }

    // 현재 데이터 (과거 30분)
    const currentData = Array.from({ length: 7 }, (_, i) => {
        return 75 + Math.sin(i * Math.PI / 3) * 10 + Math.random() * 5;
    });

    // 예측 데이터 (미래 30분)
    const predictedData = Array.from({ length: 6 }, (_, i) => {
        return 78 + Math.sin((i + 7) * Math.PI / 3) * 8 + Math.random() * 3;
    });

    const mixedData = {
        currentData: currentData,
        predictedData: predictedData,
        splitIndex: 7
    };

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    chartInstances[canvasId] = createMixedLineChart(
        canvasId,
        labels,
        mixedData,
        '1시간 단기 CPU 사용률 예측'
    );

    console.log('Short-term prediction chart updated.');
}

/**
 * 선택된 예측 대상 목록 가져오기
 */
function getSelectedPredictionTargets() {
    const checkboxes = document.querySelectorAll('#predictionTargetCheckboxContainer input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}
