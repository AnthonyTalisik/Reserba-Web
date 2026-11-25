package com.talisik.reserba.model;

import java.util.List;

/** JSON bodies the API accepts. */
public final class Requests {
    private Requests() { }

    public record Register(String firstName, String middleName, String lastName, String idNumber,
                           String organization, String email, String password, String role) { }

    public record Login(String email, String password) { }

    public record ReservationBody(String roomId, String date, String startTime, String endTime,
                                  Integer attendees, String purpose, String organization,
                                  List<String> equipment) { }

    public record Remarks(String remarks) { }

    public record Reason(String reason) { }

    public record NewRoom(String name, String building, String type, Integer capacity) { }

    public record Active(boolean active) { }

    public record NewBlock(String date, String reason) { }
}
