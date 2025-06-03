import {
    fetchWithAuth
} from '../../index/js/auth.js';

document.getElementById('sensorRetrieveButton').addEventListener('click', async function(){
    // 도메인에 걸린 센서들 조회
    const url='http://localhost:10279/api/v1/environment/javame/time-series/dropdown/deviceId'
    const bhResponse=await fetchWithAuth(url);
    const datas = await bhResponse.json();
    console.log("응답상태:", bhResponse.status);
    console.log(datas);
    // console.log(datas.Lmax[0].time);

    const tb = document.querySelector("#sensorContent");

    if(tb) {
        datas.data.forEach(data => {
            const tr = document.createElement('tr');
            const sensorId = document.createElement('td');
            const companyDomain = document.createElement('td');

            sensorId.innerText = data;
            companyDomain.innerText = "javame";

            tr.appendChild(sensorId);
            tr.appendChild(companyDomain);

            tb.appendChild(tr);
        })
    }

})