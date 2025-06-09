import {
    fetchWithAuth
} from '../../index/js/auth.js'

document.addEventListener('DOMContentLoaded', function (){
    const alarmIcon = document.querySelector('#alarmDropDown');
    alarmIcon.addEventListener('click', function (){
        const url = '/warnify/list/compnayDomain?size=5&page=1';
        const warnify = fetchWithAuth(url);
        console.log(warnify);
    });
});