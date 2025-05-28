const API_BASE_URL = 'http://localhost:10279/api/v1/environment';

let eventSource = null;

export async function getTree(companyDomain) {
    const res = await fetch(`${API_BASE_URL}/${companyDomain}/tree`);
    if (!res.ok) {
        console.log("트리구조 데이터 로딩 실패: {}" + res.status);
        return null;
    }
    return await res.json();
}

export async function getOrigins(companyDomain) {
    const res = await fetch(`${API_BASE_URL}/${companyDomain}/origins`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getDropdownValues(companyDomain, origin, tag) {
        const res = await fetch(`${API_BASE_URL}/${companyDomain}/dropdown/${tag}`);
    if (!res.ok) return [];
    return await res.json();
}

export async function getMeasurementList(companyDomain, origin, gatewayId = "") {
    const url = `${API_BASE_URL}/${companyDomain}/measurements?origin=${origin}${gatewayId ? `&gatewayId=${gatewayId}` : ""}`;
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