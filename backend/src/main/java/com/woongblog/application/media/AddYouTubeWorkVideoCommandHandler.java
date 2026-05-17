package com.woongblog.application.media;

import com.woongblog.content.ContentService;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AddYouTubeWorkVideoCommandHandler {
    private final ContentService contentService;

    public AddYouTubeWorkVideoCommandHandler(ContentService contentService) {
        this.contentService = contentService;
    }

    public Map<String, Object> handle(AddYouTubeWorkVideoCommand command) {
        return contentService.addYouTubeVideo(
                command.workId(),
                new ContentService.AddYouTubeVideoRequest(command.youtubeUrlOrId(), command.expectedVideosVersion()));
    }
}
