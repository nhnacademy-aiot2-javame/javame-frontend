package com.nhnacademy.frontend.environment;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/environment")
public class EnvironmentController {

    @GetMapping("/data")
    public String environmentPage() {
        return "environment/data";
    }

    @GetMapping("/sensor-data")
    public String sensorDataPage() {
        return "environment/sensor-data";
    }

    @GetMapping({"", "/"})
    public String defaultPage() {
        return "environment/environment";
    }
}