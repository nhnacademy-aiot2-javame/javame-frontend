/**
 * 테이블 페이지 스크립트
 * 관리자 테이블 페이지의 동작을 구현합니다.
 */

// 현재 필터 상태
let currentFilters = {
    deviceId: null,
    sensorType: null,
    startDate: null,
    endDate: null
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initTable();
});

/**
 * 테이블 페이지를 초기화합니다.
 */
async function initTable() {
    try {
        // 센서 타입 및 디바이스 ID 목록 가져오기
        const sensorTypes = await getAllSensorTypes();
        const deviceIds = await getAllDeviceIds();

        // 필터 드롭다운 초기화
        initFilterDropdowns(sensorTypes, deviceIds);

        // 날짜 필터 초기화
        initDateFilters();

        // 데이터 테이블 로드
        await loadSensorDataTable();

        // 필터 버튼 이벤트 리스너 등록
        document.getElementById('filterButton').addEventListener('click', function() {
            applyFilters();
        });

        // 필터 초기화 버튼 이벤트 리스너 등록
        document.getElementById('resetButton').addEventListener('click', function() {
            resetFilters();
        });

    } catch (error) {
        console.error('테이블 초기화 중 오류 발생:', error);
        alert('테이블 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 필터 드롭다운을 초기화합니다.
 * @param {Array} sensorTypes 센서 타입 목록
 * @param {Array} deviceIds 디바이스 ID 목록
 */
function initFilterDropdowns(sensorTypes, deviceIds) {
    // 센서 타입 드롭다운 초기화
    const sensorTypeDropdown = document.getElementById('sensorTypeFilter');
    if (sensorTypeDropdown) {
        // 기본 옵션 추가
        sensorTypeDropdown.innerHTML = '<option value="">모든 센서 타입</option>';

        // 센서 타입 옵션 추가
        sensorTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            sensorTypeDropdown.appendChild(option);
        });
    }

    // 디바이스 ID 드롭다운 초기화
    const deviceIdDropdown = document.getElementById('deviceIdFilter');
    if (deviceIdDropdown) {
        // 기본 옵션 추가
        deviceIdDropdown.innerHTML = '<option value="">모든 디바이스</option>';

        // 디바이스 ID 옵션 추가
        deviceIds.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            deviceIdDropdown.appendChild(option);
        });
    }
}

/**
 * 날짜 필터를 초기화합니다.
 */
function initDateFilters() {
    // 날짜 입력 필드 가져오기
    const startDateInput = document.getElementById('startDateFilter');
    const endDateInput = document.getElementById('endDateFilter');

    if (startDateInput && endDateInput) {
        // 현재 날짜 가져오기
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // 날짜 형식으로 변환 (YYYY-MM-DD)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // 초기 날짜 설정
        startDateInput.value = formatDate(oneMonthAgo);
        endDateInput.value = formatDate(now);
    }
}

/**
 * 센서 데이터 테이블을 로드합니다.
 */
async function loadSensorDataTable() {
    try {
        let sensorData;

        // 필터 적용 여부에 따라 데이터 가져오기
        if (currentFilters.deviceId && currentFilters.sensorType) {
            // 디바이스 ID와 센서 타입으로 필터링
            sensorData = await getSensorDataByDeviceAndType(
                currentFilters.deviceId,
                currentFilters.sensorType
            );
        } else if (currentFilters.deviceId) {
            // 디바이스 ID로 필터링
            sensorData = await getSensorDataByDeviceId(currentFilters.deviceId);
        } else if (currentFilters.sensorType) {
            // 센서 타입으로 필터링
            sensorData = await getSensorDataByType(currentFilters.sensorType);
        } else {
            // 모든 데이터 가져오기
            sensorData = await getAllSensorData();
        }

        // 날짜 필터 적용 (클라이언트 측에서 처리)
        if (currentFilters.startDate || currentFilters.endDate) {
            sensorData = filterDataByDate(sensorData, currentFilters.startDate, currentFilters.endDate);
        }

        // 테이블 업데이트
        updateDataTable(sensorData);

    } catch (error) {
        console.error('센서 데이터 로드 중 오류 발생:', error);
    }
}

/**
 * 데이터 테이블을 업데이트합니다.
 * @param {Array} sensorData 센서 데이터 목록
 */
