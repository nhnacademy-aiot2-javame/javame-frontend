function valueConverter() {
    const api = {};

    api.roleConverter = function (role) {
        if(role === 'ROLE_PENDING'){
            return '대기자';
        }
        if(role === 'ROLE_USER') {
            return '회원';
        }
        if(role === 'ROLE_OWNER') {
            return '관리자';
        }
        if(role === 'ROLE_ADMIN'){
            return '운영자';
        }
        return '권한 없음';
    }

    api.timeConverterHMS = function (time) {
        if(!time){
            return '';
        }

        const fixed = time.replace(/(\.\d{3})\d+/, "$1");
        const date = new Date(fixed);

        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ` +
                `${date.getHours()}시 ${date.getMinutes()}분 ${date.getSeconds()}초`;
    }

    api.timeConverterHM = function (time) {
        if(!time){
            return '';
        }

        const fixed = time.replace(/(\.\d{3})\d+/, "$1");
        const date = new Date(fixed);

        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ` +
            `${date.getHours()}시 ${date.getMinutes()}분`;
    }

    return api;

}