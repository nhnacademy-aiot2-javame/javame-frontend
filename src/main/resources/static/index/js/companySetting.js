import {
    fetchWithAuth, fetchWithAuthPut
} from './auth.js'

window.addEventListener('DOMContentLoaded', async function (){
    const url = 'http://gateway.javame.live/api/v1/companies/companyDomain';
    const result = await fetchWithAuth(url);
    const json = await result.json();

    document.getElementById('companyDomain').innerText = json.companyDomain;
    document.getElementById('companyName').innerText = json.companyName;
    document.getElementById('companyEmail').innerText = json.companyEmail;
    document.getElementById('companyMobile').innerText = json.companyMobile;
    document.getElementById('companyAddress').innerText = json.companyAddress;

    document.getElementById('editButton').addEventListener('click', switchToEdit);
    document.getElementById('cancelEdit').addEventListener('click', cancelEdit);
    document.getElementById('saveCompanyInfo').addEventListener('click', saveCompanyInfo);
})

function switchToEdit() {
    document.getElementById('viewMode').style.display = 'none';
    document.getElementById('editMode').style.display = 'block'

    document.getElementById('editCompanyDomain').innerText = document.getElementById('companyDomain').innerText;
    document.getElementById('editCompanyEmail').innerText = document.getElementById('companyEmail').innerText;

    document.getElementById('editCompanyName').value = document.getElementById('companyName').innerText;
    document.getElementById('editCompanyMobile').value = document.getElementById('companyMobile').innerText;
    document.getElementById('editCompanyAddress').value = document.getElementById('companyAddress').innerText;
}

function cancelEdit() {
    document.getElementById('editMode').style.display = 'none';
    document.getElementById('viewMode').style.display = 'block';
}

async function saveCompanyInfo() {
    const data = {
        companyName: document.getElementById('editCompanyName').value,
        companyMobile: document.getElementById('editCompanyMobile').value,
        companyAddress: document.getElementById('editCompanyAddress').value
    };

    try {
        const url = 'http://gateway.javame.live/api/v1/companies/companyDomain';
        const response = await fetchWithAuthPut(url, data);
        const json = await response.json();
        console.log(json);

        if (!response.ok) throw new Error('저장 실패');

        // UI 갱신
        document.getElementById('companyName').innerText = data.companyName;
        document.getElementById('companyMobile').innerText = data.companyMobile;
        document.getElementById('companyAddress').innerText = data.companyAddress;

        cancelEdit();
        alert('회사 정보가 저장되었습니다.');
    } catch (error) {
        alert('오류 발생: ' + error.message);
    }
}
