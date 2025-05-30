package com.nhnacademy.frontend.dashboard;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Objects;

@Controller
@RequestMapping("/environment")
public class DashboardController {

    @GetMapping({"/dashboard-main"})
    public String adminDashboard() {
        return "dashboard/dashboard-main";
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


    @GetMapping("/warnify")
    public String warnify(@RequestParam(value = "page", required = false)Long pageNum, Model model) {
        if(Objects.isNull(pageNum)){
            return "redirect:/environment/warnify?page=1";
        }
        model.addAttribute("pageNum", pageNum);
        return "dashboard/warnify";
    }

    @GetMapping("/members")
    public String memberMange(@RequestParam(value = "page", required = false)Long pageNum, Model model) {
        if(Objects.isNull(pageNum)){
            return "redirect:/environment/members?page=1";
        }
        model.addAttribute("pageNum", pageNum);
        return "dashboard/members";
    }

    @GetMapping("/pending")
    public String pendingMember(@RequestParam(value = "page", required = false)Long pageNum, Model model) {
        if(Objects.isNull(pageNum)){
            return "redirect:/environment/pending?page=1";
        }
        model.addAttribute("pageNum", pageNum);
        return "dashboard/pendingmembers";
    }

    @GetMapping("/dashboard-detail")
    public String dashboardDetail(){
        return "dashboard/dashboard-detail";

    }

    @GetMapping("/dashboard-integration")
    public String dashboardIntegration(){
        return "dashboard/dashboard-integration";
    }

    @GetMapping("/dashboard-prediction")
    public String dashboardPrediction() {
        return "dashboard/dashboard-prediction";
    }

    @GetMapping("/test-websocket")
    public String testWebSocket() {
        return "test/test";
    }
}
