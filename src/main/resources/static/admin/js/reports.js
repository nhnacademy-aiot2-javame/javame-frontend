// reports.js - 테이블 변환 및 UI 개선
import {
    createAreaChart,
    createBarChart,
    createPieChart
} from './chartUtils.js';

const API_BASE_URL = 'https://javame.live/api/v1/environment/reports';

// ★★★ 전역 변수 ★★★
let currentChartInstances = [];

// ★★★ 전역 변수 ★★★
let currentChartInstances = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('리포트 페이지 로드 완료');
    initializeReportPage();
});

function initializeReportPage() {
    const form = document.getElementById('reportGenerationForm');
    if (form) {
        form.addEventListener('submit', handleReportGeneration);
    }

    // 키보드 단축키 지원 (Ctrl + Enter)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            const form = document.getElementById('reportGenerationForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });

    console.log('리포트 페이지 초기화 완료');
}

// ★★★ 리포트 생성 처리 ★★★
async function handleReportGeneration(e) {
    e.preventDefault();

    const userPrompt = document.getElementById('userPromptInput')?.value?.trim();
    const reportType = document.getElementById('reportTypeSelect')?.value || '종합';

    if (!userPrompt) {
        alert('분석하고 싶은 내용을 입력해주세요.');
        return;
    }

    console.log('리포트 생성 요청:', { userPrompt, reportType });

    const requestBody = {
        userPrompt,
        reportType
    };

    toggleLoading(true);
    clearResults();

    try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: `서버 오류: ${response.statusText}`
            }));
            throw new Error(`서버 오류 ${response.status}: ${errorData.message || response.statusText}`);
        }

        const reportData = await response.json();
        console.log('리포트 데이터 수신:', reportData);

        // ★★★ 리포트 결과 표시 ★★★
        displayReportResults(reportData);

    } catch (error) {
        console.error('리포트 생성 실패:', error);
        showError(`리포트 생성 실패: ${error.message}`);
    } finally {
        toggleLoading(false);
    }
}

// ★★★ 리포트 결과 표시 ★★★
function displayReportResults(reportData) {
    const outputArea = document.getElementById('reportOutputArea');
    if (outputArea) {
        outputArea.style.display = 'block';
    }

    displayReportTitle(reportData.reportOverallTitle || reportData.summaryText?.split('\n')[0] || 'AI 분석 리포트');
    displayAISummary(reportData.summaryText);
    displayCharts(reportData.chartVisualizations);
    displayReportInfo(reportData);

    console.log('리포트 결과 표시 완료');
}

