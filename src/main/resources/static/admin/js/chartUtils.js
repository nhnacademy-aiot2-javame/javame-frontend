/**
 * 차트 유틸리티 함수
 * Chart.js를 사용한 차트 생성 함수들을 제공합니다.
 * chartUtils.js
 */

/**
 * 영역 차트를 생성합니다.
 * @param {string} canvasId 캔버스 요소의 ID
 * @param {Array<string>} labels X축 라벨
 * @param {Array<number>} data 데이터 값
 * @param {string} title 차트 제목
 */
export function createAreaChart(canvasId, labels, data, title = 'Area Chart', rawData = []) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (window[canvasId + '_chart']) window[canvasId + '_chart'].destroy();

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: "rgba(54, 162, 235, 0.2)",
                borderColor: "rgba(54, 162, 235, 1)",
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                    }
                },
                y: {
                    beginAtZero: false,  // ★ 수정: true → false
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2);  // ★ 추가: 소수점 1자리로 표시
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // context.dataIndex와 rawData의 인덱스 일치한다고 가정
                            let timeStr = '';
                            if (rawData?.length && rawData[context.dataIndex]?.time) {
                                const date = new Date(rawData[context.dataIndex].time);
                                timeStr = date.toLocaleString('ko-KR');
                            }
                            return `${title}: ${context.parsed.y.toFixed(2)}${timeStr ? ' ('+timeStr+')' : ''}`;
                        }
                    }
                }
            }
        }
    });

    window[canvasId + '_chart'] = chart;
    return chart;
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
        return null;
    }

    // 기존 차트 인스턴스 제거 (window에 보관)
    if (window[canvasId + '_chart']) {
        window[canvasId + '_chart'].destroy();
    }

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: "rgba(75, 192, 192, 0.8)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    grid: { display: true }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    window[canvasId + '_chart'] = chart;
    return chart;
}

/**
 * 파이 차트를 생성합니다.
 * @param {string} canvasId 캔버스 요소의 ID
 * @param {Array<string>} labels 라벨
 * @param {Array<number>} data 데이터 값
 * @param {string} title 차트 제목
 */
export function createPieChart(canvasId, labels, data, title = 'Pie Chart') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // 기존 차트 제거
    if (window[canvasId + '_chart']) window[canvasId + '_chart'].destroy();

    // 컬러 팔레트
    const backgroundColors = [
        'rgba(255, 99, 132, 0.8)',  'rgba(54, 162, 235, 0.8)',  'rgba(255, 205, 86, 0.8)',  'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',  'rgba(199, 199, 199, 0.8)', 'rgba(83, 102, 255, 0.8)',
        'rgba(105, 255, 132, 0.8)', 'rgba(200, 100, 250, 0.8)', 'rgba(80, 200, 120, 0.8)',  'rgba(240, 180, 60, 0.8)',
        'rgba(160, 230, 240, 0.8)', 'rgba(255, 80, 180, 0.8)',  'rgba(50, 60, 220, 0.8)',   'rgba(210, 210, 50, 0.8)',
        'rgba(90, 120, 200, 0.8)',  'rgba(0, 175, 255, 0.8)',   'rgba(255, 0, 120, 0.8)',   'rgba(10, 130, 50, 0.8)'
    ];

    // hidden 인덱스 트래킹
    let hiddenIndexes = [];

    // 파이차트 Chart.js 인스턴스
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, data.length),
                borderWidth: 2,
                borderColor: '#fff'
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: !!title, text: title, font: { size: 18 } }
            }
        }
    });

    // 커스텀 legend 직접 구현
    const legendContainer = document.getElementById('pieChartLegend');
    if (legendContainer) {
        legendContainer.style.maxHeight = "160px";
        legendContainer.style.overflowY = "auto";
        legendContainer.style.marginTop = "8px";

        // legend 아이템 그리기 함수 (토글 반영)
        function renderLegend() {
            legendContainer.innerHTML = labels.map((label, i) => {
                const hidden = hiddenIndexes.includes(i);
                return `
                    <div class="pie-legend-item" data-index="${i}"
                        style="display:flex;align-items:center;cursor:pointer;opacity:${hidden ? 0.5 : 1};margin-bottom:4px;">
                        <span style="display:inline-block;width:14px;height:14px;border-radius:3px;
                            background:${backgroundColors[i % backgroundColors.length]};
                            margin-right:8px;border:1px solid #999;
                            ${hidden ? 'filter:grayscale(70%);' : ''}
                        "></span>
                        <span style="font-size:14px;">${label} (${data[i]})</span>
                    </div>
                `;
            }).join('');
        }

        renderLegend();

        // 이벤트 위임: 클릭시 해당 파이 슬라이스 show/hide
        legendContainer.onclick = (e) => {
            let item = e.target.closest('.pie-legend-item');
            if (!item) return;
            const idx = parseInt(item.getAttribute('data-index'));
            if (hiddenIndexes.includes(idx)) {
                hiddenIndexes = hiddenIndexes.filter(i => i !== idx);
            } else {
                hiddenIndexes.push(idx);
            }
            chart.toggleDataVisibility(idx);
            chart.update();
            renderLegend();
        };
    }

    window[canvasId + '_chart'] = chart;
    return chart;
}

