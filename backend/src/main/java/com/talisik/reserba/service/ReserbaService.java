package com.talisik.reserba.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.talisik.reserba.ApiException;
import com.talisik.reserba.model.Block;
import com.talisik.reserba.model.CheckResult;
import com.talisik.reserba.model.Notice;
import com.talisik.reserba.model.Requests;
import com.talisik.reserba.model.Reservation;
import com.talisik.reserba.model.ReviewView;
import com.talisik.reserba.model.Room;
import com.talisik.reserba.model.RoomView;
import com.talisik.reserba.model.Slot;
import com.talisik.reserba.model.User;
import com.talisik.reserba.security.PasswordHasher;
import com.talisik.reserba.util.TimeUtil;
import static com.talisik.reserba.util.TimeUtil.conflicts;
import static com.talisik.reserba.util.TimeUtil.formatDate;
import static com.talisik.reserba.util.TimeUtil.formatRange;
import static com.talisik.reserba.util.TimeUtil.minutes;
import static com.talisik.reserba.util.TimeUtil.overlaps;
import static com.talisik.reserba.util.TimeUtil.toMillis;

/**
 * All business rules (BR-01 .. BR-15) ported from the React mockStore.js.
 *
 * Data lives in plain lists below. When Firebase arrives, only the list reads/writes in this class
 * need to move to a repository; the rules and the controllers stay the same. Methods are
 * synchronized so two admins approving at once cannot both lock the same slot (BR-01, BR-08).
 */
@Service
public class ReserbaService {
    public static final int MAX_PENDING = 3;            // BR-11
    public static final int MAX_DURATION_HOURS = 4;     // BR-04
    public static final int MIN_ADVANCE_HOURS = 24;     // BR-03
    public static final int MAX_ADVANCE_DAYS = 30;      // BR-03
    private static final long HOUR = 3_600_000L;
    private static final long DAY = 86_400_000L;

