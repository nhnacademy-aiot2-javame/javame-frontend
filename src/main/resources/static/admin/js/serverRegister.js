import { fetchWithAuth } from '../../index/js/auth.js';

// 트리 전체 데이터를 받아놓는 용도지만,
// 이제 value 변환 불필요! (한글 label만 씀)
let labelValueTreeData = null;

// charts.js에서 트리 데이터 받아옴 (호환성 위해 유지)
export function setTreeDataForLabelValueMap(treeData) {
    labelValueTreeData = treeData;
}

const thresholdDataName = document.getElementById('thresholdDataName');
const thresholdPrevValue = document.getElementById('thresholdPrevValue');
const minInput = document.getElementById('minThresholdInput');
const maxInput = document.getElementById('maxThresholdInput');
const registerBtn = document.getElementById('registerThresholdBtn');
const updateBtn = document.getElementById('updateThresholdBtn');
const deleteBtn = document.getElementById('deleteThresholdBtn');

// 등록폼 상태
let selected = {
    deviceId: null,
    location: null,    // == 한글 label
    gateway: null,     // == 한글 label
    measurement: null, // == 한글 label
    companyDomain: null,
    serverNo: null,
    serverDataNo: null
};

// 임계값 조회 및 데이터명/입력값 UI 반영 (트리 등에서 선택 시 호출)
export async function onDataSelect(deviceId, location, gatewayId, measurement, labelKor, companyDomain) {
    selected.deviceId = deviceId;
    selected.location = location;
    selected.gateway = gatewayId;
    selected.measurement = measurement;
    selected.companyDomain = companyDomain;
    thresholdDataName.innerText = labelKor && labelKor.trim() ? labelKor : '(데이터명 없음)';
    minInput.value = '';
    maxInput.value = '';
    registerBtn.disabled = true;
    thresholdPrevValue.innerText = '';

    // 서버 리스트 fetch
    const url = '/rule/servers/cp/companyDomain';
    const serverListRes = await fetchWithAuth(url);
    if (!serverListRes.ok) {
        alert('서버 리스트 조회 실패');
        updateBtnState();
        return;
    }
    const serverList = await serverListRes.json();
    const matchedServer = serverList.find(row => row.iphost === deviceId);

    if (!matchedServer) {
        alert('등록된 임계치가 없습니다.');
        updateBtnState();
        return;
    }
    selected.serverNo = matchedServer.serverNo;

    // 임계값 리스트 fetch
    const listRes = await fetchWithAuth(`/rule/server-datas/by-server-no/${selected.serverNo}`);
    let match = null;
    if (listRes.ok) {
        const serverDataList = await listRes.json();
        match = serverDataList.find(d =>
            d.serverDataLocation === selected.location &&
            d.serverDataGateway === selected.gateway &&
            d.serverDataName === selected.measurement
        );
    }
    if (match) {
        minInput.value = match.minThreshold ?? '';
        maxInput.value = match.maxThreshold ?? '';
        selected.serverDataNo = match.serverDataNo;
        thresholdPrevValue.innerText = `저장된 최소값: ${match.minThreshold ?? '-'}, 최대값: ${match.maxThreshold ?? '-'}`;
    } else {
        minInput.value = '';
        maxInput.value = '';
        selected.serverDataNo = null;
        thresholdPrevValue.innerText = '저장된 값 없음';
    }
    registerBtn.disabled = false;
    updateBtnState();
}

// 등록 버튼
registerBtn.addEventListener('click', async function () {
    if (!selected.serverNo) {
        alert('서버 정보가 없습니다.');
        return;
    }
    // label(한글) 그대로 저장!
    const data = {
        serverDataLocation: selected.location,
        serverDataGateway: selected.gateway,
        serverDataName: selected.measurement,
        minThreshold: minInput.value,
        maxThreshold: maxInput.value
    };
    const url = `/rule/server-datas?serverNo=${selected.serverNo}`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
    console.log('=== 임계값 등록 요청 ===', url, options);
    const res = await fetchWithAuth(url, options);

    if (res.ok) {
        alert('임계치 등록 완료!');
        await onDataSelect(selected.deviceId, selected.location, selected.gateway, selected.measurement, thresholdDataName.innerText, selected.companyDomain);
    } else {
        alert('저장 실패... 관리자에게 문의하세요.');
    }
});

// 수정 버튼
updateBtn.addEventListener('click', async function () {
    if (!selected.serverDataNo) {
        alert('수정할 임계치 데이터가 없습니다.');
        return;
    }
    const data = {
        serverDataLocation: selected.location,
        serverDataGateway: selected.gateway,
        serverDataName: selected.measurement,
        minThreshold: minInput.value,
        maxThreshold: maxInput.value
    };
    const url = `/rule/server-datas/${selected.serverDataNo}`;
    const options = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
    console.log('=== 임계값 수정 요청 ===', url, options);
    const res = await fetchWithAuth(url, options);

    if (res.ok) {
        alert('임계치 수정 완료!');
        await onDataSelect(selected.deviceId, selected.location, selected.gateway, selected.measurement, thresholdDataName.innerText, selected.companyDomain);
    } else {
        alert('수정 실패... 관리자에게 문의하세요.');
    }
});

// 삭제 버튼
deleteBtn.addEventListener('click', async function () {
    if (!selected.serverDataNo) {
        alert('삭제할 임계치 데이터가 없습니다.');
        return;
    }
    const url = `/rule/server-datas/${selected.serverDataNo}`;
    const options = { method: 'DELETE' };
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetchWithAuth(url, options);
    if (res.ok) {
        alert('임계치 삭제 완료!');
        minInput.value = '';
        maxInput.value = '';
        thresholdPrevValue.innerText = '저장된 값 없음';
        selected.serverDataNo = null;
        updateBtnState();
    } else {
        alert('삭제 실패... 관리자에게 문의하세요.');
    }
});

function updateBtnState() {
    if (selected.serverDataNo) {
        registerBtn.disabled = true;
        updateBtn.disabled = false;
        deleteBtn.disabled = false;
    } else {
        registerBtn.disabled = false;
        updateBtn.disabled = true;
        deleteBtn.disabled = true;
    }
}
