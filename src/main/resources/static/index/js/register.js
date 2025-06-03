
const BASE_URL = 'https://javame.live/api/v1';
async function register(memberData) {
    const response = await fetch(`${BASE_URL}/members/register`, {
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
            memberEmail: document.getElementById('memberEmail').value,
            memberPassword: document.getElementById('memberPassword').value,
            companyDomain: document.getElementById('companyDomain').value,
        };
        console.log(JSON.stringify(memberData));

        try {
            await register(memberData);
            alert('회원가입 성공!');
            window.location.href = '/auth/login';
        } catch (error) {
            alert('회원가입 실패: ' + error.message);
        }
    });
});