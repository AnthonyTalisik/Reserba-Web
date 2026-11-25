package com.talisik.reserba.security;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.talisik.reserba.ApiException;
import com.talisik.reserba.model.User;
import com.talisik.reserba.service.ReserbaService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Runs before every /api request (see WebConfig for the public ones). Reads "Authorization: Bearer <token>",
 * loads the user into the request attribute "user", and keeps /api/admin/** for administrators only.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final TokenService tokens;
    private final ReserbaService service;

    public AuthInterceptor(TokenService tokens, ReserbaService service) {
        this.tokens = tokens;
        this.service = service;
    }

    public static String bearer(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : null;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true; // CORS preflight

        String uid = tokens.resolve(bearer(request));
        User user = uid == null ? null : service.findUser(uid);
        if (user == null || !"ACTIVE".equals(user.accountStatus)) {
            throw ApiException.unauthorized("Please log in again.");
        }
        if (request.getRequestURI().startsWith("/api/admin/") && !"ADMIN".equals(user.role)) {
            throw ApiException.forbidden("Administrator access only.");
        }
        request.setAttribute("user", user);
        return true;
    }
}
