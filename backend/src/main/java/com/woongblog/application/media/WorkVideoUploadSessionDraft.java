package com.woongblog.application.media;

import java.util.UUID;

public record WorkVideoUploadSessionDraft(
        UUID id,
        UUID workId,
        String storageType,
        String storageKey,
        String originalFileName,
        String expectedMimeType,
        long expectedSize,
        String status) {
}
