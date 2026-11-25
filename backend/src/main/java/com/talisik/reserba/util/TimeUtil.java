package com.talisik.reserba.util;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import com.talisik.reserba.ApiException;

/** Dates are "yyyy-MM-dd", times are "HH:mm" (24h), exactly as the React app sends them. */
public final class TimeUtil {
    /** Campus time zone. Change here if the school is not in the Philippines. */
    public static final ZoneId ZONE = ZoneId.of("Asia/Manila");

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE, MMM d", Locale.ENGLISH);
    private static final DateTimeFormatter H12 = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    private TimeUtil() { }

    public static LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeException | NullPointerException e) {
            throw ApiException.badRequest("Date must be in the format yyyy-MM-dd.");
        }
    }

    public static LocalTime parseTime(String time) {
        try {
            return LocalTime.parse(time, HHMM);
        } catch (DateTimeException | NullPointerException e) {
            throw ApiException.badRequest("Time must be in the format HH:mm.");
        }
    }

    public static long toMillis(String date, String time) {
        return LocalDateTime.of(parseDate(date), parseTime(time)).atZone(ZONE).toInstant().toEpochMilli();
    }

    public static int minutes(String time) {
        LocalTime t = parseTime(time);
        return t.getHour() * 60 + t.getMinute();
    }

    public static String hhmm(int minutes) {
        return String.format("%02d:%02d", minutes / 60, minutes % 60);
    }

    public static String roundUp30(int minutes) {
        return hhmm((minutes + 29) / 30 * 30);
    }

    public static String format12(String time) {
        return parseTime(time).format(H12).toUpperCase(Locale.ENGLISH);
    }

    public static String formatRange(String start, String end) {
        return format12(start) + " - " + format12(end);
    }

    public static String formatDate(String date) {
        return parseDate(date).format(DAY);
    }

    public static String dateOffset(int days) {
        return LocalDate.now(ZONE).plusDays(days).toString();
    }

    /** BR-01: a new booking clashes if it starts before the other ends + gap, and ends + gap after it starts. */
    public static boolean conflicts(long newStart, long newEnd, long exStart, long exEnd, int bufferMinutes) {
        long buffer = bufferMinutes * 60_000L;
        return newStart < exEnd + buffer && newEnd + buffer > exStart;
    }

    public static boolean overlaps(long aStart, long aEnd, long bStart, long bEnd) {
        return aStart < bEnd && aEnd > bStart;
    }
}
