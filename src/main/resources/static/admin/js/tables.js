import {
    getOrigins,
    getDropdownValues,
    getMeasurementList,
    getHourlyAverages,
    startSensorDataStream, // onError 콜백 받는 버전으로 가정
    closeSensorDataStream  // 명시적 종료 함수 추가 가정
} from './iotSensorApi.js'; // API 함수 경로는 실제 프로젝트에 맞게 조정

// 현재 적용된 필터 조건을 저장하는 객체
let currentTableFilter = {};

// DOM 로딩 완료 후 초기화 함수 실행
window.addEventListener('DOMContentLoaded', initTable);

/**
 * 페이지 초기화 함수
 */
async function initTable() {
    console.log("Initializing table page...");
    const companyDomain = 'javame'; // 실제 환경에 맞게 수정 필요
    currentTableFilter.companyDomain = companyDomain;

    try {
        // 1. Origin 목록 가져오기
        const origins = await getOrigins(companyDomain);
        console.log("Fetched origins:", origins);

        if (!origins || origins.length === 0) {
            console.warn(`No origins found for company "${companyDomain}".`);
            const originSelect = document.getElementById('originSelect');
            if (originSelect) {
                originSelect.disabled = true;
                originSelect.options[0].textContent = "Origin 없음";
            }
            disableDependentFilters();
            return;
        }

        // 2. Origin 드롭다운 채우기 및 변경 시 하위 필터 설정 로직 연결
        await populateDropdown('originSelect', origins, async (selectedOrigin) => {
            // Origin 변경 시 동작
            console.log(`Origin changed to: ${selectedOrigin}`);
            currentTableFilter.origin = selectedOrigin;
            // Origin 변경 시 기존 스트림 종료 및 테이블 초기화
            closeSensorDataStream();
            clearTables("Origin 변경됨. 하위 필터를 선택하고 적용하세요.");
            // 선택된 Origin에 따라 나머지 필터 드롭다운 설정
            if (selectedOrigin) { // 유효한 Origin 선택 시에만 하위 로드
                await setupFilterDropdowns(companyDomain, selectedOrigin);
            } else { // "선택" 옵션 선택 시 하위 비활성화
                disableDependentFilters();
            }
        });

        // 3. 필터 적용 및 초기화 버튼 이벤트 리스너 연결
        const filterButton = document.getElementById('filterButton');
        const resetButton = document.getElementById('resetButton');

        if (filterButton) {
            filterButton.addEventListener('click', handleFilterApply);
        } else {
            console.error("Filter button not found!");
        }

        if (resetButton) {
            resetButton.addEventListener('click', handleFilterReset);
        } else {
            console.error("Reset button not found!");
        }

        // 초기 페이지 로드 시 테이블 초기 상태 메시지 설정
        clearTables("필터를 선택하고 적용해주세요.");

        console.log("Table page initialized.");

    } catch (error) {
        console.error("Error during table initialization:", error);
        alert("페이지 초기화 중 오류가 발생했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.");
        // 오류 발생 시 테이블에 오류 메시지 표시 가능
        renderTableError("페이지 초기화 실패");
        renderAverageTableError("페이지 초기화 실패");
    }
}

/**
 * Origin을 제외한 하위 필터들을 비활성화하고 옵션을 초기화합니다.
 */
function disableDependentFilters() {
    console.log("Disabling dependent filters...");
    const dependentTags = ['location', 'place', 'device_id', 'building', '_field', 'measurement'];
    dependentTags.forEach(tag => {
        const select = document.getElementById(`${tag}Select`);
        if (select) {
            select.disabled = true;
            while (select.options.length > 1) {
                select.remove(1);
            }
            select.value = "";
        }
    });
}

/**
 * 테이블과 평균 테이블 내용을 지우고 안내 메시지를 표시합니다.
 * @param {string} [message='필터를 선택하고 적용해주세요.'] - 테이블 본문에 표시할 메시지
 */
