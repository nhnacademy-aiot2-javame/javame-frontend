import {
    fetchWithAuth
} from '../../index/js/auth.js';

document.getElementById('sensorRetrieveButton').addEventListener('click', async function(){
    // 도메인에 걸린 센서들 조회
    const url='/rule/sensors/cp/javame';
    const bhResponse=await fetchWithAuth(url);
    const deviceIdList = await bhResponse.json();
    console.log(deviceIdList);

    const tb = document.querySelector("#sensorContent");

    if(tb) {
        tb.innerHTML='';
        deviceIdList.forEach(sensor => {
            const tr = document.createElement('tr');
            const sensorNo = document.createElement('td');
            const sensorId = document.createElement('td');

            sensorNo.innerText = sensor.sensorNo;
            sensorId.innerText = sensor.sensorId;

            tr.appendChild(sensorNo);
            tr.appendChild(sensorId);

            tb.appendChild(tr);

            const registerTbody = document.querySelector("#sensorDataContent");
            tr.addEventListener('click', async function () {

                if (registerTbody) {
                    registerTbody.innerHTML='';
                    document.querySelector("#sensorDataTable").setAttribute('style','display: block');
                    const dataUrl = `/environment/companyDomain/measurements?deviceId=${sensor}`;
                    const dataResponse = await fetchWithAuth(dataUrl);
                    const datas = await dataResponse.json();
                    let i = 1;
                    console.log(datas);
                    datas.forEach(data => {
                        const registerTr = document.createElement('tr');

                        const no = document.createElement('td');
                        const sensorId = document.createElement('td');
                        const gateway = document.createElement('td');
                        const measurements = document.createElement('td');
                        const minThresholdTd = document.createElement('td');
                        const maxThresholdTd = document.createElement('td');
                        const registerTd = document.createElement('td');

                        const minThreshold = document.createElement('input');
                        const maxThreshold = document.createElement('input');
                        const registerButton = document.createElement('button');
                        no.innerText = i;
                        sensorId.innerText = sensor;
                        measurements.innerText = data;
                        gateway.innerText = data;
                        minThreshold.type = 'text';
                        maxThreshold.type = 'text';
                        registerButton.innerText = '등록하기';

                        minThresholdTd.appendChild(minThreshold);
                        maxThresholdTd.appendChild(maxThreshold);
                        registerTd.appendChild(registerButton);

                        registerTr.appendChild(no);
                        registerTr.appendChild(sensorId);
                        registerTr.appendChild(gateway);
                        registerTr.appendChild(measurements);
                        registerTr.appendChild(minThresholdTd);
                        registerTr.appendChild(maxThresholdTd);
                        registerTr.appendChild(registerTd);

                        registerTbody.appendChild(registerTr);

                        i++;
                        console.log(data);
                    });
                }

            });
        })
    }

})