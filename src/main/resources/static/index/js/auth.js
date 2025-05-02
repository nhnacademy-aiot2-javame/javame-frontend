// auth.js
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USE_MOCK_LOGIN = false;

/**
 * 로그인 요청 → 토큰 받아서 저장 + 사용자 정보 반환
 */
export async function login(memberEmail, memberPassword) {
    if (USE_MOCK_LOGIN) {
        const mockUsers = [
            { memberEmail: "testuser", memberPassword: "testpass", role: "ROLE_USER" },
            { memberEmail: "testadmin", memberPassword: "testpass", role: "ROLE_ADMIN" },
            { memberEmail: "testowner", memberPassword: "testpass", role: "ROLE_OWNER" }
        ];

        // 사용자 인증 시뮬레이션
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = mockUsers.find(u => u.memberEmail === memberEmail && u.memberPassword === memberPassword);
                if (user) {
                    // 가짜 토큰 생성 및 저장
                    const accessToken = 'mock_access_token_' + Math.random().toString(36).substr(2, 9);
                    const refreshToken = 'mock_refresh_token_' + Math.random().toString(36).substr(2, 9);
                    sessionStorage.setItem(TOKEN_KEY, accessToken);
                    sessionStorage.setItem(REFRESH_KEY, refreshToken);
                    sessionStorage.setItem('user', JSON.stringify({
                        memberEmail: user.memberEmail,
                        role: user.role,
                        isLoggedIn: true
                    }));
                    resolve({ memberEmail: user.memberEmail, role: user.role });
                } else {
                    reject(new Error('Invalid username or password'));
                }
            }, 500);
        });
    } else {
        const response = await fetch('http://localhost:10279/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ memberEmail, memberPassword })
        });

        if (!response.ok) {
            throw new Error('로그인 실패');
        }

        const data = await response.json();
        console.log('로그인 응답 데이터:', data);

        const decodedToken = jwt_decode(data.accessToken);
        const role = decodedToken.role;

        sessionStorage.setItem(TOKEN_KEY, data.accessToken);
        sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
        sessionStorage.setItem('user', JSON.stringify({
            memberEmail: data.memberEmail,
            role: role,
            isLoggedIn: true
        }));

        return { memberEmail: data.memberEmail, role: role };
    }
}

export function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem('user');
    location.href = '/auth/login.html';
}

export function getAccessToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
    return sessionStorage.getItem(REFRESH_KEY);
}

export function isLoggedIn() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    return user && user.isLoggedIn;
}

export function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem('user'));
}

export function authHeader() {
    const token = getAccessToken();
    if (token) {
        return {
            Authorization: `Bearer ${token}`,
        };
    }
    return {};
}

export async function refreshAccessToken() {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);

    if (!refreshToken) {
        throw new Error('Refresh token is missing');
    }

    const response = await fetch('http://localhost:10279/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
        throw new Error('리프레시 토큰 갱신 실패');
    }

    const data = await response.json();
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    return data.accessToken;
}

async function fetchWithAuth(url, options) {
    let token = sessionStorage.getItem(TOKEN_KEY);
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status === 401) { // 액세스 토큰 만료
        // 리프레시 토큰을 사용해 새로운 액세스 토큰을 받음
        try {
            token = await refreshAccessToken();
            // 새로운 토큰을 사용해 다시 요청
            return fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch (error) {
            console.error('리프레시 토큰 갱신 실패', error);
            window.location.href = "/auth/login.html"; // 로그인 페이지로 리다이렉트
        }
    }

    return response;
}
