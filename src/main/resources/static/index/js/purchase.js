document.getElementById('purchaseBtn').addEventListener('click', async function (e) {
    e.preventDefault();

    const data = {
        companyDomain: document.getElementById('companyDomain').value,
        companyName: document.getElementById('companyName').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyMobile: document.getElementById('companyMobile').value,
        companyAddress: document.getElementById('companyAddress').value,
        ownerEmail: document.getElementById('ownerEmail').value,
        ownerPassword: document.getElementById('ownerPassword').value
    };

    try {
        const response = await fetch('http://localhost:10279/api/v1/auth/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('회사 및 오너 등록 성공!');
            window.location.href = '/api/v1/auth/login';
        } else {
            const error = await response.json();
            alert('등록 실패: ' + (error.message || response.status));
        }
    } catch (err) {
        alert('오류 발생: ' + err.message);
    }
});
