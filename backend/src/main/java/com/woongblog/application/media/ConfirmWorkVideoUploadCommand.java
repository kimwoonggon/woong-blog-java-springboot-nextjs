package com.woongblog.application.media;

import java.util.UUID;

public record ConfirmWorkVideoUploadCommand(UUID workId, UUID uploadSessionId, int expectedVideosVersion) {
}
