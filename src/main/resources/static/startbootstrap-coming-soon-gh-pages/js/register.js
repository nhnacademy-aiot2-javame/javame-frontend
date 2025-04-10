const BASE_URL = location.hostname === 'localhost'
    ? 'http://localhost:10258/api'
    : 'https://javame.live';

export async function register({
   memberId,
   memberPassword,
   memberName,
   memberBirth,
   memberEmail,
   memberMobile,
   memberSex
}) {
    // 환경에 따라 주소를 자동으로 분기하기 위해 BASE_URL 사용
    const response = await fetch('${BASE_URL}/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            memberId,
            memberPassword,
            memberName,
            memberBirth,
            memberEmail,
            memberMobile,
            memberSex
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '회원가입 중 에러 발생');
    }

    return await response.json();
}

document.getElementByid('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
};