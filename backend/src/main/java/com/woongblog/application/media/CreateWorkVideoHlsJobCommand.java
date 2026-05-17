package com.woongblog.application.media;

import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public record CreateWorkVideoHlsJobCommand(UUID workId, MultipartFile file, int expectedVideosVersion) {
}
