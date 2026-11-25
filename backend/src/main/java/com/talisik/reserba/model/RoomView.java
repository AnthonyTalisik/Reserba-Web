package com.talisik.reserba.model;

import java.util.List;

/** A room plus its "Free now / In use until ..." badge, flat so the frontend can use it as is. */
public record RoomView(String roomId, String name, String building, String floor, String type, int capacity,
                       List<String> equipment, String openTime, String closeTime, int bufferMinutes,
                       boolean isActive, String description, String availabilityLabel, boolean free) {
    public static RoomView of(Room r, String label, boolean free) {
        return new RoomView(r.roomId, r.name, r.building, r.floor, r.type, r.capacity, r.equipment,
                r.openTime, r.closeTime, r.bufferMinutes, r.isActive, r.description, label, free);
    }
}
