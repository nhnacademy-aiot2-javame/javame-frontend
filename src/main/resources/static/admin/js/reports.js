// reports.js

import { createAreaChart, createMultiLineChart, createBarChart, createPieChart } from './chartUtils.js';

const API_BASE_URL = 'http://localhost:10279/api/v1/environment/reports';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportGenerationForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userPrompt = document.getElementById('userPromptInput').value;
            const reportType = document.getElementById('reportTypeSelect')?.value || '종합';

            if (!userPrompt.trim()) {
                alert('프롬프트를 입력해주세요.');
                return;
            }

            const body = {
                userPrompt,
                reportType
                // startDate, endDate 등 다른 필드들은 백엔드에서 기본값 처리한다고 가정
            };

            toggleLoading(true);
            clearResults(); // 여기서 reportOutputArea도 숨겨짐 (clearResults 수정 시)

            try {
                const res = await fetch(`${API_BASE_URL}/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: `서버 오류: ${res.statusText}` }));
                    throw new Error(`서버 오류 ${res.status}: ${errorData.message || res.statusText}`);
                }

                const data = await res.json();
                console.log("Received data from backend:", data); // ★★★ 백엔드 응답 데이터 구조 확인용 로그 ★★★

                // ★★★ 결과 영역 보이도록 처리 ★★★
                const reportOutputArea = document.getElementById('reportOutputArea');
                if (reportOutputArea) {
                    reportOutputArea.style.display = 'block';
                }

                // ★★★ 리포트 제목 표시 (백엔드 DTO의 reportOverallTitle 필드 사용 가정) ★★★
                const reportTitleElement = document.getElementById('reportGeneratedTitle');
                if (reportTitleElement && data.reportOverallTitle) {
                    reportTitleElement.textContent = data.reportOverallTitle;
                } else if (reportTitleElement) {
                    reportTitleElement.textContent = "AI 분석 리포트 (제목 없음)";
                }


                showSummary(data.summaryText); // DTO 필드명 확인!
                // showTable(data.detailedMetricsTable); // DTO 필드명 확인!
                showCharts(data.chartVisualizations); // DTO 필드명 확인!

            } catch (err) {
                showError(err.message);
            } finally {
                toggleLoading(false);
            }
        });
    }
});

function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
}

function clearResults() {
    // reportOutputArea도 숨기도록 추가
    const reportOutputArea = document.getElementById('reportOutputArea');
    if (reportOutputArea) {
        reportOutputArea.style.display = 'none';
    }
    ['reportSummary', 'reportTableContainer', 'reportChartsContainer', 'reportGeneratedTitle', 'errorMessage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = ''; // errorMessage는 textContent = '' 가 더 적절할 수 있음
    });
    // errorMessage는 숨기기
    const errorEl = document.getElementById('errorMessage');
    if(errorEl) errorEl.style.display = 'none';
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

function showSummary(text) {
    const el = document.getElementById('reportSummary');
    if (el) {
        // text가 null 또는 undefined일 경우를 대비하여 기본값 설정
        const summaryContent = text || '제공된 요약 정보가 없습니다.';
        // pre 태그를 사용하여 마크다운의 줄바꿈 등을 어느정도 유지
        el.innerHTML = `<pre>${summaryContent}</pre>`;
    }
}

// function showTable(data) {
//     const el = document.getElementById('reportTableContainer');
//     if (!el) return; // 테이블 컨테이너 없으면 종료
//     if (!data || data.length === 0) {
//         el.innerHTML = '<p>표시할 테이블 데이터가 없습니다.</p>';
//         return;
//     }
//     // data가 배열이고, 첫 번째 요소가 객체인지 확인
//     if (!Array.isArray(data) || typeof data[0] !== 'object' || data[0] === null) {
//         el.innerHTML = '<p>테이블 데이터 형식이 올바르지 않습니다.</p>';
//         console.error("Invalid table data format:", data);
//         return;
//     }
//     const keys = Object.keys(data[0]);
//     const table = `
//         <table class="table table-striped table-bordered table-hover table-sm"> <!-- Bootstrap 클래스 추가 -->
//             <thead class="table-light"> <!-- aThead 스타일 -->
//                 <tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>
//             </thead>
//             <tbody>
//                 ${data.map(row => `<tr>${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}</tr>`).join('')}
//             </tbody>
//         </table>`;
//     el.innerHTML = table;
// }

function showCharts(charts) {
    const container = document.getElementById('reportChartsContainer');
    if (!container) return; // 차트 컨테이너 없으면 종료
    if (!charts || charts.length === 0) {
        container.innerHTML = '<p>표시할 차트 데이터가 없습니다.</p>';
        return;
    }
    container.innerHTML = ''; // 이전 차트 지우기
    charts.forEach((chart, i) => {
        const canvasId = `reportChartCanvas-${i}`; // ID 명확하게 변경
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper mb-4 p-3'; // 클래스 및 패딩, 마진 추가

        const titleElement = document.createElement('h5');
        titleElement.className = 'text-center mb-3'; // 제목 스타일
        titleElement.textContent = chart.title || `차트 ${i + 1}`;
        wrapper.appendChild(titleElement);

        const canvasElement = document.createElement('canvas');
        canvasElement.id = canvasId;
        // canvasElement.height = 180; // 스타일은 CSS에서 관리하는 것이 좋음
        // canvasElement.style.maxHeight = '300px'; // 예시 최대 높이
        wrapper.appendChild(canvasElement);
        container.appendChild(wrapper);

        // chartUtils.js 함수 호출
        if (chart.datasets && typeof createMultiLineChart === 'function') {
            createMultiLineChart(canvasId, chart.labels, chart.datasets, chart.title);
        } else if (chart.values && typeof createAreaChart === 'function') {
            createAreaChart(canvasId, chart.labels, chart.values, chart.title);
        } else if (chart.values && typeof createBarChart === 'function') {
            // createBarChart(canvasId, chart.labels, chart.values, chart.title);
            console.warn(`Bar 차트 생성 함수는 현재 주석 처리됨. Area 차트로 대체: ${chart.title}`);
            createAreaChart(canvasId, chart.labels, chart.values, chart.title);
        } else {
            console.error(`차트 데이터를 그리는 데 필요한 함수를 찾을 수 없거나, 데이터 구조(${chart.title ? chart.title : '제목 없음'})가 적합하지 않습니다.`, chart);
            const fallbackText = document.createElement('p');
            fallbackText.className = 'text-muted text-center';
            fallbackText.textContent = `${chart.title || `차트 ${i + 1}`} - 차트 생성 실패 (데이터 또는 유틸 함수 확인 필요)`;
            wrapper.appendChild(fallbackText);
        }
    });
}
