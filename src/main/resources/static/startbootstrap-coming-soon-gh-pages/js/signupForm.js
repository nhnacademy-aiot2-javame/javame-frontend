import { register } from './register.js';

document.querySelector('.btn-register').addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.querySelector('#Email').value;
    const username = document.querySelector('#Username').value;
    const password = document.querySelector('#Password').value;

    try {
        await register({ email, username, password });
        alert('회원가입 성공! 로그인 페이지로 이동합니다.');
        location.href = '/auth/login';
    } catch (err) {
        alert('회원가입 실패: ' + err.message);
    }
});
