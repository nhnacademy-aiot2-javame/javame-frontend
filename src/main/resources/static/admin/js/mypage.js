import {
        fetchWithAuth, fetchWithAuthBody
} from '../../index/js/auth.js'

async function fetchMemberInfo() {

        // fetchWithAuth를 사용하여 API 호출, await를 사용하여 응답 대기
        const result = await fetchWithAuth("https://javame.live/api/v1/members/me", "method : 'GET");
        if (!result.ok) {
                console.error(`Error ${result.status} - ${result.statusText}`);
                // 예: 로그인 페이지로 이동
                if (result.status === 401) {
                        window.location.href = '/auth/login';
                }
                return;
        }

        // JSON 형식으로 응답을 파싱
        const data = await result.json();

        // 각 요소에 데이터를 삽입
        document.getElementById('mypage-email').innerText = data.memberEmail;
        document.getElementById('mypage-no').innerText = data.memberNo;
        document.getElementById('mypage-role').innerText = data.roleId;
        document.getElementById('mypage-company').innerText = data.companyDomain;

}

async function fetchPassword(currentPassword, newPassword) {
        console.log("---fetchPassword start---");

        const data = {
                'currentPassword': currentPassword,
                'newPassword': newPassword
        };

        const response = await fetchWithAuthBody('http://localhost:10279/api/v1/auth/update/password', data);

        if (response.ok) {
                alert("비밀번호가 성공적으로 변경되었습니다.");
        } else {
                const error = await response.text();
                console.log("오류 발생: " + error);
                alert("오류 발생: " + error);
        }
}
// 페이지가 로드될 때 fetchMemberInfo 함수 호출
document.addEventListener('DOMContentLoaded', () => {
        fetchMemberInfo();

        const form = document.querySelector('form');
        form.addEventListener('submit', async function(e) {
                e.preventDefault(); // 폼 제출 기본 동작 방지

                const currentPassword = form.currentPassword.value;
                const newPassword = form.newPassword.value;

                await fetchPassword(currentPassword, newPassword);
        });
});
