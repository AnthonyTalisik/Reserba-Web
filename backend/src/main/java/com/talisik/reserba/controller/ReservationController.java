package com.talisik.reserba.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.talisik.reserba.model.CheckResult;
import com.talisik.reserba.model.Requests;
import com.talisik.reserba.model.Reservation;
import com.talisik.reserba.model.User;
import com.talisik.reserba.service.ReserbaService;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
    private final ReserbaService service;

    public ReservationController(ReserbaService service) {
        this.service = service;
    }

    /** Live conflict check for the request form: free or not, next free start, suggested rooms. */
    @PostMapping("/check")
    public CheckResult check(@RequestAttribute("user") User user, @RequestBody Requests.ReservationBody body) {
        return service.check(user, body);
    }

    @PostMapping
    public ResponseEntity<Reservation> create(@RequestAttribute("user") User user,
                                              @RequestBody Requests.ReservationBody body) {
        return ResponseEntity.status(201).body(service.create(user, body));
    }

    @GetMapping("/mine")
    public List<Reservation> mine(@RequestAttribute("user") User user) {
        return service.mine(user);
    }

    @GetMapping("/{id}")
    public Reservation one(@RequestAttribute("user") User user, @PathVariable("id") String id) {
        return service.getFor(user, id);
    }

    @PostMapping("/{id}/cancel")
    public Reservation cancel(@RequestAttribute("user") User user, @PathVariable("id") String id) {
        return service.cancel(id, user, null);
    }
}
