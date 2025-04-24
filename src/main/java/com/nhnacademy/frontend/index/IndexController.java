package com.nhnacademy.frontend.index; // 패키지 이름 확인

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping(value = {"/", "index.html"})
    public String index() {
        return "index/index";
    }
}
