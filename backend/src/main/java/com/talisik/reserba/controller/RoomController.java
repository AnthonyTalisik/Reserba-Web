package com.talisik.reserba.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.talisik.reserba.model.RoomView;
import com.talisik.reserba.model.Slot;
import com.talisik.reserba.service.ReserbaService;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private final ReserbaService service;

    public RoomController(ReserbaService service) {
        this.service = service;
    }

    @GetMapping
    public List<RoomView> list() {
        return service.rooms();
    }

    @GetMapping("/{roomId}")
    public RoomView one(@PathVariable("roomId") String roomId) {
        return service.roomView(roomId);
    }

    /** Hourly timeline for one date: GET /api/rooms/r301/slots?date=2026-12-01 */
    @GetMapping("/{roomId}/slots")
    public List<Slot> slots(@PathVariable("roomId") String roomId, @RequestParam("date") String date) {
        return service.slots(roomId, date);
    }
}
