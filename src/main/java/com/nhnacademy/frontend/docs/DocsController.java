package com.nhnacademy.frontend.docs;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/docs")
public class DocsController {

    @GetMapping("/privacy-policy")
    public  String privacyPolicy(){
        return "docs/privacy-policy";
    }

    @GetMapping("/terms-of-service")
    public String termsofServicePage() {
        return "docs/terms-of-service";
    }

    @GetMapping("/service-guide")
    public String serviceGuidePage() {
        return "docs/service-guide";
    }
}
