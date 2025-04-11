const BASE_URL = location.hostname === 'localhost'
    ? 'http://localhost:10259/api/auth'
    : 'https://javame.live';

async function register(memberData) {
    const response = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(memberData)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '알맞은 정보를 입력해 주세요');
    }

    return await response.json();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('registerForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const memberData = {
            memberId: document.getElementById('memberId').value,
            memberPassword: document.getElementById('memberPassword').value,
            memberName: document.getElementById('memberName').value,
            memberBirth: document.getElementById('memberBirth').value,
            memberEmail: document.getElementById('memberEmail').value,
            memberMobile: document.getElementById('memberMobile').value,
            memberSex: document.getElementById('memberSex').value
        };

        try {
            await register(memberData);
            alert('회원가입 성공!');
            window.location.href = '/index.html';
        } catch (error) {
            alert('회원가입 실패: ' + error.message);
        }
    });
});
