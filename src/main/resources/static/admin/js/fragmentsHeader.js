import {
    fetchWithAuth
} from '../../index/js/auth.js'

/**
 * 우측 상단에 알림 벨을 클릭하면 경고 목록이 뜨는 스크립트 입니다.
 */
document.addEventListener('DOMContentLoaded', function (){
    const alarmIcon = document.querySelector('#alarmDropDown');
    alarmIcon.addEventListener('click', async function () {
        const url = '/warnify/list/companyDomain?size=5&page=1';
        const warnifyResponse = await fetchWithAuth(url);
        const warnifyList = await warnifyResponse.json();
        const ulTag = document.querySelector('#alarmUlTag');
        ulTag.innerHTML = '';

        const liWarnfiyLast5 = document.createElement('li');
        liWarnfiyLast5.innerHTML=
            `
                <li><label class="dropdown-label">최근 5개의 경고 목록 입니다.</label></li>
                <li><hr class="dropdown-divider" /></li>
`;
        ulTag.appendChild(liWarnfiyLast5);

        warnifyList.content.forEach(warnify => {
            const li = document.createElement('li');

            li.innerHTML = `<li><a class="dropdown-item" href=/environment/warnify>${warnify.warnInfo}</a></li>`;
            ulTag.appendChild(li);
        });

        const liWarnfiyDashboard = document.createElement('li');
        liWarnfiyDashboard.innerHTML = `
                    <li><hr class="dropdown-divider" /></li>
                    <li><a id="warnifyList" class="dropdown-item" href="/environment/warnify">경고목록으로</a></li>        
        `;
        ulTag.appendChild(liWarnfiyDashboard);

    });
});