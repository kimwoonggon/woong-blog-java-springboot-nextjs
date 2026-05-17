package com.woongblog.application.media;

import com.woongblog.content.ContentService;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class DeleteWorkVideoCommandHandler {
    private final ContentService contentService;

    public DeleteWorkVideoCommandHandler(ContentService contentService) {
        this.contentService = contentService;
    }

    public Map<String, Object> handle(DeleteWorkVideoCommand command) {
        return contentService.deleteVideo(command.workId(), command.videoId(), command.expectedVideosVersion());
    }
}
