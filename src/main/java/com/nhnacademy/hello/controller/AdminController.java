package com.nhnacademy.hello.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin")
public class AdminController {

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
