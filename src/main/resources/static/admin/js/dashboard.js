import { getOrigins, getDropdownValues, getMeasurementList, getHourlyAverages, startSensorDataStream } from './iotSensorApi.js';

let currentChartFilter = {}; // companyDomain, origin, etc.

window.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
    // 초기 드롭다운 로딩 → origin 선택 → filter 선택 → SSE 연결
    const companyDomain = 'javame';
    currentChartFilter.companyDomain = companyDomain;

    const origins = await getOrigins(companyDomain);
    populateDropdown('originSelect', origins, async (origin) => {
        currentChartFilter.origin = origin;
        await loadFilterDropdowns(companyDomain, origin);
    });
}

async function loadFilterDropdowns(companyDomain, origin) {
    const filterTags = ['location', 'place', 'device_id', 'building', '_field'];
    for (const tag of filterTags) {
        const values = await getDropdownValues(companyDomain, origin, tag);
        populateDropdown(`${tag}Select`, values, (val) => {
            currentChartFilter[tag] = val;
            restartStream();
        });
    }
    const measurements = await getMeasurementList(companyDomain, origin);
    populateDropdown('measurementSelect', measurements, (val) => {
        currentChartFilter._measurement = val;
        restartStream();
    });
    restartStream();
}

function populateDropdown(id, items, onChange) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = '<option value="">선택</option>';
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        select.appendChild(opt);
    });

    // 자동 선택 로직 추가
    if (items.length > 0) {
        select.value = items[0];
        onChange(items[0]);
    }

    select.onchange = (e) => onChange(e.target.value);

}

function restartStream() {
    startSensorDataStream(currentChartFilter, (data) => {
        const measurement = currentChartFilter._measurement;
        const records = data[measurement] || [];
        updateCharts(records);
    });
}

function updateCharts(data) {
    const labels = data.map(d => new Date(d.time).toLocaleTimeString());
    const values = data.map(d => d.value);

    // 예시 차트 업데이트 로직 (Chart.js 필요)
    if (window.areaChart) window.areaChart.destroy();
    window.areaChart = createAreaChart('areaChartCanvas', labels, values);

    if (window.barChart) window.barChart.destroy();
    window.barChart = createBarChart('barChartCanvas', labels, values);
}

function createAreaChart(id, labels, values) {
    return new Chart(document.getElementById(id), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: '실시간 센서 데이터', data: values, borderColor: 'blue', fill: false }]
        }
    });
}

function createBarChart(id, labels, values) {
    return new Chart(document.getElementById(id), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: '센서 막대 데이터', data: values, backgroundColor: 'orange' }]
        }
    });
}