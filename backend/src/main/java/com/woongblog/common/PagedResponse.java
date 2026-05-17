package com.woongblog.common;

import java.util.List;

public record PagedResponse<T>(List<T> items, int page, int pageSize, long totalItems, int totalPages) {
    public static <T> PagedResponse<T> of(List<T> items, int page, int pageSize, long totalItems) {
        int totalPages = pageSize <= 0 ? 0 : (int) Math.ceil(totalItems / (double) pageSize);
        return new PagedResponse<>(items, page, pageSize, totalItems, totalPages);
    }
}
