package com.woongblog.application.media;

import com.woongblog.media.MediaService;
import java.io.IOException;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class UploadWorkVideoCommandHandler {
    private final WorkVideoStore workVideoStore;
    private final MediaService mediaService;

    public UploadWorkVideoCommandHandler(
            WorkVideoStore workVideoStore,
            MediaService mediaService,
            com.woongblog.content.ContentService contentService) {
        this.workVideoStore = workVideoStore;
        this.mediaService = mediaService;
    }

    public Map<String, Object> handle(UploadWorkVideoCommand command) throws IOException {
        WorkVideoUploadSession session = workVideoStore.activeUploadSession(command.uploadSessionId(), command.workId());
        mediaService.writeBytes(session.storageKey(), command.file().getBytes());
        workVideoStore.markUploadSessionStatus(command.uploadSessionId(), "uploaded");
        return Map.of("success", true);
    }
}
