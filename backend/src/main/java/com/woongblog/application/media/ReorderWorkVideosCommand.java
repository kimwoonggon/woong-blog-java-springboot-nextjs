package com.woongblog.application.media;

import java.util.List;
import java.util.UUID;

public record ReorderWorkVideosCommand(UUID workId, List<UUID> orderedVideoIds, int expectedVideosVersion) {
}
