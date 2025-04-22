import { login } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginbtn = document.querySelector('.btn-login');

    if (loginbtn) {
        loginbtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const username = document.querySelector('#username').value;
            const password = document.querySelector('#password').value;

            try {
                await login(username, password);
                alert('로그인 성공!');
                location.href = '/';
            } catch (err) {
                alert('로그인 실패: ' + err.message);
            }
        });
    }
});