/**
 * 게이지 차트를 생성합니다.
 * @param canvasId 차트를 그릴 canvas 요소의 ID
 * @param value 표시할 값
 * @param label 중앙에 표시 될 텍스트
 * @param title 라벨 아래 작은 제목
 * @param colors 색상
 * @param valueFont 값의 폰트 스타일
 * @param titleFont 제목의 폰트 스타일
 */
export function createGaugeChart(
    canvasId,
    value,
    label,
    title = '',
    colors = ['rgba(54, 162, 235, 1)', 'rgba(220, 220, 220, 0.3)'],
    valueFont = 'bold 1.5rem sans-serif',
    titleFont = '0.8rem sans-serif'
) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID '${canvasId}'를 찾을 수 없습니다.`);
        return null;
    }

    if (Chart.getChart(canvasId)) {
        Chart.getChart(canvasId).destroy();
    }

    const normalizedValue = Math.max(0, Math.min(100, value));

    const centerTextPlugin = {
        id: 'gaugeCenterText',
        afterDraw: function(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;

            const { left, right, top, bottom } = chartArea;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;

            ctx.save();
            ctx.font = valueFont;
            ctx.fillStyle = colors[0];
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, centerX, centerY);

            if (title) {
                ctx.font = titleFont;
                ctx.fillStyle = 'grey';
                ctx.fillText(title, centerX, centerY + 25);
            }
            ctx.restore();
        }
    };

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [normalizedValue, 100 - normalizedValue],
                backgroundColor: colors,
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            rotation: -90,
            circumference: 180,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        },
        plugins: [centerTextPlugin]
    });
}

/**
 * 바 차트 + 라인 차트
 * @param canvasId
 * @param barDataArray
 * @param lineDataArray
 * @param barDatasetLabel
 * @param lineDatasetLabel
 * @param xAxisLabels
 * @returns {Chart|null}
 */
export function createComboBarLineChart(canvasId, barDataArray, lineDataArray, barDatasetLabel, lineDatasetLabel, xAxisLabels) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID ${canvasId}를 찾을 수 없습니다.`);
        return null;
    }

    if (Chart.getChart(canvasId)) {
        Chart.getChart(canvasId).destroy();
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: xAxisLabels,
            datasets: [
                {
                    label: barDatasetLabel,
                    data: barDataArray,
                    backgroundColor: 'rgba(70, 130, 180, 0.15)',
                    borderColor: 'rgba(70, 130, 180, 1)',
                    borderWidth: 1,
                    borderRadius: 2,
                    borderSkipped: false,
                    order: 1
                },
                {
                    label: lineDatasetLabel,
                    data: lineDataArray,
                    type: 'line',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.2,
                    pointRadius: 3,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: 'rgba(220, 53, 69, 1)',
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    fill: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    border: { display: false },
                    ticks: {
                        font: {
                            size: 11,
                            family: "'Malgun Gothic', sans-serif"
                        },
                        color: '#666666',
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: false,
                    border: { display: false },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.08)',
                        lineWidth: 1,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            family: "'Malgun Gothic', sans-serif"
                        },
                        color: '#666666',
                        padding: 8,
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'K';
                            }
                            return value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        font: {
                            size: 11,
                            family: "'Malgun Gothic', sans-serif",
                            weight: 'normal'
                        },
                        color: '#333333',
                        usePointStyle: false,
                        boxWidth: 12,
                        boxHeight: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(51, 51, 51, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 4,
                    padding: 12,
                    titleFont: {
                        size: 12,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Malgun Gothic', sans-serif"
                    },
                    displayColors: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    callbacks: {
                        label: function(context) {
                            const value = new Intl.NumberFormat('ko-KR').format(context.parsed.y);
                            return `${context.dataset.label}: ${value}`;
                        }
                    }
                }
            },
            animation: {
                duration: 600,
                easing: 'easeOutQuad'
            }
        }
    });
}


