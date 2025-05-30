/**
 * 로그인 요청 → 토큰 받아서 저장 + 사용자 정보 반환
 */
// auth.js
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USE_MOCK_LOGIN = false;
const CICD_URL = 'https://gateway.javame.live';

/**
 * 로그인 요청 → 토큰 받아서 저장 + 사용자 정보 반환
 */
export async function login(memberEmail, memberPassword) {
    if (USE_MOCK_LOGIN) {
        const mockUsers = [
            { memberEmail: "testuser", memberPassword: "testpass", role: "ROLE_USER", companyDomain: "javame" },
            { memberEmail: "testadmin", memberPassword: "testpass", role: "ROLE_ADMIN" },
            { memberEmail: "testowner", memberPassword: "testpass", role: "ROLE_OWNER", companyDomain: "javame" }
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
        const response = await fetch('https://gateway.javame.live/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ memberEmail, memberPassword }),
        });

        if (!response.ok) {
            throw new Error('로그인 실패');
        }

        // 헤더에서 토큰 받아오기


        console.log("Authorization: " + response.headers.get('Authorization'));
        const authHeader = response.headers.get('Authorization');
        const refreshToken = response.headers.get('Refresh-Token');

        if (!authHeader) {
            throw new Error('Authorization 헤더가 없습니다.');
        }

        // "Bearer " 부분 제거하고 토큰만 추출
        const accessToken = authHeader.split(' ')[1];

        const decodedToken = jwt_decode(accessToken);
        const role = decodedToken.role;

        sessionStorage.setItem(TOKEN_KEY, accessToken);
        sessionStorage.setItem(REFRESH_KEY, refreshToken);
        sessionStorage.setItem('user', JSON.stringify({
            memberEmail: decodedToken.sub || '',
            role: role,
            isLoggedIn: true
        }));

        return { memberEmail: decodedToken.sub || '', role: role };
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

    const response = await fetch('https://gateway.javame.live/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Refresh-Token': refreshToken
        }
    });

    if (!response.ok) {
        throw new Error('리프레시 토큰 갱신 실패');
    }

    const data = await response.json();
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    return data.accessToken;
}

export async function fetchWithAuth(url, options) {
    let token = sessionStorage.getItem(TOKEN_KEY);
    const final_url = CICD_URL + url;
    const response = await fetch(final_url, {
        options,
        headers: {
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

export async function fetchWithAuthPut(url, data) {
    let token = sessionStorage.getItem(TOKEN_KEY);
    const final_url = CICD_URL + url;
    const option = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`
        }
    };
    if(data){
        option.body = JSON.stringify(data);
    }
    const response = await fetch(final_url, option);

    if (response.status === 401) { // 액세스 토큰 만료
        // 리프레시 토큰을 사용해 새로운 액세스 토큰을 받음
        try {
            const refreshToken = await refreshAccessToken();
            const refreshOption = {
                method: 'PUT',
                headers: {
                    'Refresh-Token': refreshToken
                }
            }
            return await fetch(url, refreshOption);
        } catch (error) {
            console.error('리프레시 토큰 갱신 실패', error);
            window.location.href = "/auth/login.html"; // 로그인 페이지로 리다이렉트
        }
    }

    return response;
}
