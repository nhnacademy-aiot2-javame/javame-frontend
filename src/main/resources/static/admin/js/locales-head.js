// const messages = {
//     ko: {
//         m36: `로그아웃`,
//         m37: `설정`,
//         m38: `마이페이지`,
//         m39: `사용자 관리`,
//         m40: `회사 정보 관리`,
//         m41: `회원 허가`,
//         m42: `메인으로`
//     },
//
//     en: {
//         m36: `Log out`,
//         m37: `Setting`,
//         m38: `My Page`,
//         m39: `User Management`,
//         m40: `Company Information Management`,
//         m41: `User Approval`,
//         m42: `Back to Main`
//     },
// };
//
// function setLanguage(lang){
//     const t = messages[lang];
//
//     document.getElementById('m36').innerText = t.m36;
//     document.getElementById('m37').innerText = t.m37;
//     document.getElementById('m38').innerText = t.m38;
//     document.getElementById('m39').innerText = t.m39;
//     document.getElementById('m40').innerText = t.m40;
//     document.getElementById('m41').innerText = t.m41;
//     document.getElementById('m42').innerText = t.m42;
//
//
//     localStorage.setItem('lang', lang);
// }
//
// // 페이지 로드 시 저장된 언어 불러오기
// document.addEventListener('DOMContentLoaded', () => {
//     const savedLang = localStorage.getItem('lang') || 'ko';
//     setLanguage(savedLang);
//
//     // 버튼 이벤트 등록
//     document.getElementById('btn-ko').addEventListener('click', () => setLanguage('ko'));
//     document.getElementById('btn-en').addEventListener('click', () => setLanguage('en'));
// });