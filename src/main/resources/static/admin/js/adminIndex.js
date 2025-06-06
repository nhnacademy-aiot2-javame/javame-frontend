import {
    fetchWithAuth
} from "../../index/js/auth.js";

window.addEventListener('DOMContentLoaded', async function () {
    const url = "/companies";
    const result = await fetchWithAuth(url);
    const json = await result.json();
    console.log(json);
});