// charts.js
import {
    getChartDataForSensorType,
    getPieChartData,
    getAllSensorTypes
} from './iotSensorApi.js';

import {
    createAreaChart,
    createBarChart,
    createPieChart
} from './chartUtils.js';

/**
 * 차트 페이지 스크립트
 * 관리자 차트 페이지의 동작을 구현합니다.
 */
const companyDomain = window.companyDomain || 'nhnacademy';

/**
 * 실시간 차트를 위한 필드 변수
 */
let areaChart = null;
let barChart = null;
let pieChart = null;
let pollingInterval = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded!');
    initCharts();
});

/**
 * 차트 페이지를 초기화합니다.
 */
async function initCharts() {
    try {
        // 센서 타입 목록 가져오기
        const sensorTypes = await getAllSensorTypes(companyDomain);


        if (sensorTypes && sensorTypes.length > 0) {
            // 센서 타입 선택 드롭다운 초기화
            initSensorTypeDropdown(sensorTypes);

            // 첫 번째 센서 타입으로 차트 초기화
            await loadChartsForSensorType(sensorTypes[0]);
        } else {
            console.warn('센서 타입 데이터가 없습니다.');
        }

        console.log('companyDomain:', companyDomain);
        console.log('sensorTypes:', sensorTypes);

        // 센서 타입별 통계로 파이 차트 초기화
        await loadPieChart();

    } catch (error) {
        console.error('차트 초기화 중 오류 발생:', error);
        alert('차트 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 센서 타입 선택 드롭다운을 초기화합니다.
 * @param {Array} sensorTypes 센서 타입 목록
 */
function initSensorTypeDropdown(sensorTypes) {
    const dropdown = document.getElementById('sensorTypeDropdown');
    if (!dropdown) {
        console.error('센서 타입 드롭다운 요소를 찾을 수 없습니다.');
        return;
    }

    // 드롭다운 옵션 초기화
    dropdown.innerHTML = '';

    // 센서 타입 옵션 추가
    sensorTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        dropdown.appendChild(option);
    });

    // 드롭다운 변경 이벤트 리스너
    dropdown.addEventListener('change', function() {
        const selectedType = this.value;
        if (selectedType) {
            loadChartsForSensorType(selectedType);
        }
    });
}

/**
 * 선택한 센서 타입에 대한 차트를 로드합니다.
 * @param {string} sensorType 센서 타입
 */
async function loadChartsForSensorType(sensorType) {
    // 선택한 센서 타입에 대한 차트 데이터 가져오기
    const chartData = await getChartDataForSensorType(companyDomain, sensorType);

    if (areaChart) areaChart.destroy();
    if (barChart) barChart.destroy();

    areaChart = createAreaChart('myAreaChart', chartData.labels, chartData.values, `${sensorType} 센서 데이터`);
    barChart = createBarChart('myBarChart', chartData.labels, chartData.values, `${sensorType} 센서 데이터`);

    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
        const newData = await getChartDataForSensorType(companyDomain, sensorType);
        if (newData && newData.labels && newData.values) {
            areaChart.data.labels = newData.labels;
            areaChart.data.datasets[0].data = newData.values;
            areaChart.update();

            barChart.data.labels = newData.labels;
            barChart.data.datasets[0].data = newData.values;
            barChart.update();
        }
    }, 1000);
}

/**
 * 파이 차트를 로드합니다.
 */
async function loadPieChart() {
    try {
        // 파이 차트 데이터 가져오기
        const pieChartData = await getPieChartData(companyDomain);

        if (pieChartData && pieChartData.labels && pieChartData.values) {
            // 파이 차트 업데이트
            if (window.pieChart) {
                window.pieChart.destroy();
            }
            window.pieChart = createPieChart('myPieChart', pieChartData.labels, pieChartData.values);

            // 차트 제목 업데이트
            const pieChartTitle = document.querySelector('#pieChartCard .card-header');
            if (pieChartTitle) {
                pieChartTitle.innerHTML = '<i class="fas fa-chart-pie me-1"></i> 센서 유형별 데이터 분포';
            }
        } else {
            console.warn('파이 차트 데이터가 없습니다.');
        }
    } catch (error) {
        console.error('파이 차트 로드 중 오류 발생:', error);
    }
}