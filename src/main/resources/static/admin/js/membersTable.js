import {
    fetchWithAuth, fetchWithAuthPut
} from '../../index/js/auth.js'

const converter = valueConverter();

window.addEventListener('DOMContentLoaded', function (){

    const member = new memberTable();
    member.loadWarnify();

    const pending = new pendigTable();
    pending.loadPending();

});

const memberTable = function (){
    'use strict';

    this.loadWarnify = async function(){

        const num = document.querySelector('#page_num').value;
        const url = `/members/companies/companyDomain?isPending=false&page=${num}`;

        const result = await fetchWithAuth(url);
        const json = await result.json();
        const tbody = document.querySelector('#membersTable tbody')


        if(tbody){
            let i = 0;
            json.content.forEach(json =>{
                const tr = document.createElement('tr');

                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                const td3 = document.createElement('td');
                const td4 = document.createElement('td');
                const td5 = document.createElement('td');


                const deleteBtn = document.createElement('button');
                deleteBtn.innerText = '변경'
                deleteBtn.classList.add('trendy-button');
                deleteBtn.addEventListener('click', function (e){
                    if (e.target.classList.contains('trendy-button')){
                        const email = json.memberEmail;

                        if(!confirm(`${email}님을 승인대기 상태로 변경 하시곘습니까?`)) return;
                        const memberNo = json.memberNo;
                        const url = `/members/role/${memberNo}?role=ROLE_PENDING`;

                        fetchWithAuthPut(url)
                            .then(response => {
                                if(!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("권한 변경 성공");
                                    window.location.href = `/members/member-list`;
                                }
                            });

                    }
                });

                td1.innerText = json.memberEmail;
                td2.innerText = converter.roleConverter(json.roleId);
                td3.innerText = converter.timeConverterHM(json.registerAt);
                td4.innerText = converter.timeConverterHM(json.lastLoginAt);
                if(json.roleId !== 'ROLE_OWNER' && json.roleId !== 'ROLE_ADMIN'){
                    td5.appendChild(deleteBtn);
                }

                td1.style.textAlign = 'center';
                td2.style.textAlign = 'center';
                td3.style.textAlign = 'center';
                td4.style.textAlign = 'center';
                td5.style.textAlign = 'center';

                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                tr.appendChild(td4);
                tr.appendChild(td5);

                tbody.appendChild(tr);
                i++;
            })
        }

        // 페이지 버튼 생성기
        const createButton = function (page, element) {
            const frontNum = parseInt((page.pageable.pageNumber)/10);
            const nowNum = (frontNum*10);

            if(page.number>=10) {
                const previousNum = frontNum;
                const previous = document.createElement('button');
                previous.textContent = "이전";
                previous.disabled = false;
                previous.classList.add('page-btn');
                previous.addEventListener('click', () => window.location.href = `/members/member-list?page=${previousNum}`);
                element.appendChild(previous);
            }

            for(let i=1 ; i<=10 ; i++ ){
                const num = (frontNum*10)+i;

                if(page.totalPages < num){
                    break;
                }

                const btn = document.createElement('button');
                btn.textContent = num;
                btn.classList.add('page-btn');
                btn.disabled = false;
                btn.addEventListener('click',()=>window.location.href=`/members/member-list?page=${num}`);
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
                next.addEventListener('click', () => window.location.href = `/members/member-list?page=${nextNum}`);
                element.appendChild(next);
            }
        }

        const pageButton = document.querySelector('#pageButton');
        createButton(json, pageButton);

    }

}

const pendigTable = function (){
    'use strict';

    this.loadPending = async function(){

        const num = document.querySelector('#page_num').value;
        const url = `/members/companies/companyDomain?isPending=true&page=${num}`;

        const result = await fetchWithAuth(url,"method : 'GET");
        const json = await result.json();
        const tbody = document.querySelector('#pendingMembersTable tbody')

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
                approveBtn.classList.add('trendy-button');
                deleteBtn.innerText = '삭제';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.classList.add('trendy-button');
                approveBtn.addEventListener('click', function (e) {
                    if (e.target.classList.contains('approve-btn')) {
                        const email = json.memberEmail;
                        if(!confirm(`${email}님의 권한을 주시겠습니까?`)) return;
                        const memberNo = json.memberNo;
                        const url = `/members/role/${memberNo}?role=ROLE_USER`;

                        fetchWithAuthPut(url)
                            .then(response => {
                                if(!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("권한 변경 성공");
                                    window.location.href = `/members/member-list`;
                                }
                            })
                    }
                });

                deleteBtn.addEventListener('click', function (e) {
                    if (e.target.classList.contains('delete-btn')) {
                        const email = json.memberEmail;
                        if(!confirm(`${email}님을 삭제하시겠습니까?`)) return;
                        const memberNo = json.memberNo;
                        const url = SERVER_URL + `/members/${memberNo}`

                        fetchWithAuthPut(url)
                            .then(response => {
                                if(!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("회원 삭제 성공");
                                    window.location.href = `/members/member-list`;
                                }
                            })
                    }
                });


                td1.innerText = json.memberEmail;
                td2.innerText = converter.timeConverterHM(json.registerAt);

                td3.style.display = 'flex';
                td3.style.gap = '8px';
                td3.style.justifyContent = 'center';


                td3.appendChild(approveBtn);
                td3.appendChild(deleteBtn);

                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);

                tbody.appendChild(tr);
            })
        }

        // 페이지 버튼 생성기
        const pendingCreateButton = function (page, element) {
            const frontNum = parseInt((page.pageable.pageNumber)/10);
            const nowNum = (frontNum*10);
            console.log(frontNum);

            if(page.number>=10) {
                const previousNum = frontNum;
                const previous = document.createElement('button');
                previous.textContent = "이전";
                previous.disabled = false;
                previous.classList.add('page-btn');
                previous.addEventListener('click', () => window.location.href = `/members/member-list?page=${previousNum}`);
                element.appendChild(previous);
            }

            for(let i=1 ; i<=10 ; i++ ){
                const num = (frontNum*10)+i;

                if(page.totalPages < num){
                    break;
                }

                const btn = document.createElement('button');
                btn.textContent = num;
                btn.classList.add('page-btn');
                btn.disabled = false;
                btn.addEventListener('click',()=>window.location.href=`/members/member-list?page=${num}`);
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
                next.addEventListener('click', () => window.location.href = `/members/member-list?page=${nextNum}`);
                element.appendChild(next);
            }
        }

        const pageButton = document.querySelector('#pendingPageButton');
        pendingCreateButton(json, pageButton);

    }

}
