/**
 * auth.js 세션 스토리지 활용 토큰 관리 유틸
 * 브라우저 탭을 닫으면 사라짐
 */

// 토큰 필드 설정
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

/**
 * 로그인 요청 → 토큰 받아서 저장
 * @param {string} username
 * @param {string} password
 */

export async function login(username, password) {
    const response = await fetch('http://localhost:10259/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({username, password}),
    });

    if (!response.ok){
        throw new Error('로그인 실패');
    }

    const data = await response.json();

    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(REFRESH_KEY, data.refreshToken);

}

/**
 * 로그아웃 함수 - 세션 스토리지에서 토큰 제거
 */
export function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
}

/**
 * 토큰 가져오기
 */
export function getAccessToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
    return sessionStorage.getItem(REFRESH_KEY);
}

/**
 * 토큰을 Authorization 헤더에 붙여서 요청할 때 사용하는 옵션
 */
export function authHeader() {
    const token = getAccessToken();
    if (token) {
        return {
            Authorization: `Bearer ${token}`,
        };
    }
    return {};
}
