package com.woongblog.application.media;

import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public record UploadWorkVideoCommand(UUID workId, UUID uploadSessionId, MultipartFile file) {
}
