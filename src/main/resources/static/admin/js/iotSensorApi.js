// iotSensorApi.js

const API_BASE_URL = 'http://localhost:10279/api/v1/environment';

/**
 * 특정 회사의 모든 센서 데이터(실시간/전체) - 예시 (실제 필요시 구현)
 */
export async function getAllSensorData(companyDomain, origin = 'sensor_data') {
    const url = `${API_BASE_URL}/${companyDomain}/sensor-stream?origin=${origin}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error('센서 데이터 가져오기 실패:', error);
        return [];
    }
}

/**
 * 센서 타입(Measurement) 목록
 */
export async function getAllSensorTypes(companyDomain) {
    const url = `${API_BASE_URL}/${companyDomain}/sensor-measurements`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error('센서 타입 목록 가져오기 실패:', error);
        return [];
    }
}

/**
 * 디바이스 ID 목록
 */
export async function getAllDeviceIds(companyDomain, origin = 'sensor_data') {
    const url = `${API_BASE_URL}/${companyDomain}/sensor-deviceIds?origin=${origin}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error('디바이스 ID 목록 가져오기 실패:', error);
        return [];
    }
}

/**
 * 회사 도메인 목록
 */
export async function getAllCompanyDomains(origin = 'sensor_data') {
    const url = `${API_BASE_URL}/sensor-companyDomains?origin=${origin}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error('회사 도메인 목록 가져오기 실패:', error);
        return [];
    }
}

/**
 * 특정 센서 타입의 차트 데이터
 */
export async function getChartDataForSensorType(companyDomain, sensorType, origin = 'sensor_data') {
    const url = `${API_BASE_URL}/${companyDomain}/chart/type/${sensorType}?origin=${origin}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error(`센서 타입 ${sensorType}의 차트 데이터 가져오기 실패:`, error);
        return { labels: [], values: [] };
    }
}

/**
 * 파이 차트 데이터
 */
export async function getPieChartData(companyDomain, origin = 'sensor_data') {
    const url = `${API_BASE_URL}/${companyDomain}/chart/pie?origin=${origin}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error('파이 차트 데이터 가져오기 실패:', error);
        return { labels: [], values: [] };
    }
}

/**
 * 빌딩, 장소, 디바이스ID 등 태그별 목록 (예시)
 */
export async function getBuildingList(companyDomain, origin = 'sensor_data') {
    const url = `${API_BASE_URL}/${companyDomain}/sensor-buildings?origin=${origin}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error('빌딩 목록 가져오기 실패:', error);
        return [];
    }
}

export async function getPlaceList(companyDomain, origin = 'sensor_data') {
    const url = `${API_BASE_URL}/${companyDomain}/sensor-places?origin=${origin}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('서버 응답 실패');
        return await response.json();
    } catch (error) {
        console.error('장소 목록 가져오기 실패:', error);
        return [];
    }
}
