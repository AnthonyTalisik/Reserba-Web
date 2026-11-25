package com.talisik.reserba.model;

/** A blocked date/time for a room (maintenance, events). */
public class Block {
    public String blockId;
    public String roomId;
    public String date;
    public String startTime;
    public String endTime;
    public String reason;
    public String createdBy;
}
