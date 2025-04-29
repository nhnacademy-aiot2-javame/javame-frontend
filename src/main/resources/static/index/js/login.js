// login.js
import { login } from './auth.js';
import { updateNavBar } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.querySelector('#username').value;
            const password = document.querySelector('#password').value;

            try {
                await login(username, password);
                alert('로그인 성공!');
                updateNavBar();
            } catch (err) {
                alert('로그인 실패: ' + err.message);
            }
        });
    }
});
