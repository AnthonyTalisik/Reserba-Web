package com.talisik.reserba.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.talisik.reserba.model.Block;
import com.talisik.reserba.model.Requests;
import com.talisik.reserba.model.Reservation;
import com.talisik.reserba.model.ReviewView;
import com.talisik.reserba.model.Room;
import com.talisik.reserba.model.User;
import com.talisik.reserba.model.UserDto;
import com.talisik.reserba.service.ReserbaService;

/** Everything under /api/admin is blocked for non-admins by AuthInterceptor. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final ReserbaService service;

    public AdminController(ReserbaService service) {
        this.service = service;
    }

    // ---- reservation requests (FR-06)
    @GetMapping("/reservations")
    public List<Reservation> reservations(@RequestParam(name = "status", required = false) String status,
                                          @RequestParam(name = "roomId", required = false) String roomId,
                                          @RequestParam(name = "date", required = false) String date) {
        return service.adminList(status, roomId, date);
    }

    @GetMapping("/reservations/{id}")
    public ReviewView review(@PathVariable("id") String id) {
        return service.review(id);
    }

    @PostMapping("/reservations/{id}/approve")
    public Reservation approve(@RequestAttribute("user") User admin, @PathVariable("id") String id,
                               @RequestBody(required = false) Requests.Remarks body) {
        return service.approve(id, body == null ? null : body.remarks(), admin);
    }

    @PostMapping("/reservations/{id}/reject")
    public Reservation reject(@RequestAttribute("user") User admin, @PathVariable("id") String id,
                              @RequestBody Requests.Remarks body) {
        return service.reject(id, body.remarks(), admin);
    }

    @PostMapping("/reservations/{id}/cancel")
    public Reservation cancel(@RequestAttribute("user") User admin, @PathVariable("id") String id,
                              @RequestBody Requests.Reason body) {
        return service.cancel(id, admin, body.reason());
    }

    // ---- account verification (FR-11)
    @GetMapping("/accounts/pending")
    public List<UserDto> pendingAccounts() {
        return service.pendingAccounts().stream().map(UserDto::of).toList();
    }

    @PostMapping("/accounts/{uid}/approve")
    public Map<String, String> approveAccount(@RequestAttribute("user") User admin, @PathVariable("uid") String uid) {
        service.approveAccount(uid, admin);
        return Map.of("message", "Account approved.");
    }

    @PostMapping("/accounts/{uid}/reject")
    public Map<String, String> rejectAccount(@RequestAttribute("user") User admin, @PathVariable("uid") String uid,
                                             @RequestBody Requests.Remarks body) {
        service.rejectAccount(uid, body.remarks(), admin);
        return Map.of("message", "Account rejected.");
    }

    // ---- rooms and blocked dates (FR-10)
    @PostMapping("/rooms")
    public ResponseEntity<Room> addRoom(@RequestBody Requests.NewRoom body) {
        return ResponseEntity.status(201).body(service.addRoom(body));
    }

    @PatchMapping("/rooms/{roomId}/active")
    public Room setActive(@PathVariable("roomId") String roomId, @RequestBody Requests.Active body) {
        return service.setRoomActive(roomId, body.active());
    }

    @PostMapping("/rooms/{roomId}/blocks")
    public ResponseEntity<Block> block(@RequestAttribute("user") User admin, @PathVariable("roomId") String roomId,
                                       @RequestBody Requests.NewBlock body) {
        return ResponseEntity.status(201).body(service.blockWholeDay(roomId, body.date(), body.reason(), admin));
    }
}
