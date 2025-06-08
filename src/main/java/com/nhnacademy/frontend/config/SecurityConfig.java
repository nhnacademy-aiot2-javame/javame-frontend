package com.nhnacademy.frontend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf().disable()
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**", "/css/**", "/js/**", "/images/**").permitAll()
                        .anyRequest().permitAll() // 인증 안 걸고, 점진적 도입
                )
                .oauth2Login(oauth -> oauth
                        .loginPage("/auth/login")
                        .defaultSuccessUrl("/auth/oauth2/success", true) // 성공 시 redirect
                );
        return http.build();
    }
}
