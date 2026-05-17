package com.woongblog.common;

import java.text.Normalizer;
import java.util.Locale;

public final class SlugSupport {
    private SlugSupport() {
    }

    public static String fromTitle(String title) {
        String normalized = Normalizer.normalize(title == null ? "" : title, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? "untitled" : normalized;
    }
}
