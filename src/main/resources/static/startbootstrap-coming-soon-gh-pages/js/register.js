const BASE_URL_V1 = 'http://localhost:10259/api/v1/auth'; // /v1 포함된 경로 사용

async function register(memberData) {
    // 수정된 URL 사용
    const response = await fetch(`${BASE_URL_V1}/register`, { // <<<--- BASE_URL_V1 사용 또는 직접 경로 입력
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(memberData)
    });

    if (!response.ok) {
        // 404 오류는 이제 발생하지 않아야 함. 다른 오류(400, 409, 500 등) 처리
        let errorMsg = `회원가입 실패: ${response.status}`;
        try {
            const errorData = await response.json(); // 에러 응답 본문이 JSON일 경우
            errorMsg = errorData.message || errorMsg;
        } catch (e) {
            // 에러 응답 본문이 없거나 JSON이 아닐 경우
            errorMsg = `${errorMsg} - ${await response.text()}`;
        }
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    // 회원가입 성공 시 Member API 응답 본문이 있다면 반환 (현재는 Void이므로 불필요)
    // return await response.json(); // 필요시 주석 해제
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
        console.log(JSON.stringify(memberData));

        try {
            await register(memberData);
            alert('회원가입 성공!');
            window.location.href = '/index.html';
        } catch (error) {
            alert('회원가입 실패: ' + error.message);
        }
    });
});
