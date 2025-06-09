import {
    fetchWithAuth
} from '/index/js/auth.js';

const API_BASE_URL = '/environment/companyDomain';

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

// ★★★ 통합 평균 데이터 조회 함수 (시간 범위 지원 추가) ★★★
export async function getAverageData(origin, measurement, filters, timeRange = '1h') {
    const params = new URLSearchParams();

    // ★★★ 검색 결과 [2] Period Over Period 방식: 파라미터 중복 제거 ★★★
    Object.entries(filters).forEach(([key, value]) => {
        if (key !== 'companyDomain') { // companyDomain은 게이트웨이에서 처리
            params.append(key, value);
        }
    });

    params.append("origin", origin);
    params.append("measurement", measurement);

    // ★★★ startTime/endTime 중복 추가 방지 ★★★
    // filters에서 이미 추가되었으므로 다시 추가하지 않음

    let endpoint;
    switch(timeRange) {
        case '1h':
            endpoint = '/1h';
            break;
        case '24h':
            endpoint = '/24h';
            break;
        case '1w':
            endpoint = '/1w';
            break;
        default:
            endpoint = '/average/' + timeRange;
    }

    const url = API_BASE_URL + endpoint + '?' + params.toString();

    console.log('getAverageData 호출 (' + timeRange + '):', url);
    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) {
            console.error('getAverageData(' + timeRange + ') 실패', res.status, await res.text());
            return {
                timeSeriesAverage: [],
                overallAverage: 0.0,
                timeRange: timeRange,
                error: true
            };
        }
        const result = await res.json();

        // ★★★ 검색 결과 [3] 응답 데이터 로깅 강화 ★★★
        console.log(`getAverageData(${timeRange}) 응답:`, {
            timeSeriesAverage: result.timeSeriesAverage?.length || 0,
            overallAverage: result.overallAverage,
            actualStartTime: result.actualStartTime,
            actualEndTime: result.actualEndTime,
            hasData: result.hasData
        });

        return result;
    } catch (error) {
        console.error('getAverageData(' + timeRange + ') 오류:', error);
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
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (key !== 'companyDomain') {
            params.append(key, value);
        }
    });

    params.append("origin", origin);
    params.append("measurement", measurement);

    const url = API_BASE_URL + '/1h?' + params.toString();

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

export async function getChartDataForSensor(origin, sensor, rangeMinutes = 5) {
    const params = new URLSearchParams({
        origin,
        rangeMinutes
    }).toString();
    const res = await fetchWithAuth(`${API_BASE_URL}/chart/type/${sensor}?${params}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

export async function getPieChartData(origin) {
    const res = await fetchWithAuth(`${API_BASE_URL}/chart/pie?origin=${encodeURIComponent(origin)}`);
    if (!res.ok) return { labels: [], values: [] };
    return await res.json();
}

// ★★★ 서비스 개수 조회 (companyDomain + gatewayId 기준) ★★★
export async function getServiceCount() {
    try {
        const res = await fetchWithAuth(API_BASE_URL + '/services/count');
        if (!res.ok) {
            console.warn('서비스 개수 조회 실패: ' + res.status);
            return 0;
        }
        const data = await res.json();
        return data.count || 0;
    } catch (error) {
        console.error('서비스 개수 조회 오류:', error);
        return 0;
    }
}

export async function getSensorCount() {
    try {
        const res = await fetchWithAuth(API_BASE_URL + '/sensors/count');
        if (!res.ok) {
            console.warn('센서 개수 조회 실패: ' + res.status);
            return 0;
        }
        const data = await res.json();
        return data.count || 0;
    } catch (error) {
        console.error('센서 개수 조회 오류:', error);
        return 0;
    }
}

export async function getServerCount() {
    try {
        const res = await fetchWithAuth(API_BASE_URL + '/servers/count');
        if (!res.ok) {
            console.warn('센서 개수 조회 실패: ' + res.status);
            return 0;
        }
        const data = await res.json();
        return data.count || 0;
    } catch (error) {
        console.error('센서 개수 조회 오류:', error);
        return 0;
    }
}

export async function getOutboundTraffic() {
    try {
        const res = await fetchWithAuth(API_BASE_URL + '/traffic/outbound');
        if (!res.ok) {
            console.warn('아웃바운드 트래픽 조회 실패: ' + res.status);
            return { formattedValue: '0.0 MB', success: false };
        }
        const data = await res.json();
        return data.traffic || { formattedValue: '0.0 MB', success: false };
    } catch (error) {
        console.error('아웃바운드 트래픽 조회 오류:', error);
        return { formattedValue: '0.0 MB', success: false };
    }
}

// ★★★ 통합 통계 조회 함수 (새로 추가) ★★★
export async function getDashboardStats() {
    try {
        const res = await fetchWithAuth(API_BASE_URL + '/stats');
        if (!res.ok) {
            console.warn('통합 통계 조회 실패: ' + res.status);
            return {
                serviceCount: 0,
                serverCount: 0,
                sensorCount: 0,
                outboundTraffic: { formattedValue: '0.0 MB' },
                inboundTraffic: { formattedValue: '0.0 MB' },
                success: false
            };
        }
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('통합 통계 조회 오류:', error);
        return {
            serviceCount: 0,
            serverCount: 0,
            sensorCount: 0,
            outboundTraffic: { formattedValue: '0.0 MB' },
            inboundTraffic: { formattedValue: '0.0 MB' },
            success: false
        };
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