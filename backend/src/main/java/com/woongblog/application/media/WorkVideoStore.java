package com.woongblog.application.media;

import java.util.UUID;

public interface WorkVideoStore {
    void createUploadSession(WorkVideoUploadSessionDraft session);

    WorkVideoUploadSession activeUploadSession(UUID sessionId, UUID workId);

    void markUploadSessionStatus(UUID sessionId, String status);

    int currentVideoVersion(UUID workId);
}
