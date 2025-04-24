
import { isLoggedIn, logout} from "./auth";

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.querySelector("#loginForm");

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();


        })
    }
})