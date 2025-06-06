const messages = {
    ko: {
        solution: `실시간 장애 예방, 자동화 대응, 환경 통합 감시 <br> 대시보드 기반의 시각화 및 예측 운영`,
        server: `AI가 서버 리소스의 이상 징후를 실시간 탐지`,
        iot: `IoT 센서를 통해 온도, 습도, 전력 등 서버룸 환경을 모니터링`

    },
    en: {
        solution: `Prevent incidents in real-time, automated response, integrated monitoring
        <br> Dashboard-based visualization and predictive operations`,
        server: `AI detects abnormal signs of server resources in real time`,
        iot: `Monitoring server room environment such as temperature, humidity, and power through IoT sensors`
    },
};


function setLanguage(lang) {
    const t = messages[lang];

    // 일반 텍스트는 innterText
    document.getElementById('server').innerText = t.server;

    // <br> 포함된 경우는 innterHTML 사용
    document.getElementById('solution').innerHTML = t.solution;

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