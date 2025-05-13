// environmentApi.js
import { fetchWithAuth } from './auth.js';

const API_BASE_URL = '/api/v1/environment';

let eventSource = null;

export async function getOrigins(companyDomain) {
    const res = await fetchWithAuth(`${API_BASE_URL}/${companyDomain}/origins`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getDropdownValues(companyDomain, origin, tag) {
    const res = await fetchWithAuth(`${API_BASE_URL}/${companyDomain}/dropdown/${tag}?origin=${origin}`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getMeasurementList(companyDomain, origin, location = "") {
    const url = `${API_BASE_URL}/${companyDomain}/measurements?origin=${origin}${location ? `&location=${location}` : ""}`;
    console.log("로그:", url);
    const res = await fetchWithAuth(url);
    if (!res.ok) return [];
    return await res.json();
}

export function startSensorDataStream(params, onData) {
    if (eventSource) eventSource.close();

    const { companyDomain, origin, ...rest } = params;
    const query = new URLSearchParams({ origin, ...rest });
    const url = `${API_BASE_URL}/${companyDomain}/time-series-stream?${query.toString()}`;

    eventSource = new EventSource(url); // 인증 필요 시 Server-Sent Events에 토큰 붙이는 방식은 별도 처리 필요
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
    const res = await fetchWithAuth(url);
    if (!res.ok) {
        console.error('getHourlyAverages() 실패', res.status, await res.text());
        return {};
    }
    return await res.json();
}

export async function getChartDataForSensor(companyDomain, origin, sensor) {
    const res = await fetchWithAuth(`${API_BASE_URL}/${companyDomain}/chart/type/${sensor}?origin=${origin}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

export async function getPieChartData(companyDomain, origin) {
    const res = await fetchWithAuth(`${API_BASE_URL}/${companyDomain}/chart/pie?origin=${origin}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

export function closeSensorDataStream() {
    if (eventSource) {
        console.log("Explicitly closing EventSource connection.");
        eventSource.close();
        eventSource = null;
    }
}
