package com.talisik.reserba.model;

import java.util.List;

/** Everything the admin review screen needs in one call. */
public record ReviewView(Reservation reservation, Room room, boolean checkOk, String checkText,
                         List<Reservation> overlappingPending) { }
