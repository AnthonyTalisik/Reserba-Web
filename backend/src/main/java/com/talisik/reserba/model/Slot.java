package com.talisik.reserba.model;

/** One hour of a room's day timeline. status: AVAILABLE | PENDING | TAKEN | BLOCKED. */
public record Slot(String startTime, String endTime, String status, String detail) { }
