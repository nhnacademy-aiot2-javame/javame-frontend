import {
    fetchWithAuth
} from '/index/js/auth.js';

const API_BASE_URL = 'http://localhost:10279/api/v1/environment';

let eventSource = null;
let ws = null;

export async function getTree() {
    const res = await fetchWithAuth(`${API_BASE_URL}/tree`);
    if (!res.ok) {
        console.log("트리구조 데이터 로딩 실패: " + res.status);
        return null;
    }
    return await res.json();
}

export async function getOrigins() {
    const res = await fetchWithAuth(`${API_BASE_URL}/origins`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getDropdownValues(origin, tag) {
    const res = await fetchWithAuth(`${API_BASE_URL}/dropdown/${tag}`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getMeasurementList(origin, gatewayId = "") {
    const url = `${API_BASE_URL}/measurements?origin=${origin}${gatewayId ? `&gatewayId=${gatewayId}` : ""}`;
    console.log("로그 : " + url);
    const res = await fetchWithAuth(url);
    if (!res.ok) return [];
    return await res.json();
}

// ★★★ WebSocket 연결 함수 ★★★
export function startSensorDataWebSocket(params, onData) {
    if (ws) {
        ws.close();
        ws = null;
    }

    const { companyDomain, origin, ...rest } = params;
    const token = sessionStorage.getItem("accessToken") || localStorage.getItem("jwtToken") || "";
    const wsUrl = `ws://localhost:10279/ws/environment?token=${token}`;

    console.log("WebSocket 연결 시 토큰:", token.substring(0, 20) + "...");
    console.log("WebSocket 연결할 URL:", wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket 연결 성공");
        // 실시간 데이터 구독 메시지 전송
        ws.send(JSON.stringify({
            action: "subscribe",
            ...params
        }));
    };

    ws.onmessage = (event) => {
        try {
            const obj = JSON.parse(event.data);

            if (obj.type === 'realtime' && Array.isArray(obj.data)) {
                onData(obj.data);
            } else if (obj.type === 'subscribe') {
                console.log('구독 성공 메시지:', obj.status);
            } else if (obj.type === 'connection') {
                console.log('WebSocket 연결 확인:', obj.companyDomain);
            } else {
                onData([]);
            }
        } catch (e) {
            console.error("WebSocket 데이터 파싱 오류", e);
            onData([]);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket 연결 종료");
    };

    ws.onerror = (err) => {
        console.error("WebSocket 에러", err);
        ws.close();
    };
}

// ★★★ WebSocket 연결 종료 함수 ★★★
export function closeSensorDataWebSocket() {
    if (ws) {
        ws.close();
        ws = null;
    }
}

// ★★★ 통합 평균 데이터 조회 함수 (1h/24h/1w 지원) ★★★
export async function getAverageData(origin, measurement, filters, timeRange = '1h') {
    const companyDomain = filters.companyDomain;

    if (!companyDomain) {
        console.error('getAverageData: companyDomain이 필요합니다.');
        return {};
    }

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (key !== 'companyDomain') {
            params.append(key, value);
        }
    });

    params.append("origin", origin);
    params.append("measurement", measurement);

    // ★★★ 수정된 URL 경로 ★★★
    const url = `${API_BASE_URL}/companyDomain/${companyDomain}/average/${timeRange}?${params.toString()}`;

    console.log(`getAverageData 호출 (${timeRange}):`, url);

    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) {
            console.error(`getAverageData(${timeRange}) 실패`, res.status, await res.text());
            return {
                timeSeriesAverage: [],
                overallAverage: 0.0,
                timeRange: timeRange,
                error: true
            };
        }
        return await res.json();
    } catch (error) {
        console.error(`getAverageData(${timeRange}) 오류:`, error);
        return {
            timeSeriesAverage: [],
            overallAverage: 0.0,
            timeRange: timeRange,
            error: true
        };
    }
}

// ★★★ 1시간 평균 데이터 (기존 호환성 유지) ★★★
export async function getHourlyAverages(origin, measurement, filters) {
    const companyDomain = filters.companyDomain;

    if (!companyDomain) {
        console.error('getHourlyAverages: companyDomain이 필요합니다.');
        return {};
    }

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (key !== 'companyDomain') {
            params.append(key, value);
        }
    });

    params.append("origin", origin);
    params.append("measurement", measurement);

    // ★★★ 수정된 URL 경로 ★★★
    const url = `${API_BASE_URL}/companyDomain/${companyDomain}/1h?${params.toString()}`;

    console.log('getHourlyAverages 호출:', url);

    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) {
            console.error('getHourlyAverages() 실패', res.status, await res.text());
            return {};
        }
        return await res.json();
    } catch (error) {
        console.error('getHourlyAverages() 오류:', error);
        return {};
    }
}

// ★★★ 24시간 평균 데이터 ★★★
export async function get24HourAverages(origin, measurement, filters) {
    return getAverageData(origin, measurement, filters, '24h');
}

// ★★★ 주별 평균 데이터 ★★★
export async function getWeeklyAverages(origin, measurement, filters) {
    return getAverageData(origin, measurement, filters, '1w');
}

// ★★★ 차트 데이터 조회 함수들 ★★★
export async function getChartDataForSensor(origin, sensor) {
    const res = await fetchWithAuth(`${API_BASE_URL}/chart/type/${sensor}?origin=${encodeURIComponent(origin)}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

export async function getPieChartData(origin) {
    const res = await fetchWithAuth(`${API_BASE_URL}/chart/pie?origin=${encodeURIComponent(origin)}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

// ★★★ 현재 센서 값 조회 (fetchWithAuth 사용으로 수정) ★★★
export async function getCurrentSensorValue(companyDomain, origin, location, measurement, field = null) {
    const queryParams = new URLSearchParams({
        origin: origin,
        location: location,
        _measurement: measurement
    });

    if (field) {
        queryParams.append('_field', field);
    }

    const url = `${API_BASE_URL}/${companyDomain}/current?${queryParams.toString()}`;
    console.log(`Fetching current value from: ${url}`);

    try {
        const res = await fetchWithAuth(url); // ★★★ fetchWithAuth 사용 ★★★
        if (!res.ok) {
            console.error(`Failed to fetch current value for ${measurement}. Status: ${res.status}`, await res.text());
            return null;
        }
        const data = await res.json();
        return data;
    } catch (error) {
        console.error(`Error fetching current value for ${measurement}:`, error);
        return null;
    }
}

// ★★★ EventSource 연결 종료 함수 ★★★
export function closeSensorDataStream() {
    if (eventSource) {
        console.log("Explicitly closing EventSource connection.");
        eventSource.close();
        eventSource = null;
    }
}

// ★★★ 디버깅 함수 ★★★
export function debugApiStatus() {
    console.log('=== iotSensorApi 상태 ===');
    console.log('WebSocket 연결 상태:', ws ? ws.readyState : 'null');
    console.log('EventSource 연결 상태:', eventSource ? eventSource.readyState : 'null');
    console.log('API Base URL:', API_BASE_URL);

    const token = sessionStorage.getItem("accessToken") || localStorage.getItem("jwtToken");
    console.log('토큰 존재 여부:', token ? '있음' : '없음');

    if (token) {
        console.log('토큰 미리보기:', token.substring(0, 20) + '...');
    }
}

// ★★★ 전역 함수로 디버깅 함수 노출 ★★★
window.debugApiStatus = debugApiStatus;
