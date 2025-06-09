// /admin/js/serverStateManager.js
class ServerStateManager {
    constructor() {
        this.selectedServer = 'all';
        this.serverList = [];
        this.listeners = new Map();
        this.storageKey = 'iot_selected_server';

        // 페이지 로드 시 저장된 서버 상태 복원
        this.loadFromStorage();
    }

    // ★★★ 서버 선택 상태 설정 ★★★
    setSelectedServer(serverId, serverInfo = null) {
        const previousServer = this.selectedServer;
        this.selectedServer = serverId;

        // 로컬 스토리지에 저장
        this.saveToStorage();

        console.log(`🔄 서버 선택 변경: ${previousServer} → ${serverId}`);

        // 모든 리스너에게 변경 알림
        this.notifyListeners(serverId, serverInfo, previousServer);
    }

    // ★★★ 현재 선택된 서버 반환 ★★★
    getSelectedServer() {
        return this.selectedServer;
    }

    // ★★★ 서버 목록 설정 ★★★
    setServerList(serverList) {
        this.serverList = serverList;
        this.saveToStorage();
    }

    getServerList() {
        return this.serverList;
    }

    // ★★★ 서버 변경 리스너 등록 ★★★
    addListener(listenerId, callback) {
        this.listeners.set(listenerId, callback);
        console.log(`📡 서버 상태 리스너 등록: ${listenerId}`);
    }

    removeListener(listenerId) {
        this.listeners.delete(listenerId);
        console.log(`📡 서버 상태 리스너 제거: ${listenerId}`);
    }

    // ★★★ 모든 리스너에게 알림 ★★★
    notifyListeners(serverId, serverInfo, previousServer) {
        this.listeners.forEach((callback, listenerId) => {
            try {
                callback({
                    serverId,
                    serverInfo,
                    previousServer,
                    timestamp: Date.now()
                });
                console.log(`✅ 리스너 알림 성공: ${listenerId}`);
            } catch (error) {
                console.error(`❌ 리스너 알림 실패: ${listenerId}`, error);
            }
        });
    }

    // ★★★ 로컬 스토리지 저장/로드 ★★★
    saveToStorage() {
        try {
            const state = {
                selectedServer: this.selectedServer,
                serverList: this.serverList,
                timestamp: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            console.error('서버 상태 저장 실패:', error);
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const state = JSON.parse(stored);
                this.selectedServer = state.selectedServer || 'all';
                this.serverList = state.serverList || [];
                console.log('💾 저장된 서버 상태 복원:', this.selectedServer);
            }
        } catch (error) {
            console.error('서버 상태 로드 실패:', error);
        }
    }

    // ★★★ 서버 필터 조건 생성 ★★★
    getServerFilter() {
        if (this.selectedServer === 'all') {
            return null; // 전체 서버
        }

        const serverInfo = this.serverList.find(s => s.id === this.selectedServer);
        if (serverInfo && serverInfo.serverNo) {
            return {
                serverNo: serverInfo.serverNo,
                serverId: this.selectedServer,
                serverName: serverInfo.name,
                ip: serverInfo.ip
            };
        }

        return null;
    }

    // ★★★ 디버깅 정보 ★★★
    getDebugInfo() {
        return {
            selectedServer: this.selectedServer,
            serverList: this.serverList,
            listeners: Array.from(this.listeners.keys()),
            filter: this.getServerFilter()
        };
    }
}

// ★★★ 전역 인스턴스 생성 ★★★
const serverStateManager = new ServerStateManager();

// ★★★ 전역 함수로 노출 ★★★
window.serverStateManager = serverStateManager;

export default serverStateManager;
