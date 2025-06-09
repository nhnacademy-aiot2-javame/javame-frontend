// reports.js

import { createAreaChart, createMultiLineChart} from './chartUtils.js';

const API_BASE_URL = 'https://javame.live/api/v1/environment/reports';

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
            };

            toggleLoading(true);
            clearResults();

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
                console.log("Received data from backend:", data);

                // ★★★ 결과 영역 보이도록 처리 ★★★
                const reportOutputArea = document.getElementById('reportOutputArea');
                if (reportOutputArea) {
                    reportOutputArea.style.display = 'block';
                }

                // ★★★ 기존 DTO 필드명 사용 ★★★
                const reportTitleElement = document.getElementById('reportGeneratedTitle');
                if (reportTitleElement && data.reportOverallTitle) {
                    reportTitleElement.textContent = data.reportOverallTitle;
                } else if (reportTitleElement) {
                    reportTitleElement.textContent = "AI 분석 리포트 (제목 없음)";
                }

                // ★★★ 기존 DTO 필드명에 맞춰 수정 ★★★
                showSummary(data.summaryText);           // summaryText 필드 사용
                showCharts(data.chartVisualizations);    // chartVisualizations 필드 사용
                showReportInfo(data);                    // 추가 정보 표시

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
    const reportOutputArea = document.getElementById('reportOutputArea');
    if (reportOutputArea) {
        reportOutputArea.style.display = 'none';
    }
    ['reportSummary', 'reportChartsContainer', 'reportGeneratedTitle', 'reportInfo', 'errorMessage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
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
        const summaryContent = text || '제공된 요약 정보가 없습니다.';

        // ★★★ 마크다운을 HTML로 변환하는 함수 ★★★
        const htmlContent = convertMarkdownToHtml(summaryContent);

        el.innerHTML = `<div class="summary-content">${htmlContent}</div>`;
    }
}

function convertMarkdownToHtml(markdown) {
    let html = markdown || '';
    // 헤더 변환
    html = html.replace(/^### (.*$)/gm, '<h3 class="mt-4 mb-3"><i class="fas fa-chevron-right text-primary me-2"></i>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="mt-4 mb-3 pb-2 border-bottom border-primary"><i class="fas fa-chart-line text-primary me-2"></i>$1</h2>');
    // 볼드(배지)
    html = html.replace(/\*\*(.*?)\*\*/g, '<span class="badge bg-primary-subtle text-primary-emphasis me-1">$1</span>');
    // 리스트(체크)
    html = html.replace(/^\*\s+(.*)$/gm, '<div class="d-flex align-items-start mb-2"><i class="fas fa-check-circle text-success me-2 mt-1"></i><span>$1</span></div>');
    // 줄바꿈
    html = html.split('\n\n').map(paragraph => {
        if (paragraph.trim()) {
            if (paragraph.includes('<h') || paragraph.includes('<div')) {
                return paragraph.replace(/\n/g, ' ');
            } else {
                return `<p class="mb-3 lh-lg">${paragraph.replace(/\n/g, '<br>')}</p>`;
            }
        }
        return '';
    }).join('');
    return html;
}



// ★★★ 기존 DTO 필드명에 맞춰 수정 ★★★
function showReportInfo(data) {
    const el = document.getElementById('reportInfo');
    if (!el) return;

    let infoHtml = '<div class="report-info mt-3 p-3 bg-light rounded">';
    infoHtml += '<h6 class="mb-2">📊 리포트 정보</h6>';

    // ★★★ 기존 필드명 사용 ★★★
    if (data.reportPeriodStart && data.reportPeriodEnd) {
        infoHtml += `<p class="mb-1"><strong>분석 기간:</strong> ${data.reportPeriodStart} ~ ${data.reportPeriodEnd}</p>`;
    }

    if (data.filterCriteriaSummary) {
        infoHtml += `<p class="mb-1"><strong>조건:</strong> ${data.filterCriteriaSummary}</p>`;
    }

    if (data.generatedAt) {
        const generatedTime = new Date(data.generatedAt).toLocaleString('ko-KR');
        infoHtml += `<p class="mb-0"><strong>생성 시간:</strong> ${generatedTime}</p>`;
    }

    infoHtml += '</div>';
    el.innerHTML = infoHtml;
}

function showCharts(charts) {
    const container = document.getElementById('reportChartsContainer');
    if (!container) return;

    if (!charts || charts.length === 0) {
        container.innerHTML = '<div class="alert alert-info">📈 표시할 차트 데이터가 없습니다.</div>';
        return;
    }

    container.innerHTML = '';

    charts.forEach((chart, i) => {
        const canvasId = `reportChartCanvas-${i}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper mb-4 p-3 border rounded';

        const titleElement = document.createElement('h5');
        titleElement.className = 'text-center mb-3 text-primary';
        titleElement.textContent = chart.title || `차트 ${i + 1}`;
        wrapper.appendChild(titleElement);

        const canvasElement = document.createElement('canvas');
        canvasElement.id = canvasId;
        canvasElement.style.maxHeight = '400px';
        wrapper.appendChild(canvasElement);
        container.appendChild(wrapper);

        console.log(`차트 ${i + 1} 데이터:`, chart);

        try {
            // ★★★ 기존 차트 데이터 구조 처리 ★★★
            if (chart.labels && chart.values && chart.labels.length > 0 && chart.values.length > 0) {
                if (typeof createAreaChart === 'function') {
                    createAreaChart(canvasId, chart.labels, chart.values, chart.title);
                    console.log(`Area 차트 생성 완료: ${chart.title}`);
                } else {
                    throw new Error('createAreaChart 함수를 찾을 수 없습니다.');
                }
            }
            else if (chart.datasets && typeof createMultiLineChart === 'function') {
                createMultiLineChart(canvasId, chart.labels, chart.datasets, chart.title);
                console.log(`Multi-line 차트 생성 완료: ${chart.title}`);
            }
            else {
                throw new Error('차트 데이터가 없거나 형식이 올바르지 않습니다.');
            }
        } catch (error) {
            console.error(`차트 ${i + 1} 생성 실패:`, error, chart);
            const fallbackElement = document.createElement('div');
            fallbackElement.className = 'alert alert-warning text-center';
            fallbackElement.innerHTML = `
                <strong>${chart.title || `차트 ${i + 1}`}</strong><br>
                <small>차트 생성 실패: ${error.message}</small><br>
                <small class="text-muted">데이터 구조를 확인해주세요.</small>
            `;
            wrapper.appendChild(fallbackElement);
        }
    });
}

// 키보드 단축키 지원
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        const form = document.getElementById('reportGenerationForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});