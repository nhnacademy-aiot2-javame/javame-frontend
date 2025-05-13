package com.nhnacademy.frontend.member;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/members")
public class MemberController {

    @GetMapping("/member-list")
    public String memberList() {
        return "admin/member-list";
    }

    // 오너는 본인 회사 회원 리스트 페이지로 이동
    @GetMapping("/member-list-owner")
    public String memberListOwner() {
        return "owner/member-list";  // templates/owner/member-list.html
    }

    // 회원 설정은 공통
    @GetMapping("/settings")
    public String settingsPage() {
        return "common/settings";  // templates/common/settings.html
    }

    @GetMapping("/mypage")
    public String myPage() {
        return "common/my-page";  // templates/common/my-page.html
    }

    @GetMapping("/permission")
    public String permissionPage() {
        return "owner/permission";
    }
}
