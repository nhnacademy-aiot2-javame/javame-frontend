import {
    fetchWithAuth,
    fetchWithAuthPost
} from '../../index/js/auth.js';

import {
    translationMap
} from '../../index/js/translationMap.js'

document.addEventListener('DOMContentLoaded',async function (){
    // 도메인에 걸린 데이터들 조회
    const url='/environment/companyDomain/dropdown/deviceId';
    const serverResponse=await fetchWithAuth(url);
    const datas = await serverResponse.json();

    const tbody = document.querySelector("#serverContent");
    if(tbody) {

        let i = 1;
        datas.forEach(data => {
            const serverContentTr = document.createElement('tr');
            const serverNo = document.createElement('td');
            const serverId = document.createElement('td');

            serverNo.innerText = i;
            serverId.innerText = data;

            serverContentTr.appendChild(serverNo);
            serverContentTr.appendChild(serverId);

            tbody.appendChild(serverContentTr);
            i++;

            serverContentTr.addEventListener('click', async function () {
                const datalistTbody = document.querySelector('#serverDataContent');
                datalistTbody.innerHTML = '';
                if(datalistTbody) {
                    let i = 1;
                    document.querySelector("#sensorDataTable").setAttribute('style','display: table');
                    const num = this.querySelectorAll('td')[1].textContent;
                    const locationUrl = `/environment/companyDomain/dropdown/location?deviceId=${num}`;
                    const locationResponse = await fetchWithAuth(locationUrl)
                    const locations = await locationResponse.json();

                    for(const location of locations){
                        const gatewayIdUrl = `/environment/companyDomain/dropdown/gatewayId?deviceId=${num}&location=${location}`;
                        const gatewayIdResponse = await fetchWithAuth(gatewayIdUrl);
                        const gatewayIds = await gatewayIdResponse.json();

                        for(const gatewayId of gatewayIds){
                            const measurementUrl = `/environment/companyDomain/dropdown/_measurement?deviceId=${num}&location=${location}&gatewayId=${gatewayId}`;
                            const measurementResponse = await fetchWithAuth(measurementUrl);
                            const measurements = await measurementResponse.json();

                            for (const measurement of measurements) {
                                const tr = document.createElement('tr');

                                const noTd = document.createElement('td');
                                const locationTd = document.createElement('td');
                                const deviceIdTd = document.createElement('td');
                                const gatewayTd = document.createElement('td');
                                const nameTd = document.createElement('td');
                                const minThresholdTd = document.createElement('td');
                                const maxThresholdTd = document.createElement('td');
                                const buttonTd = document.createElement('td');

                                noTd.innerText = i;
                                locationTd.innerText = translationMap[location] || location;
                                deviceIdTd.innerText = translationMap[num] || num;
                                gatewayTd.innerText = translationMap[gatewayId] || gatewayId;
                                nameTd.innerText = translationMap[measurement] || measurement;

                                const inputMinThreshold = document.createElement('input');
                                inputMinThreshold.type = 'text';
                                minThresholdTd.appendChild(inputMinThreshold);

                                const inputMaxThreshold = document.createElement('input');
                                inputMaxThreshold.type = 'text';
                                maxThresholdTd.appendChild(inputMaxThreshold);

                                const registerButton = document.createElement('button');
                                registerButton.innerText = '등록하기';
                                registerButton.classList.add('trendy-button');
                                buttonTd.appendChild(registerButton);

                                tr.appendChild(noTd);
                                tr.appendChild(locationTd);
                                tr.appendChild(deviceIdTd);
                                tr.appendChild(gatewayTd);
                                tr.appendChild(nameTd);
                                tr.appendChild(minThresholdTd);
                                tr.appendChild(maxThresholdTd);
                                tr.appendChild(buttonTd);


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
