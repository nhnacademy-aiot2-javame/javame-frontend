package com.nhnacademy.frontend.rule;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 *
 */
@Controller
@RequestMapping("/rule")
public class RuleController {

    @GetMapping({"/sensor"})
    public String sensorRegister() {
        return "rule/sensor";
    }

    @GetMapping({"/sensorData"})
    public String sensorDataRegister(){
        return "rule/sensorData";
    }

    @GetMapping({"/server"})
    public String serverRegister() {
        return "rule/server";
    }

    @GetMapping({"/serverData"})
    public String serverDataRegister(){
        return "rule/serverData";
    }
}
