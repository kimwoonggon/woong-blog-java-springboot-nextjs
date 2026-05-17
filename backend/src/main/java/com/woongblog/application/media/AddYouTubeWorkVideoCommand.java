package com.woongblog.application.media;

import java.util.UUID;

public record AddYouTubeWorkVideoCommand(UUID workId, String youtubeUrlOrId, int expectedVideosVersion) {
}
