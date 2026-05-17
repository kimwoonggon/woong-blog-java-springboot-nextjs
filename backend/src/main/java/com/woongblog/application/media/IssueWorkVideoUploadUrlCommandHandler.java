package com.woongblog.application.media;

import com.woongblog.common.BadRequestException;
import com.woongblog.content.ContentService;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class IssueWorkVideoUploadUrlCommandHandler {
    private final ContentService contentService;
    private final WorkVideoStore workVideoStore;

    public IssueWorkVideoUploadUrlCommandHandler(ContentService contentService, WorkVideoStore workVideoStore) {
        this.contentService = contentService;
        this.workVideoStore = workVideoStore;
    }

    public Map<String, Object> handle(IssueWorkVideoUploadUrlCommand command) {
        validateMetadata(command);
        contentService.requireVideoVersion(command.workId(), command.expectedVideosVersion());
        String fileName = fileNameOrDefault(command.fileName());
        String storageKey = "videos/%s/%s/%s".formatted(command.workId(), UUID.randomUUID(), safeName(fileName));
        UUID sessionId = UUID.randomUUID();
        workVideoStore.createUploadSession(new WorkVideoUploadSessionDraft(
                sessionId,
                command.workId(),
                "local",
                storageKey,
                fileName,
                command.contentType(),
                command.size(),
                "issued"));
        return Map.of(
                "uploadSessionId", sessionId,
                "uploadMethod", "local",
                "uploadUrl", "/api/admin/works/%s/videos/upload?uploadSessionId=%s".formatted(command.workId(), sessionId),
                "storageKey", storageKey);
    }

    private static String fileNameOrDefault(String value) {
        return value == null || value.isBlank() ? "video.mp4" : value;
    }

    private static String safeName(String value) {
        return value.replaceAll("[^A-Za-z0-9._-]", "-");
    }

    private static void validateMetadata(IssueWorkVideoUploadUrlCommand command) {
        if (command.size() <= 0
                || command.fileName() == null
                || command.fileName().isBlank()
                || command.contentType() == null
                || !command.contentType().startsWith("video/")) {
            throw new BadRequestException("Valid video file metadata is required.");
        }
    }
}
