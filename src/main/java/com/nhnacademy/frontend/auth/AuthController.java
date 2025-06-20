package com.nhnacademy.frontend.auth;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @GetMapping("/login")
    public String loginPage() {
        return "auth/login";
    }

    @GetMapping("/register")
    public String registerPage(){
        return "auth/register";
    }

    @GetMapping("/purchase")
    public String purchasePage(){
        return "auth/purchase";
    }

    @GetMapping("/findpass")
    public String findPassPage(){
        return "auth/find-password";
    }

    @GetMapping("/callback")
    public String callback(@RequestParam String email, Model model) {
        model.addAttribute("email", email);
        return "auth/callback";
    }
}
