package com.nhnacademy.frontend.test;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SimpleGreetingController {
    @GetMapping("/api/greet")
    public String greet() {
        return "Hello from javame-frontend!";
    }
}
