// charts.js (트리 기반 필터링 구조 + 임계값 카드 데이터명 동기화)
import {
    startSensorDataWebSocket,
    getChartDataForSensor,
    getPieChartData,
    getTree
} from './iotSensorApi.js';

import {
    createAreaChart,
    createBarChart,
    createPieChart
} from './chartUtils.js';

import { onDataSelect, setTreeDataForLabelValueMap } from './serverRegister.js';

const pathParts = window.location.pathname.split('/');
console.log(pathParts);
const companyDomain = pathParts[0];
let currentChartFilter = {
    companyDomain: companyDomain,
    rangeMinutes: 5
};

// === 트리 전체 데이터를 전역 보관 ===
let globalTreeData = null;

window.addEventListener('DOMContentLoaded', async () => {
    globalTreeData = await getTree(currentChartFilter.companyDomain);
    renderSlTree(document.getElementById('filterTree'), globalTreeData);
    setTreeDataForLabelValueMap(globalTreeData); // serverRegister.js에도 동일 트리 넘김!

    document.getElementById('rangeSelect').addEventListener('sl-change', (e) => {
        currentChartFilter.rangeMinutes = Number(e.target.value);
        refreshChartsWithFilter();
    });

    document.getElementById('applyChartFilter')?.addEventListener('click', async () => {
        restartSseChart();
        await loadBarChart();
        await loadPieChart();
    });
});

async function refreshChartsWithFilter() {
    restartSseChart();
    await loadBarChart();
    await loadPieChart();
}

function renderSlTree(container, node) {
    if (!node?.children?.length) return;
    node.children.forEach(child => {
        const item = createSlTreeItem(child);
        container.appendChild(item);
    });
}

function createSlTreeItem(node) {
    const item = document.createElement('sl-tree-item');
    item.textContent = node.label;
    item.dataset.tag = node.tag;
    item.dataset.label = node.label;

    item.addEventListener('click', async (e) => {
        currentChartFilter[node.tag] = node.value;
        // 한글 label도 최신화 (등록/수정시 UI에 보이게)
        if (node.tag === 'location') currentChartFilter.location = node.label;
        if (node.tag === 'gateway') currentChartFilter.gatewayId = node.label;
        if (node.tag === 'deviceId') currentChartFilter.deviceId = node.value;

        // 데이터(최하위 measurement) 클릭 시 임계값 카드 데이터명도 갱신
        if (node.tag === 'measurement' || node.tag === '_measurement') {
            currentChartFilter._measurement = node.value;
            currentChartFilter._measurementLabel = node.label;
            restartSseChart();
            await loadBarChart();
            await loadPieChart();

            await onDataSelect(
                currentChartFilter.deviceId,
                currentChartFilter.location,
                currentChartFilter.gatewayId,
                node.label,
                node.label,
                currentChartFilter.companyDomain
            );
        }
        e.stopPropagation();
        if (item.children.length > 0) {
            item.expanded = !item.expanded;
        }
    });

    (node.children || []).forEach(child => {
        const childItem = createSlTreeItem(child);
        childItem.setAttribute('slot', 'children');
        item.appendChild(childItem);
    });

    return item;
}

function restartSseChart() {
    const measurement = currentChartFilter._measurement;
    if (!measurement) return console.warn('측정값 없음');

    startSensorDataWebSocket(currentChartFilter, (records) => {
        loadAreaChart(records);
    });
}

function updateLastUpdatedTime(cardId) {
    const footer = document.querySelector(`#${cardId} .card-footer`);
    if (!footer) return;
    const now = new Date();
    const isToday = now.toDateString() === new Date().toDateString();
    let timeStr;
    if (isToday) {
        timeStr = `오늘 ${now.toLocaleTimeString('ko-KR', { hour12: false })}`;
    } else {
        timeStr = now.toLocaleString('ko-KR', { hour12: false });
    }
    footer.textContent = `마지막 업데이트: ${timeStr}`;
}

function loadAreaChart(dataArray) {
    console.log('loadAreaChart data:', dataArray);
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
        console.warn('areaChart용 데이터가 비어있음!');
        return;
    }
    const labels = dataArray.map(d => {
        if (!d.time) return '';
        const date = new Date(d.time);
        return date.toLocaleTimeString('ko-KR', { hour12: false });
    });

    const values = dataArray.map(d => d.value);

    const title = currentChartFilter._measurementLabel || currentChartFilter._measurement || "측정값";
    updateLastUpdatedTime('areaChartCard');
    createAreaChart("myAreaChart", labels, values, title);
}

async function loadBarChart() {
    const { companyDomain, origin, _measurement } = currentChartFilter;
    if (!origin || !_measurement) return;

    let chartData;
    try {
        chartData = await getChartDataForSensor(origin, _measurement);
        console.log('loadBarChart data:', chartData);
        console.log('loadBarChart 호출 - companyDomain:', companyDomain, 'origin:', origin, '_measurement:', _measurement);
    } catch (e) {
        console.error('getChartDataForSensor 예외:', e);
        chartData = { labels: [], values: [] };
    }

    if (!chartData || !Array.isArray(chartData.labels) || !chartData.labels.length) {
        console.warn('barChart용 데이터가 비어있음!');
        return;
    }

    if (window.barChart) window.barChart.destroy();
    const title = currentChartFilter._measurementLabel || currentChartFilter._measurement || "측정값";
    updateLastUpdatedTime('areaChartCard');
    window.barChart = createBarChart('myBarChart', chartData.labels, chartData.data, `${title} 변화`);
}

async function loadPieChart() {
    const { companyDomain, origin, _measurement, _measurementLabel } = currentChartFilter;
    console.log('loadPieChart 호출 - companyDomain:', companyDomain, 'origin:', origin);

    const pieData = await getPieChartData(origin);
    console.log('loadPieChart data:', pieData);

    if (!pieData.labels?.length) {
        console.warn('pieChart용 데이터가 비어있음!');
        return;
    }

    const title = currentChartFilter._measurementLabel || currentChartFilter._measurement || "측정값";

    if (window.pieChart) window.pieChart.destroy();
    updateLastUpdatedTime('pieChartCard');
    window.pieChart = createPieChart('myPieChart', pieData.labels, pieData.data, title);
}
