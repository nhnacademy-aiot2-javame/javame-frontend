// chartUtils.js
/**
 * 차트 유틸리티 함수
 * Chart.js를 사용한 차트 생성 함수들을 제공합니다.
 */

/**
 * 영역 차트를 생성합니다.
 * @param {string} canvasId 캔버스 요소의 ID
 * @param {Array<string>} labels X축 라벨
 * @param {Array<number>} data 데이터 값
 * @param {string} title 차트 제목
 */
export function createAreaChart(canvasId, labels, data, title = 'Area Chart') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID ${canvasId}를 찾을 수 없습니다.`);
        return;
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                lineTension: 0.3,
                backgroundColor: "rgba(42, 85, 85, 0.2)",
                borderColor: "rgba(42, 85, 85, 1)",
                pointRadius: 5,
                pointBackgroundColor: "rgba(42, 85, 85, 1)",
                pointBorderColor: "rgba(255, 255, 255, 0.8)",
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "rgba(42, 85, 85, 1)",
                pointHitRadius: 50,
                pointBorderWidth: 2,
                data: data,
            }],
        },
        options: {
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        beginAtZero: true
                    },
                    grid: {
                        color: "rgba(0, 0, 0, .125)",
                    }
                },
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * 막대 차트를 생성합니다.
 * @param {string} canvasId 캔버스 요소의 ID
 * @param {Array<string>} labels X축 라벨
 * @param {Array<number>} data 데이터 값
 * @param {string} title 차트 제목
 */
export function createBarChart(canvasId, labels, data, title = 'Bar Chart') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID ${canvasId}를 찾을 수 없습니다.`);
        return;
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                backgroundColor: "rgba(42, 85, 85, 1)",
                borderColor: "rgba(42, 85, 85, 1)",
                data: data,
            }],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        beginAtZero: true
                    },
                    grid: {
                        display: true
                    }
                },
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * 파이 차트를 생성합니다.
 * @param {string} canvasId 캔버스 요소의 ID
 * @param {Array<string>} labels 라벨
 * @param {Array<number>} data 데이터 값
 */
export function createPieChart(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID ${canvasId}를 찾을 수 없습니다.`);
        return;
    }

    // 파이 차트에 사용할 배경색 배열
    const backgroundColors = [
        'rgba(42, 85, 85, 1)',
        'rgba(220, 53, 69, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(25, 135, 84, 1)',
        'rgba(13, 202, 240, 1)',
        'rgba(108, 117, 125, 1)',
        'rgba(0, 123, 255, 1)',
        'rgba(111, 66, 193, 1)',
        'rgba(253, 126, 20, 1)',
        'rgba(32, 201, 151, 1)'
    ];

    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, data.length),
            }],
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * 대시보드 카드 데이터를 업데이트합니다.
 * @param {string} cardId 카드 요소의 ID
 * @param {string} title 카드 제목
 * @param {string} value 카드 값
 * @param {string} bgClass 배경색 클래스 (예: bg-primary, bg-success 등)
 */
export function updateDashboardCard(cardId, title, value, bgClass = 'bg-primary') {
    const cardElement = document.getElementById(cardId);
    if (!cardElement) {
        console.error(`카드 ID ${cardId}를 찾을 수 없습니다.`);
        return;
    }

    // 카드의 배경색 클래스 변경
    cardElement.className = `card ${bgClass} text-white mb-4`;

    // 카드 제목과 값 업데이트
    const cardBodyElement = cardElement.querySelector('.card-body');
    if (cardBodyElement) {
        cardBodyElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="me-2">
                    <div class="text-xs font-weight-bold text-uppercase mb-1">${title}</div>
                    <div class="h5 mb-0 font-weight-bold">${value}</div>
                </div>
                <div>
                    <i class="fas fa-sensor fa-2x text-white-50"></i>
                </div>
            </div>
        `;
    }
}

