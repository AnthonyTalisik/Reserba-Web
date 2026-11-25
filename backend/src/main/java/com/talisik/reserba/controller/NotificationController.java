package com.talisik.reserba.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.talisik.reserba.model.Notice;
import com.talisik.reserba.model.User;
import com.talisik.reserba.service.ReserbaService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final ReserbaService service;

    public NotificationController(ReserbaService service) {
        this.service = service;
    }

    @GetMapping
    public List<Notice> list(@RequestAttribute("user") User user) {
        return service.notificationsFor(user);
    }

    @PostMapping("/read-all")
    public Map<String, String> readAll(@RequestAttribute("user") User user) {
        service.markAllRead(user);
        return Map.of("message", "ok");
    }

    @PostMapping("/{id}/read")
    public Map<String, String> read(@RequestAttribute("user") User user, @PathVariable("id") String id) {
        service.markRead(user, id);
        return Map.of("message", "ok");
    }
}
