package com.nhnacademy.frontend.dashboard;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/api/v1/environment")
public class DashboardController {

    @GetMapping({"/dashboard", "/"})
    public String adminDashboard() {
        return "admin/dashboard";
    }

    @GetMapping("/charts")
    public String charts() {
        return "admin/charts";
    }

    @GetMapping("/tables")
    public String tables() {
        return "admin/tables";
    }
}
