// dashboardMain.js
import {
    getServiceCount,
    getSensorCount,
    getServerCount,
    getOutboundTraffic,
} from './iotSensorApi.js';

import {
    createGaugeChart,
    updateGaugeChart
} from './chartUtils.js';

import {
    fetchWithAuth
} from '/index/js/auth.js';

// 차트 인스턴스 관리 객체
const chartInstances = {};

// 동적 companyDomain
let COMPANY_DOMAIN = null;

// ★★★ 개선된 WebSocket 관리 객체 ★★★
class DashboardWebSocket {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.subscriptions = new Map();
        this.isConnected = false;
        this.companyDomain = null;
        this.lastDataReceived = new Map();
        this.refreshTimer = null;

        // ★★★ 데이터 수집 완료 후 일괄 업데이트를 위한 속성들 ★★★
        this.dataCollectionBuffer = new Map();
        this.dataCollectionTimer = null;

        // ★★★ 실제 필요한 모든 측정값 (4개) ★★★
        this.requiredMetrics = ['usage_user', 'used_percent', 'used_percent', 'temp_input']; // CPU, 메모리, 디스크, 온도
        this.requiredDataKeys = [
            'usage_user:cpu',      // CPU 사용률
            'used_percent:mem',    // 메모리 사용량
            'used_percent:disk',   // 디스크 사용량
            'temp_input:sensors'   // 서버 온도
        ];

        this.collectionTimeout = 20000; // 20초로 증가 (모든 데이터 수집 대기)
        this.isInitialLoad = true;
        this.hasReceivedAnyData = false;

        // ★★★ 안정적인 데이터 저장소 ★★★
        this.stableDataStore = new Map(); // 지속적으로 유지되는 데이터
        this.isInitialDataCollected = false; // 초기 데이터 수집 완료 여부

        // ★★★ 동적 서버 관리 ★★★
        this.selectedServer = 'all';
        this.serverList = []; // 빈 배열로 시작
        this.connectionStatus = {
            server: 'unknown',
            sensor: 'unknown',
            service: 'unknown'
        };
    }

    connect() {
        try {
            const token = sessionStorage.getItem('accessToken');
            if (!token) {
                console.error('JWT 토큰을 찾을 수 없습니다.');
                return;
            }

            // ★★★ 로딩 상태 표시 ★★★
            this.showLoadingState();

            this.socket = new WebSocket(`ws://localhost:10279/api/v1/ws/environment?token=${token}`);

            this.socket.onopen = () => {
                console.log('Dashboard WebSocket 연결 성공');
                this.isConnected = true;
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('WebSocket 메시지 파싱 오류:', error);
                }
            };

            this.socket.onclose = (event) => {
                console.log('Dashboard WebSocket 연결 종료:', event.code);
                this.isConnected = false;
                this.stopRefreshTimer();
                this.attemptReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('Dashboard WebSocket 오류:', error);
                this.isConnected = false;
                this.stopRefreshTimer();
            };

        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('WebSocket 재연결 시도 횟수 초과.');
        }
    }

    handleMessage(data) {
        console.log('WebSocket 메시지 수신:', data.type, data);

        switch (data.type) {
            case 'connection':
                this.handleConnectionMessage(data);
                break;
            case 'subscribe':
                console.log('구독 성공:', data.measurement, data.gatewayId);
                break;
            case 'realtime':
                this.handleRealtimeData(data);
                break;
            default:
                console.log('알 수 없는 메시지 타입:', data.type);
        }
    }

    handleConnectionMessage(data) {
        // .com 제거 로직
        let cleanDomain = data.companyDomain;
        if (cleanDomain && cleanDomain.endsWith('.com')) {
            cleanDomain = cleanDomain.substring(0, cleanDomain.length - 4);
        }

        this.companyDomain = cleanDomain;
        COMPANY_DOMAIN = cleanDomain;

        // UI 표시용은 .com 포함
        const serverTitle = `${cleanDomain}.com`;
        console.log(`WebSocket 연결 확인 - 회사: ${this.companyDomain} (UI: ${serverTitle})`);

        const mainTitle = document.getElementById('totalDomain');
        if (mainTitle) {
            mainTitle.textContent = serverTitle;
        }

        // ★★★ 서버 목록 로드 ★★★
        setTimeout(() => {
            this.loadServerList();
        }, 500);

        // 서비스/센서 카운트 업데이트
        setTimeout(() => {
            updateServiceAndSensorCount();
        }, 1500);

        // 구독 시작
        setTimeout(() => {
            this.startSubscriptions();
            this.startRefreshTimer(5000, 10000);
        }, 1000);
    }

