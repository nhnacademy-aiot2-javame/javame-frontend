import {
    fetchWithAuth
} from '../../index/js/auth.js'

window.addEventListener('DOMContentLoaded', function (){

    const warnify = new warnifyTable();
    warnify.loadWarnify();

});

const warnifyTable = function (){
    'use strict';

    //todo1 api 주소 나중에 배포할때 바꾸기
    const SERVER_URL = "http://localhost:10279";

    this.loadWarnify = async function(){

        const num = document.querySelector('#page_num').value;
        const url = `/api/v1/warnify/list/companyDomain?page=${num}`;

        const result = await fetchWithAuth(url, "method : 'GET'");
        const json = await result.json();
        const tbody = document.querySelector('#warnifyTable tbody')

        if(tbody){
            json.content.forEach(json =>{
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                const td3 = document.createElement('td');

                td1.innerText = json.warnDate;
                td2.innerText = json.warnInfo;
                td3.innerText = json.resolve;
                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                if (json.resolve === '해결') {
                    tr.style.backgroundColor = '#d4edda'; // 연한 초록색
                } else if (json.resolve === '미해결') {
                    tr.style.backgroundColor = '#f8d7da'; // 연한 빨간색
                }
                tbody.appendChild(tr);
            })
        }

        // 페이지 버튼 생성기
        const createButton = function (page, element) {
            const frontNum = parseInt((page.pageable.pageNumber)/10);
            const nowNum = (frontNum*10);
            console.log(frontNum);

            if(page.number>=10) {
                const previousNum = frontNum;
                const previous = document.createElement('button');
                previous.textContent = "이전";
                previous.disabled = false;
                previous.classList.add('page-btn');
                previous.addEventListener('click', () => window.location.href = `/environment/warnify?page=${previousNum}`);
                element.appendChild(previous);
            }

            console.log(page);

            for(let i=1 ; i<=10 ; i++ ){
                const num = (frontNum*10)+i;

                if(page.totalPages < num){
                    break;
                }

                const btn = document.createElement('button');
                btn.textContent = num;
                btn.classList.add('page-btn');
                btn.disabled = false;
                btn.addEventListener('click',()=>window.location.href=`/environment/warnify?page=${num}`);
                if(num === page.pageable.pageNumber+1){
                    btn.classList.add('active-page');
                }

                element.appendChild(btn);
            }

            if((frontNum+1)*10<page.totalPages) {
                const nextNum = (frontNum+1)*10+1;
                const next = document.createElement('button');
                next.textContent = "다음";
                next.disabled = false;
                next.classList.add('page-btn');
                next.addEventListener('click', () => window.location.href = `/environment/warnify?page=${nextNum}`);
                element.appendChild(next);
            }
        }

        const pageButton = document.querySelector('#pageButton');
        createButton(json, pageButton);

    }

}