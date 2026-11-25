package com.talisik.reserba.model;

import java.util.List;

public class Room {
    public String roomId;
    public String name;
    public String building;
    public String floor = "";
    public String type;          // CLASSROOM | MEETING | ACTIVITY
    public int capacity;
    public List<String> equipment;
    public String openTime = "07:00";
    public String closeTime = "21:00";
    public int bufferMinutes = 20;
    public boolean isActive = true;
    public String description = "";
}