// ★★★ 리포트 제목 표시 ★★★
function displayReportTitle(title) {
    const titleElement = document.getElementById('reportGeneratedTitle');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

// ★★★ AI 요약 표시 (테이블 스타일 적용) ★★★
function displayAISummary(summaryText) {
    const summaryElement = document.getElementById('reportSummary');
    if (!summaryElement) return;

    if (!summaryText || summaryText.trim() === '') {
        summaryElement.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                AI 분석 요약이 제공되지 않았습니다.
            </div>
        `;
        return;
    }

    // 마크다운을 HTML로 변환
    const htmlContent = convertMarkdownToHtml(summaryText);

    // ★★★ 깔끔한 UI/UX 적용 ★★★
    summaryElement.innerHTML = `
        <div class="ai-analysis-panel p-4 rounded" style="background-color: #f8f9fa;">
            <div class="d-flex align-items-center mb-3">
                <i class="fas fa-robot text-primary fs-4 me-2"></i>
                <span class="fw-bold fs-5">AI 분석 결과</span>
            </div>
            <div class="summary-content lh-lg">
                ${htmlContent}
            </div>
        </div>
    `;

    // ★★★ 생성된 테이블에 Bootstrap 클래스 추가 ★★★
    const tables = summaryElement.querySelectorAll('table');
    tables.forEach(table => {
        table.classList.add('table', 'table-bordered', 'table-hover', 'mt-3');
        table.style.width = '100%';
        table.style.backgroundColor = '#ffffff';
    });
}

// ★★★ 차트 표시 (ChartDataDto 구조 처리) ★★★
function displayCharts(chartVisualizations) {
    const container = document.getElementById('reportChartsContainer');
    if (!container) {
        console.error('차트 컨테이너를 찾을 수 없습니다.');
        return;
    }

    console.log('차트 데이터 처리 시작:', chartVisualizations);

    destroyExistingCharts();

    if (!chartVisualizations || chartVisualizations.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-chart-line me-2"></i>
                <strong>차트 데이터 없음</strong><br>
                <small>분석할 데이터가 충분하지 않거나 해당 기간에 데이터가 없습니다. 다른 측정값이나 기간으로 시도해보세요.</small>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    chartVisualizations.forEach((chartData, index) => {
        try {
            console.log(`차트 ${index + 1} 생성 시도:`, chartData);
            createSingleChart(chartData, index, container);
        } catch (error) {
            console.error(`차트 ${index + 1} 생성 실패:`, error);
            createErrorChart(chartData, index, container, error.message);
        }
    });

    console.log(`총 ${chartVisualizations.length}개 차트 처리 완료`);
}

// ★★★ 개별 차트 생성 (ChartDataDto 구조 처리) ★★★
function createSingleChart(chartData, index, container) {
    const canvasId = `reportChart-${index}`;

    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-wrapper mb-4 p-4 border rounded shadow-sm';
    chartWrapper.style.backgroundColor = '#ffffff';

    const titleElement = document.createElement('h5');
    titleElement.className = 'text-center mb-3 text-primary fw-bold';
    titleElement.textContent = chartData.title || `차트 ${index + 1}`;
    chartWrapper.appendChild(titleElement);

    const canvasContainer = document.createElement('div');
    canvasContainer.style.position = 'relative';
    canvasContainer.style.height = '400px';

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.maxHeight = '100%';
    canvasContainer.appendChild(canvas);
    chartWrapper.appendChild(canvasContainer);
    container.appendChild(chartWrapper);

    const labels = chartData.labels || [];
    const values = chartData.data || chartData.values || [];

    if (!labels || labels.length === 0) throw new Error('라벨 데이터가 없습니다');
    if (!values || values.length === 0) throw new Error('값 데이터가 없습니다');
    if (labels.length !== values.length) {
        const minLength = Math.min(labels.length, values.length);
        labels.splice(minLength);
        values.splice(minLength);
    }

    const chartType = determineChartType(chartData.title, labels, values);
    let chartInstance = null;

    switch (chartType) {
        case 'bar':
            chartInstance = createBarChart(canvasId, labels, values, chartData.title);
            console.log(`✅ Bar 차트 생성: ${chartData.title}`);
            break;

        case 'pie':
            chartInstance = createPieChart(canvasId, labels, values, chartData.title);
            console.log(`✅ Pie 차트 생성: ${chartData.title}`);
            break;

        case 'area':
        default:
            chartInstance = createAreaChart(canvasId, labels, values, chartData.title);
            console.log(`✅ Area 차트 생성: ${chartData.title}`);
            break;
    }

    if (chartInstance) {
        currentChartInstances.push(chartInstance);
    }
}

// ★★★ 차트 타입 결정 로직 ★★★
function determineChartType(title, labels, values) {
    if (!title) return 'area';

    const titleLower = title.toLowerCase();

    if (titleLower.includes('집계') || titleLower.includes('통계') ||
        titleLower.includes('요약') || titleLower.includes('비교')) {
        return 'bar';
    }

    if (titleLower.includes('분포') || titleLower.includes('비율') ||
        titleLower.includes('점유율') || (labels.length <= 10 && values.every(v => v > 0))) {
        return 'pie';
    }

    return 'area';
}

// ★★★ 에러 차트 생성 ★★★
function createErrorChart(chartData, index, container, errorMessage) {
    const errorWrapper = document.createElement('div');
    errorWrapper.className = 'chart-wrapper mb-4 p-4 border rounded';
    errorWrapper.style.backgroundColor = '#fff5f5';
    errorWrapper.style.borderColor = '#fed7d7';

    errorWrapper.innerHTML = `
        <h5 class="text-center mb-3 text-danger">
            ${chartData.title || `차트 ${index + 1}`}
        </h5>
        <div class="alert alert-danger text-center">
            <i class="fas fa-exclamation-triangle mb-2"></i><br>
            <strong>차트 생성 실패</strong><br>
            <small>${errorMessage}</small>
            <details class="mt-3">
                <summary class="btn btn-sm btn-outline-danger">디버그 정보</summary>
                <pre class="mt-2 text-start small">${JSON.stringify(chartData, null, 2)}</pre>
            </details>
        </div>
    `;

    container.appendChild(errorWrapper);
}

// ★★★ 기존 차트 인스턴스 정리 ★★★
function destroyExistingCharts() {
    currentChartInstances.forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            try {
                chart.destroy();
            } catch (error) {
                console.warn('차트 제거 실패:', error);
            }
        }
    });
    currentChartInstances = [];
}

// ★★★ 리포트 정보 표시 ★★★
function displayReportInfo(reportData) {
    const infoElement = document.getElementById('reportInfo');
    if (!infoElement) return;

    let infoHtml = '<div class="report-info mt-4 p-3 bg-light rounded">';
    infoHtml += '<h6 class="mb-3"><i class="fas fa-info-circle me-2"></i>리포트 정보</h6>';

    if (reportData.reportPeriodStart && reportData.reportPeriodEnd) {
        infoHtml += `<p class="mb-2"><strong>분석 기간:</strong> ${reportData.reportPeriodStart} ~ ${reportData.reportPeriodEnd}</p>`;
    }
    if (reportData.filterCriteriaSummary) {
        infoHtml += `<p class="mb-2"><strong>분석 조건:</strong> ${reportData.filterCriteriaSummary}</p>`;
    }
    if (reportData.generatedAt) {
        const generatedTime = new Date(reportData.generatedAt).toLocaleString('ko-KR');
        infoHtml += `<p class="mb-2"><strong>생성 시간:</strong> ${generatedTime}</p>`;
    }
    const chartCount = reportData.chartVisualizations?.length || 0;
    infoHtml += `<p class="mb-0"><strong>생성된 차트:</strong> ${chartCount}개</p>`;

    infoHtml += '</div>';
    infoElement.innerHTML = infoHtml;
}

// ★★★ 유틸리티 함수들 ★★★
function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

function clearResults() {
    const outputArea = document.getElementById('reportOutputArea');
    if (outputArea) {
        outputArea.style.display = 'none';
    }

    const elementsToReset = [
        'reportGeneratedTitle',
        'reportSummary',
        'reportChartsContainer',
        'reportInfo'
    ];

    elementsToReset.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '';
        }
    });

    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }

    destroyExistingCharts();
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    console.error('리포트 에러:', message);
}

// ★★★ 마크다운을 HTML로 변환 (라이브러리 사용) ★★★
function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    return marked.parse(markdown);
}

// ★★★ 디버깅 함수들 ★★★
window.debugReportCharts = function() {
    // ... 기존 디버깅 함수 ...
};

window.clearAllCharts = function() {
    // ... 기존 차트 정리 함수 ...
};

window.addEventListener('beforeunload', () => {
    destroyExistingCharts();
});

console.log('reports.js 로드 완료');
