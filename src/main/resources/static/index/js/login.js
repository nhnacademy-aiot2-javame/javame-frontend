// login.js
import { login } from './auth.js';
import { updateNavBar } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const memberEmail = document.querySelector('#memberEmail').value;
            const memberPassword = document.querySelector('#memberPassword').value;

            try {
                const user = await login(memberEmail, memberPassword);
                alert('로그인 성공!');
                updateNavBar();

                if (user.role === 'ROLE_USER' || user.role === 'ROLE_OWNER') {
                    window.location.href = '/api/v1/environment/dashboard';
                } else if (user.role === 'ROLE_ADMIN') {
                    window.location.href = '/admin/index';
                } else {
                    alert('알 수 없는 역할입니다.');
                }

            } catch (err) {
                alert('로그인 실패: ' + err.message);
            }
        });
    }
});
