package com.woongblog.application.media;

import java.util.UUID;

public record DeleteWorkVideoCommand(UUID workId, UUID videoId, int expectedVideosVersion) {
}
