// dashboard.js
/**
 * 대시보드 페이지 스크립트
 * 관리자 대시보드 페이지의 동작을 구현합니다.
 */

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

/**
 * 대시보드를 초기화합니다.
 */
async function initDashboard() {
    try {
        // 센서 통계 데이터 가져오기
        const statistics = await getSensorStatistics();

        // 센서 타입 목록 가져오기
        const sensorTypes = await getAllSensorTypes();

        // 통계 데이터로 대시보드 카드 업데이트
        updateDashboardCards(statistics);

        // 차트 데이터 가져오기 및 업데이트
        await updateDashboardCharts(sensorTypes);

        // 데이터 테이블 업데이트
        await updateDashboardTable();

    } catch (error) {
        console.error('대시보드 초기화 중 오류 발생:', error);
        alert('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 센서 통계 데이터로 대시보드 카드를 업데이트합니다.
 * @param {Array} statistics 센서 통계 데이터
 */
function updateDashboardCards(statistics) {
    if (!statistics || statistics.length === 0) {
        console.warn('통계 데이터가 없습니다.');
        return;
    }

    // 카드에 표시할 배경색 클래스 배열
    const bgClasses = ['bg-primary', 'bg-warning', 'bg-success', 'bg-danger'];

    // 최대 4개의 센서 통계 데이터만 표시
    const maxCards = Math.min(statistics.length, 4);

    for (let i = 0; i < maxCards; i++) {
        const stat = statistics[i];
        const cardId = `card-${i + 1}`;
        const bgClass = bgClasses[i];

        // 센서 통계 데이터로 카드 업데이트
        updateDashboardCard(
            cardId,
            `${stat.sensorType} 센서`,
            `평균: ${stat.avgValue.toFixed(2)} ${stat.unit} | 데이터 수: ${stat.count}`,
            bgClass
        );
    }
}

/**
 * 대시보드 차트들을 업데이트합니다.
 * @param {Array} sensorTypes 센서 타입 목록
 */
async function updateDashboardCharts(sensorTypes) {
    if (!sensorTypes || sensorTypes.length === 0) {
        console.warn('센서 타입 데이터가 없습니다.');
        return;
    }

    // 파이 차트 업데이트
    const pieChartData = await getPieChartData();
    if (pieChartData && pieChartData.labels && pieChartData.values) {
        createPieChart('myPieChart', pieChartData.labels, pieChartData.values);
    }

    // 첫 번째 센서 타입으로 영역 차트 업데이트
    if (sensorTypes.length > 0) {
        const areaChartData = await getChartDataForSensorType(sensorTypes[0]);
        if (areaChartData && areaChartData.labels && areaChartData.values) {
            createAreaChart(
                'myAreaChart',
                areaChartData.labels,
                areaChartData.values,
                `${sensorTypes[0]} 센서 데이터`
            );
        }

        // 두 번째 센서 타입으로 막대 차트 업데이트 (있는 경우)
        if (sensorTypes.length > 1) {
            const barChartData = await getChartDataForSensorType(sensorTypes[1]);
            if (barChartData && barChartData.labels && barChartData.values) {
                createBarChart(
                    'myBarChart',
                    barChartData.labels,
                    barChartData.values,
                    `${sensorTypes[1]} 센서 데이터`
                );
            }
        }
    }
}

/**
 * 대시보드 데이터 테이블을 업데이트합니다.
 */
async function updateDashboardTable() {
    // 최근 센서 데이터 가져오기 (최대 5개)
    const sensorData = await getAllSensorData();

    if (!sensorData || sensorData.length === 0) {
        console.warn('센서 데이터가 없습니다.');
        return;
    }

    const tableBody = document.querySelector('#dataTable tbody');
    if (!tableBody) {
        console.error('데이터 테이블 요소를 찾을 수 없습니다.');
        return;
    }

    // 테이블 내용 초기화
    tableBody.innerHTML = '';

    // 최대 5개의 센서 데이터만 표시
    const maxRows = Math.min(sensorData.length, 5);

    for (let i = 0; i < maxRows; i++) {
        const data = sensorData[i];

        // 날짜 형식 변환
        const receivedDate = new Date(data.receivedAt);
        const formattedDate = receivedDate.toLocaleString();

        // 새 행 추가
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.dataId}</td>
            <td>${data.deviceId}</td>
            <td>${data.sensorType}</td>
            <td>${data.sensorValue} ${data.unit}</td>
            <td>${formattedDate}</td>
        `;

        tableBody.appendChild(row);
    }
}