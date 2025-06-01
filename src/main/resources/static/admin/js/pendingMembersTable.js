import {
    fetchWithAuth,
    fetchWithAuthPut
} from '../../index/js/auth.js'

window.addEventListener('DOMContentLoaded', function (){

    const pending = new pendigTable();
    pending.loadPending();

});

const pendigTable = function (){
    'use strict';

    this.loadPending = async function(){

        const num = document.querySelector('#page_num').value;
        const url = `/api/v1/members/companies/companyDomain?isPending=true&page=${num}`;

        const result = await fetchWithAuth(url,"method : 'GET");
        const json = await result.json();
        const tbody = document.querySelector('#membersTable tbody')
        console.log(json);

        if(tbody){
            json.content.forEach(json =>{
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                const td3 = document.createElement('td');

                const approveBtn = document.createElement('button');
                const deleteBtn = document.createElement('button');
                approveBtn.innerText = '승인';
                approveBtn.classList.add('approve-btn');
                deleteBtn.innerText = '삭제';
                deleteBtn.classList.add('delete-btn');
                approveBtn.addEventListener('click', function (e) {
                    if (e.target.classList.contains('approve-btn')) {
                        const email = json.memberEmail;
                        if(!confirm(`${email}님의 권한을 주시겠습니까?????`)) return;
                        const memberNo = json.memberNo;
                        const url = `/api/v1/members/role/${memberNo}?role=ROLE_USER`;

                        fetchWithAuthPut(url)
                            .then(response => {
                                if(!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("권한 변경 성공");
                                    window.location.href = `/environment/pending`;
                                }
                            })
                    }
                });

                deleteBtn.addEventListener('click', function (e) {
                    if (e.target.classList.contains('delete-btn')) {
                        const email = json.memberEmail;
                        if(!confirm(`${email}님을 삭제하시겠습니까?????`)) return;
                        const memberNo = json.memberNo;
                        const url = SERVER_URL + `/api/v1/members/${memberNo}`

                        fetchWithAuthPut(url)
                            .then(response => {
                                if(!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("회원 삭제 성공");
                                    window.location.href = `/environment/pending`;
                                }
                            })
                    }
                });


                td1.innerText = json.memberEmail;
                td2.innerText = json.registerAt;
                td3.appendChild(approveBtn);
                td3.appendChild(deleteBtn);

                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);

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
                previous.addEventListener('click', () => window.location.href = `/environment/members?page=${previousNum}`);
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
                btn.addEventListener('click',()=>window.location.href=`/environment/members?page=${num}`);
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
                next.addEventListener('click', () => window.location.href = `/environment/members?page=${nextNum}`);
                element.appendChild(next);
            }
        }

        const pageButton = document.querySelector('#pageButton');
        createButton(json, pageButton);

    }

}