// dashboardFixed.js (단일 CPU 게이지용으로 단순화)

import { getCurrentSensorValue } from './iotSensorApi.js'; // 경로 확인
import { createGaugeChart } from './chartUtils.js';    // 경로 확인

// 차트 인스턴스를 저장할 객체 (단일 차트만 관리하므로 간단하게 해도 됨)
let cpuGaugeChartInstance = null;

// 고정된 값 또는 설정에서 가져올 값
const COMPANY_DOMAIN = 'javame'; // 실제 회사 도메인으로 변경
const CPU_ORIGIN = 'server_data'; // 예시: CPU 데이터가 오는 origin (백엔드 설정에 따라 다름)
const CPU_LOCATION = 'sensors'; // 예시: 고정된 location
const CPU_MEASUREMENT = 'temp_input'; // 예시: CPU 사용률을 직접 %로 반환하는 _measurement
// 또는 'cpu_load' 같은 이름이고, 값은 실제 load 값일 수 있음

window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard page loaded. Initializing CPU gauge chart...");
    loadAndRenderCpuGauge();

    // (선택적) 주기적으로 게이지 업데이트
    // setInterval(loadAndRenderCpuGauge, 30000); // 30초마다 업데이트
});

/**
 * CPU 사용률 게이지 차트에 필요한 데이터를 가져와 렌더링합니다.
 */
async function loadAndRenderCpuGauge() {
    const canvasId = 'cpuUsageGauge'; // HTML에 있는 <canvas>의 ID
    const valueTextElement = document.getElementById('cpuUsageValueText'); // 값을 표시할 텍스트 요소 ID
    const statusTextElement = document.getElementById('gauge-status-text'); // 상태 텍스트 요소 (하나의 게이지만 있으므로 ID보다는 클래스로 찾는게 나을수도)

    console.log(`Fetching CPU usage for domain: ${COMPANY_DOMAIN}, origin: ${CPU_ORIGIN}`);

    // API 호출하여 현재 CPU 사용률 가져오기
    // getCurrentSensorValue는 { value: 75.5, time: "..." } 형태의 객체를 반환한다고 가정
    const cpuData = await getCurrentSensorValue(
        COMPANY_DOMAIN,
        CPU_ORIGIN,
        CPU_LOCATION,
        CPU_MEASUREMENT
        // 만약 _field 파라미터가 필요하다면 추가:
        // 'value' // CPU 사용률 값이 저장된 필드명
    );

    let gaugeValue = 0; // 게이지에 표시할 % 값 (0-100)
    let displayText = '--%'; // 차트 중앙 및 텍스트 영역에 표시될 값

    if (cpuData && typeof cpuData.value === 'number') {
        const currentCpuUsage = cpuData.value; // API에서 받은 실제 CPU 사용률 (%)
        gaugeValue = Math.max(0, Math.min(100, currentCpuUsage)); // 0-100 범위로 클리핑
        displayText = `${currentCpuUsage.toFixed(1)}%`;
        console.log(`CPU Usage: ${displayText}`);
        if (valueTextElement) valueTextElement.textContent = displayText;
        if (statusTextElement) { // 상태 텍스트 업데이트 (예시)
            if (currentCpuUsage > 80) {
                statusTextElement.textContent = "높은 사용률";
                statusTextElement.style.color = "red";
            } else if (currentCpuUsage > 50) {
                statusTextElement.textContent = "보통 사용률";
                statusTextElement.style.color = "orange";
            } else {
                statusTextElement.textContent = "안정적";
                statusTextElement.style.color = "green";
            }
        }
    } else {
        console.warn("CPU 사용률 데이터를 가져오지 못했거나 유효하지 않은 형식입니다.", cpuData);
        if (valueTextElement) valueTextElement.textContent = '--%';
        if (statusTextElement) {
            statusTextElement.textContent = "데이터 없음";
            statusTextElement.style.color = "grey";
        }
    }

    // 기존 차트 인스턴스가 있다면 파괴
    if (cpuGaugeChartInstance) {
        cpuGaugeChartInstance.destroy();
    }

    // 새 게이지 차트 생성
    // createGaugeChart(canvasId, 게이지 채울 퍼센트, 중앙 텍스트, 하단 부제목)
    cpuGaugeChartInstance = createGaugeChart(canvasId, gaugeValue, displayText, 'CPU 사용률');

    if (cpuGaugeChartInstance) {
        console.log("CPU gauge chart rendered/updated.");
    } else {
        console.error("Failed to render CPU gauge chart.");
    }
}
