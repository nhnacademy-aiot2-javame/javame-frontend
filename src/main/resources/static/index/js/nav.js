import { isLoggedIn, logout } from './auth.js';
import { messages, getCurrentLang, setLanguage } from '/admin/js/locales-index.js'

document.addEventListener('DOMContentLoaded', () => {
    updateNavBar();

    // 언어 변경 시 내비게이션도 갱신되도록 이벤트 등록
    document.getElementById('btn-ko').addEventListener('click', () => {
        setLanguage('ko');
        updateNavBar();
    });
    document.getElementById('btn-en').addEventListener('click', () => {
        setLanguage('en');
        updateNavBar();
    });

    // 로그아웃 버튼 클릭 이벤트
    const loginLogoutBtn = document.querySelector('#loginLogoutBtn');
    if (loginLogoutBtn) {
        loginLogoutBtn.addEventListener('click', (e) => {
            if (isLoggedIn() && e.target.textContent.trim() === messages[getCurrentLang()].logout) {
                logout();
                updateNavBar();
            }
        });
    }
});

export function updateNavBar() {
    const lang = getCurrentLang();
    const t = messages[lang];
    const loginLogoutBtn = document.querySelector('#loginLogoutBtn');
    const registerDashboardBtn = document.querySelector('#registerDashboardBtn');

    if (loginLogoutBtn && registerDashboardBtn) {
        if (isLoggedIn()) {
            loginLogoutBtn.textContent = t.logout;
            loginLogoutBtn.href = '#';
            registerDashboardBtn.textContent = t.dashboard;
            registerDashboardBtn.href = '/environment/dashboard-main';
        } else {
            loginLogoutBtn.textContent = t.login;
            loginLogoutBtn.href = '/auth/login';
            registerDashboardBtn.textContent = t.signup;
            registerDashboardBtn.href = '/auth/register';
        }
    }
}
