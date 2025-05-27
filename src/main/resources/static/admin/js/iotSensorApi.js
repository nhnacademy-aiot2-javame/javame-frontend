const API_BASE_URL = 'http://localhost:10279/api/v1/environment/company-domain/';

let eventSource = null;

export async function getTree() {
    const res = await fetch(`${API_BASE_URL}/tree`);
    if (!res.ok) {
        console.log("트리구조 데이터 로딩 실패: {}" + res.status);
        return null;
    }
    return await res.json();
}

export async function getOrigins() {
    const res = await fetch(`${API_BASE_URL}/origins`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getDropdownValues(origin, tag) {
        const res = await fetch(`${API_BASE_URL}/dropdown/${tag}`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getMeasurementList(origin, gatewayId = "") {
    const url = `${API_BASE_URL}/measurements?origin=${origin}${gatewayId ? `&gatewayId=${gatewayId}` : ""}`;
    console.log("로그 : {}" + url);
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
}

export function startSensorDataStream(params, onData) {
    if (eventSource) eventSource.close();

    const { companyDomain, origin, ...rest } = params;
    const query = new URLSearchParams({ origin, ...rest });
    const url = `${API_BASE_URL}/time-series-stream?${query.toString()}`;

    eventSource = new EventSource(url);
    eventSource.addEventListener("time-series-update", (event) => {
        const data = JSON.parse(event.data);
        onData(data);
    });
    eventSource.onerror = (err) => {
        console.error("SSE 오류", err);
        eventSource.close();
    };
}

export async function getHourlyAverages(origin, measurement, filters) {
    const params = new URLSearchParams(filters);
    params.append("origin", origin);
    params.append("measurement", measurement);

    const url = `${API_BASE_URL}/1h?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
        console.error('getHourlyAverages() 실패', res.status, await res.text());
        return {};
    }
    return await res.json();
}


export async function getChartDataForSensor(origin, sensor) {
    const res = await fetch(`${API_BASE_URL}/chart/type/${sensor}?origin=${origin}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

export async function getPieChartData(origin) {
    const res = await fetch(`${API_BASE_URL}/chart/pie?origin=${origin}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

/**
 * 현재 활성화된 센서 데이터 스트림(EventSource) 연결을 명시적으로 닫습니다.
 */
export function closeSensorDataStream() {
    if (eventSource) {
        console.log("Explicitly closing EventSource connection.");
        eventSource.close();
        eventSource = null; // 참조 제거하여 상태 반영
    } else {
        // console.log("No active EventSource connection to close.");
    }
}