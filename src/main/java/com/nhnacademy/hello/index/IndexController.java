package com.nhnacademy.hello.index; // 패키지 이름 확인

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping(value = {"/", "/index.html"})
    public String index(Model model) {
        model.addAttribute("activeMenu", "dashboard"); // 루트는 대시보드 활성화
        return "index/index";
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model) { // ✨ Model 추가 및 addAttribute 추가! ✨
        model.addAttribute("activeMenu", "dashboard"); // 대시보드 활성화
        return "dashboard";
    }

    @GetMapping("/company")
    public String companyPage(Model model) { // ✨ Model 추가 및 addAttribute 추가! ✨
        model.addAttribute("activeMenu", "company"); // 회사소개 활성화
        return "company";
    }

    @GetMapping("/product")
    public String productPage(Model model) { // ✨ Model 추가 및 addAttribute 추가! ✨
        model.addAttribute("activeMenu", "product"); // 제품소개 활성화
        return "product";
    }

}
