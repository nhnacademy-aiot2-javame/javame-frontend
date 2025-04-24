package com.nhnacademy.frontend.dashboard;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("api/v1/environment")
public class DashboardController {

    @GetMapping({"dashboard", "/"})
    public String adminDashboard() {
        return "dashboard/dashboard";
    }

    @GetMapping("charts")
    public String charts() {
        return "dashboard/charts";
    }

    @GetMapping("tables")
    public String tables() {
        return "dashboard/tables";
    }
}