    private static final Pattern ID_PATTERN = Pattern.compile("^\\d{3}-\\d{5}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final List<User> users = new ArrayList<>();
    private final List<Room> rooms = new ArrayList<>();
    private final List<Reservation> reservations = new ArrayList<>();
    private final List<Block> blocks = new ArrayList<>();
    private final List<Notice> notices = new ArrayList<>();

    public ReserbaService() {
        seed();
    }

    private static String newId(String prefix) {
        return prefix + UUID.randomUUID().toString().substring(0, 8);
    }

    // ------------------------------------------------------------------ lookups
    public synchronized User findUser(String uid) {
        return users.stream().filter(u -> u.uid.equals(uid)).findFirst().orElse(null);
    }

    private Room room(String id) {
        return rooms.stream().filter(r -> r.roomId.equals(id)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Room not found."));
    }

    private Reservation reservation(String id) {
        return reservations.stream().filter(r -> r.reservationId.equals(id)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Reservation not found."));
    }

    private List<String> adminIds() {
        return users.stream().filter(u -> "ADMIN".equals(u.role)).map(u -> u.uid).toList();
    }

    // ------------------------------------------------------------- notifications (FR-12)
    private void pushNotice(String userId, String title, String message, String reservationId) {
        Notice n = new Notice();
        n.notificationId = newId("n");
        n.userId = userId;
        n.title = title;
        n.message = message;
        n.reservationId = reservationId == null ? "" : reservationId;
        n.createdAt = System.currentTimeMillis();
        notices.add(n);
    }

    public synchronized List<Notice> notificationsFor(User user) {
        return notices.stream().filter(n -> n.userId.equals(user.uid))
                .sorted(Comparator.comparingLong((Notice n) -> n.createdAt).reversed()).toList();
    }

    public synchronized void markRead(User user, String notificationId) {
        notices.stream().filter(n -> n.userId.equals(user.uid) && n.notificationId.equals(notificationId))
                .forEach(n -> n.isRead = true);
    }

    public synchronized void markAllRead(User user) {
        notices.stream().filter(n -> n.userId.equals(user.uid)).forEach(n -> n.isRead = true);
    }

    // ------------------------------------------------------------------- auth (FR-01)
    public synchronized User login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isEmpty()) {
            throw ApiException.badRequest("Enter your email and password.");
        }
        User u = users.stream().filter(x -> x.email.equalsIgnoreCase(email.trim())).findFirst().orElse(null);
        if (u == null) throw ApiException.unauthorized("No account found for that email.");
        if (!PasswordHasher.matches(password, u.passwordHash)) throw ApiException.unauthorized("Incorrect password.");
        if ("PENDING".equals(u.accountStatus)) {
            throw ApiException.forbidden("Your account is still waiting for administrator verification.");
        }
        if ("REJECTED".equals(u.accountStatus)) {
            String why = u.adminRemarks.isBlank() ? "" : " Reason: " + u.adminRemarks + ".";
            throw ApiException.forbidden("Your registration was rejected." + why
                    + " Please register again with corrected information.");
        }
        return u;
    }

    /** BR-12, BR-13, BR-15. The account starts as PENDING until an administrator verifies it. */
    public synchronized User register(Requests.Register req) {
        String first = clean(req.firstName());
        String last = clean(req.lastName());
        String id = clean(req.idNumber());
        String mail = clean(req.email());
        String org = clean(req.organization());
        String role = req.role() == null ? "" : req.role().trim().toUpperCase(Locale.ROOT);

        if (first.isEmpty() || last.isEmpty()) throw ApiException.badRequest("First and last name are required.");
        if ("ADMIN".equals(role)) throw ApiException.forbidden("Administrator accounts cannot be self-registered.");
        if (!role.equals("STUDENT") && !role.equals("FACULTY")) throw ApiException.badRequest("Choose Student or Faculty.");
        if (!ID_PATTERN.matcher(id).matches()) throw ApiException.badRequest("ID number must be in the format 000-00000.");
        if (!EMAIL_PATTERN.matcher(mail).matches()) throw ApiException.badRequest("Enter a valid email address.");
        if (req.password() == null || req.password().length() < 6) {
            throw ApiException.badRequest("Password must be at least 6 characters.");
        }
        if (org.isEmpty()) throw ApiException.badRequest("Choose your organization or department.");

        // A rejected account may register again with corrected information.
        users.removeIf(u -> "REJECTED".equals(u.accountStatus)
                && (u.email.equalsIgnoreCase(mail) || u.idNumber.equals(id)));
        if (users.stream().anyMatch(u -> u.email.equalsIgnoreCase(mail))) {
            throw ApiException.conflict("That email is already registered.");
        }
        if (users.stream().anyMatch(u -> u.idNumber.equals(id))) {
            throw ApiException.conflict("That ID number is already linked to another account.");
        }

        User u = new User();
        u.uid = newId("u");
        u.firstName = first;
        u.middleName = clean(req.middleName());
        u.lastName = last;
        u.email = mail;
        u.passwordHash = PasswordHasher.hash(req.password());
        u.role = role;
        u.idNumber = id;
        u.organization = org;
        u.accountStatus = "PENDING";
        u.createdAt = System.currentTimeMillis();
        users.add(u);
        adminIds().forEach(a -> pushNotice(a, "New account to verify", u.fullName() + " (" + u.idNumber + ") registered.", ""));
        return u;
    }

    private static String clean(String s) {
        return s == null ? "" : s.trim();
    }

    // ---------------------------------------------------- accounts (admin, FR-11)
    public synchronized List<User> pendingAccounts() {
        return users.stream().filter(u -> "PENDING".equals(u.accountStatus)).toList();
    }

    public synchronized void approveAccount(String uid, User admin) {
        User u = pendingUser(uid);
        u.accountStatus = "ACTIVE";
        u.verifiedBy = admin.uid;
    }

    public synchronized void rejectAccount(String uid, String remarks, User admin) {
        if (clean(remarks).isEmpty()) throw ApiException.badRequest("Remarks are required when rejecting an account.");
        User u = pendingUser(uid);
        u.accountStatus = "REJECTED";
        u.adminRemarks = remarks.trim();
        u.verifiedBy = admin.uid;
    }

    private User pendingUser(String uid) {
        User u = findUser(uid);
        if (u == null) throw ApiException.notFound("Account not found.");
        if (!"PENDING".equals(u.accountStatus)) throw ApiException.conflict("This account was already reviewed.");
        return u;
    }

    // ------------------------------------------------ availability and conflicts
    private Reservation approvedConflict(String roomId, long start, long end, String excludeId) {
        Room room = room(roomId);
        return reservations.stream().filter(r -> r.roomId.equals(roomId) && "APPROVED".equals(r.status)
                && !r.reservationId.equals(excludeId)
                && conflicts(start, end, r.startMillis, r.endMillis, room.bufferMinutes)).findFirst().orElse(null);
    }

    private Block blockConflict(String roomId, long start, long end) {
        return blocks.stream().filter(b -> b.roomId.equals(roomId)
                && overlaps(start, end, toMillis(b.date, b.startTime), toMillis(b.date, b.endTime))).findFirst().orElse(null);
    }

    private List<Reservation> overlappingPendingOf(Reservation res) {
        Room room = room(res.roomId);
        return reservations.stream().filter(r -> "PENDING".equals(r.status)
                && !r.reservationId.equals(res.reservationId) && r.roomId.equals(res.roomId)
                && conflicts(res.startMillis, res.endMillis, r.startMillis, r.endMillis, room.bufferMinutes)).toList();
    }

    private RoomView view(Room room) {
        if (!room.isActive) return RoomView.of(room, "Unavailable", false);
        long now = System.currentTimeMillis();
        boolean blocked = blocks.stream().anyMatch(b -> b.roomId.equals(room.roomId)
                && now >= toMillis(b.date, b.startTime) && now <= toMillis(b.date, b.endTime));
        if (blocked) return RoomView.of(room, "Blocked", false);
        Reservation inUse = reservations.stream().filter(r -> r.roomId.equals(room.roomId)
                && "APPROVED".equals(r.status) && now >= r.startMillis && now <= r.endMillis).findFirst().orElse(null);
        if (inUse != null) return RoomView.of(room, "In use until " + TimeUtil.format12(inUse.endTime), false);
        return RoomView.of(room, "Free now", true);
    }

    public synchronized List<RoomView> rooms() {
        refreshStatuses();
        return rooms.stream().map(this::view).toList();
    }

    public synchronized RoomView roomView(String roomId) {
        refreshStatuses();
        return view(room(roomId));
    }

    /** Hourly day timeline for one room. */
    public synchronized List<Slot> slots(String roomId, String date) {
        Room room = room(roomId);
        List<Slot> slots = new ArrayList<>();
        int open = minutes(room.openTime);
        int close = minutes(room.closeTime);
        for (int m = open; m < close; m += 60) {
            String st = TimeUtil.hhmm(m);
            String et = TimeUtil.hhmm(Math.min(m + 60, close));
            long s = toMillis(date, st);
            long e = toMillis(date, et);
            Block block = blocks.stream().filter(b -> b.roomId.equals(roomId)
                    && overlaps(s, e, toMillis(b.date, b.startTime), toMillis(b.date, b.endTime))).findFirst().orElse(null);
            Reservation taken = reservations.stream().filter(r -> r.roomId.equals(roomId)
                    && "APPROVED".equals(r.status) && overlaps(s, e, r.startMillis, r.endMillis)).findFirst().orElse(null);
            Reservation pending = reservations.stream().filter(r -> r.roomId.equals(roomId)
                    && "PENDING".equals(r.status) && overlaps(s, e, r.startMillis, r.endMillis)).findFirst().orElse(null);
            if (block != null) slots.add(new Slot(st, et, "BLOCKED", "Blocked - " + block.reason));
            else if (taken != null) slots.add(new Slot(st, et, "TAKEN", "Taken - " + taken.organization));
            else if (pending != null) slots.add(new Slot(st, et, "PENDING", "Pending - " + pending.organization));
            else slots.add(new Slot(st, et, "AVAILABLE", "Available"));
        }
        return slots;
    }

    /** BR-14: active, free (gap and blocked dates included), enough seats, same type and equipment. */
    private List<RoomView> suggest(Room original, String date, String start, String end, int attendees,
                                   List<String> equipment) {
        long s = toMillis(date, start);
        long e = toMillis(date, end);
        int sMin = minutes(start);
        int eMin = minutes(end);
        int seats = Math.max(attendees, 1);
        return rooms.stream()
                .filter(r -> !r.roomId.equals(original.roomId) && r.isActive && r.type.equals(original.type)
                        && r.capacity >= seats && r.equipment.containsAll(equipment)
                        && sMin >= minutes(r.openTime) && eMin <= minutes(r.closeTime)
                        && blockConflict(r.roomId, s, e) == null && approvedConflict(r.roomId, s, e, null) == null)
                .sorted(Comparator.comparingInt((Room r) -> r.capacity - seats)
                        .thenComparingInt(r -> r.building.equals(original.building) ? 0 : 1))
                .map(this::view).toList();
    }

    // ------------------------------------------------------ request validation
    private long pendingCount(String userId) {
        return reservations.stream().filter(r -> r.requesterId.equals(userId) && "PENDING".equals(r.status)).count();
    }

    /** BR-02, 03, 04, 05, 10, 11, 12. Throws a 400 with the message the form should show. */
    private void validate(Room room, Requests.ReservationBody b, String userId) {
        if (!room.isActive) throw ApiException.badRequest("This room is inactive and cannot be requested.");
        long s = toMillis(b.date(), b.startTime());
        long e = toMillis(b.date(), b.endTime());
        if (e <= s) throw ApiException.badRequest("End time must be later than start time.");

        int sMin = minutes(b.startTime());
        int eMin = minutes(b.endTime());
        if (sMin % 30 != 0 || eMin % 30 != 0) throw ApiException.badRequest("Times must be in 30-minute steps.");
        if (sMin < minutes(room.openTime) || eMin > minutes(room.closeTime)) {
            throw ApiException.badRequest("Time must fall within the room's operating hours ("
                    + formatRange(room.openTime, room.closeTime) + ").");
        }
        if (e - s > MAX_DURATION_HOURS * HOUR) {
            throw ApiException.badRequest("A single reservation may not exceed " + MAX_DURATION_HOURS + " hours.");
        }
        long now = System.currentTimeMillis();
        if (s < now) throw ApiException.badRequest("The reservation date cannot be in the past.");
        if (s < now + MIN_ADVANCE_HOURS * HOUR) {
            throw ApiException.badRequest("Requests must be made at least " + MIN_ADVANCE_HOURS + " hours ahead.");
        }
        if (s > now + MAX_ADVANCE_DAYS * DAY) {
            throw ApiException.badRequest("Requests may be made at most " + MAX_ADVANCE_DAYS + " days ahead.");
        }
        int attendees = b.attendees() == null ? 0 : b.attendees();
        if (attendees < 1) throw ApiException.badRequest("Enter at least 1 attendee.");
        if (attendees > room.capacity) {
            throw ApiException.badRequest("Attendees exceed the room capacity (" + room.capacity + ").");
        }
        if (clean(b.purpose()).length() < 10) throw ApiException.badRequest("Purpose must be at least 10 characters.");
        if (pendingCount(userId) >= MAX_PENDING) {
            throw ApiException.badRequest("You already have " + MAX_PENDING
                    + " pending requests. Wait for a decision or cancel one.");
        }
    }

    /** Live conflict check for the request form (never throws for rule problems: returns ok=false + message). */
    public synchronized CheckResult check(User user, Requests.ReservationBody b) {
        Room room = room(b.roomId());
        try {
            validate(room, b, user.uid);
        } catch (ApiException e) {
            return new CheckResult(false, e.getMessage(), null, List.of());
        }
        return conflictResult(room, b);
    }

    private CheckResult conflictResult(Room room, Requests.ReservationBody b) {
        long s = toMillis(b.date(), b.startTime());
        long e = toMillis(b.date(), b.endTime());
        Block block = blockConflict(room.roomId, s, e);
        Reservation clash = block == null ? approvedConflict(room.roomId, s, e, null) : null;
        if (block == null && clash == null) return new CheckResult(true, "This room is free at that time.", null, List.of());

        List<RoomView> alternatives = suggest(room, b.date(), b.startTime(), b.endTime(), b.attendees(),
                b.equipment() == null ? List.of() : b.equipment());
        if (block != null) {
            return new CheckResult(false, "This room is blocked on that day (" + block.reason + ").", null, alternatives);
        }
        String next = TimeUtil.roundUp30(minutes(clash.endTime) + room.bufferMinutes);
        String msg = clash.organization + " has this room " + formatRange(clash.startTime, clash.endTime)
                + " (a " + room.bufferMinutes + "-minute gap is kept between reservations). Earliest start after it: "
                + TimeUtil.format12(next) + ".";
        return new CheckResult(false, msg, next, alternatives);
    }

    public synchronized Reservation create(User user, Requests.ReservationBody b) {
        Room room = room(b.roomId());
        validate(room, b, user.uid);
        CheckResult c = conflictResult(room, b);
        if (!c.ok()) throw ApiException.conflict(c.message());

        Reservation r = new Reservation();
        r.reservationId = newId("res");
        r.roomId = room.roomId;
        r.roomName = room.name;
        r.requesterId = user.uid;
        r.requesterName = user.fullName();
        r.organization = clean(b.organization()).isEmpty() ? user.organization : b.organization().trim();
        r.date = b.date();
        r.startTime = b.startTime();
        r.endTime = b.endTime();
        r.startMillis = toMillis(b.date(), b.startTime());
        r.endMillis = toMillis(b.date(), b.endTime());
        r.purpose = b.purpose().trim();
        r.equipmentNeeded = b.equipment() == null ? List.of() : List.copyOf(b.equipment());
        r.attendees = b.attendees();
        r.status = "PENDING";
        r.createdAt = System.currentTimeMillis();
        r.updatedAt = r.createdAt;
        reservations.add(r);

        pushNotice(user.uid, "Request submitted", room.name + " on " + formatDate(r.date) + " is waiting for approval.", r.reservationId);
        adminIds().forEach(a -> pushNotice(a, "New reservation request",
                user.fullName() + " requested " + room.name + " on " + formatDate(r.date) + ".", r.reservationId));
        return r;
    }

    // ----------------------------------------------------------------- listings
    public synchronized List<Reservation> mine(User user) {
        refreshStatuses();
        return reservations.stream().filter(r -> r.requesterId.equals(user.uid))
                .sorted(Comparator.comparingLong((Reservation r) -> r.startMillis).reversed()).toList();
    }

    public synchronized Reservation getFor(User user, String id) {
        Reservation r = reservation(id);
        if (!"ADMIN".equals(user.role) && !r.requesterId.equals(user.uid)) {
            throw ApiException.forbidden("You can only view your own reservations.");
        }
        return r;
    }

    public synchronized List<Reservation> adminList(String status, String roomId, String date) {
        refreshStatuses();
        return reservations.stream()
                .filter(r -> (status == null || status.isBlank() || status.equalsIgnoreCase("ALL") || r.status.equalsIgnoreCase(status))
                        && (roomId == null || roomId.isBlank() || r.roomId.equals(roomId))
                        && (date == null || date.isBlank() || r.date.equals(date)))
                .sorted(Comparator.comparingLong(r -> r.startMillis)).toList();
    }

    /** Detail + conflict-check result for the admin review screen. */
    public synchronized ReviewView review(String id) {
        refreshStatuses();
        Reservation r = reservation(id);
        Room room = room(r.roomId);
        boolean ok = true;
        String text = "";
        List<Reservation> others = List.of();
        if ("PENDING".equals(r.status)) {
            Block block = blockConflict(r.roomId, r.startMillis, r.endMillis);
            Reservation clash = approvedConflict(r.roomId, r.startMillis, r.endMillis, r.reservationId);
            if (block != null) {
                ok = false;
                text = "Blocked date: " + block.reason + ". This request cannot be approved.";
            } else if (clash != null) {
                ok = false;
                text = "Clashes with an approved reservation by " + clash.organization + " ("
                        + formatRange(clash.startTime, clash.endTime) + "). This request cannot be approved.";
            } else {
                text = "No clash with approved bookings. Checked approved reservations, blocked dates and the "
                        + room.bufferMinutes + "-minute gap.";
            }
            others = overlappingPendingOf(r);
        }
        return new ReviewView(r, room, ok, text, others);
    }

    // ------------------------------------------------------- admin decisions
    /** BR-01, 06, 07, 08: re-check the conflict, lock the slot, auto-reject overlapping pending requests. */
    public synchronized Reservation approve(String id, String remarks, User admin) {
        Reservation r = reservation(id);
        if (!"PENDING".equals(r.status)) throw ApiException.conflict("Only pending requests can be approved.");
        Room room = room(r.roomId);
        if (!room.isActive) throw ApiException.conflict("This room is inactive.");

        Block block = blockConflict(r.roomId, r.startMillis, r.endMillis);
        if (block != null) throw ApiException.conflict("The room is blocked at that time (" + block.reason + ").");
        Reservation clash = approvedConflict(r.roomId, r.startMillis, r.endMillis, r.reservationId);
        if (clash != null) {
            throw ApiException.conflict("Conflicts with an approved reservation by " + clash.organization + " ("
                    + formatRange(clash.startTime, clash.endTime) + ", " + room.bufferMinutes + "-minute gap included).");
        }

        r.status = "APPROVED";
        r.adminRemarks = clean(remarks);
        r.reviewedBy = admin.uid;
        r.updatedAt = System.currentTimeMillis();
        pushNotice(r.requesterId, "Reservation approved", r.roomName + " on " + formatDate(r.date) + ", "
                + formatRange(r.startTime, r.endTime) + "." + (r.adminRemarks.isEmpty() ? "" : " Remarks: " + r.adminRemarks),
                r.reservationId);

        for (Reservation o : overlappingPendingOf(r)) { // BR-08
            o.status = "REJECTED";
            o.adminRemarks = "Slot no longer available";
            o.reviewedBy = admin.uid;
            o.updatedAt = System.currentTimeMillis();
            pushNotice(o.requesterId, "Reservation rejected",
                    o.roomName + " on " + formatDate(o.date) + ": Slot no longer available.", o.reservationId);
        }
        return r;
    }

    public synchronized Reservation reject(String id, String remarks, User admin) {
        if (clean(remarks).isEmpty()) throw ApiException.badRequest("Remarks are required when rejecting a request."); // BR-07
        Reservation r = reservation(id);
        if (!"PENDING".equals(r.status)) throw ApiException.conflict("Only pending requests can be rejected.");
        r.status = "REJECTED";
        r.adminRemarks = remarks.trim();
        r.reviewedBy = admin.uid;
        r.updatedAt = System.currentTimeMillis();
        pushNotice(r.requesterId, "Reservation rejected",
                r.roomName + " on " + formatDate(r.date) + ". Reason: " + r.adminRemarks, r.reservationId);
        return r;
    }

    /** BR-09: owners cancel their own reservation before it starts; an admin must give a reason. */
    public synchronized Reservation cancel(String id, User by, String reason) {
        Reservation r = reservation(id);
        boolean isAdmin = "ADMIN".equals(by.role);
        if (!isAdmin && !r.requesterId.equals(by.uid)) throw ApiException.forbidden("You can only cancel your own reservations.");
        if (!"PENDING".equals(r.status) && !"APPROVED".equals(r.status)) {
            throw ApiException.conflict("This reservation can no longer be cancelled.");
        }
        if (System.currentTimeMillis() >= r.startMillis) {
            throw ApiException.conflict("A reservation that has started cannot be cancelled.");
        }
        if (isAdmin && clean(reason).isEmpty()) throw ApiException.badRequest("A reason is required to cancel a reservation.");

        r.status = "CANCELLED";
        if (isAdmin) {
            r.adminRemarks = reason.trim();
            r.reviewedBy = by.uid;
        }
        r.updatedAt = System.currentTimeMillis();
        if (isAdmin) {
            pushNotice(r.requesterId, "Reservation cancelled", r.roomName + " on " + formatDate(r.date)
                    + " was cancelled by the administrator. Reason: " + r.adminRemarks, r.reservationId);
        } else {
            adminIds().forEach(a -> pushNotice(a, "Reservation cancelled",
                    r.requesterName + " cancelled " + r.roomName + " on " + formatDate(r.date) + ".", r.reservationId));
        }
        return r;
    }

    /** Approved reservations whose end time has passed become Completed (BR-06). */
    private void refreshStatuses() {
        long now = System.currentTimeMillis();
        reservations.stream().filter(r -> "APPROVED".equals(r.status) && r.endMillis < now)
                .forEach(r -> r.status = "COMPLETED");
    }

    // --------------------------------------------------- rooms and blocks (FR-10)
    public synchronized Room addRoom(Requests.NewRoom req) {
        if (clean(req.name()).isEmpty() || clean(req.building()).isEmpty()) {
            throw ApiException.badRequest("Room name and building are required.");
        }
        if (req.capacity() == null || req.capacity() < 1) throw ApiException.badRequest("Capacity must be at least 1.");
        String type = clean(req.type()).toUpperCase(Locale.ROOT);
        if (!List.of("CLASSROOM", "MEETING", "ACTIVITY").contains(type)) {
            throw ApiException.badRequest("Room type must be CLASSROOM, MEETING or ACTIVITY.");
        }
        Room r = new Room();
        r.roomId = newId("r");
        r.name = req.name().trim();
        r.building = req.building().trim();
        r.type = type;
        r.capacity = req.capacity();
        r.equipment = List.of("Whiteboard");
        rooms.add(r);
        return r;
    }

    public synchronized Room setRoomActive(String roomId, boolean active) {
        Room r = room(roomId);
        r.isActive = active;
        return r;
    }

    public synchronized Block blockWholeDay(String roomId, String date, String reason, User admin) {
        Room room = room(roomId);
        TimeUtil.parseDate(date);
        if (clean(reason).isEmpty()) throw ApiException.badRequest("A reason is required, for example Maintenance.");
        Block b = new Block();
        b.blockId = newId("blk");
        b.roomId = roomId;
        b.date = date;
        b.startTime = room.openTime;
        b.endTime = room.closeTime;
        b.reason = reason.trim();
        b.createdBy = admin.uid;
        blocks.add(b);
        return b;
    }

    // -------------------------------------------------------------- seed data
    private void seed() {
        addUser("u_admin", "Room", "", "Administrator", "admin@reserba.edu", "admin123", "ADMIN", "ADMIN-001", "Facilities Office", "ACTIVE");
        addUser("u_student", "Maria", "", "Santos", "student@school.edu", "123456", "STUDENT", "240-00124", "College of Computer Studies", "ACTIVE");
        addUser("u_faculty", "Prof.", "", "Reyes", "faculty@school.edu", "123456", "FACULTY", "102-00020", "Faculty meeting - department", "ACTIVE");
        addUser("u_p1", "Juan", "D.", "Cruz", "juan@school.edu", "123456", "STUDENT", "240-00311", "Student Council / Student Government", "PENDING");
        addUser("u_p2", "Ana", "", "Lopez", "ana@school.edu", "123456", "STUDENT", "231-01180", "College of Computer Studies", "PENDING");

        addSeedRoom("r301", "Room 301 - CCS Lab", "Main Building", "3rd Floor", "CLASSROOM", 40, List.of("Projector", "Whiteboard"), "Computer lab with 40 workstations.");
        addSeedRoom("r302", "Room 302", "Main Building", "3rd Floor", "CLASSROOM", 35, List.of("Projector", "Whiteboard"), "");
        addSeedRoom("r305", "Room 305", "Main Building", "3rd Floor", "CLASSROOM", 45, List.of("Projector", "Whiteboard", "Microphone"), "");
        addSeedRoom("mrA", "Meeting Room A", "Main Building", "2nd Floor", "MEETING", 12, List.of("Projector", "Whiteboard"), "");
        addSeedRoom("mrB", "Meeting Room B", "Annex Building", "1st Floor", "MEETING", 20, List.of("Projector", "Whiteboard"), "");
        addSeedRoom("hall", "Activity Hall", "Student Center", "Ground Floor", "ACTIVITY", 120, List.of("Projector", "Microphone"), "");

        seedRes("s1", "r301", "u_seed", "Student Council", "Student Council / Student Government", 2, "11:00", "13:00", "Officers planning meeting", 30, "APPROVED", "Approved. Please tidy up.");
        seedRes("s2", "r301", "u_faculty", "Prof. Reyes", "Faculty meeting - department", 2, "14:00", "15:30", "Review session for midterms", 35, "PENDING", "");
        seedRes("s3", "r301", "u_student", "Maria Santos", "College of Computer Studies", 2, "14:30", "16:00", "General meeting of members", 40, "PENDING", "");
        seedRes("s4", "mrA", "u_student", "Maria Santos", "College of Computer Studies", 3, "09:00", "10:30", "Officers' weekly sync", 8, "PENDING", "");
        seedRes("s5", "hall", "u_student", "Maria Santos", "College of Computer Studies", 4, "13:00", "16:00", "Freshmen orientation workshop", 80, "APPROVED", "Approved. Sound check at 12:30.");
        seedRes("s6", "r302", "u_student", "Maria Santos", "College of Computer Studies", -3, "10:00", "12:00", "Hackathon planning session", 25, "COMPLETED", "");
        seedRes("s7", "mrB", "u_student", "Maria Santos", "College of Computer Studies", -2, "15:00", "17:00", "Alumni talk preparation", 15, "REJECTED", "Room reserved for a school event.");

        Block b = new Block();
        b.blockId = "b1";
        b.roomId = "r302";
        b.date = TimeUtil.dateOffset(5);
        b.startTime = "07:00";
        b.endTime = "21:00";
        b.reason = "Maintenance";
        b.createdBy = "u_admin";
        blocks.add(b);

        pushNotice("u_student", "Reservation approved", "Activity Hall was approved. Remarks: Approved. Sound check at 12:30.", "s5");
        pushNotice("u_student", "Reservation rejected", "Meeting Room B was rejected. Reason: Room reserved for a school event.", "s7");
        pushNotice("u_admin", "New reservation request", "Prof. Reyes requested Room 301 - CCS Lab.", "s2");
        pushNotice("u_admin", "New account to verify", "Juan D. Cruz (240-00311) registered.", "");
    }

    private void addUser(String uid, String first, String middle, String last, String email, String password,
                         String role, String idNumber, String org, String status) {
        User u = new User();
        u.uid = uid;
        u.firstName = first;
        u.middleName = middle;
        u.lastName = last;
        u.email = email;
        u.passwordHash = PasswordHasher.hash(password);
        u.role = role;
        u.idNumber = idNumber;
        u.organization = org;
        u.accountStatus = status;
        u.createdAt = System.currentTimeMillis();
        users.add(u);
    }

    private void addSeedRoom(String id, String name, String building, String floor, String type, int capacity,
                             List<String> equipment, String description) {
        Room r = new Room();
        r.roomId = id;
        r.name = name;
        r.building = building;
        r.floor = floor;
        r.type = type;
        r.capacity = capacity;
        r.equipment = equipment;
        r.description = description;
        rooms.add(r);
    }

    private void seedRes(String id, String roomId, String requesterId, String requesterName, String org,
                         int dayOffset, String start, String end, String purpose, int attendees, String status,
                         String remarks) {
        Room room = room(roomId);
        Reservation r = new Reservation();
        r.reservationId = id;
        r.roomId = roomId;
        r.roomName = room.name;
        r.requesterId = requesterId;
        r.requesterName = requesterName;
        r.organization = org;
        r.date = TimeUtil.dateOffset(dayOffset);
        r.startTime = start;
        r.endTime = end;
        r.startMillis = toMillis(r.date, start);
        r.endMillis = toMillis(r.date, end);
        r.purpose = purpose;
        r.equipmentNeeded = List.of("Projector");
        r.attendees = attendees;
        r.status = status;
        r.adminRemarks = remarks;
        r.reviewedBy = "PENDING".equals(status) ? "" : "u_admin";
        r.createdAt = System.currentTimeMillis();
        r.updatedAt = r.createdAt;
        reservations.add(r);
    }
}
