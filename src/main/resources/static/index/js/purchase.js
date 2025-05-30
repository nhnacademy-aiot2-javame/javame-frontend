const BASE_URL = 'http://javame-gateway:10279/api/v1';

document.getElementById('purchaseBtn').addEventListener('click', async function (e) {
    e.preventDefault();

    const companyData = {
        companyDomain: document.getElementById('companyDomain').value,
        companyName: document.getElementById('companyName').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyMobile: document.getElementById('companyMobile').value,
        companyAddress: document.getElementById('companyAddress').value,
    };

    const memberData = {
        memberEmail: document.getElementById('ownerEmail').value,
        memberPassword: document.getElementById('ownerPassword').value,
        companyDomain: companyData.companyDomain
    };

    try {
        // 1. 회사 등록
        const companyRes = await fetch(`${BASE_URL}/companies/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(companyData)
        });

        if (!companyRes.ok) {
            const error = await companyRes.json();
            throw new Error('회사 등록 실패: ' + (error.message || companyRes.status));
        }

        // 2. 오너 회원 등록
        const memberRes = await fetch(`${BASE_URL}/members/register/owners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberData)
        });

        if (!memberRes.ok) {
            const error = await memberRes.json();
            throw new Error('회원 등록 실패: ' + (error.message || memberRes.status));
        }

        alert('회사 및 오너 회원 등록 성공!');
        window.location.href = '/auth/login'; // 로그인 페이지로 리디렉트

    } catch (err) {
        alert('오류 발생: ' + err.message);

    }
});
