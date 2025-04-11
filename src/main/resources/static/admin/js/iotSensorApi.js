/**
 * IoT 센서 API 클라이언트
 * 서버 API와 통신하기 위한 함수들을 제공합니다.
 */

const API_BASE_URL = 'https://localhost:10257/api/sensors';

/**
 * 모든 센서 데이터를 가져옵니다.
 * @returns {Promise<Array>} 센서 데이터 목록
 */
async function getAllSensorData() {
    try {
        const response = await fetch(`${API_BASE_URL}`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error('센서 데이터 가져오기 실패:', error);
        return [];
    }
}

/**
 * ID로 센서 데이터를 가져옵니다.
 * @param {number} id 센서 데이터 ID
 * @returns {Promise<Object>} 센서 데이터
 */
async function getSensorDataById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error(`ID ${id}의 센서 데이터 가져오기 실패:`, error);
        return null;
    }
}

/**
 * 디바이스 ID로 센서 데이터를 가져옵니다.
 * @param {string} deviceId 디바이스 ID
 * @returns {Promise<Array>} 센서 데이터 목록
 */
async function getSensorDataByDeviceId(deviceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/device/${deviceId}`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error(`디바이스 ID ${deviceId}의 센서 데이터 가져오기 실패:`, error);
        return [];
    }
}

/**
 * 센서 타입으로 데이터를 가져옵니다.
 * @param {string} sensorType 센서 타입
 * @returns {Promise<Array>} 센서 데이터 목록
 */
async function getSensorDataByType(sensorType) {
    try {
        const response = await fetch(`${API_BASE_URL}/type/${sensorType}`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error(`센서 타입 ${sensorType}의 데이터 가져오기 실패:`, error);
        return [];
    }
}

/**
 * 센서 타입별 통계를 가져옵니다.
 * @returns {Promise<Array>} 센서 타입별 통계 목록
 */
async function getSensorStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error('센서 통계 가져오기 실패:', error);
        return [];
    }
}

/**
 * 특정 센서 타입의 차트 데이터를 가져옵니다.
 * @param {string} sensorType 센서 타입
 * @returns {Promise<Object>} 차트 데이터 (labels, values)
 */
async function getChartDataForSensorType(sensorType) {
    try {
        const response = await fetch(`${API_BASE_URL}/type/${sensorType}/chart`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error(`센서 타입 ${sensorType}의 차트 데이터 가져오기 실패:`, error);
        return { labels: [], values: [] };
    }
}

/**
 * 파이 차트 데이터를 가져옵니다.
 * @returns {Promise<Object>} 차트 데이터 (labels, values)
 */
async function getPieChartData() {
    try {
        const response = await fetch(`${API_BASE_URL}/chart/pie`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error('파이 차트 데이터 가져오기 실패:', error);
        return { labels: [], values: [] };
    }
}

/**
 * 모든 센서 타입 목록을 가져옵니다.
 * @returns {Promise<Array>} 센서 타입 목록
 */
async function getAllSensorTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}/types`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error('센서 타입 목록 가져오기 실패:', error);
        return [];
    }
}

/**
 * 모든 디바이스 ID 목록을 가져옵니다.
 * @returns {Promise<Array>} 디바이스 ID 목록
 */
async function getAllDeviceIds() {
    try {
        const response = await fetch(`${API_BASE_URL}/devices`);
        if (!response.ok) {
            throw new Error('서버 응답 실패');
        }
        return await response.json();
    } catch (error) {
        console.error('디바이스 ID 목록 가져오기 실패:', error);
        return [];
    }
}