// ★★★ 서버 목록 동적 로드 (간단한 오토 인크리먼트) ★★★
    async loadServerList() {
        try {
            console.log('서버 목록 API 호출 시작...');

            const url = '/rule/servers/cp/companyDomain';
            const serverResponse = await fetchWithAuth(url);
            const serverData = await serverResponse.json();

            console.log('서버 API 응답:', serverData);

            // 서버 목록 업데이트
            this.serverList = [
                {
                    id: 'all',
                    name: '전체 서버',
                    status: 'online',
                    ip: null,
                    serverNo: null,
                    autoIndex: null,
                    description: '모든 서버의 종합 상태'
                }
            ];

            // ★★★ 단순히 배열 순서대로 1, 2, 3... 할당 ★★★
            serverData.forEach((server, index) => {
                const autoIndex = index + 1; // 1부터 시작하는 오토 인크리먼트

                this.serverList.push({
                    id: `server-${autoIndex}`,
                    name: `서버 ${autoIndex}`,
                    status: 'online',
                    ip: server.iphost,
                    serverNo: server.serverNo, // 실제 DB 서버번호 (참조용)
                    autoIndex: autoIndex, // 단순 오토 인크리먼트 (1, 2, 3...)
                    companyDomain: server.companyDomain,
                    createdAt: server.createdAt,
                    description: `서버 ${autoIndex} (${server.iphost})`
                });
            });

            console.log('서버 목록 로드 완료 (단순 오토 인크리먼트):', this.serverList);
            this.renderServerTabs();

        } catch (error) {
            console.error('서버 목록 API 호출 실패:', error);

            // ★★★ 폴백: getServerCount API 사용 ★★★
            try {
                const serverCount = await getServerCount();
                console.log('폴백: getServerCount 사용, 서버 개수:', serverCount);

                this.serverList = [
                    {
                        id: 'all',
                        name: '전체 서버',
                        status: 'online',
                        ip: null,
                        serverNo: null,
                        description: '모든 서버의 종합 상태'
                    }
                ];

                // 서버 개수만큼 기본 서버 생성
                for (let i = 1; i <= serverCount; i++) {
                    this.serverList.push({
                        id: `server-${i}`,
                        name: `서버 ${i}`,
                        status: 'online',
                        ip: `192.168.1.${100 + i - 1}`,
                        serverNo: i,
                        description: `서버 ${i} (기본 설정)`
                    });
                }

                this.renderServerTabs();

            } catch (fallbackError) {
                console.error('폴백 API도 실패:', fallbackError);

                // ★★★ 최종 폴백: 기본 서버 설정 ★★★
                this.serverList = [
                    {
                        id: 'all',
                        name: '전체 서버',
                        status: 'online',
                        ip: null,
                        serverNo: null,
                        description: '모든 서버의 종합 상태'
                    },
                    {
                        id: 'server-1',
                        name: '서버 1',
                        status: 'online',
                        ip: '192.168.1.100',
                        serverNo: 1,
                        description: '메인 서버 (기본 설정)'
                    }
                ];

                this.renderServerTabs();
            }
        }
    }

    // ★★★ 서버 탭 동적 렌더링 (실제 IP 표시) ★★★
    renderServerTabs() {
        const tabsContainer = document.getElementById('serverTabs');
        const contentContainer = document.getElementById('serverTabContent');

        if (!tabsContainer || !contentContainer) return;

        // 기존 탭 제거
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        // 서버 탭 생성
        this.serverList.forEach((server, index) => {
            // 탭 버튼 생성
            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.setAttribute('role', 'presentation');

            const isActive = index === 0 ? 'active' : '';
            const statusClass = this.getStatusClass(server.status);
            const iconClass = server.id === 'all' ? 'fas fa-globe' : 'fas fa-server';

            tabItem.innerHTML = `
                <button class="nav-link ${isActive}" 
                        id="${server.id}-tab" 
                        data-bs-toggle="tab" 
                        data-bs-target="#${server.id}" 
                        type="button" 
                        role="tab" 
                        data-server-id="${server.id}"
                        data-server-no="${server.serverNo || ''}">
                    <i class="${iconClass} me-2"></i>
                    ${server.name}
                    <span class="server-status-indicator ${statusClass}"></span>
                    ${server.id === 'all' ? `<span class="badge bg-primary server-info-badge" id="allServerCount">${this.serverList.length - 1}</span>` : ''}
                </button>
            `;

            // 탭 컨텐츠 생성
            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
            tabContent.id = server.id;
            tabContent.setAttribute('role', 'tabpanel');

            if (server.id === 'all') {
                tabContent.innerHTML = `
                    <div class="row">
                        <div class="col-md-4">
                            <small class="text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                ${server.description}
                            </small>
                        </div>
                        <div class="col-md-8 text-end">
                            <span class="badge bg-success me-2">
                                <i class="fas fa-check-circle me-1"></i>정상 운영중
                            </span>
                            <small class="text-muted">총 서버: <span class="fw-bold">${this.serverList.length - 1}</span>대</small>
                        </div>
                    </div>
                `;
            } else {
                const statusBadge = this.getStatusBadge(server.status);
                const createdDate = server.createdAt ? new Date(server.createdAt).toLocaleDateString('ko-KR') : '--';

                tabContent.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <small class="text-muted">
                                <i class="fas fa-server me-1"></i>
                                ${server.description}
                            </small>
                            ${server.createdAt ? `<br><small class="text-muted">생성일: ${createdDate}</small>` : ''}
                        </div>
                        <div class="col-md-6 text-end">
                            ${statusBadge}
                            <br><small class="text-muted">IP: <span class="fw-bold">${server.ip || 'Unknown'}</span></small>
                        </div>
                    </div>
                `;
            }

            tabsContainer.appendChild(tabItem);
            contentContainer.appendChild(tabContent);
        });

        // 탭 이벤트 리스너 추가
        this.attachTabEventListeners();

        console.log('서버 탭 렌더링 완료:', this.serverList.length, '개 서버');
    }

    // ★★★ 탭 이벤트 리스너 ★★★
    attachTabEventListeners() {
        const serverTabs = document.querySelectorAll('#serverTabs button[data-bs-toggle="tab"]');

        serverTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const serverId = event.target.getAttribute('data-server-id');
                const selectedServerInfo = document.getElementById('selectedServerInfo');

                const server = this.serverList.find(s => s.id === serverId);
                if (server) {
                    selectedServerInfo.textContent = server.name;
                    selectedServerInfo.className = serverId === 'all' ? 'badge bg-primary me-2' : 'badge bg-success me-2';

                    this.handleServerSelection(serverId);
                    console.log('서버 탭 변경:', serverId, server.name);
                }
            });
        });
    }

    // ★★★ 서버 선택 처리 개선 (서버 번호 포함) ★★★
    handleServerSelection(serverId) {
        this.selectedServer = serverId;

        const selectedServer = this.serverList.find(s => s.id === serverId);
        console.log(`서버 선택 변경: ${serverId}`, selectedServer);

        if (serverId === 'all') {
            // 전체 서버 데이터 표시
            console.log('전체 서버 모드: 모든 데이터 종합 표시');
            this.forceRefreshAllGauges();
        } else {
            // 특정 서버 데이터만 표시
            console.log(`${serverId} 개별 데이터 표시 (서버번호: ${selectedServer?.serverNo})`);
            this.refreshChartsForSelectedServer(serverId, selectedServer);
        }
    }

    refreshChartsForSelectedServer(serverId, serverInfo) {
        // 선택된 서버에 따라 차트 데이터 필터링 및 갱신
        console.log(`${serverId} 데이터로 차트 갱신 시작`);
        console.log('서버 정보:', serverInfo);

        // 현재는 모든 서버가 같은 데이터를 사용하므로 기존 로직 사용
        this.forceRefreshAllGauges();

        // ★★★ 향후 서버별 데이터 필터링 로직 ★★★
        // if (serverInfo && serverInfo.serverNo) {
        //     // 특정 서버 번호의 데이터만 필터링
        //     this.loadServerSpecificData(serverInfo.serverNo);
        // }
    }

    // ★★★ 향후 확장: 특정 서버 데이터 로드 ★★★
    async loadServerSpecificData(serverNo) {
        try {
            console.log(`서버 ${serverNo}의 개별 데이터 로드 시작...`);

            // servers.js의 클릭 이벤트와 동일한 API 사용
            const url = `/rule/server-datas/by-server-no/${serverNo}`;
            const serverResponse = await fetchWithAuth(url);
            const serverDataList = await serverResponse.json();

            console.log(`서버 ${serverNo} 데이터:`, serverDataList);

            // 서버별 데이터로 차트 업데이트 로직 구현
            // TODO: 서버별 측정값 데이터를 차트에 반영

        } catch (error) {
            console.error(`서버 ${serverNo} 데이터 로드 실패:`, error);
        }
    }

    // ★★★ 상태 클래스 반환 ★★★
    getStatusClass(status) {
        switch (status) {
            case 'online': return 'online';
            case 'offline': return 'offline';
            case 'warning': return 'warning';
            default: return 'offline';
        }
    }

    // ★★★ 상태 배지 반환 ★★★
    getStatusBadge(status) {
        switch (status) {
            case 'online':
                return '<span class="badge bg-success me-2"><i class="fas fa-check-circle me-1"></i>온라인</span>';
            case 'offline':
                return '<span class="badge bg-danger me-2"><i class="fas fa-times-circle me-1"></i>오프라인</span>';
            case 'warning':
                return '<span class="badge bg-warning me-2"><i class="fas fa-exclamation-triangle me-1"></i>경고</span>';
            default:
                return '<span class="badge bg-secondary me-2"><i class="fas fa-question-circle me-1"></i>알 수 없음</span>';
        }
    }

    // ★★★ 연결 상태 업데이트 ★★★
    updateConnectionStatus(type, status) {
        this.connectionStatus[type] = status;
        this.renderConnectionStatus();
    }

    renderConnectionStatus() {
        const statusElements = {
            server: document.getElementById('serverConnectionStatus'),
            sensor: document.getElementById('sensorConnectionStatus'),
            service: document.getElementById('serviceConnectionStatus')
        };

        Object.entries(this.connectionStatus).forEach(([type, status]) => {
            const element = statusElements[type];
            if (!element) return;

            let badgeClass, text, icon;

            switch (status) {
                case 'connected':
                    badgeClass = 'bg-success-status';
                    text = '연결 정상';
                    icon = 'fa-check-circle';
                    break;
                case 'warning':
                    badgeClass = 'bg-warning-status';
                    text = '일부 문제';
                    icon = 'fa-exclamation-triangle';
                    break;
                case 'error':
                    badgeClass = 'bg-danger-status';
                    text = '연결 실패';
                    icon = 'fa-times-circle';
                    break;
                default:
                    badgeClass = 'bg-secondary-status';
                    text = '확인중...';
                    icon = 'fa-circle';
            }

            element.className = `badge ${badgeClass}`;
            element.innerHTML = `<i class="fas ${icon} me-1"></i>${text}`;
        });
    }

    // ★★★ 개선된 실시간 데이터 처리 ★★★
    handleRealtimeData(data) {
        const { measurement, gatewayId } = data;
        this.hasReceivedAnyData = true;

        let value = null;
        let hasValidData = false;

        if (data.data && data.data.length > 0) {
            const latestData = data.data[data.data.length - 1];
            value = latestData.value;
            hasValidData = true;
        }

        const dataKey = `${measurement}:${gatewayId}`;

        // ★★★ 임시 버퍼에 수집 (초기 로딩용) ★★★
        this.dataCollectionBuffer.set(dataKey, {
            measurement,
            gatewayId,
            value,
            hasValidData,
            timestamp: Date.now()
        });

        // ★★★ 안정적인 데이터 저장소에도 저장 (지속적 유지) ★★★
        if (hasValidData) {
            this.stableDataStore.set(dataKey, {
                measurement,
                gatewayId,
                value,
                hasValidData,
                timestamp: Date.now()
            });
            console.log(`💾 안정 데이터 저장: ${measurement} = ${value}`);
        }

        console.log(`📥 데이터 수집: ${measurement} = ${hasValidData ? value : '없음'} (버퍼: ${this.dataCollectionBuffer.size}/${this.requiredDataKeys.length})`);

        // ★★★ 초기 로딩 완료 후에는 개별 업데이트 ★★★
        if (this.isInitialDataCollected) {
            this.updateSingleChart(dataKey, hasValidData ? value : null, hasValidData);
        } else {
            // 초기 로딩 중에는 모든 데이터 수집 완료 확인
            this.checkAndUpdateCharts();
        }
    }

    // ★★★ 개별 차트 업데이트 (초기 로딩 완료 후 사용) ★★★
    updateSingleChart(dataKey, value, hasValidData) {
        const metricConfig = this.findMetricConfigByDataKey(dataKey);
        if (!metricConfig) return;

        let gaugeDisplayValue, textDisplay;

        if (hasValidData && typeof value === 'number' && !isNaN(value)) {
            const converted = this.convertValueForGauge(value, metricConfig.gauge.unit);
            gaugeDisplayValue = converted.gaugeDisplayValue;
            textDisplay = converted.textDisplay;

            // lastDataReceived 업데이트
            this.lastDataReceived.set(dataKey, {
                gaugeDisplayValue,
                textDisplay,
                hasValidData: true
            });

            console.log(`🔄 개별 차트 업데이트: ${metricConfig.gauge.title} = ${textDisplay}`);
            this.updateGaugeWithAnimation(metricConfig.gauge, gaugeDisplayValue, textDisplay);
        }
        // ★★★ 데이터가 없어도 기존 값 유지 (업데이트하지 않음) ★★★
    }

    // ★★★ 데이터 키로 메트릭 설정 찾기 ★★★
    findMetricConfigByDataKey(dataKey) {
        const [measurement, gatewayId] = dataKey.split(':');

        for (const config of Object.values(DASHBOARD_CONFIG)) {
            if (config.gauge &&
                config.gauge.apiParams.measurement === measurement &&
                config.gauge.apiParams.gatewayId === gatewayId) {
                return config;
            }
        }
        return null;
    }

    // ★★★ 로딩 상태만 표시 (차트 생성하지 않음) ★★★
    showLoadingState() {
        console.log('🔄 로딩 상태 표시: 차트 생성 대기 중...');

        // ★★★ 차트 생성하지 않고 로딩 메시지만 표시 ★★★
        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const canvas = document.getElementById(metricConfig.gauge.canvasId);
                if (canvas) {
                    const parent = canvas.parentElement;
                    if (parent) {
                        // 로딩 오버레이 생성
                        if (!parent.querySelector('.chart-loading-overlay')) {
                            parent.style.position = 'relative';
                            parent.innerHTML += `
                                <div class="chart-loading-overlay" style="
                                    position: absolute; 
                                    top: 0; left: 0; right: 0; bottom: 0; 
                                    background: rgba(248, 249, 252, 0.9); 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    z-index: 1000;
                                    border-radius: 0.75rem;
                                ">
                                    <div class="text-center">
                                        <div class="spinner-border text-primary mb-2"></div>
                                        <div class="small text-muted">데이터 수집 중...</div>
                                    </div>
                                </div>
                            `;
                        }
                    }
                }
            }
        });
    }

    // ★★★ 로딩 상태 해제 ★★★
    hideLoadingState() {
        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const canvas = document.getElementById(metricConfig.gauge.canvasId);
                if (canvas) {
                    const parent = canvas.parentElement;
                    if (parent) {
                        const overlay = parent.querySelector('.chart-loading-overlay');
                        if (overlay) {
                            overlay.remove();
                        }
                    }
                }
            }
        });
        console.log('✅ 로딩 상태 해제 완료');
    }

    checkAndUpdateCharts() {
        // ★★★ 초기 로딩이 이미 완료되었으면 개별 업데이트만 ★★★
        if (this.isInitialDataCollected) {
            return;
        }

        // ★★★ 정확한 데이터 키로 확인 ★★★
        const collectedDataKeys = Array.from(this.dataCollectionBuffer.keys());

        const hasAllRequiredData = this.requiredDataKeys.every(requiredKey =>
            collectedDataKeys.includes(requiredKey)
        );

        console.log(`📊 초기 데이터 수집 상태: ${collectedDataKeys.length}/${this.requiredDataKeys.length}`);
        console.log(`필수 데이터 키: [${this.requiredDataKeys.join(', ')}]`);
        console.log(`수집된 데이터 키: [${collectedDataKeys.join(', ')}]`);

        if (hasAllRequiredData) {
            console.log('🎯 모든 필수 데이터 수집 완료! 차트 일괄 생성 시작');
            this.initialBatchUpdateAllCharts();
            this.clearCollectionTimer();
            this.isInitialDataCollected = true;
        } else {
            // ★★★ 아직 모든 데이터가 수집되지 않았으면 계속 대기 ★★★
            this.startCollectionTimer();
        }
    }

    startCollectionTimer() {
        // ★★★ 기존 타이머가 있으면 취소하고 새로 시작 ★★★
        if (this.dataCollectionTimer) {
            clearTimeout(this.dataCollectionTimer);
            this.dataCollectionTimer = null;
            console.log('🔄 기존 데이터 수집 타이머 취소 후 재시작');
        }

        console.log(`⏰ 초기 데이터 수집 타이머 시작: ${this.collectionTimeout/1000}초 후 강제 생성`);

        this.dataCollectionTimer = setTimeout(() => {
            console.log('⏰ 초기 데이터 수집 타임아웃!');

            const collectedDataKeys = Array.from(this.dataCollectionBuffer.keys());
            const missingDataKeys = this.requiredDataKeys.filter(key => !collectedDataKeys.includes(key));

            if (missingDataKeys.length > 0) {
                console.warn(`❌ 타임아웃 시점에 누락된 데이터: [${missingDataKeys.join(', ')}]`);
                console.warn('❌ 모든 필수 데이터가 수집되지 않아 차트를 생성하지 않습니다.');
                this.showNoDataState();
            } else {
                console.log('✅ 타임아웃 전에 모든 데이터 수집 완료');
                this.initialBatchUpdateAllCharts();
                this.isInitialDataCollected = true;
            }

            this.clearCollectionTimer();
        }, this.collectionTimeout);
    }

    clearCollectionTimer() {
        if (this.dataCollectionTimer) {
            clearTimeout(this.dataCollectionTimer);
            this.dataCollectionTimer = null;
        }
    }

    // ★★★ 초기 일괄 차트 생성 (모든 데이터가 있을 때만 실행) ★★★
    initialBatchUpdateAllCharts() {
        console.log('🔄 초기 차트 일괄 생성 시작...');

        // ★★★ 로딩 상태 해제 ★★★
        this.hideLoadingState();

        let successCount = 0;
        let noDataCount = 0;

        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const { measurement, gatewayId } = metricConfig.gauge.apiParams;
                const dataKey = `${measurement}:${gatewayId}`;

                // 안정적인 데이터 저장소에서 데이터 조회
                const stableData = this.stableDataStore.get(dataKey);
                const bufferData = this.dataCollectionBuffer.get(dataKey);

                // 안정 데이터 우선, 없으면 버퍼 데이터 사용
                const collectedData = stableData || bufferData;

                let gaugeDisplayValue, textDisplay, hasValidData;

                if (collectedData && collectedData.hasValidData) {
                    const converted = this.convertValueForGauge(collectedData.value, metricConfig.gauge.unit);
                    gaugeDisplayValue = converted.gaugeDisplayValue;
                    textDisplay = converted.textDisplay;
                    hasValidData = true;
                    successCount++;

                    console.log(`✅ 초기 유효 데이터: ${metricConfig.gauge.title} = ${textDisplay}`);
                } else {
                    // ★★★ 데이터가 없는 경우 차트를 생성하지 않음 ★★★
                    console.error(`❌ 필수 데이터 누락: ${metricConfig.gauge.title} (${dataKey})`);
                    noDataCount++;
                    return; // 차트 생성하지 않고 건너뛰기
                }

                // lastDataReceived 업데이트
                this.lastDataReceived.set(dataKey, {
                    gaugeDisplayValue,
                    textDisplay,
                    hasValidData
                });

                // ★★★ 유효한 데이터가 있을 때만 차트 생성 ★★★
                this.updateGaugeWithAnimation(metricConfig.gauge, gaugeDisplayValue, textDisplay);
            }
        });

        console.log(`✅ 초기 차트 생성 완료 - 유효데이터: ${successCount}개, 누락데이터: ${noDataCount}개`);

        if (noDataCount > 0) {
            console.warn(`⚠️ ${noDataCount}개의 차트가 데이터 부족으로 생성되지 않았습니다.`);
        }

        if (this.isInitialLoad) {
            this.isInitialLoad = false;
            console.log('🎉 초기 로딩 완료!');
        }

        // 버퍼만 초기화 (안정 데이터는 유지)
        this.dataCollectionBuffer.clear();
    }

    // ★★★ 데이터가 전혀 없을 때 상태 ★★★
    showNoDataState() {
        this.hideLoadingState();

        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const canvas = document.getElementById(metricConfig.gauge.canvasId);
                if (canvas) {
                    const parent = canvas.parentElement;
                    if (parent) {
                        parent.innerHTML = `
                            <div class="d-flex align-items-center justify-content-center h-100 text-center">
                                <div>
                                    <i class="fas fa-exclamation-triangle text-warning mb-2" style="font-size: 2rem;"></i>
                                    <div class="text-muted">연결 실패</div>
                                    <small class="text-muted">데이터를 가져올 수 없습니다</small>
                                </div>
                            </div>
                        `;
                    }
                }
            }
        });
        console.log('❌ 연결 실패 상태 표시');
    }

    subscribe(measurement, gatewayId) {
        const subscriptionKey = `${measurement}:${gatewayId}`;
        this.subscriptions.set(subscriptionKey, { measurement, gatewayId });

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket이 연결되지 않았습니다. 구독 요청을 대기열에 추가합니다.');
            return;
        }

        const subscribeMessage = {
            action: 'subscribe',
            measurement: measurement,
            gatewayId: gatewayId,
            interval: 10
        };

        this.socket.send(JSON.stringify(subscribeMessage));
        console.log(`구독 요청: ${measurement} (${gatewayId}) - 10초 간격`);
    }

    startSubscriptions() {
        console.log(`${this.companyDomain} 회사의 모든 지표 구독 시작...`);
        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const { measurement, gatewayId } = metricConfig.gauge.apiParams;
                this.subscribe(measurement, gatewayId);
            }
        });
    }

    startRefreshTimer(firstDelay = 5000, intervalDelay = 10000) {
        this.stopRefreshTimer();

        setTimeout(() => {
            console.log(`🚀 첫 번째 새로고침: ${firstDelay / 1000}초 후 모든 게이지 강제 업데이트`);
            this.forceRefreshAllGauges();

            this.refreshTimer = setInterval(() => {
                console.log(`🔄 정기 새로고침: ${intervalDelay / 1000}초 타이머 - 모든 게이지 강제 업데이트`);
                this.forceRefreshAllGauges();
            }, intervalDelay);

            console.log(`✅ 정기 ${intervalDelay / 1000}초 강제 새로고침 타이머 시작`);

        }, firstDelay);

        console.log(`⏰ 첫 강제 새로고침 ${firstDelay / 1000}초 타이머 시작`);
    }

    forceRefreshAllGauges() {
        console.log('🔄 강제 새로고침 시작 - 안정 데이터로 모든 게이지 재평가');

        let successCount = 0;
        let failCount = 0;

        Object.values(DASHBOARD_CONFIG).forEach(metricConfig => {
            if (metricConfig.gauge) {
                const { measurement, gatewayId } = metricConfig.gauge.apiParams;
                const dataKey = `${measurement}:${gatewayId}`;

                // ★★★ 안정 데이터 우선 사용 ★★★
                const stableData = this.stableDataStore.get(dataKey);
                const lastData = this.lastDataReceived.get(dataKey);

                try {
                    if (stableData && stableData.hasValidData) {
                        const converted = this.convertValueForGauge(stableData.value, metricConfig.gauge.unit);
                        console.log(`🔄 강제 업데이트 (안정 데이터): ${metricConfig.gauge.title} = ${converted.textDisplay}`);
                        this.updateGaugeWithAnimation(metricConfig.gauge, converted.gaugeDisplayValue, converted.textDisplay);

                        // lastDataReceived도 업데이트
                        this.lastDataReceived.set(dataKey, {
                            gaugeDisplayValue: converted.gaugeDisplayValue,
                            textDisplay: converted.textDisplay,
                            hasValidData: true
                        });
                        successCount++;
                    } else if (lastData) {
                        console.log(`🔄 강제 업데이트 (마지막 데이터): ${metricConfig.gauge.title} = ${lastData.textDisplay}`);
                        this.updateGaugeWithAnimation(metricConfig.gauge, lastData.gaugeDisplayValue, lastData.textDisplay);
                        successCount++;
                    } else {
                        console.log(`🔄 강제 업데이트: ${metricConfig.gauge.title} = 데이터없음 (강제)`);
                        this.updateGaugeWithAnimation(metricConfig.gauge, 0, '데이터없음');
                        successCount++;
                    }
                } catch (error) {
                    console.error(`❌ 강제 업데이트 실패: ${metricConfig.gauge.title}`, error);
                    failCount++;
                }
            }
        });

        console.log(`✅ 강제 새로고침 완료 - 성공: ${successCount}개, 실패: ${failCount}개`);
    }

    stopRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('❌ 10초 새로고침 타이머 중지');
        }
    }

    updateGaugeWithAnimation(gaugeConfig, gaugeDisplayValue, textDisplay) {
        const canvasId = gaugeConfig.canvasId;

        try {
            if (chartInstances[canvasId]) {
                // 기존 차트 업데이트
                updateGaugeChart(chartInstances[canvasId], gaugeDisplayValue, textDisplay, true);
                console.log(`🔄 차트 업데이트: ${gaugeConfig.title} = ${textDisplay}`);
            } else {
                // 새 차트 생성
                chartInstances[canvasId] = createGaugeChart(
                    canvasId,
                    gaugeDisplayValue,
                    textDisplay,
                    gaugeConfig.title
                );
                console.log(`🆕 차트 생성: ${gaugeConfig.title} = ${textDisplay}`);
            }
        } catch (error) {
            console.error(`❌ 차트 업데이트 실패: ${gaugeConfig.title}`, error);
        }
    }

    findMetricKey(measurement, gatewayId) {
        for (const [key, config] of Object.entries(DASHBOARD_CONFIG)) {
            if (config.gauge &&
                config.gauge.apiParams.measurement === measurement &&
                config.gauge.apiParams.gatewayId === gatewayId) {
                return key;
            }
        }
        return null;
    }

    convertValueForGauge(value, unit) {
        let gaugeDisplayValue = 0;
        let textDisplay = `데이터없음`;

        if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
            if (unit === '%') {
                gaugeDisplayValue = Math.max(0, Math.min(100, value));
                textDisplay = `${value.toFixed(1)}%`;
            } else if (unit === '°C') {
                gaugeDisplayValue = Math.max(0, Math.min(100, value));
                textDisplay = `${value.toFixed(1)}°C`;
            } else {
                gaugeDisplayValue = Math.max(0, Math.min(100, value));
                textDisplay = `${value.toFixed(1)}${unit || ''}`;
            }
        } else {
            gaugeDisplayValue = 0;
            textDisplay = '데이터없음';
        }

        return { gaugeDisplayValue, textDisplay };
    }

    disconnect() {
        this.stopRefreshTimer();
        this.clearCollectionTimer();

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.isConnected = false;
        console.log('WebSocket 연결 해제');
    }

    // ★★★ 디버깅 함수 개선 ★★★
    debugDataState() {
        console.log('=== 데이터 상태 디버깅 ===');
        console.log('초기 로딩 완료:', this.isInitialDataCollected);
        console.log('안정 데이터 저장소:', Array.from(this.stableDataStore.entries()));
        console.log('데이터 수집 버퍼:', Array.from(this.dataCollectionBuffer.entries()));
        console.log('마지막 수신 데이터:', Array.from(this.lastDataReceived.entries()));
        console.log('서버 목록:', this.serverList);
        console.log('선택된 서버:', this.selectedServer);
        console.log('연결 상태:', this.connectionStatus);

        // ★★★ 서버별 상세 정보 ★★★
        this.serverList.forEach(server => {
            if (server.id !== 'all') {
                console.log(`서버 ${server.name}:`, {
                    serverNo: server.serverNo,
                    ip: server.ip,
                    status: server.status,
                    companyDomain: server.companyDomain
                });
            }
        });
    }
}

// ★★★ 전역 WebSocket 인스턴스 ★★★
const dashboardWS = new DashboardWebSocket();

// ★★★ 개선된 DASHBOARD_CONFIG (역률 제거) ★★★
const DASHBOARD_CONFIG = {
    cpu: {
        gauge: {
            canvasId: 'gauge1',
            title: 'CPU 사용률',
            apiParams: {
                origin: 'server_data',
                location: 'server_resource_data',
                gatewayId: 'cpu',
                measurement: 'usage_user'
            },
            unit: '%'
        },
    },
    memory: {
        gauge: {
            canvasId: 'gauge2',
            title: '메모리 사용량',
            apiParams: {
                origin: 'server_data',
                location: 'server_resource_data',
                gatewayId: 'mem',
                measurement: 'used_percent'
            },
            unit: '%'
        },
    },
    disk: {
        gauge: {
            canvasId: 'gauge3',
            title: '디스크 사용량',
            apiParams: {
                origin: 'server_data',
                location: 'server_resource_data',
                gatewayId: 'disk',
                measurement: 'used_percent'
            },
            unit: '%'
        },
    },
    temperature: {
        gauge: {
            canvasId: 'gauge4',
            title: '서버 온도',
            apiParams: {
                origin: 'server_data',
                location: 'server_resource_data',
                gatewayId: 'sensors',
                measurement: 'temp_input'
            },
            unit: '°C'
        },
    },
    watchAlarm: {
        apiUrl: '/warnify/list/companyDomain?page=1&size=100',
        updateInterval: 60000
    }
};

// ★★★ 유틸리티 함수들 ★★★
function checkAuthStatus() {
    if (window.location.pathname.includes('/auth/login')) {
        return false;
    }

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        console.warn('인증 토큰이 없습니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/auth/login';
        return false;
    }
    return true;
}

async function loadWatchAlarmData() {
    try {
        const result = await fetchWithAuth(DASHBOARD_CONFIG.watchAlarm.apiUrl);
        const json = await result.json();

        const statusCounts = json.content.reduce((acc, item) => {
            const status = item.resolve || '데이터부족';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        updateWatchAlarmCard({
            resolved: statusCounts['해결'] || 0,
            unresolved: statusCounts['미해결'] || 0,
            noData: statusCounts['데이터부족'] || 0
        });

        console.log('Watch Alarm 데이터 업데이트 완료:', statusCounts);

    } catch (error) {
        console.error('Watch Alarm 데이터 로드 실패:', error);

        updateWatchAlarmCard({
            resolved: 0,
            unresolved: 0,
            noData: 1
        });
    }
}

function updateWatchAlarmCard(counts) {
    const elements = {
        resolved: document.getElementById('alarm안정Count'),
        unresolved: document.getElementById('alarm발생Count'),
        noData: document.getElementById('alarm데이터부족Count')
    };

    if (elements.resolved) {
        elements.resolved.textContent = counts.resolved;
        elements.resolved.classList.toggle('text-success', counts.resolved > 0);
    }

    if (elements.unresolved) {
        elements.unresolved.textContent = counts.unresolved;
        elements.unresolved.classList.toggle('text-danger', counts.unresolved > 0);
    }

    if (elements.noData) {
        elements.noData.textContent = counts.noData;
        elements.noData.classList.toggle('text-warning', counts.noData > 0);
    }
}

// ★★★ 연결 상태 모니터링 개선 ★★★
async function updateServiceAndSensorCount() {
    try {
        console.log('서비스/센서/서버/트래픽 개수 업데이트 시작...');

        const [serviceCount, sensorCount, serverCount, trafficData] = await Promise.all([
            getServiceCount(),
            getSensorCount(),
            getServerCount(),
            getOutboundTraffic()
        ]);

        // ★★★ 연결 상태 업데이트 ★★★
        dashboardWS.updateConnectionStatus('service', serviceCount > 0 ? 'connected' : 'error');
        dashboardWS.updateConnectionStatus('sensor', sensorCount > 0 ? 'connected' : 'error');
        dashboardWS.updateConnectionStatus('server', serverCount > 0 ? 'connected' : 'error');

        const serviceElement = document.getElementById('totalServicesCount');
        const sensorElement = document.getElementById('totalSensorsCount');
        const serverElement = document.getElementById('totalServersCount');
        const trafficElement = document.getElementById('outboundTrafficValue');

        if (serviceElement) {
            serviceElement.textContent = serviceCount;
            console.log('✅ 서비스 개수 업데이트: ' + serviceCount);
        }

        if (sensorElement) {
            sensorElement.textContent = sensorCount;
            console.log('✅ 센서 개수 업데이트: ' + sensorCount);
        }

        if (serverElement) {
            serverElement.textContent = serverCount;
            console.log('✅ 서버 개수 업데이트: ' + serverCount);
        }

        if (trafficElement) {
            trafficElement.textContent = trafficData.formattedValue || '0.0 MB';
            console.log('✅ 아웃바운드 트래픽 업데이트: ' + trafficData.formattedValue);
        }

    } catch (error) {
        console.error('서비스/센서/서버/트래픽 개수 업데이트 실패:', error);

        // ★★★ 에러 시 연결 상태를 에러로 설정 ★★★
        dashboardWS.updateConnectionStatus('service', 'error');
        dashboardWS.updateConnectionStatus('sensor', 'error');
        dashboardWS.updateConnectionStatus('server', 'error');
    }
}

// ★★★ 전역 함수들 ★★★
function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('lastUpdateTime');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleTimeString('ko-KR');
    }
}

// ★★★ 이벤트 리스너 및 초기화 ★★★
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard 페이지 로드 완료.");

    if (!checkAuthStatus()) {
        return;
    }

    console.log("인증 확인 완료. WebSocket 실시간 모니터링 시작...");

    loadWatchAlarmData();

    setInterval(() => {
        loadWatchAlarmData();
    }, DASHBOARD_CONFIG.watchAlarm.updateInterval);

    // 10초마다 업데이트 시간 갱신
    setInterval(updateLastUpdateTime, 10000);
    updateLastUpdateTime();

    dashboardWS.connect();
});

window.addEventListener('beforeunload', () => {
    dashboardWS.disconnect();
});

// ★★★ 전역 함수로 노출 ★★★
window.dashboardWS = dashboardWS;

// ★★★ 디버깅 함수들 ★★★
window.refreshDashboard = function() {
    console.log('대시보드 수동 새로고침...');
    dashboardWS.disconnect();
    setTimeout(() => {
        dashboardWS.connect();
    }, 1000);
};

window.debugDashboard = function() {
    console.log('=== Dashboard 디버깅 정보 ===');
    console.log('WebSocket 연결 상태:', dashboardWS.isConnected);
    console.log('Company Domain:', COMPANY_DOMAIN);
    console.log('구독 목록:', Array.from(dashboardWS.subscriptions.entries()));
    console.log('마지막 수신 데이터:', Array.from(dashboardWS.lastDataReceived.entries()));
    console.log('데이터 수집 버퍼:', Array.from(dashboardWS.dataCollectionBuffer.entries()));
    console.log('차트 인스턴스:', Object.keys(chartInstances));
    console.log('새로고침 타이머 상태:', dashboardWS.refreshTimer ? '활성' : '비활성');
};

window.debugDataState = function() {
    dashboardWS.debugDataState();
};

window.testBatchUpdate = function() {
    console.log('🔄 일괄 업데이트 테스트 시작...');
    dashboardWS.initialBatchUpdateAllCharts();
};

// ★★★ dashboardIntegration.js와의 호환성을 위한 함수들 ★★★
window.clearMeasurementSelection = function() {
    console.log('측정값 선택 초기화 (메인 대시보드에서는 사용하지 않음)');
};

window.debugPeriodComparison = function() {
    console.log('Period-over-period 비교 디버깅 (메인 대시보드에서는 사용하지 않음)');
};
