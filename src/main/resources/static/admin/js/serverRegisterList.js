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
            serverId.innerText = data.label;

            serverContentTr.appendChild(serverNo);
            serverContentTr.appendChild(serverId);

            tbody.appendChild(serverContentTr);
            i++;

            serverContentTr.addEventListener('click', async function () {
                const datalistTbody = document.querySelector('#serverDataContent');
                datalistTbody.innerHTML = '';
                if(datalistTbody) {
                    let i = 1;
                    document.querySelector("#sensorDataTableWrapper").setAttribute('style','display: table');
                    const num = this.querySelectorAll('td')[1].textContent;
                    const locationUrl = `/environment/companyDomain/dropdown/location?deviceId=${num}`;
                    const locationResponse = await fetchWithAuth(locationUrl);
                    const locations = await locationResponse.json();

                    for(const location of locations){
                        const gatewayIdUrl = `/environment/companyDomain/dropdown/gatewayId?deviceId=${num}&location=${location.value}`;
                        const gatewayIdResponse = await fetchWithAuth(gatewayIdUrl);
                        const gatewayIds = await gatewayIdResponse.json();
                        for(const gatewayId of gatewayIds){
                            const measurementUrl = `/environment/companyDomain/dropdown/_measurement?deviceId=${num}&location=${location.value}&gatewayId=${gatewayId.value}`;
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
                                locationTd.innerText = location.label;
                                deviceIdTd.innerText = num;
                                gatewayTd.innerText = gatewayId.label;
                                nameTd.innerText = measurement.label;

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
                                tr.appendChild(deviceIdTd);
                                tr.appendChild(locationTd);
                                tr.appendChild(gatewayTd);
                                tr.appendChild(nameTd);
                                tr.appendChild(minThresholdTd);
                                tr.appendChild(maxThresholdTd);
                                tr.appendChild(buttonTd);

                                datalistTbody.appendChild(tr);
                                registerButton.addEventListener('click',async function (){
                                    const isConfirmed = confirm("저장 하시겠습니까???");
                                    if(isConfirmed) {
                                        const registerUrl = '/rule/servers';
                                        const iphostNum = serverId.textContent;
                                        const data = {
                                            companyDomain: 'javame.com',
                                            iphost: iphostNum
                                        };
                                        const registerServerResponse = await fetchWithAuthPost(registerUrl, data);
                                        if (!registerServerResponse.ok) {
                                            // 흠....
                                        }
                                        const serverResponseUrl = `/rule/servers/companyDomain/iphost/${iphostNum}`;
                                        const serverResponseResponse = await fetchWithAuth(serverResponseUrl);
                                        const serverResponse = await serverResponseResponse.json();

                                        const serverDataJson = {
                                            serverNo: serverResponse.serverNo,
                                            serverDataLocation: location.label,
                                            serverDataGateway: gatewayId.label,
                                            serverDataName: measurement.label,
                                            minThreshold: inputMinThreshold.value,
                                            maxThreshold: inputMaxThreshold.value
                                        };
                                        const serverDataRegisterUrl = `/rule/server-datas?serverNo=${serverResponse.serverNo}`;
                                        const serverDataResponse = await fetchWithAuthPost(serverDataRegisterUrl, serverDataJson);
                                        console.log(serverDataResponse);
                                        if(serverDataResponse.ok){
                                            alert("저장 성공!!!");
                                        }else if(serverDataResponse.status == 400) {
                                            alert("저장 실패!!! 이미 존재하는 데이터 입니다.");
                                        }else {
                                            alert("저장 실패... 관리자에게 문의하세요.");
                                        }
                                    }
                                });
                                i++;
                            }
                        }
                    }
                }
            });
        });
    }

})
