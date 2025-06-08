package com.nhnacademy.frontend.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Controller
@RequestMapping("/auth/oauth2")
public class OAuth2Controller {

    private static final Logger log = LoggerFactory.getLogger(OAuth2Controller.class);
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/success")
    public String oauth2Success(@AuthenticationPrincipal OAuth2User principal, HttpServletResponse response) {
        String email = principal.getAttribute("email");
        String name = principal.getAttribute("name");
        log.info(email + " " + name);

        // 1. auth-api 에 로그인 or 회원가입 요청 (JWT 발급)
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = Map.of("email", email, "name", name);

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> result = restTemplate.postForEntity("http://auth-api.internal/oauth/login", request, Map.class);

        // 2. JWT 받아서 JS에 넘기기
        String jwt = (String) result.getBody().get("accessToken");
        Cookie cookie = new Cookie("Authorization", jwt);
        cookie.setPath("/");
        response.addCookie(cookie);

        return "redirect:/environment/dashboard-main";
    }
}