function clearTables(message = '필터를 선택하고 적용해주세요.') {
    const tbody = document.querySelector('#datatablesSimple tbody');
    if (tbody) {
        tbody.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 11; // 컬럼 수
        td.className = 'text-center';
        td.textContent = message;
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    const averageContainer = document.getElementById('averageTable');
    if (averageContainer) {
        averageContainer.replaceChildren(); // 평균 테이블 영역도 비움
    }
    console.log("Tables cleared with message:", message);
}


/**
 * 특정 태그(location, place 등)에 대한 드롭다운 값을 가져와 채웁니다.
 * @param {string} companyDomain - 회사 도메인
 * @param {string} origin - 현재 선택된 origin
 */
async function setupFilterDropdowns(companyDomain, origin) {
    console.log(`Setting up dependent filters for origin: ${origin}`);
    const tags = ['location', 'place', 'device_id', 'building', '_field'];
    const measurementTag = 'measurement';

    // 모든 하위 필터 드롭다운 활성화 및 초기화
    [...tags, measurementTag].forEach(tag => {
        const select = document.getElementById(`${tag}Select`);
        if (select) {
            select.disabled = false;
            while (select.options.length > 1) {
                select.remove(1);
            }
            select.value = "";
        }
    });

    try {
        // Promise.all 사용하여 병렬 요청
        const promises = [
            ...tags.map(tag => getDropdownValues(companyDomain, origin, tag)
                .then(values => ({ tag, values: values || [] }))
                .catch(error => {
                    console.error(`Error fetching dropdown for ${tag}:`, error);
                    return { tag, values: [] };
                })),
            getMeasurementList(companyDomain, origin) // location 파라미터는 현재 사용 안 함
                .then(values => ({ tag: measurementTag, values: values || [] }))
                .catch(error => {
                    console.error(`Error fetching measurement list:`, error);
                    return { tag: measurementTag, values: [] };
                })
        ];

        const results = await Promise.all(promises);

        // 각 드롭다운 채우기
        for (const { tag, values } of results) {
            // populateDropdown은 이제 변경 리스너를 설정하지 않음 (initTable에서 origin만 설정)
            await populateDropdown(`${tag}Select`, values);
        }
        console.log(`Dependent filters updated for origin: ${origin}`);

    } catch (error) {
        console.error("Error setting up filter dropdowns:", error);
        disableDependentFilters();
        alert(`하위 필터 목록 로딩 오류: ${error.message}`);
    }
}

/**
 * 드롭다운(<select>) 요소를 주어진 아이템들로 채웁니다.
 * @param {string} id - select 요소의 ID
 * @param {string[]} items - 드롭다운에 표시할 문자열 배열
 * @param {function(string)} [onChange] - (선택적) 값이 변경될 때 호출될 콜백. Origin Select에만 사용.
 */
async function populateDropdown(id, items, onChange) {
    const select = document.getElementById(id);
    if (!select) {
        console.error(`Select element with id "${id}" not found.`);
        return;
    }

    // 기존 옵션 비우기 (첫 "선택" 옵션 제외)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // 새 옵션 추가
    if (items && items.length > 0) {
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            select.appendChild(opt);
        });
    }

    // Origin 드롭다운 처리: 첫 항목 선택 및 이벤트 리스너 설정
    if (id === 'originSelect') {
        if (items && items.length > 0) {
            select.value = items[0]; // 첫 항목 자동 선택
            // 첫 항목 선택 후 변경 콜백 실행 (비동기로)
            if (onChange) {
                // setTimeout을 사용하여 현재 콜스택 완료 후 실행 보장
                setTimeout(async () => {
                    try {
                        await onChange(items[0]);
                    } catch (error) {
                        console.error(`Error executing initial onChange for ${id}:`, error);
                    }
                }, 0);
            }
        } else {
            select.value = ""; // 아이템 없으면 "선택" 상태
        }

        // Origin Select에만 change 이벤트 리스너 설정
        if (onChange) {
            const eventHandler = async (e) => {
                const selectedValue = e.target.value;
                try {
                    await onChange(selectedValue);
                } catch (error) {
                    console.error(`Error executing onChange callback for ${id}:`, error);
                }
            };
            // 기존 리스너 제거 후 새로 추가
            if (select.handleChange) {
                select.removeEventListener('change', select.handleChange);
            }
            select.addEventListener('change', eventHandler);
            select.handleChange = eventHandler;
        }
    } else {
        // 다른 드롭다운은 기본 "선택" 상태 유지
        select.value = "";
        // 다른 드롭다운의 change 리스너는 제거 (필요 시)
        if (select.handleChange) {
            select.removeEventListener('change', select.handleChange);
            delete select.handleChange;
        }
    }
}


/**
 * 센서 데이터 스트림을 시작하고 테이블을 업데이트합니다.
 */
async function fetchAndRenderTable() {
    if (!currentTableFilter._measurement) {
        console.log("Measurement not selected. Cannot fetch time-series data.");
        clearTables("Measurement를 선택하고 필터를 적용하세요.");
        return;
    }

    console.log("Fetching sensor data with filter:", currentTableFilter);
    renderTableLoading(); // 로딩 상태 표시

    // API 모듈의 startSensorDataStream 호출 (onError 콜백 추가)
    try {
        startSensorDataStream(
            currentTableFilter,
            (data) => { // onData 콜백
                const measurement = currentTableFilter._measurement;
                const records = data && data[measurement] ? data[measurement] : [];
                renderTable(records);
            },
            (error) => { // onError 콜백
                console.error("SSE stream error reported:", error);
                renderTableError("데이터 스트리밍 중 오류가 발생했습니다.");
                // 스트림은 API 내부의 onerror에서 이미 닫혔을 것임
            }
        );
        console.log("Sensor data stream initiated.");
    } catch (error) {
        // EventSource 생성 자체에서 예외 발생 시 (거의 발생 안 함)
        console.error("Error initiating sensor data stream:", error);
        renderTableError("데이터 스트림 시작 중 오류 발생.");
    }
}

