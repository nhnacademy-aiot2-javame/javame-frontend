import { createMultiLineChart } from './chartUtils.js';

// 차트 인스턴스 저장
let multiLineChartInstance = null;

// 더미 데이터
const dummyMeasurements = [
    { measurement: 'usage_idle', origin: 'server_data', location: 'cpu', unit: 'percentage', values: [97, 96, 95, 97, 98, 95, 96] },
    { measurement: 'usage_user', origin: 'server_data', location: 'cpu', unit: 'percentage', values: [1, 2, 2, 1, 1, 2, 2] },
    { measurement: 'temperature', origin: 'sensor_data', location: 'rack1', unit: 'celsius', values: [27, 27.3, 27.5, 27, 26.8, 27.1, 27.2] },
    { measurement: 'humidity', origin: 'sensor_data', location: 'rack1', unit: 'percentage', values: [55, 54, 56, 57, 55, 54, 56] },
    { measurement: 'disk_io', origin: 'server_data', location: 'disk', unit: 'bytes', values: [120000000, 115000000, 118000000, 121000000, 119000000, 117000000, 120500000] }
];
const xLabels = [
    '2024-05-24', '2024-05-25', '2024-05-26', '2024-05-27', '2024-05-28', '2024-05-29', '2024-05-30'
];

// 체크박스 선택 상태 저장
let checkedMeasurements = new Set(dummyMeasurements.map(m => m.measurement));

// 페이지 로드 시
window.addEventListener('DOMContentLoaded', () => {
    renderMeasurementTable();
    renderMultiLineChart();

    // 필터 버튼 - 조회 클릭 시 (실제로는 날짜, origin, 단위 등 적용)
    document.getElementById('applyFiltersButton')?.addEventListener('click', () => {
        renderMultiLineChart();
    });

    // 전체 선택 체크박스
    document.getElementById('selectAllMeasurements')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            checkedMeasurements = new Set(dummyMeasurements.map(m => m.measurement));
        } else {
            checkedMeasurements.clear();
        }
        renderMeasurementTable();
        renderMultiLineChart();
    });
});

// 체크박스/테이블 그리기
function renderMeasurementTable() {
    const tbody = document.getElementById('measurementTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    dummyMeasurements.forEach((m, idx) => {
        const checked = checkedMeasurements.has(m.measurement) ? 'checked' : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="form-check-input measurement-chk" data-measurement="${m.measurement}" ${checked}></td>
            <td>${m.measurement}</td>
            <td>${m.values[m.values.length - 1]}</td>
            <td>${Math.min(...m.values)}</td>
            <td>${Math.max(...m.values)}</td>
            <td>${m.origin}</td>
            <td>${m.location}</td>
        `;
        tbody.appendChild(tr);
    });

    // 체크박스 이벤트
    document.querySelectorAll('.measurement-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const mName = e.target.dataset.measurement;
            if (e.target.checked) checkedMeasurements.add(mName);
            else checkedMeasurements.delete(mName);
            renderMultiLineChart();
        });
    });

    // 전체 선택 체크박스 갱신
    document.getElementById('selectAllMeasurements').checked = checkedMeasurements.size === dummyMeasurements.length;
    document.getElementById('selectedUnitDisplay').innerText = "다중 단위"; // 유동적으로 변경 가능
}

// 차트 그리기
function renderMultiLineChart() {
    const chartCanvasId = 'multiLineChartCanvas';
    const datasets = [];

    dummyMeasurements.forEach(m => {
        if (checkedMeasurements.has(m.measurement)) {
            datasets.push({
                label: `[${m.origin}] ${m.measurement}`,
                data: m.values,
                unit: m.unit
            });
        }
    });

    // 차트 새로 그림
    if (multiLineChartInstance) multiLineChartInstance.destroy();

    multiLineChartInstance = createMultiLineChart(chartCanvasId, xLabels, datasets, "측정 항목별 시계열");
}
