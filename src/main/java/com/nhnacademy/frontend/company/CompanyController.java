package com.nhnacademy.frontend.company;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/api/v1/companies")
public class CompanyController {

    @GetMapping("/company-list")
    public String companyList() {
        return "company/company-list";
    }

    @GetMapping("/company-detail")
    public String companyDetail() {
        return "company/company-detail";
    }
}
