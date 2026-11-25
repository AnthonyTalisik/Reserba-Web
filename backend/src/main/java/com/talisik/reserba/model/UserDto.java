package com.talisik.reserba.model;

public record UserDto(String uid, String firstName, String middleName, String lastName, String email,
                      String role, String idNumber, String organization, String accountStatus,
                      String adminRemarks) {
    public static UserDto of(User u) {
        return new UserDto(u.uid, u.firstName, u.middleName, u.lastName, u.email, u.role, u.idNumber,
                u.organization, u.accountStatus, u.adminRemarks);
    }
}
