package com.woongblog.media;

import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
public class MediaController {
    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PostMapping
    Map<String, Object> upload(@RequestParam("file") MultipartFile file, @RequestParam(defaultValue = "uploads") String bucket) {
        return mediaService.upload(file, bucket);
    }

    @DeleteMapping
    Map<String, Object> delete(@RequestParam UUID id) {
        return mediaService.delete(id);
    }
}
