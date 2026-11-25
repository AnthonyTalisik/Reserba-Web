package com.talisik.reserba.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.talisik.reserba.model.Requests;
import com.talisik.reserba.model.User;
import com.talisik.reserba.model.UserDto;
import com.talisik.reserba.security.AuthInterceptor;
import com.talisik.reserba.security.TokenService;
import com.talisik.reserba.service.ReserbaService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final ReserbaService service;
    private final TokenService tokens;

    public AuthController(ReserbaService service, TokenService tokens) {
        this.service = service;
        this.tokens = tokens;
    }

    /** Creates a PENDING account; an administrator verifies it before the user can log in. */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody Requests.Register body) {
        service.register(body);
        return ResponseEntity.status(201).body(Map.of(
                "message", "Account created. An administrator will verify your ID before you can log in."));
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Requests.Login body) {
        User user = service.login(body.email(), body.password());
        return Map.of("token", tokens.issue(user.uid), "user", UserDto.of(user));
    }

    @GetMapping("/me")
    public UserDto me(@RequestAttribute("user") User user) {
        return UserDto.of(user);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest request) {
        tokens.revoke(AuthInterceptor.bearer(request));
        return Map.of("message", "Logged out.");
    }
}
