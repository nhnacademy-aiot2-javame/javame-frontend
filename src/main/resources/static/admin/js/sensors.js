import {
    fetchWithAuth
} from '../../index/js/auth.js'

window.addEventListener('DOMContentLoaded', async event => {

    const url = '/api/v1/rule/sensors/cp/companyDomain';
    const sensorResponse = await fetchWithAuth(url);
    const sensors = await sensorResponse.json();
    console.log(sensors);

    const tb = document.querySelector("#sensorContent");

    if(tb){
        sensors.forEach(sensor=>{
            const tr = document.createElement('tr');

            const sensorNo = document.createElement('td');
            const sensorId = document.createElement('td');
            const companyDomain = document.createElement('td');
            const createdAt = document.createElement('td');

            sensorNo.innerText = sensor.sensorNo;
            sensorId.innerText = sensor.sensorId;
            companyDomain.innerText = sensor.companyDomain;
            createdAt.innerText = sensor.createdAt;

            tr.appendChild(sensorNo);
            tr.appendChild(sensorId);
            tr.appendChild(companyDomain);
            tr.appendChild(createdAt);

            tr.addEventListener('click', async  function(){

                const url = `/api/v1/rule/sensor-datas/by-sensor-no/${sensor.sensorNo}`;
                const sensorDataResponse = await fetchWithAuth(url);
                const sensorDatas = await sensorDataResponse.json();
                console.log(sensorDatas);

                // 테이블 보이게 하기
                const table = document.getElementById('sensorDataTable');
                table.style.display = 'table';

                const tb1 = document.querySelector('#sensorDataContent');
                tb1.innerHTML = ''; //이전 내용 지우기

                if(tb1){
                    sensorDatas.forEach(sensorData=> {

                        const tr1 = document.createElement('tr');

                        const sensorDataNo = document.createElement('td');
                        const location = document.createElement('td');
                        const gateway = document.createElement('td');
                        const sensorDataName = document.createElement('td');
                        const minThreshold = document.createElement('td');
                        const maxThreshold = document.createElement('td');
                        const createdAt = document.createElement('td');

                        sensorDataNo.innerText = sensorData.sensorDataNo;
                        location.innerText = sensorData.sensorDataLocation;
                        gateway.innerText = sensorData.sensorDataGateway;
                        sensorDataName.innerText = sensorData.sensorDataName;
                        minThreshold.innerText = sensorData.minThreshold;
                        maxThreshold.innerText = sensorData.maxThreshold;
                        createdAt.innerText = sensorData.createdAt;

                        tr1.appendChild(sensorDataNo);
                        tr1.appendChild(location);
                        tr1.appendChild(gateway);
                        tr1.appendChild(sensorDataName);
                        tr1.appendChild(minThreshold);
                        tr1.appendChild(maxThreshold);
                        tr1.appendChild(createdAt);

                        tb1.appendChild(tr1);
                    })
                }

            });

            tb.appendChild(tr);
        })

    }

} )