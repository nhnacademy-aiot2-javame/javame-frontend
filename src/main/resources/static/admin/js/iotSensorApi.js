import {
    fetchWithAuth
} from '/index/js/auth.js';

const API_BASE_URL = '/environment/companyDomain';

let eventSource = null;
let ws = null;

export async function getTree() {
    const res = await fetchWithAuth(`${API_BASE_URL}/tree`);
    if (!res.ok) {
        console.log("트리구조 데이터 로딩 실패: {}" + res.status);
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
    console.log("로그 : {}" + url);
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
    const token = sessionStorage.getItem("accessToken") || ""; // 또는 auth에서 토큰 가져오기
    const wsUrl = `wss://javame.live/api/v1/ws/environment?token=${token}`;

    console.log("WebSocket 연결 시 토큰:", token); // 이 줄이 반드시 먼저 나와야 함
    console.log("WebSocket 연결할 URL:", wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        // 실시간 데이터 구독 메시지 전송
        ws.send(JSON.stringify({
            action: "subscribe",
            ...params // 필요 파라미터
        }));
    };

    ws.onmessage = (event) => {
        try {
            const obj = JSON.parse(event.data);

            if (obj.type === 'realtime' && Array.isArray(obj.data)) {
                // 진짜 데이터 온 경우만 차트 갱신
                onData(obj.data);
            } else if (obj.type === 'subscribe') {
                // 구독 응답, 최초 메시지 → 무시
                console.log('구독 성공 메시지:', obj.status);
            } else {
                // 혹시 모를 fallback
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

// 명시적 연결 종료 함수
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


/**
 * 특정 센서의 현재(최신) 값을 가져옵니다.
 * 백엔드 API가 '/{companyDomain}/current?origin=...&location=...&measurement=...' 형태의 엔드포인트를 제공한다고 가정합니다.
 * @param {string} companyDomain 회사 도메인
 * @param {string} origin 데이터 출처
 * @param {string} location 위치 (예: 'cpu', 'memory', '입구')
 * @param {string} measurement 측정 항목 (예: 'usage_user', 'used_percent', 'temperature')
 * @param {string} [field] (옵션) 값을 가져올 특정 필드명 (백엔드 API가 요구하는 경우)
 * @returns {Promise<Object|null>} { value: 숫자, time: "타임스탬프" } 형태의 객체 또는 오류 시 null
 */
export async function getCurrentSensorValue(companyDomain, origin, location, measurement, field = null) {
    // 쿼리 파라미터 구성
    const queryParams = new URLSearchParams({
        origin: origin,
        location: location,
        _measurement: measurement // 백엔드 컨트롤러가 @RequestParam("_measurement")로 받는다면 _measurement 사용
        // 또는 @RequestParam("measurement")라면 measurement 사용
    });

    if (field) {
        queryParams.append('_field', field); // 백엔드 컨트롤러가 @RequestParam("_field")로 받는다면 _field 사용
        // 또는 @RequestParam("field")라면 field 사용
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
