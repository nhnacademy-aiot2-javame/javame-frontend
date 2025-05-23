package com.nhnacademy.frontend.company;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/companies")
public class CompanyController {

    @GetMapping("/company-list")
    public String companyList() {
        return "admin/company-list";
    }

    @GetMapping("/settings")
    public String companyDetail() {
        return "owner/company-settings";
    }
}
