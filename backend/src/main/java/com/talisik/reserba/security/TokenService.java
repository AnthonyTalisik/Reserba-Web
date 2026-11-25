package com.talisik.reserba.security;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Login tokens kept in memory (a restart logs everyone out). Later this can be swapped for
 * Firebase Auth ID tokens without touching the controllers.
 */
@Component
public class TokenService {
    private static final long LIFETIME_MS = 8L * 60 * 60 * 1000; // 8 hours

    private record Session(String uid, long expiresAt) { }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String issue(String uid) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sessions.put(token, new Session(uid, System.currentTimeMillis() + LIFETIME_MS));
        return token;
    }

    /** Returns the user id for a valid token, or null. */
    public String resolve(String token) {
        if (token == null) return null;
        Session s = sessions.get(token);
        if (s == null) return null;
        if (s.expiresAt() < System.currentTimeMillis()) {
            sessions.remove(token);
            return null;
        }
        return s.uid();
    }

    public void revoke(String token) {
        if (token != null) sessions.remove(token);
    }
}