/**
 * 멀티 라인 차트
 * @param canvasId
 * @param xAxisLabels
 * @param datasetsInput
 * @param chartTitle
 * @returns {Chart|null}
 */
export function createMultiLineChart(canvasId, xAxisLabels, datasetsInput = [], chartTitle = '') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID ${canvasId}를 찾을 수 없습니다.`);
        return null;
    }

    if (Chart.getChart(canvasId)) {
        Chart.getChart(canvasId).destroy();
    }

    const jenniferColors = [
        '#4682B4',
        '#DC3545',
        '#28A745',
        '#FFC107',
        '#6F42C1',
        '#FD7E14',
        '#20C997',
        '#E83E8C',
        '#6C757D',
        '#17A2B8',
        '#343A40',
        '#007BFF'
    ];

    const yAxesConfig = {};
    const processedDatasets = [];
    let yAxisPositionCounter = { left: 0, right: 0 };

    const validDatasetsInput = Array.isArray(datasetsInput) ? datasetsInput : [];

    validDatasetsInput.forEach((ds, index) => {
        const color = ds.borderColor || jenniferColors[index % jenniferColors.length];

        let yAxisID;
        let yAxisTitle;
        let yAxisPosition = 'left';

        if (ds.unit === 'percentage') {
            yAxisID = 'yPercentage';
            yAxisTitle = '퍼센트 (%)';
            yAxisPosition = 'left';
        } else if (ds.unit === 'celsius') {
            yAxisID = 'yCelsius';
            yAxisTitle = '온도 (°C)';
            yAxisPosition = 'right';
        } else if (ds.unit === 'bytes') {
            yAxisID = 'yBytes';
            yAxisTitle = '바이트 (B)';
            yAxisPosition = 'right';
        } else {
            const otherUnitIndex = Object.keys(yAxesConfig).filter(k => k.startsWith('yOther')).length;
            yAxisID = `yOther${otherUnitIndex}`;
            yAxisTitle = `${ds.label || '데이터'} (${ds.unit || ''})`;
            yAxisPosition = (Object.values(yAxesConfig).filter(axis => axis.position === 'left').length <=
                Object.values(yAxesConfig).filter(axis => axis.position === 'right').length) ? 'left' : 'right';
        }

        if (!yAxesConfig[yAxisID]) {
            if (yAxisPosition === 'left') yAxisPositionCounter.left++;
            else yAxisPositionCounter.right++;

            yAxesConfig[yAxisID] = {
                type: 'linear',
                display: true,
                position: yAxisPosition,
                beginAtZero: false,
                border: { display: false },
                grid: {
                    drawOnChartArea: (yAxisPosition === 'left' && yAxisPositionCounter.left === 1) ||
                        (yAxisPosition === 'right' && yAxisPositionCounter.right === 1),
                    color: 'rgba(0, 0, 0, 0.08)',
                    lineWidth: 1,
                    drawBorder: false
                },
                title: {
                    display: true,
                    text: yAxisTitle,
                    font: {
                        size: 11,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'normal'
                    },
                    color: '#666666'
                },
                ticks: {
                    font: {
                        size: 10,
                        family: "'Malgun Gothic', sans-serif"
                    },
                    color: '#666666',
                    padding: 6,
                    callback: function(value) {
                        if (ds.unit === 'bytes') {
                            if (value >= 1073741824) {
                                return (value / 1073741824).toFixed(1) + 'GB';
                            } else if (value >= 1048576) {
                                return (value / 1048576).toFixed(1) + 'MB';
                            } else if (value >= 1024) {
                                return (value / 1024).toFixed(1) + 'KB';
                            }
                            return value + 'B';
                        } else if (ds.unit === 'percentage') {
                            return value + '%';
                        }
                        return value;
                    }
                }
            };
        }

        processedDatasets.push({
            label: ds.label || `Dataset ${index + 1}`,
            data: ds.data || [],
            borderColor: color,
            backgroundColor: color + '15',
            fill: ds.fill !== undefined ? ds.fill : false,
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1,
            pointHoverRadius: 4,
            pointHoverBorderWidth: 2,
            yAxisID: yAxisID
        });
    });

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: xAxisLabels,
            datasets: processedDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    border: { display: false },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Malgun Gothic', sans-serif"
                        },
                        color: '#666666',
                        maxTicksLimit: 12
                    }
                },
                ...(Object.keys(yAxesConfig).length > 0 ? yAxesConfig : {
                    y: {
                        display: true,
                        beginAtZero: false,
                        border: { display: false },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.08)',
                            drawBorder: false
                        }
                    }
                })
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    align: 'start',
                    labels: {
                        font: {
                            size: 10,
                            family: "'Malgun Gothic', sans-serif"
                        },
                        color: '#333333',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 12,
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                title: {
                    display: !!chartTitle,
                    text: chartTitle,
                    font: {
                        size: 14,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'bold'
                    },
                    color: '#333333',
                    padding: { bottom: 20 }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(51, 51, 51, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 4,
                    padding: 10,
                    titleFont: {
                        size: 11,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 10,
                        family: "'Malgun Gothic', sans-serif"
                    },
                    displayColors: true,
                    boxWidth: 8,
                    boxHeight: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                const originalDataset = validDatasetsInput.find(ds => ds.label === context.dataset.label);
                                const unit = originalDataset?.unit || '';

                                let formattedValue = new Intl.NumberFormat('ko-KR').format(context.parsed.y);

                                if (unit === 'bytes') {
                                    const bytes = context.parsed.y;
                                    if (bytes >= 1073741824) {
                                        formattedValue = (bytes / 1073741824).toFixed(2) + ' GB';
                                    } else if (bytes >= 1048576) {
                                        formattedValue = (bytes / 1048576).toFixed(2) + ' MB';
                                    } else if (bytes >= 1024) {
                                        formattedValue = (bytes / 1024).toFixed(2) + ' KB';
                                    } else {
                                        formattedValue = bytes + ' B';
                                    }
                                } else if (unit) {
                                    formattedValue += ` ${unit}`;
                                }

                                label += formattedValue;
                            }
                            return label;
                        }
                    }
                }
            },
            animation: {
                duration: 500,
                easing: 'easeOutQuad'
            }
        }
    });
}

/**
 * 믹스 라인 차트 생성 (현재 데이터 + AI 예측 데이터)
 *
 * @param {string} canvasId - 차트를 렌더링할 canvas 요소의 ID
 * @param {string[]} labels - X축 라벨 배열 (시간 순서대로)
 * @param {Object} data - 현재 데이터와 예측 데이터를 포함하는 객체
 * @param {number[]} data.currentData - 현재 데이터 배열 (InfluxDB에서 가져온 실제 값)
 * @param {number[]} data.predictedData - 예측 데이터 배열 (Python AI로 생성된 미래 값)
 * @param {number} [data.splitIndex] - 현재/예측 데이터 경계 인덱스 (미지정 시 자동 계산)
 * @param {string} [title="AI예측 데이터 차트"] - 차트 제목
 * @returns {Chart|null} Chart.js 인스턴스 또는 실패 시 null
 *
 */
export function createMixedLineChart(canvasId, labels, data, title = "AI예측 데이터 차트") {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID ${canvasId}를 찾을 수 없습니다.`);
        return null;
    }

    // 기존 차트가 있으면 제거
    if (Chart.getChart(canvasId)) {
        Chart.getChart(canvasId).destroy();
    }

    // 데이터 유효성 검사
    if (!data || !data.currentData || !data.predictedData) {
        console.error('currentData와 predictedData가 필요합니다.');
        return null;
    }

    const currentData = data.currentData || [];
    const predictedData = data.predictedData || [];

    // ★ 데이터의 최소값과 최대값 찾기
    const allData = [...currentData, ...predictedData].filter(v => v !== null);
    const minValue = Math.min(...allData);
    const maxValue = Math.max(...allData);

    // ★ Y축 범위 설정 (여유 공간 추가)
    const range = maxValue - minValue;
    const padding = range * 0.2; // 상하 20%의 여유 공간
    const yMin = Math.floor((minValue - padding) * 100) / 100; // 소수점 2자리로 내림
    const yMax = Math.ceil((maxValue + padding) * 100) / 100;  // 소수점 2자리로 올림


    // 분할 지점 계산 (현재 데이터 끝나는 지점)
    const splitIndex = data.splitIndex !== undefined ? data.splitIndex : currentData.length;

    // 전체 데이터 배열 구성 (현재 + 예측)
    const fullCurrentData = [...currentData, ...Array(predictedData.length).fill(null)];
    const fullPredictedData = [...Array(currentData.length).fill(null), ...predictedData];

    // 연결점 데이터 (현재 데이터의 마지막 점과 예측 데이터의 첫 점을 연결)
    const connectionData = Array(labels.length).fill(null);
    if (currentData.length > 0 && predictedData.length > 0) {
        connectionData[splitIndex - 1] = currentData[currentData.length - 1];
        connectionData[splitIndex] = predictedData[0];
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            layout: {
                padding: {
                    left: 10,
                    right: 20,
                    top: 10,
                    bottom: 10
                }
            },
            datasets: [
                {
                    label: '현재 데이터',
                    data: fullCurrentData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    fill: false,
                    spanGaps: false
                },
                {
                    label: 'AI 예측 데이터 (24시간)',
                    data: fullPredictedData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    fill: false,
                    spanGaps: false
                },
                {
                    label: '연결선',
                    data: connectionData,
                    borderColor: 'rgba(128, 128, 128, 0.5)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [2, 2],
                    tension: 0,
                    pointRadius: 0,
                    fill: false,
                    spanGaps: false,
                    legend: {
                        display: false
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    border: { display: false },
                    ticks: {
                        font: { size: 10, family: "'Malgun Gothic', sans-serif" },
                        color: '#666666',
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 24  // 30분 단위로 24개 = 12시간
                    }
                },
                y: {
                    min: yMin,  // ★ 최소값 설정
                    max: yMax,  // ★ 최대값 설정
                    border: { display: false },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: { size: 11, family: "'Malgun Gothic', sans-serif" },
                        color: '#666666',
                        padding: 8,
                        stepSize: (yMax - yMin) / 5,  // ★ 10개 정도의 눈금으로 분할
                        callback: function(value) {
                            return value.toFixed(2) + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        font: {
                            size: 12,
                            family: "'Malgun Gothic', sans-serif",
                            weight: 'normal'
                        },
                        color: '#333333',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        boxWidth: 10,
                        boxHeight: 10,
                        filter: function(legendItem) {
                            return legendItem.text !== '연결선';
                        }
                    }
                },
                title: {
                    display: !!title,
                    text: title,
                    font: {
                        size: 16,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'bold'
                    },
                    color: '#333333',
                    padding: { bottom: 20 }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(51, 51, 51, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 6,
                    padding: 12,
                    titleFont: {
                        size: 12,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Malgun Gothic', sans-serif"
                    },
                    displayColors: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    callbacks: {
                        title: function(tooltipItems) {
                            if (tooltipItems.length > 0) {
                                const label = tooltipItems[0].label;
                                const index = tooltipItems[0].dataIndex;

                                // 현재 시간 기준으로 표시
                                if (index < splitIndex) {
                                    return `${label} (과거 데이터)`;
                                } else {
                                    return `${label} (AI 예측)`;
                                }
                            }
                            return '';
                        },
                        label: function(context) {
                            if (context.dataset.label === '연결선') {
                                return null;
                            }
                            const value = Number(context.parsed.y).toFixed(2);
                            return `${context.dataset.label}: ${value}%`;
                        },
                        afterLabel: function(context) {
                            if (context.dataset.label === 'AI 예측 데이터 (24시간)' && context.parsed.y !== null) {
                                const confidence = data.predictedData[context.dataIndex - splitIndex]?.confidenceScore;
                                if (confidence) {
                                    return `신뢰도: ${(confidence * 100).toFixed(1)}%`;
                                }
                            }
                            return '';
                        }
                    }
                },
                // 현재/예측 구분선 표시
                annotation: {
                    annotations: {
                        splitLine: {
                            type: 'line',
                            xMin: splitIndex - 0.5,
                            xMax: splitIndex - 0.5,
                            borderColor: 'rgba(128, 128, 128, 0.8)',
                            borderWidth: 2,
                            borderDash: [10, 5],
                            label: {
                                content: '예측 시작',
                                enabled: true,
                                position: 'top',
                                backgroundColor: 'rgba(128, 128, 128, 0.8)',
                                color: '#ffffff',
                                font: {
                                    size: 10,
                                    family: "'Malgun Gothic', sans-serif"
                                }
                            }
                        }
                    }
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
}

/**
 * 믹스 라인 차트 생성 (현재 데이터 + AI 예측 데이터)
 *
 * @param {string} canvasId - 차트를 렌더링할 canvas 요소의 ID
 * @param {string[]} labels - X축 라벨 배열 (시간 순서대로)
 * @param {Object} data - 현재 데이터와 예측 데이터를 포함하는 객체
 * @param {number[]} data.currentData - 현재 데이터 배열 (InfluxDB에서 가져온 실제 값)
 * @param {number[]} data.predictedData - 예측 데이터 배열 (Python AI로 생성된 미래 값)
 * @param {number} [data.splitIndex] - 현재/예측 데이터 경계 인덱스 (미지정 시 자동 계산)
 * @param {string} [title="AI예측 데이터 차트"] - 차트 제목
 * @returns {Chart|null} Chart.js 인스턴스 또는 실패 시 null
 *
 */
export function createMixedLineChartForMem(canvasId, labels, data, title = "AI예측 데이터 차트") {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`캔버스 ID ${canvasId}를 찾을 수 없습니다.`);
        return null;
    }

    // 기존 차트가 있으면 제거
    if (Chart.getChart(canvasId)) {
        Chart.getChart(canvasId).destroy();
    }

    // 데이터 유효성 검사
    if (!data || !data.currentData || !data.predictedData) {
        console.error('currentData와 predictedData가 필요합니다.');
        return null;
    }

    const currentData = data.currentData || [];
    const predictedData = data.predictedData || [];

    // ★ 데이터의 최소값과 최대값 찾기
    const allData = [...currentData, ...predictedData].filter(v => v !== null);
    const minValue = Math.min(...allData);
    const maxValue = Math.max(...allData);

    // ★ Y축 범위 설정 (여유 공간 추가)
    const range = maxValue - minValue;
    const padding = range * 0.2; // 상하 20%의 여유 공간
    const yMin = Math.floor((minValue - padding) * 100) / 100; // 소수점 2자리로 내림
    const yMax = Math.ceil((maxValue + padding) * 100) / 100;  // 소수점 2자리로 올림


    // 분할 지점 계산 (현재 데이터 끝나는 지점)
    const splitIndex = data.splitIndex !== undefined ? data.splitIndex : currentData.length;

    // 전체 데이터 배열 구성 (현재 + 예측)
    const fullCurrentData = [...currentData, ...Array(predictedData.length).fill(null)];
    const fullPredictedData = [...Array(currentData.length).fill(null), ...predictedData];

    // 연결점 데이터 (현재 데이터의 마지막 점과 예측 데이터의 첫 점을 연결)
    const connectionData = Array(labels.length).fill(null);
    if (currentData.length > 0 && predictedData.length > 0) {
        connectionData[splitIndex - 1] = currentData[currentData.length - 1];
        connectionData[splitIndex] = predictedData[0];
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            layout: {
                padding: {
                    left: 10,
                    right: 20,
                    top: 10,
                    bottom: 10
                }
            },
            datasets: [
                {
                    label: '현재 데이터',
                    data: fullCurrentData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    fill: false,
                    spanGaps: false
                },
                {
                    label: 'AI 예측 데이터 (24시간)',
                    data: fullPredictedData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    fill: false,
                    spanGaps: false
                },
                {
                    label: '연결선',
                    data: connectionData,
                    borderColor: 'rgba(128, 128, 128, 0.5)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [2, 2],
                    tension: 0,
                    pointRadius: 0,
                    fill: false,
                    spanGaps: false,
                    legend: {
                        display: false
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    border: { display: false },
                    ticks: {
                        font: { size: 10, family: "'Malgun Gothic', sans-serif" },
                        color: '#666666',
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 24  // 30분 단위로 24개 = 12시간
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    border: { display: false },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: { size: 11, family: "'Malgun Gothic', sans-serif" },
                        color: '#666666',
                        padding: 8,
                        stepSize: 5,
                        callback: function(value) {
                            return value.toFixed(2) + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        font: {
                            size: 12,
                            family: "'Malgun Gothic', sans-serif",
                            weight: 'normal'
                        },
                        color: '#333333',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        boxWidth: 10,
                        boxHeight: 10,
                        filter: function(legendItem) {
                            return legendItem.text !== '연결선';
                        }
                    }
                },
                title: {
                    display: !!title,
                    text: title,
                    font: {
                        size: 16,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'bold'
                    },
                    color: '#333333',
                    padding: { bottom: 20 }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(51, 51, 51, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 6,
                    padding: 12,
                    titleFont: {
                        size: 12,
                        family: "'Malgun Gothic', sans-serif",
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Malgun Gothic', sans-serif"
                    },
                    displayColors: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    callbacks: {
                        title: function(tooltipItems) {
                            if (tooltipItems.length > 0) {
                                const label = tooltipItems[0].label;
                                const index = tooltipItems[0].dataIndex;

                                // 현재 시간 기준으로 표시
                                if (index < splitIndex) {
                                    return `${label} (과거 데이터)`;
                                } else {
                                    return `${label} (AI 예측)`;
                                }
                            }
                            return '';
                        },
                        label: function(context) {
                            if (context.dataset.label === '연결선') {
                                return null;
                            }
                            const value = Number(context.parsed.y).toFixed(2);
                            return `${context.dataset.label}: ${value}%`;
                        },
                        afterLabel: function(context) {
                            if (context.dataset.label === 'AI 예측 데이터 (24시간)' && context.parsed.y !== null) {
                                const confidence = data.predictedData[context.dataIndex - splitIndex]?.confidenceScore;
                                if (confidence) {
                                    return `신뢰도: ${(confidence * 100).toFixed(1)}%`;
                                }
                            }
                            return '';
                        }
                    }
                },
                // 현재/예측 구분선 표시
                annotation: {
                    annotations: {
                        splitLine: {
                            type: 'line',
                            xMin: splitIndex - 0.5,
                            xMax: splitIndex - 0.5,
                            borderColor: 'rgba(128, 128, 128, 0.8)',
                            borderWidth: 2,
                            borderDash: [10, 5],
                            label: {
                                content: '예측 시작',
                                enabled: true,
                                position: 'top',
                                backgroundColor: 'rgba(128, 128, 128, 0.8)',
                                color: '#ffffff',
                                font: {
                                    size: 10,
                                    family: "'Malgun Gothic', sans-serif"
                                }
                            }
                        }
                    }
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
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

    cardElement.className = `card ${bgClass} text-white mb-4`;

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