/**
 * 테이블에 '데이터 로딩 중...' 메시지를 표시합니다.
 */
function renderTableLoading() {
    const tbody = document.querySelector('#datatablesSimple tbody');
    if (!tbody) return;
    tbody.replaceChildren();
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 11;
    td.className = 'text-center';
    td.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> 센서 데이터 로딩 중...';
    tr.appendChild(td);
    tbody.appendChild(tr);
}

/**
 * 테이블에 오류 메시지를 표시합니다.
 * @param {string} [message='데이터 로딩 중 오류 발생'] - 표시할 오류 메시지
 */
function renderTableError(message = '데이터 로딩 중 오류가 발생했습니다.') {
    const tbody = document.querySelector('#datatablesSimple tbody');
    if (!tbody) return;
    tbody.replaceChildren();
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 11;
    td.className = 'text-center text-danger';
    td.textContent = message;
    tr.appendChild(td);
    tbody.appendChild(tr);
}


/**
 * 주어진 센서 데이터 레코드로 테이블 본문(tbody)을 렌더링합니다.
 * @param {Array<object>} records - 테이블에 표시할 센서 데이터 객체 배열
 */
function renderTable(records) {
    const tbody = document.querySelector('#datatablesSimple tbody');
    if (!tbody) return;

    tbody.replaceChildren(); // 새 데이터로 완전히 교체

    if (!records || records.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 11;
        td.className = 'text-center';
        td.textContent = '표시할 데이터가 없습니다.';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        const fragment = document.createDocumentFragment();
        records.forEach(r => {
            const time = r.time ? new Date(r.time).toLocaleString() : '-';
            const field = r.field ?? '-';
            const value = r.value ?? '-';
            const tags = r.tags || {};

            const {
                companyDomain = '-', origin = '-', location = '-', place = '-',
                _measurement = '-', device_id = '-', _field = '-', building = '-'
            } = tags;

            const tr = document.createElement('tr');
            const cells = [
                time, field, value, companyDomain, origin, location,
                place, _measurement, device_id, _field, building
            ];

            cells.forEach(cellData => {
                const td = document.createElement('td');
                td.textContent = cellData;
                tr.appendChild(td);
            });
            fragment.appendChild(tr);
        });
        tbody.appendChild(fragment);
    }
}

/**
 * 시간대별 평균 데이터를 가져와 테이블 형태로 렌더링합니다.
 */
