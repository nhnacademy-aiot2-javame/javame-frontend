function valueConverter() {
    const api = {};

    api.roleConverter = function (role) {
        if (role === 'ROLE_PENDING') {
            return '대기자';
        }
        if (role === 'ROLE_USER') {
            return '회원';
        }
        if (role === 'ROLE_OWNER') {
            return '관리자';
        }
        if (role === 'ROLE_ADMIN') {
            return '운영자';
        }
        return '권한 없음';
    }

    api.timeConverterHMS = function (time) {
        if (!time) {
            return '';
        }

        const fixed = time.replace(/(\.\d{3})\d+/, "$1");
        const utcDate = new Date(fixed);

        // KST 보정 (UTC + 9시간)
        const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);

        return `${kstDate.getFullYear()}년 ${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일 ` +
            `${kstDate.getHours()}시 ${kstDate.getMinutes()}분 ${kstDate.getSeconds()}초`;
    }

    api.timeConverterHM = function (time) {
        if (!time) {
            return '';
        }

        const fixed = time.replace(/(\.\d{3})\d+/, "$1");
        const utcDate = new Date(fixed);

        // KST 보정 (UTC + 9시간)
        const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);

        return `${kstDate.getFullYear()}년 ${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일 ` +
            `${kstDate.getHours()}시 ${kstDate.getMinutes()}분`;
    }

    return api;
}
