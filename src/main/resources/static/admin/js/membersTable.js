import {
    fetchWithAuth, fetchWithAuthPut
} from '../../index/js/auth.js'

const converter = valueConverter();

// ✅ page1, page2 파라미터 추출 함수
function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || 1;
}

window.addEventListener('DOMContentLoaded', function () {
    const member = new memberTable();
    member.loadWarnify();

    const pending = new pendigTable();
    pending.loadPending();
});

const memberTable = function () {
    'use strict';

    this.loadWarnify = async function () {
        const page1 = getParam("page1");
        const page2 = getParam("page2");
        const url = `/members/companies/companyDomain?isPending=false&page=${page1}`;

        const result = await fetchWithAuth(url);
        const json = await result.json();
        const tbody = document.querySelector('#membersTable tbody');

        if (tbody) {
            tbody.innerHTML = '';
            json.content.forEach(json => {
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                const td3 = document.createElement('td');
                const td4 = document.createElement('td');
                const td5 = document.createElement('td');

                const deleteBtn = document.createElement('button');
                deleteBtn.innerText = '변경';
                deleteBtn.classList.add('trendy-button');
                deleteBtn.addEventListener('click', function (e) {
                    if (e.target.classList.contains('trendy-button')) {
                        const email = json.memberEmail;
                        if (!confirm(`${email}님을 승인대기 상태로 변경하시겠습니까?`)) return;
                        const memberNo = json.memberNo;
                        const url = `/members/role/${memberNo}?role=ROLE_PENDING`;

                        fetchWithAuthPut(url)
                            .then(response => {
                                if (!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("권한 변경 성공");
                                    window.location.href = `/members/member-list?page1=${page1}&page2=${page2}`;
                                }
                            });
                    }
                });

                td1.innerText = json.memberEmail;
                td2.innerText = converter.roleConverter(json.roleId);
                td3.innerText = converter.timeConverterHM(json.registerAt);
                td4.innerText = converter.timeConverterHM(json.lastLoginAt);
                if (json.roleId !== 'ROLE_OWNER' && json.roleId !== 'ROLE_ADMIN') {
                    td5.appendChild(deleteBtn);
                }

                [td1, td2, td3, td4, td5].forEach(td => td.style.textAlign = 'center');
                [td1, td2, td3, td4, td5].forEach(td => tr.appendChild(td));
                tbody.appendChild(tr);
            });
        }

        const createButton = function (page, element) {
            const frontNum = parseInt(page.pageable.pageNumber / 10);
            const nowNum = (frontNum * 10);

            if (page.number >= 10) {
                const previousNum = frontNum * 10 - 1;
                const previous = document.createElement('button');
                previous.textContent = "이전";
                previous.classList.add('page-btn');
                previous.addEventListener('click', () =>
                    window.location.href = `/members/member-list?page1=${previousNum}&page2=${page2}`);
                element.appendChild(previous);
            }

            for (let i = 1; i <= 10; i++) {
                const num = (frontNum * 10) + i;
                if (page.totalPages < num) break;

                const btn = document.createElement('button');
                btn.textContent = num;
                btn.classList.add('page-btn');
                if (num === page.pageable.pageNumber + 1) {
                    btn.classList.add('active-page');
                }
                btn.addEventListener('click', () =>
                    window.location.href = `/members/member-list?page1=${num}&page2=${page2}`);
                element.appendChild(btn);
            }

            if ((frontNum + 1) * 10 < page.totalPages) {
                const nextNum = (frontNum + 1) * 10;
                const next = document.createElement('button');
                next.textContent = "다음";
                next.classList.add('page-btn');
                next.addEventListener('click', () =>
                    window.location.href = `/members/member-list?page1=${nextNum}&page2=${page2}`);
                element.appendChild(next);
            }
        }

        const pageButton = document.querySelector('#pageButton');
        pageButton.innerHTML = '';
        createButton(json, pageButton);
    }
}

const pendigTable = function () {
    'use strict';

    this.loadPending = async function () {
        const page1 = getParam("page1");
        const page2 = getParam("page2");
        const url = `/members/companies/companyDomain?isPending=true&page=${page2}`;

        const result = await fetchWithAuth(url);
        const json = await result.json();
        const tbody = document.querySelector('#pendingMembersTable tbody');

        if (tbody) {
            tbody.innerHTML = '';
            json.content.forEach(json => {
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                const td3 = document.createElement('td');

                const approveBtn = document.createElement('button');
                const deleteBtn = document.createElement('button');
                approveBtn.innerText = '승인';
                approveBtn.classList.add('approve-btn', 'trendy-button');
                deleteBtn.innerText = '삭제';
                deleteBtn.classList.add('delete-btn', 'trendy-button');

                approveBtn.addEventListener('click', function (e) {
                    if (e.target.classList.contains('approve-btn')) {
                        const email = json.memberEmail;
                        if (!confirm(`${email}님의 권한을 주시겠습니까?`)) return;
                        const memberNo = json.memberNo;
                        const url = `/members/role/${memberNo}?role=ROLE_USER`;

                        fetchWithAuthPut(url)
                            .then(response => {
                                if (!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("권한 변경 성공");
                                    window.location.href = `/members/member-list?page1=${page1}&page2=${page2}`;
                                }
                            })
                    }
                });

                deleteBtn.addEventListener('click', function (e) {
                    if (e.target.classList.contains('delete-btn')) {
                        const email = json.memberEmail;
                        if (!confirm(`${email}님을 삭제하시겠습니까?`)) return;
                        const memberNo = json.memberNo;
                        const url = SERVER_URL + `/members/${memberNo}`;

                        fetchWithAuthPut(url)
                            .then(response => {
                                if (!response.ok) {
                                    alert("서버 오류 발생");
                                } else {
                                    alert("회원 삭제 성공");
                                    window.location.href = `/members/member-list?page1=${page1}&page2=${page2}`;
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
            });
        }

        const pendingCreateButton = function (page, element) {
            const frontNum = parseInt(page.pageable.pageNumber / 10);
            const nowNum = (frontNum * 10);

            if (page.number >= 10) {
                const previousNum = frontNum * 10 - 1;
                const previous = document.createElement('button');
                previous.textContent = "이전";
                previous.classList.add('page-btn');
                previous.addEventListener('click', () =>
                    window.location.href = `/members/member-list?page1=${page1}&page2=${previousNum}`);
                element.appendChild(previous);
            }

            for (let i = 1; i <= 10; i++) {
                const num = (frontNum * 10) + i;
                if (page.totalPages < num) break;

                const btn = document.createElement('button');
                btn.textContent = num;
                btn.classList.add('page-btn');
                if (num === page.pageable.pageNumber + 1) {
                    btn.classList.add('active-page');
                }
                btn.addEventListener('click', () =>
                    window.location.href = `/members/member-list?page1=${page1}&page2=${num}`);
                element.appendChild(btn);
            }

            if ((frontNum + 1) * 10 < page.totalPages) {
                const nextNum = (frontNum + 1) * 10;
                const next = document.createElement('button');
                next.textContent = "다음";
                next.classList.add('page-btn');
                next.addEventListener('click', () =>
                    window.location.href = `/members/member-list?page1=${page1}&page2=${nextNum}`);
                element.appendChild(next);
            }
        }

        const pageButton = document.querySelector('#pendingPageButton');
        pageButton.innerHTML = '';
        pendingCreateButton(json, pageButton);
    }
}
