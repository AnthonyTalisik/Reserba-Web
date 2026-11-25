package com.talisik.reserba.model;

import java.util.List;

/** Answer of the live conflict check used by the request form. */
public record CheckResult(boolean ok, String message, String nextFreeStart, List<RoomView> suggestions) { }
