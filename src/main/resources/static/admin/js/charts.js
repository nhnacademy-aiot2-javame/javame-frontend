// charts.js (트리 기반 필터링 구조로 전면 리팩토링)
import {
    startSensorDataStream,
    getChartDataForSensor,
    getPieChartData,
    getTree
} from './iotSensorApi.js';

import {
    createAreaChart,
    createBarChart,
    createPieChart
} from './chartUtils.js';

let currentChartFilter = { companyDomain: 'javame' };

window.addEventListener('DOMContentLoaded', async () => {
    const tree = await getTree(currentChartFilter.companyDomain);
    renderSlTree(document.getElementById('filterTree'), tree);

    document.getElementById('applyChartFilter')?.addEventListener('click', async () => {
        restartSseChart();
        await loadBarChart();
        await loadPieChart();
    });
});

// 재귀 렌더링 함수
function renderSlTree(container, node) {
    if (!node?.children?.length) return;

    // 각 하위 노드 렌더링
    node.children.forEach(child => {
        const item = createSlTreeItem(child);
        container.appendChild(item);  // 반드시 <sl-tree> 또는 <sl-tree-item> 하위에 추가
    });
}

function createSlTreeItem(node) {
    const item = document.createElement('sl-tree-item');
    item.textContent = node.label;
    item.dataset.tag = node.tag;
    item.dataset.label = node.label;

    item.addEventListener('click', async (e) => {
        currentChartFilter[node.tag] = node.value;
        console.log('현재 필터:', currentChartFilter);

        if (node.tag === 'measurement') {
            currentChartFilter._measurement = node.value;
            restartSseChart();
            await loadBarChart();
            await loadPieChart();
        }
    });

    // 자식 노드 렌더링
    node.children?.forEach(child => {
        const childItem = createSlTreeItem(child);
        childItem.setAttribute('slot', 'children');
        item.appendChild(childItem);
    });

    return item;
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