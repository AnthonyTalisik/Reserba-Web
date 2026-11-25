package com.talisik.reserba.model;

/** Never returned directly (it holds the password hash); controllers return UserDto. */
public class User {
    public String uid;
    public String firstName;
    public String middleName = "";
    public String lastName;
    public String email;
    public String passwordHash;
    public String role;          // STUDENT | FACULTY | ADMIN
    public String idNumber;      // 000-00000
    public String organization;
    public String accountStatus; // PENDING | ACTIVE | REJECTED
    public String verifiedBy = "";
    public String adminRemarks = "";
    public long createdAt;

    public String fullName() {
        StringBuilder sb = new StringBuilder(firstName);
        if (middleName != null && !middleName.isBlank()) sb.append(' ').append(middleName);
        sb.append(' ').append(lastName);
        return sb.toString();
    }
}
