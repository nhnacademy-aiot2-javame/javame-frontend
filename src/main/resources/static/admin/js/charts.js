//charts.js
import {
    getOrigins,
    getDropdownValues,
    getMeasurementList,
    startSensorDataStream,
    getChartDataForSensor,
    getPieChartData
} from './iotSensorApi.js';

import {
    createAreaChart,
    createBarChart,
    createPieChart
} from './chartUtils.js';

let currentChartFilter = { companyDomain: 'javame' };

window.addEventListener('DOMContentLoaded', initChartPage);

async function initChartPage() {
    await loadOriginDropdown();

    document.getElementById('applyChartFilter')?.addEventListener('click', async () => {
        updateFilterFromDropdowns();
        restartSseChart();
        await loadBarChart();
        await loadPieChart();

    });
}

async function loadOriginDropdown() {
    const origins = await getOrigins(currentChartFilter.companyDomain);
    console.log('origins', origins);
    populateDropdown('originDropdown', origins, async (origin) => {
        currentChartFilter.origin = origin;
        await loadDependentDropdowns(origin);
    });
}

async function loadDependentDropdowns(origin) {
    const tags = ['location', 'place', 'device_id', 'building', '_field'];
    for (const tag of tags) {
        const values = await getDropdownValues(currentChartFilter.companyDomain, origin, tag);
        populateDropdown(`${tag}Dropdown`, values);
    }

    const measurements = await getMeasurementList(currentChartFilter.companyDomain, origin);
    populateDropdown('measurementDropdown', measurements);
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

    if (items.length > 0) {
        select.value = items[0];
        onChange?.(items[0]);
    }

    select.onchange = (e) => onChange?.(e.target.value);
}

function updateFilterFromDropdowns() {
    const tags = ['location', 'place', 'device_id', 'building', '_field', 'measurement','range'];
    tags.forEach(tag => {
        const select = document.getElementById(`${tag}Dropdown`);
        if (select) {
            const key = tag === 'measurement' ? '_measurement' : tag;
            currentChartFilter[key] = select.value;
        }
    });
}

function restartSseChart() {
    const measurement = currentChartFilter._measurement;
    if (!measurement) return console.warn('측정값 없음');

    startSensorDataStream(currentChartFilter, (data) => {
        const records = data[measurement] || [];
        loadAreaChart(records);
    });
}

function loadAreaChart(data) {
    const labels = data.map(d => new Date(d.time).toLocaleTimeString());
    const values = data.map(d => d.value);

    if (window.areaChart) window.areaChart.destroy();
    window.areaChart = createAreaChart('myAreaChart', labels, values, '실시간 센서 데이터');
}

async function loadBarChart() {
    const { companyDomain, origin, _measurement } = currentChartFilter;
    if (!origin || !_measurement) return;

    const chartData = await getChartDataForSensor(companyDomain, origin, _measurement);
    if (!chartData.labels?.length) return;

    if (window.barChart) window.barChart.destroy();
    window.barChart = createBarChart('myBarChart', chartData.labels, chartData.values, `${_measurement} 변화`);
}

async function loadPieChart() {
    const { companyDomain, origin } = currentChartFilter;
    if (!origin) return;

    const pieData = await getPieChartData(companyDomain, origin);
    if (!pieData.labels?.length) return;

    if (window.pieChart) window.pieChart.destroy();
    window.pieChart = createPieChart('myPieChart', pieData.labels, pieData.values);
}