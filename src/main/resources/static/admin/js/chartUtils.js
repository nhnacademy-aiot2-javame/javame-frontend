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