function updateDataTable(sensorData) {
    const tableBody = document.querySelector('#datatablesSimple tbody');
    if (!tableBody) {
        console.error('데이터 테이블 요소를 찾을 수 없습니다.');
        return;
    }

    // 테이블 내용 초기화
    tableBody.innerHTML = '';

    if (!sensorData || sensorData.length === 0) {
        // 데이터가 없는 경우
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" class="text-center">데이터가 없습니다.</td>';
        tableBody.appendChild(row);
        return;
    }

    // 데이터 행 추가
    sensorData.forEach(data => {
        // 날짜 형식 변환
        const receivedDate = new Date(data.receivedAt);
        const formattedDate = receivedDate.toLocaleString();

        // 새 행 추가
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.dataId}</td>
            <td>${data.deviceId}</td>
            <td>${data.sensorType}</td>
            <td>${data.sensorValue} ${data.unit}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewSensorDetail(${data.dataId})">
                    상세보기
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // 데이터 테이블 플러그인 초기화 (이미 초기화되어 있으면 갱신)
    if (typeof simpleDatatables !== 'undefined') {
        if (window.dataTable) {
            window.dataTable.destroy();
        }
        window.dataTable = new simpleDatatables.DataTable('#datatablesSimple');
    }
}

/**
 * 날짜로 데이터를 필터링합니다.
 * @param {Array} data 필터링할 데이터
 * @param {string} startDateStr 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDateStr 종료 날짜 (YYYY-MM-DD)
 * @returns {Array} 필터링된 데이터
 */
function filterDataByDate(data, startDateStr, endDateStr) {
    if (!data || data.length === 0) {
        return data;
    }

    let startDate = null;
    let endDate = null;

    // 시작 날짜 설정
    if (startDateStr) {
        startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);
    }

    // 종료 날짜 설정
    if (endDateStr) {
        endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
    }

    // 날짜 필터 적용
    return data.filter(item => {
        const itemDate = new Date(item.receivedAt);

        if (startDate && itemDate < startDate) {
            return false;
        }

        if (endDate && itemDate > endDate) {
            return false;
        }

        return true;
    });
}

/**
 * 필터를 적용합니다.
 */
function applyFilters() {
    // 필터 값 가져오기
    currentFilters.deviceId = document.getElementById('deviceIdFilter').value || null;
    currentFilters.sensorType = document.getElementById('sensorTypeFilter').value || null;
    currentFilters.startDate = document.getElementById('startDateFilter').value || null;
    currentFilters.endDate = document.getElementById('endDateFilter').value || null;

    // 데이터 테이블 다시 로드
    loadSensorDataTable();
}

/**
 * 필터를 초기화합니다.
 */
function resetFilters() {
    // 필터 드롭다운 초기화
    document.getElementById('deviceIdFilter').value = '';
    document.getElementById('sensorTypeFilter').value = '';

    // 현재 날짜로 날짜 필터 초기화
    initDateFilters();

    // 필터 상태 초기화
    currentFilters = {
        deviceId: null,
        sensorType: null,
        startDate: null,
        endDate: null
    };

    // 데이터 테이블 다시 로드
    loadSensorDataTable();
}

/**
 * 센서 데이터 상세 정보를 봅니다.
 * @param {number} id 센서 데이터 ID
 */
async function viewSensorDetail(id) {
    try {
        // ID로 센서 데이터 가져오기
        const sensorData = await getSensorDataById(id);

        if (!sensorData) {
            alert('센서 데이터를 찾을 수 없습니다.');
            return;
        }

        // 날짜 형식 변환
        const receivedDate = new Date(sensorData.receivedAt);
        const formattedDate = receivedDate.toLocaleString();

        // 상세 정보 모달 내용 설정
        const modalBody = document.querySelector('#sensorDetailModal .modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="mb-3">
                    <strong>데이터 ID:</strong> ${sensorData.dataId}
                </div>
                <div class="mb-3">
                    <strong>디바이스 ID:</strong> ${sensorData.deviceId}
                </div>
                <div class="mb-3">
                    <strong>센서 타입:</strong> ${sensorData.sensorType}
                </div>
                <div class="mb-3">
                    <strong>센서 값:</strong> ${sensorData.sensorValue} ${sensorData.unit}
                </div>
                <div class="mb-3">
                    <strong>수신 시각:</strong> ${formattedDate}
                </div>
            `;
        }

        // 모달 제목 설정
        const modalTitle = document.querySelector('#sensorDetailModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `센서 데이터 상세 정보 (ID: ${sensorData.dataId})`;
        }

        // 모달 표시
        const modal = new bootstrap.Modal(document.getElementById('sensorDetailModal'));
        modal.show();

    } catch (error) {
        console.error('센서 데이터 상세 조회 중 오류 발생:', error);
        alert('센서 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}