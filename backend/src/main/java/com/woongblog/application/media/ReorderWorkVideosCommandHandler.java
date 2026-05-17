package com.woongblog.application.media;

import com.woongblog.content.ContentService;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ReorderWorkVideosCommandHandler {
    private final ContentService contentService;

    public ReorderWorkVideosCommandHandler(ContentService contentService) {
        this.contentService = contentService;
    }

    public Map<String, Object> handle(ReorderWorkVideosCommand command) {
        return contentService.reorderVideos(
                command.workId(),
                new ContentService.ReorderVideosRequest(command.orderedVideoIds(), command.expectedVideosVersion()));
    }
}
