import {
    fetchWithAuth
} from '../../index/js/auth.js'

document.addEventListener('DOMContentLoaded', function (){
    const alarmIcon = document.querySelector('#alarmDropDown');
    alarmIcon.addEventListener('click', async function () {
        const url = '/warnify/list/companyDomain?size=5&page=1';
        const warnifyResponse = await fetchWithAuth(url);
        const warnifyList = await warnifyResponse.json();

        const ulTag = document.querySelector('#alarmUlTag');
        ulTag.innerHTML = '';
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