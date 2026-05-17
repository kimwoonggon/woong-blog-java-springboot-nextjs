package com.woongblog.application.media;

import java.util.UUID;

public record IssueWorkVideoUploadUrlCommand(
        UUID workId,
        String fileName,
        String contentType,
        long size,
        int expectedVideosVersion) {
}
