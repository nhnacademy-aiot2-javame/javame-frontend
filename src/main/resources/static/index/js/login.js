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
                await login(memberEmail, memberPassword);
                alert('로그인 성공!');
                updateNavBar();
                window.location.href = '/api/v1/environment/dashboard';
            } catch (err) {
                alert('로그인 실패: ' + err.message);
            }
        });
    }
});
