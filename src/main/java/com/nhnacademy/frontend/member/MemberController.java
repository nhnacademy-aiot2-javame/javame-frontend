package com.nhnacademy.frontend.member;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/members")
public class MemberController {

    @GetMapping("/member-list")
    public String memberList() {
        return "member/member-list";
    }

    @GetMapping("/member-detail")
    public String memberDetail() {
        return "member/member-detail";
    }
}
