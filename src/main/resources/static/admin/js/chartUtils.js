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