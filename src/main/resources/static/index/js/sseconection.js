// // SSE 연결 설정
// const companyDomain = "javame.com"; // 회사 도메인
// const memberNo = "21"; // 사용자 번호
// const eventSource = new EventSource(`http://localhost:10279/api/v1/warnify/send/event?companyDomain=${companyDomain}&memberNo=${memberNo}`);
//
// // 서버로부터 이벤트를 수신
// eventSource.onmessage = function(event) {
//     console.log("새 메시지 수신:", event.data);
//     // 수신된 데이터를 처리 (예: 화면에 알림 표시)
//     const warnInfo = JSON.parse(event.data); // 서버에서 JSON 형식으로 데이터를 보낸 경우 파싱
//     alert(`알림: ${warnInfo.message}`); // 예: 알림 표시
// };
//
// // 특정 이벤트 이름("WARN!") 처리
// eventSource.addEventListener("WARN", function(event) {
//     console.log("WARN! 이벤트 수신:", event.data);
//     alert(`알림: ${event.data}`); // 예: 알림 표시
// });
//
// // 연결 에러 처리
// eventSource.onerror = function() {
//     console.error("SSE 연결 에러 발생");
//     // 필요 시 연결 재시도 로직 추가
// };