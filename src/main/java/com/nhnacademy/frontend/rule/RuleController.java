package com.nhnacademy.frontend.rule;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/rules")
public class RuleController {

    @GetMapping("/sensorRegister")
    public String getSensorRegister() {
        return "rule/sensorRegister";
    }

    @GetMapping("/serverRegister")
    public String getServerRegister() {
        return "rule/serverRegister";
    }

    @GetMapping("/sensorList")
    public String getSensorList() {
        return "rule/sensor";
    }

    @GetMapping("/serverList")
    public String getServerList() {
        return "rule/server";
    }

}
