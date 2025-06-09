import {
    fetchWithAuth, fetchWithAuthBody
} from '../../index/js/auth.js'

let currentPage = document.querySelector('#page_num').value;
const converter = valueConverter();

window.addEventListener('DOMContentLoaded', function () {
    const warnify = new WarnifyTable();
    warnify.loadWarnify();
});

const WarnifyTable = function () {
    'use strict';

    this.loadWarnify = async function () {
        const url = `/warnify/list/companyDomain?page=${currentPage}&size=10`;

        const result = await fetchWithAuth(url);
        const json = await result.json();

        // 메인 대시보드의 Watch Alarm 업데이트를 위한 개수 변수
        const statusCounts = this.countWarnifyStatus(json.content);

        this.updateWatchAlarmCard(statusCounts);

        const tbody = document.querySelector('#warnifyTable tbody');
        tbody.innerHTML = '';

        if (tbody) {
            json.content.forEach(item => {
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                const td3 = document.createElement('td');
                const td4 = document.createElement('td');

                const updateButton = document.createElement('button');
                updateButton.innerText = '변경';

                td1.innerText = converter.timeConverterHM(item.warnDate);
                td2.innerText = item.warnInfo;
                td4.appendChild(updateButton);

                if (item.resolve === '해결') {
                    td3.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>해결</span>`;
                } else if (item.resolve === '미해결') {
                    td3.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>미해결</span>`;
                } else if (item.resolve === '데이터부족') {
                    td3.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i>데이터부족</span>`;
                } else {
                    td3.textContent = item.resolve || ''; // 예외 처리
                }


                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                tr.appendChild(td4);

                updateButton.classList.add('update-btn');
                updateButton.classList.add('trendy-button');
                updateButton.addEventListener('click', async function () {
                    let updateURL = `/warnify/resolve/${item.warnifyId}?resolve=true`;
                    if(item.resolve === '해결'){
                        updateURL = `/warnify/resolve/${item.warnifyId}?resolve=false`;
                    }else if(item.resolve === '미해결'){
                        updateURL = `/warnify/resolve/${item.warnifyId}?resolve=true`;
                    }
                    const isConfirmed = confirm("경고를 변경 하시겠습니까?");
                    if(isConfirmed){
                        const updateResponse = await fetchWithAuthBody(updateURL);
                        if(updateResponse.ok){
                            alert("변경하였습니다.");
                            window.location.href=`/environment/warnify?page=${currentPage}`;
                        }else {
                            alert("변경 실패 입니다.");
                        }
                    }

                });

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

    this.countWarnifyStatus = function (warnifyArray) {
        const statusCount = warnifyArray.reduce((acc, item) => {
            const status = item.resolve || '데이터부족'; // null 이나 코드가 없는 것들을 처리
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        console.log('Warnify 상태별 갯수:', statusCount);

        return{
            resolved : statusCount['해결'] || 0,
            unresolved : statusCount['미해결'] || 0,
            nonData : statusCount['데이터부족'] || 0
        }
    }

    // ★★★ Watch Alarm 카드 업데이트 함수 ★★★
    this.updateWatchAlarmCard = function(counts) {
        // 메인 대시보드의 Watch Alarm 카드 요소들 업데이트
        const resolvedElement = document.getElementById('alarm안정Count');
        const unresolvedElement = document.getElementById('alarm발생Count');
        const noDataElement = document.getElementById('alarm데이터부족Count');

        if (resolvedElement) {
            resolvedElement.textContent = counts.resolved;
            console.log('안정(해결) 카운트 업데이트:', counts.resolved);
        }

        if (unresolvedElement) {
            unresolvedElement.textContent = counts.unresolved;
            console.log('발생(미해결) 카운트 업데이트:', counts.unresolved);
        }

        if (noDataElement) {
            noDataElement.textContent = counts.noData;
            console.log('데이터부족 카운트 업데이트:', counts.noData);
        }
    };
};
