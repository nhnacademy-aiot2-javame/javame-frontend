import { fetchWithAuth } from "../../index/js/auth";

async function fetchMemberInfo() {
    try {
        // fetchWithAuth를 사용하여 API 호출, await를 사용하여 응답 대기
        const response = await fetchWithAuth("http://localhost:10282/api/v1/members/me", {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        // JSON 형식으로 응답을 파싱
        const data = await response.json();

        // 각 요소에 데이터를 삽입
        document.getElementById('mypage-email').innerText = data.email;
        document.getElementById('mypage-name').innerText = data.name;
        document.getElementById('mypage-role').innerText = data.role;
        document.getElementById('mypage-company').innerText = data.company;

    } catch (error) {
        console.error('Fetch error: ', error);
    }
}

// 페이지가 로드될 때 fetchMemberInfo 함수 호출
document.addEventListener('DOMContentLoaded', fetchMemberInfo);