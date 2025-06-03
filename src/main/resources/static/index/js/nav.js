// nav.js
import { isLoggedIn, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    updateNavBar();

    // 로그아웃 버튼 클릭 이벤트 (로그아웃 버튼이 동적으로 변경되므로 이벤트 위임 사용)
    const loginLogoutBtn = document.querySelector('#loginLogoutBtn');
    if (loginLogoutBtn) {
        loginLogoutBtn.addEventListener('click', (e) => {
            if (isLoggedIn() && e.target.textContent.trim() === '로그아웃') {
                logout();
                updateNavBar();
            }
        });
    }
});

export function updateNavBar() {
    const loginLogoutBtn = document.querySelector('#loginLogoutBtn');
    const registerDashboardBtn = document.querySelector('#registerDashboardBtn');

    // 요소가 존재하는 경우에만 업데이트
    if (loginLogoutBtn && registerDashboardBtn) {
        if (isLoggedIn()) {
            // 로그인 상태일 때
            loginLogoutBtn.textContent = '로그아웃';
            loginLogoutBtn.href = '#';
            registerDashboardBtn.textContent = '대시보드';
            registerDashboardBtn.href = '/environment/dashboard-main'; // 대시보드 경로로 변경
        } else {
            // 로그아웃 상태일 때
            loginLogoutBtn.textContent = '로그인';
            loginLogoutBtn.href = '/auth/login';
            registerDashboardBtn.textContent = '회원가입';
            registerDashboardBtn.href = '/auth/register';
        }
    }
}
