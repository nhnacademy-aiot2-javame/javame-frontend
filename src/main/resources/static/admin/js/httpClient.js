const httpClient = function () {
    'use strict'

    const api = {};

    api.getFetch = async function (url) {
        let result = await fetch(url, createOption('GET', null, 'accessToken'));
        console.log(result);

        if(!result.ok){
            result = await fetch(url, createOption('GET', null, 'refreshToken'));
            if(!result.ok){
                throw new Error("데이터를 불러올수 없습니다.");
            }
            return await result.json();
        }

        return await result.json();
    }

    const createOption = function (method, data, token){
        const storageToken = sessionStorage.getItem(`${token}`);
        console.log(storageToken);
        const option =
            {
                method : method,
                headers :
                {
                    'Content-Type' : 'application/json',
                    'Accept' : 'application/json',
                    'Authorization': `Bearer ${storageToken}`
                }
            };
        if (method !== 'GET' && data) {
            option.body = JSON.stringify(data);
        }

        return option;
    }

    return api;
}