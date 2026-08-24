package com.expensetracker.security;

import org.springframework.security.core.context.SecurityContextHolder;

public class CurrentUser {

    private CurrentUser() {}

    public static Long id() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return (Long) principal;
    }
}
