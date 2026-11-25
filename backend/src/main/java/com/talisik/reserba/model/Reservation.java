package com.talisik.reserba.model;

import java.util.List;

public class Reservation {
    public String reservationId;
    public String roomId;
    public String roomName;
    public String requesterId;
    public String requesterName;
    public String organization;
    public String date;       // yyyy-MM-dd
    public String startTime;  // HH:mm
    public String endTime;
    public long startMillis;
    public long endMillis;
    public String purpose;
    public List<String> equipmentNeeded;
    public int attendees;
    public String status;     // PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED
    public String adminRemarks = "";
    public String reviewedBy = "";
    public long createdAt;
    public long updatedAt;
}