async function renderAverageTable() {
    const { companyDomain, origin, _measurement, ...filters } = currentTableFilter;
    const container = document.getElementById('averageTable');
    if (!container) return;

    if (!companyDomain || !origin || !_measurement) {
        container.replaceChildren(); // 내용 비우기
        return; // 필수 조건 미충족 시 아무것도 표시 안 함
    }

    console.log("Fetching hourly averages:", { companyDomain, origin, _measurement, filters });
    container.replaceChildren(); // 로딩 전 비우기
    const loadingP = document.createElement('p');
    loadingP.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> 시간대별 평균 로딩 중...';
    container.appendChild(loadingP);

    try {
        const data = await getHourlyAverages(companyDomain, origin, _measurement, filters);
        console.log("Received hourly averages data:", data);

        container.replaceChildren(); // 로딩 메시지 제거

        if (!data || !Array.isArray(data.oneHourAverage) || typeof data.overallAverage !== 'number') {
            console.warn("Invalid data format for hourly averages:", data);
            renderAverageTableError("평균 데이터 형식이 올바르지 않습니다.");
            return;
        }

        const { oneHourAverage: oneHour = [], overallAverage = 0 } = data;

        const h3 = document.createElement('h3');
        h3.textContent = '시간대별 평균';
        container.appendChild(h3);

        const table = document.createElement('table');
        table.className = 'table table-bordered mt-3';
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['시간', '평균값', '편차 (vs 전체 평균)'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        const overallRow = tbody.insertRow();
        overallRow.insertCell().textContent = '전체 평균';
        overallRow.insertCell().textContent = overallAverage.toFixed(2);
        overallRow.insertCell().textContent = '-';

        if (oneHour.length > 0) {
            oneHour.forEach((avg, i) => {
                const row = tbody.insertRow();
                const hourString = `${String(i).padStart(2, '0')}:00 - ${String(i).padStart(2, '0')}:59`;
                row.insertCell().textContent = hourString;
                const avgValue = typeof avg === 'number' ? avg.toFixed(2) : '-';
                row.insertCell().textContent = avgValue;
                const diffCell = row.insertCell();
                if (typeof avg === 'number') {
                    const diff = avg - overallAverage;
                    diffCell.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
                } else {
                    diffCell.textContent = '-';
                }
            });
        } else {
            const noDataRow = tbody.insertRow();
            const cell = noDataRow.insertCell();
            cell.colSpan = 3;
            cell.textContent = '시간대별 평균 데이터가 없습니다.';
            cell.className = 'text-center';
        }
        container.appendChild(table);

    } catch (error) {
        console.error("Error fetching/rendering average table:", error);
        renderAverageTableError();
    }
}

/**
 * 평균 테이블 영역에 오류 메시지를 표시합니다.
 * @param {string} [message='시간대별 평균 로딩 중 오류 발생'] - 표시할 오류 메시지
 */
function renderAverageTableError(message = '시간대별 평균 로딩 중 오류가 발생했습니다.') {
    const container = document.getElementById('averageTable');
    if (!container) return;
    container.replaceChildren();
    const p = document.createElement('p');
    p.textContent = message;
    p.className = 'text-danger';
    container.appendChild(p);
}


/**
 * '필터 적용' 버튼 클릭 시 실행되는 핸들러
 */
async function handleFilterApply() {
    console.log("Apply filters button clicked.");
    const newFilter = { companyDomain: currentTableFilter.companyDomain };
    const tags = ['origin', 'location', 'place', 'device_id', 'building', '_field', 'measurement'];

    tags.forEach(tag => {
        const select = document.getElementById(`${tag}Select`);
        if (select && select.value) {
            const key = (tag === 'measurement') ? '_measurement' : tag;
            newFilter[key] = select.value;
        }
    });

    // 필수 필터(origin, measurement) 누락 시 경고/중단 가능
    if (!newFilter.origin) {
        alert("Origin을 선택해주세요.");
        return;
    }
    if (!newFilter._measurement) {
        alert("Measurement를 선택해주세요.");
        return;
    }


    currentTableFilter = newFilter;
    console.log("Applying filter:", currentTableFilter);

    // 데이터 로드 및 렌더링 (순차 실행)
    await fetchAndRenderTable(); // 센서 데이터 테이블
    await renderAverageTable(); // 평균 테이블
    console.log("Filters applied and tables updated.");
}

/**
 * '초기화' 버튼 클릭 시 실행되는 핸들러
 */
async function handleFilterReset() {
    console.log("Reset filters button clicked.");
    // 현재 스트림 명시적 종료
    closeSensorDataStream();

    const companyDomain = currentTableFilter.companyDomain;
    currentTableFilter = { companyDomain }; // 필터 객체 초기화

    // 모든 필터 UI 초기화 ("선택"으로)
    const allFilterTags = ['origin', 'location', 'place', 'device_id', 'building', '_field', 'measurement'];
    allFilterTags.forEach(tag => {
        const select = document.getElementById(`${tag}Select`);
        if (select) {
            select.value = "";
            // Origin 외 필드는 비활성화 및 옵션 제거
            if (tag !== 'origin') {
                select.disabled = true;
                while (select.options.length > 1) {
                    select.remove(1);
                }
            } else {
                select.disabled = false; // Origin은 활성화 유지
            }
        }
    });

    // 테이블 내용 초기화
    clearTables("필터를 선택하고 적용해주세요.");

    // Origin 목록 다시 로드 및 첫 항목 선택/처리
    try {
        const origins = await getOrigins(companyDomain);
        if (origins && origins.length > 0) {
            await populateDropdown('originSelect', origins, async (selectedOrigin) => {
                currentTableFilter.origin = selectedOrigin;
                closeSensorDataStream(); // 재확인 차원
                clearTables("Origin 변경됨. 하위 필터를 선택하고 적용하세요.");
                if (selectedOrigin) {
                    await setupFilterDropdowns(companyDomain, selectedOrigin);
                } else {
                    disableDependentFilters();
                }
            });
        } else {
            // Origin이 없을 경우
            const originSelect = document.getElementById('originSelect');
            if (originSelect) {
                originSelect.disabled = true;
                originSelect.options[0].textContent = "Origin 없음";
            }
            disableDependentFilters();
        }
    } catch (error) {
        console.error("Error resetting origin dropdown:", error);
    }

    console.log("Filters reset. Current filter:", currentTableFilter);
}