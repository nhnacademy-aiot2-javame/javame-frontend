import {
    fetchWithAuth
} from '../../index/js/auth.js'

let currentPage = document.querySelector('#page_num').value;

window.addEventListener('DOMContentLoaded', function () {
    const warnify = new WarnifyTable();
    warnify.loadWarnify();
});

const WarnifyTable = function () {
    'use strict';

    this.loadWarnify = async function () {
        const url = `/api/v1/warnify/list/companyDomain?page=${currentPage}&size=10`;

        const result = await fetchWithAuth(url);
        const json = await result.json();

        const tbody = document.querySelector('#warnifyTable tbody');
        tbody.innerHTML = '';

        if (tbody) {
            json.content.forEach(item => {
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                const td3 = document.createElement('td');

                td1.innerText = item.warnDate;
                td2.innerText = item.warnInfo;
                td3.innerText = item.resolve;

                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);

                tr.style.backgroundColor = (item.resolve === '해결') ? '#d4edda' :
                    (item.resolve === '미해결') ? '#f8d7da' : '';

                tbody.appendChild(tr);
            });
        }

        // 페이지 버튼 생성기
        const createButton = (page, element) => {
            element.innerHTML = ''; // 기존 버튼 초기화
            const frontNum = Math.floor(page.pageable.pageNumber / 10);

            if (page.number >= 10) {
                const previousNum = frontNum * 10;
                const previous = document.createElement('button');
                previous.textContent = "이전";
                previous.classList.add('page-btn');
                previous.addEventListener('click', () => {
                    currentPage = previousNum;
                    window.location.href=`/environment/warnify?page=${currentPage}`
                    // this.loadWarnify();
                });
                element.appendChild(previous);
            }

            for (let i = 1; i <= 10; i++) {
                const num = frontNum * 10 + i;
                if (num > page.totalPages) break;

                const btn = document.createElement('button');
                btn.textContent = num;
                btn.classList.add('page-btn');
                if (num === page.pageable.pageNumber + 1) {
                    btn.classList.add('active-page');
                }
                btn.addEventListener('click', () => {
                    currentPage = num;
                    window.location.href=`/environment/warnify?page=${currentPage}`
                    // this.loadWarnify();
                });
                element.appendChild(btn);
            }

            if ((frontNum + 1) * 10 < page.totalPages) {
                const nextNum = (frontNum + 1) * 10 + 1;
                const next = document.createElement('button');
                next.textContent = "다음";
                next.classList.add('page-btn');
                next.addEventListener('click', () => {
                    currentPage = nextNum;
                    window.location.href=`/environment/warnify?page=${currentPage}`
                    // this.loadWarnify();
                });
                element.appendChild(next);
            }
        };

        const pageButton = document.querySelector('#pageButton');
        createButton(json, pageButton);
    };
};
