import {
    fetchWithAuth
} from '../../index/js/auth.js'

async function fetchMemberInfo() {

        // fetchWithAuth를 사용하여 API 호출, await를 사용하여 응답 대기
        const result = await fetchWithAuth("http://localhost:10279/api/v1/members/me", "method : 'GET");
        // JSON 형식으로 응답을 파싱
        const data = await result.json();
        console.log("data: " + JSON.stringify(data));

        // 각 요소에 데이터를 삽입
        document.getElementById('mypage-email').innerText = data.memberEmail;
        document.getElementById('mypage-no').innerText = data.memberNo;
        document.getElementById('mypage-role').innerText = data.roleId;
        document.getElementById('mypage-company').innerText = data.companyDomain;

}

// 페이지가 로드될 때 fetchMemberInfo 함수 호출
document.addEventListener('DOMContentLoaded', fetchMemberInfo);