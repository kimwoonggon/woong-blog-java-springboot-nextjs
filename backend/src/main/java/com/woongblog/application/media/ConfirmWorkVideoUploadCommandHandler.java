package com.woongblog.application.media;

import com.woongblog.content.ContentService;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ConfirmWorkVideoUploadCommandHandler {
    private final WorkVideoStore workVideoStore;
    private final ContentService contentService;

    public ConfirmWorkVideoUploadCommandHandler(WorkVideoStore workVideoStore, ContentService contentService) {
        this.workVideoStore = workVideoStore;
        this.contentService = contentService;
    }

    public Map<String, Object> handle(ConfirmWorkVideoUploadCommand command) {
        WorkVideoUploadSession session = workVideoStore.activeUploadSession(command.uploadSessionId(), command.workId());
        workVideoStore.markUploadSessionStatus(command.uploadSessionId(), "confirmed");
        return contentService.attachLocalVideo(
                command.workId(),
                "local",
                session.storageKey(),
                session.originalFileName(),
                session.expectedMimeType(),
                session.expectedSize(),
                command.expectedVideosVersion());
    }
}
