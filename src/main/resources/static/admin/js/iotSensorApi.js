import {
    fetchWithAuth
} from '/index/js/auth.js';

const API_BASE_URL = '/environment/companyDomain';

let eventSource = null;

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

// export function startSensorDataStream(params, onData) {
//     if (eventSource) eventSource.close();
//
//     const { companyDomain, origin, ...rest } = params;
//     const query = new URLSearchParams({ origin, ...rest });
//     const url = `${API_BASE_URL}/time-series-stream?${query.toString()}`;
//
//     eventSource = new EventSource(url);
//     eventSource.addEventListener("time-series-update", (event) => {
//         const data = JSON.parse(event.data);
//         onData(data);
//     });
//     eventSource.onerror = (err) => {
//         console.error("SSE 오류", err);
//         eventSource.close();
//     };
// }

let ws = null;

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


export async function getHourlyAverages(origin, measurement, filters) {
    const params = new URLSearchParams(filters);
    params.append("origin", origin);
    params.append("measurement", measurement);

    const url = `${API_BASE_URL}/1h?${params.toString()}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) {
        console.error('getHourlyAverages() 실패', res.status, await res.text());
        return {};
    }
    return await res.json();
}


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
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Failed to fetch current value for ${measurement}. Status: ${res.status}`, await res.text());
            return null; // 오류 발생 시 null 반환
        }
        const data = await res.json();
        // API가 반환하는 JSON 객체에 'value' 필드가 있고, 그 값이 숫자라고 가정합니다.
        // 실제 응답 형식에 맞춰 파싱 로직을 조정해야 할 수 있습니다.
        // 예: if (data && data.latest && typeof data.latest.value === 'number') return data.latest;
        return data; // API가 { value: ..., time: ... } 형태의 단일 객체를 반환한다고 가정
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
