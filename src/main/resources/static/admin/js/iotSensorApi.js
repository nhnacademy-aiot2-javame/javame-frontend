const API_BASE_URL = 'http://s2.java21.net:10279/proxy/environment';

let eventSource = null;


export async function getOrigins(companyDomain) {
    const res = await fetch(`${API_BASE_URL}/${companyDomain}/origins`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getDropdownValues(companyDomain, origin, tag) {
    const res = await fetch(`${API_BASE_URL}/${companyDomain}/dropdown/${tag}?origin=${origin}`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getMeasurementList(companyDomain, origin, location = "") {
    const url = `${API_BASE_URL}/${companyDomain}/measurements?origin=${origin}${location ? `&location=${location}` : ""}`;
    console.log("로그 : {}" + url);
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
}

export function startSensorDataStream(params, onData) {
    if (eventSource) eventSource.close();

    const { companyDomain, origin, ...rest } = params;
    const query = new URLSearchParams({ origin, ...rest });
    const url = `${API_BASE_URL}/${companyDomain}/time-series-stream?${query.toString()}`;

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

export async function getHourlyAverages(companyDomain, origin, measurement, filters) {
    const params = new URLSearchParams(filters);
    params.append("origin", origin);
    params.append("measurement", measurement);

    const url = `${API_BASE_URL}/${companyDomain}/1h?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
        console.error('getHourlyAverages() 실패', res.status, await res.text());
        return {};
    }
    return await res.json();
}


export async function getChartDataForSensor(companyDomain, origin, sensor) {
    const res = await fetch(`${API_BASE_URL}/${companyDomain}/chart/type/${sensor}?origin=${origin}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

export async function getPieChartData(companyDomain, origin) {
    const res = await fetch(`${API_BASE_URL}/${companyDomain}/chart/pie?origin=${origin}`);
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
