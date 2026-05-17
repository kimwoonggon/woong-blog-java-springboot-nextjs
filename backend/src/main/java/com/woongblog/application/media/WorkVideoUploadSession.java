package com.woongblog.application.media;

public record WorkVideoUploadSession(
        String storageKey,
        String originalFileName,
        String expectedMimeType,
        long expectedSize) {
}
