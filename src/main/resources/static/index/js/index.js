document.addEventListener('DOMContentLoaded', function() {
    console.log('대시보드 슬라이더 스크립트 초기화 시작');

    // ★★★ DOM 요소 선택 (BEM 클래스명으로 수정) ★★★
    const sliderWrapper = document.querySelector('.dashboard-slider__wrapper');
    const slides = document.querySelectorAll('.dashboard-slider__slide');
    const indicators = document.querySelectorAll('.dashboard-slider__indicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const sliderContainer = document.querySelector('.dashboard-slider'); // 터치 이벤트를 위한 전체 컨테이너

    // ★★★ 슬라이더 상태 변수 ★★★
    let currentSlide = 0;
    const totalSlides = slides.length;
    let isTransitioning = false; // 애니메이션 중복 실행 방지 플래그
    let touchStartX = 0;
    let touchEndX = 0;
    let autoSlideInterval; // 자동 슬라이드 인터벌 변수

    // ★★★ 초기화 확인 ★★★
    if (!sliderWrapper || totalSlides === 0) {
        console.error('슬라이더 핵심 요소를 찾을 수 없습니다! (.dashboard-slider__wrapper 또는 .dashboard-slider__slide)');
        return;
    }
    console.log(`슬라이더 초기화 완료 - 총 ${totalSlides}개 슬라이드`);

    // ★★★ 메인 슬라이드 이동 함수 ★★★
    function goToSlide(index) {
        if (isTransitioning) return;
        isTransitioning = true;

        // 인덱스 순환 처리 (마지막 -> 처음, 처음 -> 마지막)
        if (index < 0) {
            index = totalSlides - 1;
        } else if (index >= totalSlides) {
            index = 0;
        }

        console.log(`슬라이드 이동: ${currentSlide} → ${index}`);
        currentSlide = index;

        // ★★★ 핵심 수정: wrapper의 transform을 변경하여 슬라이드 이동 ★★★
        sliderWrapper.style.transform = `translateX(-${currentSlide * 100}%)`;

        updateIndicators();

        // CSS transition이 끝난 후 플래그를 해제하여 안정성 확보
        sliderWrapper.addEventListener('transitionend', () => {
            isTransitioning = false;
        }, { once: true }); // 이벤트가 한 번만 실행되도록 설정
    }

    // ★★★ 인디케이터 업데이트 (BEM 수정자 클래스로 변경) ★★★
    function updateIndicators() {
        indicators.forEach((indicator, idx) => {
            indicator.classList.toggle('dashboard-slider__indicator--active', idx === currentSlide);
        });
    }

    // ★★★ 네비게이션 함수들 ★★★
    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // ★★★ 이벤트 리스너 등록 ★★★

    // 버튼 클릭 이벤트
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    // 인디케이터 클릭 이벤트
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            goToSlide(index);
        });
    });

    // 키보드 네비게이션
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextSlide();
        }
    });

    // 터치/스와이프 지원
    sliderContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    sliderContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50; // 최소 스와이프 거리
        if (touchStartX - touchEndX > swipeThreshold) {
            nextSlide(); // 오른쪽으로 스와이프
        } else if (touchEndX - touchStartX > swipeThreshold) {
            prevSlide(); // 왼쪽으로 스와이프
        }
    }

    // ★★★ (선택) 자동 슬라이드 기능 ★★★
    function startAutoSlide(interval = 5000) {
        stopAutoSlide(); // 기존 인터벌이 있다면 중지
        autoSlideInterval = setInterval(nextSlide, interval);
        console.log(`자동 슬라이드 시작 (간격: ${interval}ms)`);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    // 마우스를 올리면 자동 슬라이드 멈춤, 벗어나면 다시 시작
    sliderContainer.addEventListener('mouseenter', stopAutoSlide);
    sliderContainer.addEventListener('mouseleave', () => startAutoSlide());

    // ★★★ 초기 상태 설정 ★★★
    function initialize() {
        updateIndicators();
        startAutoSlide(); // 페이지 로드 시 자동 슬라이드 시작
        console.log('슬라이더 초기화 완료 - 첫 번째 슬라이드 표시 및 자동 슬라이드 시작');
    }

    // ★★★ 초기화 실행 ★★★
    initialize();
});
