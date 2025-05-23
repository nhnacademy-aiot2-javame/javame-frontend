package com.nhnacademy.frontend.dashboard;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/environment")
public class DashboardController {

    @GetMapping({"/dashboard"})
    public String adminDashboard() {
        return "dashboard/dashboard";
    }

    @GetMapping("/charts")
    public String charts() {
        return "dashboard/charts";
    }

    @GetMapping("/tables")
    public String tables() {
        return "dashboard/tables";
    }

    @GetMapping("/reports")
    public String reports() {
        return "dashboard/reports";
    }


}
