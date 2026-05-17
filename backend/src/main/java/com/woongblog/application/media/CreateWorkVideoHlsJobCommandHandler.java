package com.woongblog.application.media;

import com.woongblog.content.ContentService;
import com.woongblog.media.MediaService;
import java.io.IOException;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CreateWorkVideoHlsJobCommandHandler {
    private final MediaService mediaService;
    private final ContentService contentService;

    public CreateWorkVideoHlsJobCommandHandler(MediaService mediaService, ContentService contentService) {
        this.mediaService = mediaService;
        this.contentService = contentService;
    }

    public Map<String, Object> handle(CreateWorkVideoHlsJobCommand command) throws IOException {
        MediaService.HlsProcessingResult hls = mediaService.prepareHlsVideo(command.workId(), command.file());
        return contentService.attachHlsVideo(
                command.workId(),
                "local:" + hls.masterStorageKey(),
                command.file().getOriginalFilename(),
                "application/vnd.apple.mpegurl",
                command.file().getSize(),
                hls.timelineVttStorageKey(),
                hls.timelineSpriteStorageKey(),
                command.expectedVideosVersion());
    }
}
