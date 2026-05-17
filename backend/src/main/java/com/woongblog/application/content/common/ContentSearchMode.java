package com.woongblog.application.content.common;

public enum ContentSearchMode {
    TITLE("title"),
    CONTENT("content");

    private final String queryValue;

    ContentSearchMode(String queryValue) {
        this.queryValue = queryValue;
    }

    public String queryValue() {
        return queryValue;
    }

    public static ContentSearchMode from(String value) {
        if ("title".equalsIgnoreCase(value)) {
            return TITLE;
        }
        return CONTENT;
    }
}
