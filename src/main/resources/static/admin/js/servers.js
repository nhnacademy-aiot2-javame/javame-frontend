import {
    fetchWithAuth
} from '../../index/js/auth.js'

window.addEventListener('DOMContentLoaded', async event => {

    const url = 'http://localhost:10279/api/v1/rule/servers/cp/javame';
    const serverResponse = await fetchWithAuth(url);
    const json = await serverResponse.json();


    const tb = document.querySelector("#serverTable_content");

    if(tb){
        json.forEach(smallJson=>{
            const tr = document.createElement('tr');
            // 들어오는 값에 따라 개수가 유동적으로 바뀌어야 함.
            const serverNo_td = document.createElement('td');
            const server_iphost = document.createElement('td');
            const server_companydomain = document.createElement('td');
            const server_createdAt = document.createElement('td');

            serverNo_td.innerText = smallJson.serverNo;
            server_iphost.innerText = smallJson.iphost;
            server_companydomain.innerText = smallJson.companyDomain;
            server_createdAt.innerText = smallJson.createdAt;

            tr.appendChild(serverNo_td);
            tr.appendChild(server_iphost);
            tr.appendChild(server_companydomain);
            tr.appendChild(server_createdAt);


            tr.addEventListener('click',async function() {

                const url = `/api/v1/rule/server-datas/by-server-no/${smallJson.serverNo}`;
                //클릭한 행의 서버 넘버 가져오기.
                const serverResponse = await fetchWithAuth(url);
                const serverDataList = await serverResponse.json();
                console.log(serverDataList);

                // 테이블 보이게 하기
                const table = document.getElementById('serverDataTable');
                table.style.display = 'table';


                // tbody를 선택하고 비움
                const tb = document.querySelector('#serverDataTable_content');
                tb.innerHTML = ''; //이전 내용 지우기

                if(tb) {
                    serverDataList.forEach(serverData => {


                    const tr1 = document.createElement('tr');

                    const serverDataNo = document.createElement('td');
                    const location = document.createElement('td');
                    const gateway = document.createElement('td');
                    const serverDataName = document.createElement('td');
                    const minThreshold = document.createElement('td');
                    const maxThreshold = document.createElement('td');
                    const createdAt = document.createElement('td');

                    serverDataNo.innerText = serverData.serverDataNo;
                    location.innerText = serverData.serverDataLocation;
                    gateway.innerText = serverData.serverDataGateway;
                    serverDataName.innerText = serverData.serverDataName;
                    minThreshold.innerText = serverData.minThreshold;
                    maxThreshold.innerText = serverData.maxThreshold;
                    createdAt.innerText = serverData.createdAt;

                    tr1.appendChild(serverDataNo);
                    tr1.appendChild(location);
                    tr1.appendChild(gateway);
                    tr1.appendChild(serverDataName);
                    tr1.appendChild(minThreshold);
                    tr1.appendChild(maxThreshold);
                    tr1.appendChild(createdAt);

                    tb.appendChild(tr1);
                })
                }
            });

            tb.appendChild(tr);

        })
    }

})