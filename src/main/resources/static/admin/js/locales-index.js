const messages = {
    ko: {
        m1: `실시간 장애 예방, 자동화 대응, 환경 통합 감시 
            <br> 대시보드 기반의 시각화 및 예측 운영`,
        m2: `AI가 서버 리소스의 이상 징후를 실시간 탐지`,
        m3: `IoT 센서를 통해 온도, 습도, 전력 등 서버룸 환경을 모니터링`,
        m4: `AIoT 기반 서버 운영 솔루션 소개`,
        m5: `다양한 형태의 그래프를 제공합니다.`,
        m6: `우리가 걸어온 길`,
        m7: `IoT 센서 연동 및 데이터 시각화`,
        m8: `노드레드를 통해 받은 데이터를 활용한 기후 정보 수집`,
        m9: `Servlet과 JSP를 활용한 MVC 패턴 기반 쇼핑몰 개발`,
        m10: `상품 검색, 장바구니, 결제 시스템 등 핵심 기능 구현
                <br>관리자 페이지를 통한 상품 CRUD 기능 개발`,
        m11: `Spring Blog 프로젝트`,
        m12: `MSA(Microservice Architecture) 기반 블로그 서비스 개발`,
        m13: `AIOT 기반 서버 운영`,
        m14: `문장곤`,
        m15: `성장원`,
        m16: `오성현`,
        m17: `이지원`,
        m18: `정지연`,
        m19: `임성인`,
        m20: `윤기원`,
        m21: `등록하기`,
        m22: `AIoT 기반 서버 운영 솔루션을 지금 경험하세요.`,
        m23: `기본 제공 플랜`,
        m24: `₩99,000`,
        m25: `무료`,
        m26: `✅ 센서 데이터 제공`,
        m27: `✅ 서버 기기 연결`,
        m28: `✅ 기본 알림 기능`,
        m29: `등록하기`,
        loginLogoutBtn: `로그인`,
        registerDashboardBtn: `회원가입`,
        m30: `개인정보 처리방침`,
        m31: `이용약관`,
        m32: `서비스 안내`,
        // m33: `메인으로`,
        m34: `비밀번호 변경`,
        m35: `로그아웃`,
        // m36: `로그아웃`,
        // m37: `설정`,
        // m38: `마이페이지`,
        // m39: `사용자 관리`,
        // m40: `회사 정보 관리`,
        // m41: `회원 허가`,
        // m42: `메인으로`







    },
    en: {
        m1: `Prevent incidents in real-time, automated response, integrated monitoring
        <br> Dashboard-based visualization and predictive operations`,
        m2: `AI detects abnormal signs of server resources in real time`,
        m3: `Monitoring server room environment such as temperature, humidity, and power through IoT sensors`,
        m4: `Introducing Our AIoT-powered Server Management Solution`,
        m5: `We provide various types of graphs.`,
        m6: `Our history`,
        m7: `IoT Sensor Integration and<br>Data Visualization`,
        m8: `Collecting Climate Information<br>Using Data from Node-RED`,
        m9: `Shopping Mall Development Based on MVC Pattern<br>Using Servlet and JSP`,
        m10: `Implementation of core features<br>(product search, shopping cart, payment system)
            <br>Development of product CRUD functionality<br>through the admin page`,
        m11: `Spring Blog Project`,
        m12: `Blog Service Development based on<br>MSA(Microservice Architecture)`,
        m13: `AIoT-based Server Operation`,
        m14: `Janggon-Mun`,
        m15: `Jangwon-Seong`,
        m16: `Sunghyeon-Oh`,
        m17: `Jiwon-Lee`,
        m18: `Jiyeon-Jung`,
        m19: `SeongIn-Lim`,
        m20: `Kiwon-Yoon`,
        m21: `Subscribe`,
        m22: `Experience AIoT-based Server Operation`,
        m23: `Basic Plan`,
        m24: `$99`,
        m25: `Free`,
        m26: `✅ Sensor Data Access`,
        m27: `✅ Server Device Connection`,
        m28: `✅ Basic Alert System `,
        m29: `Subscribe`,
        loginLogoutBtn: `Log in`,
        registerDashboardBtn: `Sign up`,
        m30: `Privacy Policy`,
        m31: `Terms of Service`,
        m32: `Service Guide`,
        // m33: `Back to Main`,
        // m34: `Change Password`,
        // m35: `Log out`,
        // m36: `Log out`,
        // m37: `Setting`,
        // m38: `My Page`,
        // m39: `User Management`,
        // m40: `Company Information Management`,
        // m41: `User Approval`,
        // m42: `Back to Main`



    },
};


function setLanguage(lang) {
    const t = messages[lang];

    // 일반 텍스트는 innterText
    document.getElementById('m2').innerText = t.m2;
    document.getElementById('m3').innerText = t.m3;
    document.getElementById('m4').innerText = t.m4;
    document.getElementById('m5').innerText = t.m5;
    document.getElementById('m6').innerText = t.m6;


    document.getElementById('m11').innerText = t.m11;
    document.getElementById('m13').innerText = t.m13;
    document.getElementById('m14').innerText = t.m14;
    document.getElementById('m15').innerText = t.m15;
    document.getElementById('m16').innerText = t.m16;
    document.getElementById('m17').innerText = t.m17;
    document.getElementById('m18').innerText = t.m18;
    document.getElementById('m19').innerText = t.m19;
    document.getElementById('m20').innerText = t.m20;
    document.getElementById('m21').innerText = t.m21;
    document.getElementById('m22').innerText = t.m22;
    document.getElementById('m23').innerText = t.m23;
    document.getElementById('m24').innerText = t.m24;
    document.getElementById('m25').innerText = t.m25;
    document.getElementById('m26').innerText = t.m26;
    document.getElementById('m27').innerText = t.m27;
    document.getElementById('m28').innerText = t.m28;
    document.getElementById('m29').innerText = t.m29;
    document.getElementById('loginLogoutBtn').innerText = t.loginLogoutBtn;
    document.getElementById('registerDashboardBtn').innerText = t.registerDashboardBtn;
    document.getElementById('m30').innerText = t.m30;
    document.getElementById('m31').innerText = t.m31;
    document.getElementById('m32').innerText = t.m32;
    // document.getElementById('m33').innerText = t.m33;
    // document.getElementById('m34').innerText = t.m34;
    // document.getElementById('m35').innerText = t.m35;
    // document.getElementById('m36').innerText = t.m36;
    // document.getElementById('m37').innerText = t.m37;
    // document.getElementById('m38').innerText = t.m38;
    // document.getElementById('m39').innerText = t.m39;
    // document.getElementById('m40').innerText = t.m40;
    // document.getElementById('m41').innerText = t.m41;
    // document.getElementById('m42').innerText = t.m42;


    // <br> 포함된 경우는 innterHTML 사용
    document.getElementById('m1').innerHTML = t.m1;
    document.getElementById('m10').innerHTML = t.m10;
    document.getElementById('m12').innerHTML = t.m12;
    document.getElementById('m8').innerHTML = t.m8;
    document.getElementById('m7').innerHTML = t.m7;
    document.getElementById('m9').innerHTML = t.m9;

    localStorage.setItem('lang', lang);
}

// 페이지 로드 시 저장된 언어 불러오기
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('lang') || 'ko';
    setLanguage(savedLang);

    // 버튼 이벤트 등록
    document.getElementById('btn-ko').addEventListener('click', () => setLanguage('ko'));
    document.getElementById('btn-en').addEventListener('click', () => setLanguage('en'));
});