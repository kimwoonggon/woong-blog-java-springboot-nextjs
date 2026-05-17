package com.woongblog.application.content.common;

public final class ContentSearchText {
    private ContentSearchText() {
    }

    public static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
