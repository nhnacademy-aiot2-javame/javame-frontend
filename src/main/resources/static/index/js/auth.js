// auth.js
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

// Mock 로그인 모드 활성화 여부 (백엔드 API가 준비되지 않았을 때 true로 설정)
const USE_MOCK_LOGIN = true;

/**
 * 로그인 요청 → 토큰 받아서 저장
 * @param {string} username
 * @param {string} password
 */
export async function login(username, password) {
    if (USE_MOCK_LOGIN) {
        // 가짜 사용자 데이터
        const mockUsers = [
            { username: "testuser", password: "testpass" },
            { username: "admin", password: "admin123" },
            { username: "owner", password: "owner123" }
        ];

        // 사용자 인증 시뮬레이션
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = mockUsers.find(u => u.username === username && u.password === password);
                if (user) {
                    // 가짜 토큰 생성 및 저장
                    const accessToken = 'mock_access_token_' + Math.random().toString(36).substr(2, 9);
                    const refreshToken = 'mock_refresh_token_' + Math.random().toString(36).substr(2, 9);
                    sessionStorage.setItem(TOKEN_KEY, accessToken);
                    sessionStorage.setItem(REFRESH_KEY, refreshToken);
                    sessionStorage.setItem('user', JSON.stringify({ username, isLoggedIn: true }));
                    resolve({ status: 'success', message: 'Login successful' });
                } else {
                    reject(new Error('Invalid username or password'));
                }
            }, 0); // 0.5초 지연으로 실제 API 호출 느낌 주기
        });
    } else {
        // 실제 API 호출 (백엔드 준비 시 사용)
        const response = await fetch('http://localhost:10279/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({id: username, password}),
        });

        if (!response.ok){
            throw new Error('로그인 실패');
        }

        const data = await response.json();
        sessionStorage.setItem(TOKEN_KEY, data.accessToken);
        sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
    }
}

/**
 * 로그아웃 함수 - 세션 스토리지에서 토큰 제거
 */
export function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem('user');
    location.href = '/auth/login.html';
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
 * 로그인 상태 확인
 */
export function isLoggedIn() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    return user && user.isLoggedIn;
}

/**
 * 현재 사용자 정보 가져오기
 */
export function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem('user'));
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

// /**
//  * auth.js 세션 스토리지 활용 토큰 관리 유틸
//  * 브라우저 탭을 닫으면 사라짐
//  */
//
// // 토큰 필드 설정
// const TOKEN_KEY = 'accessToken';
// const REFRESH_KEY = 'refreshToken';
//
// /**
//  * 로그인 요청 → 토큰 받아서 저장
//  * @param {string} username
//  * @param {string} password
//  */
//
// export async function login(username, password) {
//     const response = await fetch('http://localhost:10279/api/v1/auth/login', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({id: username, password}),
//     });
//
//     if (!response.ok){
//         throw new Error('로그인 실패');
//     }
//
//     const data = await response.json();
//
//     sessionStorage.setItem(TOKEN_KEY, data.accessToken);
//     sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
// }
//
// /**
//  * 로그아웃 함수 - 세션 스토리지에서 토큰 제거
//  */
// export function logout() {
//     sessionStorage.removeItem(TOKEN_KEY);
//     sessionStorage.removeItem(REFRESH_KEY);
// }
//
// /**
//  * 토큰 가져오기
//  */
// export function getAccessToken() {
//     return sessionStorage.getItem(TOKEN_KEY);
// }
//
// export function getRefreshToken() {
//     return sessionStorage.getItem(REFRESH_KEY);
// }
//
// /**
//  * 토큰을 Authorization 헤더에 붙여서 요청할 때 사용하는 옵션
//  */
// export function authHeader() {
//     const token = getAccessToken();
//     if (token) {
//         return {
//             Authorization: `Bearer ${token}`,
//         };
//     }
//     return {};
// }