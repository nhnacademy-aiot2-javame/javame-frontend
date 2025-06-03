import {
    fetchWithAuth
} from '../../index/js/auth.js';

document.getElementById('sensorRetriveButton').addEventListener('click', async function(){
    // 도메인에 걸린 데이터들 조회
    const url='http://localhost:10279/api/v1/environment/javame/time-series?range=180'
    const bhResponse=await fetchWithAuth(url);
    const datas = bhResponse.json();
    console.log(datas);

    document.querySelector("#server")
})