export function createGaugeChart(
    canvasId,
    value,
    label,
    title = '',
    colors = ['rgba(42, 85, 85, 1)', 'rgba(220, 220, 220, 0.3)'], // 배경색 투명도 약간 조절
    valueFont = 'bold 1.5rem sans-serif',
    titleFont = '0.8rem sans-serif'
) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID '${canvasId}'를 찾을 수 없습니다.`);
        return null; // 오류 발생 시 null 반환 또는 에러 throw
    }

    // 값 보정 (0에서 100 사이로 제한)
    const normalizedValue = Math.max(0, Math.min(100, value));

    const data = {
        datasets: [{
            data: [normalizedValue, 100 - normalizedValue], // 값과 나머지 부분
            backgroundColor: colors,
            borderWidth: 0, // 테두리 없음으로 깔끔한 모양
        }]
    };

    // 중앙 텍스트 표시를 위한 커스텀 플러그인
    const centerTextPlugin = {
        id: 'gaugeCenterText', // 플러그인 ID는 고유하게
        afterDraw: function(chart) { // afterDraw는 모든 그리기가 끝난 후 호출
            if (chart.data.datasets.length === 0) {
                return;
            }
            const chartCtx = chart.ctx; // chart.ctx 사용 (Chart.js 2.x)
            const chartArea = chart.chartArea;

            // chartArea가 유효한지 확인 (차트가 완전히 그려지기 전에는 없을 수 있음)
            if (!chartArea || !chartArea.left) {
                return;
            }

            const { left, right, top, bottom } = chartArea;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;

            chartCtx.save();

            // 메인 라벨 (값)
            chartCtx.font = valueFont;
            chartCtx.fillStyle = colors[0] || 'black'; // 값 부분 색상 사용, 없으면 검정
            chartCtx.textAlign = 'center';
            chartCtx.textBaseline = 'middle';
            chartCtx.fillText(label, centerX, centerY);

            // 보조 제목 (타이틀) - title이 제공된 경우에만 그림
            if (title) {
                chartCtx.font = titleFont;
                chartCtx.fillStyle = 'grey'; // 일반적인 보조 텍스트 색상
                chartCtx.fillText(title, centerX, centerY + parseFloat(valueFont) * 12 + 5); // 메인 라벨 아래 간격 조절 (폰트 크기 기반)
            }
            chartCtx.restore();
        }
    };

    // Chart.js 2.8.0에 맞춘 옵션
    return new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false, // 부모 컨테이너 크기에 맞게 조절
            cutoutPercentage: 80,      // 도넛의 중앙 빈 공간 비율 (80% -> 20% 두께)
            rotation: -0.5 * Math.PI,  // 시작점을 상단(12시 방향)으로 설정 (기본값은 3시 방향)
            circumference: 2 * Math.PI, // 전체 원 (360도)
            legend: {
                display: false // 범례는 게이지 차트에서 보통 숨김
            },
            tooltips: {
                enabled: false // 툴팁도 게이지 차트에서 보통 숨김
            },
            animation: { // 부드러운 초기 애니메이션 효과
                animateRotate: true,
                animateScale: false // 크기 변경 애니메이션은 제외 가능
            },
            // 클릭과 같은 차트 이벤트를 비활성화하여 순수 표시용으로 만들 수 있음 (선택 사항)
            // events: []
        },
        plugins: [centerTextPlugin] // 위에서 정의한 커스텀 플러그인 등록
    });
}

// canvasId: 차트를 그릴 <canvas> 요소의 ID
// barDataArray: 바 차트로 표시할 데이터 값들의 배열 (예: [10, 20, 30])
// lineDataArray: 라인 차트로 표시할 데이터 값들의 배열 (예: [15, 25, 35])
// barDatasetLabel: 바 차트 데이터셋의 이름 (범례용, 예: "현재 값")
// lineDatasetLabel: 라인 차트 데이터셋의 이름 (범례용, 예: "과거 평균")
// xAxisLabels: X축에 표시될 공통 라벨 배열 (예: ["항목A", "항목B", "항목C"])
export function createComboBarLineChart(canvasId, barDataArray, lineDataArray, barDatasetLabel, lineDatasetLabel, xAxisLabels) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error("캔버스 ID ${canvasId}를 찾을 수 없습니다.");
    }
    return new Chart(ctx, {
        type: 'bar',
        data : {
            labels : xAxisLabels,
            datasets: [
                {
                    label: barDatasetLabel,
                    data: barDataArray,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    order: 1
                },
                {
                    label: lineDatasetLabel,
                    data: lineDataArray,
                    type: 'line',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    fill: false,

                    tension: 0.4, // 선의 곡률 (0은 직선, 0.4는 부드러운 곡선)
                    borderWidth: 2, // 선 두께
                    pointRadius: 4, // 데이터 포인트 원 크기
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)', // 포인트 채우기 색
                    pointHoverRadius: 6, // 마우스 오버 시 포인트 원 크기
                    order: 0, // 라인을 앞에
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { // v3+ 상호작용 설정
                mode: 'index', // 같은 X축 인덱스에 있는 모든 데이터셋의 툴팁을 함께 표시
                intersect: false, // 마우스가 정확히 데이터 포인트 위에 있지 않아도 가까우면 툴팁 표시
            },
            scales: {
                x: { // v3+ X축 설정은 'x' 객체 사용
                    grid: {
                        display: false // X축 그리드 라인 숨김
                    },
                    title: { // X축 제목
                        display: true,
                        text: '항목', // 예시 X축 제목
                        font: { size: 14 }
                    }
                },
                y: { // v3+ Y축 설정은 'y' 객체 사용 (첫 번째 Y축 - 바 차트용)
                    // id: 'yBar', // 이중 축 사용 시
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)' // Y축 그리드 라인 색상
                    },
                    title: { // Y축 제목
                        display: true,
                        text: barDatasetLabel, // 또는 "값", "수량" 등
                        font: { size: 14 }
                    }
                }
            },
            plugins: { // v3+ 범례, 툴팁, 제목 등은 plugins 객체 안으로
                legend: {
                    display: true,
                    position: 'top', // 범례 위치
                    labels: {
                        font: { size: 12 },
                        usePointStyle: true, // 범례 아이콘을 포인트 스타일로
                        padding: 20 // 범례 항목 간 간격
                    }
                },
                title: { // 차트 전체 제목
                    display: true,
                    text: '데이터 조합 차트 (현재 vs 과거)',
                    font: { size: 18, weight: 'bold' },
                    padding: { top: 10, bottom: 30 }
                },
                tooltip: { // 툴팁 설정
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    caretSize: 6, // 툴팁 화살표 크기
                    cornerRadius: 4, // 툴팁 모서리 둥글기
                    // 툴팁 내용 커스터마이징 콜백
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('ko-KR').format(context.parsed.y); // 숫자 포맷팅
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value, context) => {
                        return value; // 막대 위에 값 표시
                    },
                    font: {
                        weight: 'bold'
                    }
                }
            },
            animation: { // 고급 애니메이션 설정
                duration: 1000, // 애니메이션 지속 시간 (ms)
                easing: 'easeInOutQuart', // 다양한 easing 효과 사용 가능
                // 다른 애니메이션 옵션들도 많음 (onProgress, onComplete 콜백 등)
                // 예: 특정 데이터 변경 시 애니메이션 종류 정의
                x: { type: 'number', easing: 'linear', duration: delayBetweenPoints, from: NaN, delay: delayBetweenPoints * previousData.length },
                y: { type: 'number', easing: 'linear', duration: delayBetweenPoints, from: previousData.value }
            },
            // 차트 클릭 등 이벤트 핸들링
            onClick: (event, elements, chart) => {
                if (elements.length > 0) {
                    const firstPoint = elements[0];
                    const datasetIndex = firstPoint.datasetIndex;
                    const index = firstPoint.index;
                    const value = chart.data.datasets[datasetIndex].data[index];
                    console.log(`Clicked on: ${chart.data.labels[index]}, Dataset: ${chart.data.datasets[datasetIndex].label}, Value: ${value}`);
                }
            }
        }
    });
}