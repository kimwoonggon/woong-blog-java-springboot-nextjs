package com.woongblog.media;

import com.woongblog.application.media.AddYouTubeWorkVideoCommand;
import com.woongblog.application.media.AddYouTubeWorkVideoCommandHandler;
import com.woongblog.application.media.ConfirmWorkVideoUploadCommand;
import com.woongblog.application.media.ConfirmWorkVideoUploadCommandHandler;
import com.woongblog.application.media.CreateWorkVideoHlsJobCommand;
import com.woongblog.application.media.CreateWorkVideoHlsJobCommandHandler;
import com.woongblog.application.media.DeleteWorkVideoCommand;
import com.woongblog.application.media.DeleteWorkVideoCommandHandler;
import com.woongblog.application.media.IssueWorkVideoUploadUrlCommand;
import com.woongblog.application.media.IssueWorkVideoUploadUrlCommandHandler;
import com.woongblog.application.media.ReorderWorkVideosCommand;
import com.woongblog.application.media.ReorderWorkVideosCommandHandler;
import com.woongblog.application.media.UploadWorkVideoCommand;
import com.woongblog.application.media.UploadWorkVideoCommandHandler;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/works/{workId}/videos")
public class WorkVideoController {
    private final IssueWorkVideoUploadUrlCommandHandler issueUploadUrlHandler;
    private final UploadWorkVideoCommandHandler uploadHandler;
    private final ConfirmWorkVideoUploadCommandHandler confirmUploadHandler;
    private final CreateWorkVideoHlsJobCommandHandler hlsJobHandler;
    private final AddYouTubeWorkVideoCommandHandler addYouTubeHandler;
    private final ReorderWorkVideosCommandHandler reorderVideosHandler;
    private final DeleteWorkVideoCommandHandler deleteVideoHandler;

    public WorkVideoController(
            IssueWorkVideoUploadUrlCommandHandler issueUploadUrlHandler,
            UploadWorkVideoCommandHandler uploadHandler,
            ConfirmWorkVideoUploadCommandHandler confirmUploadHandler,
            CreateWorkVideoHlsJobCommandHandler hlsJobHandler,
            AddYouTubeWorkVideoCommandHandler addYouTubeHandler,
            ReorderWorkVideosCommandHandler reorderVideosHandler,
            DeleteWorkVideoCommandHandler deleteVideoHandler) {
        this.issueUploadUrlHandler = issueUploadUrlHandler;
        this.uploadHandler = uploadHandler;
        this.confirmUploadHandler = confirmUploadHandler;
        this.hlsJobHandler = hlsJobHandler;
        this.addYouTubeHandler = addYouTubeHandler;
        this.reorderVideosHandler = reorderVideosHandler;
        this.deleteVideoHandler = deleteVideoHandler;
    }

    @PostMapping("/upload-url")
    Map<String, Object> issueUploadUrl(@PathVariable UUID workId, @RequestBody IssueUploadRequest request) {
        return issueUploadUrlHandler.handle(new IssueWorkVideoUploadUrlCommand(
                workId,
                request.fileName(),
                request.contentType(),
                request.size(),
                request.expectedVideosVersion()));
    }

    @PostMapping("/upload")
    Map<String, Object> upload(
            @PathVariable UUID workId,
            @RequestParam UUID uploadSessionId,
            @RequestParam("file") MultipartFile file) throws IOException {
        return uploadHandler.handle(new UploadWorkVideoCommand(workId, uploadSessionId, file));
    }

    @PostMapping("/confirm")
    Map<String, Object> confirm(@PathVariable UUID workId, @RequestBody ConfirmUploadRequest request) {
        return confirmUploadHandler.handle(new ConfirmWorkVideoUploadCommand(
                workId,
                request.uploadSessionId(),
                request.expectedVideosVersion()));
    }

    @PostMapping("/hls-job")
    Map<String, Object> hlsJob(
            @PathVariable UUID workId,
            @RequestParam("file") MultipartFile file,
            @RequestParam int expectedVideosVersion) throws IOException {
        return hlsJobHandler.handle(new CreateWorkVideoHlsJobCommand(workId, file, expectedVideosVersion));
    }

    @PostMapping("/youtube")
    Map<String, Object> youtube(@PathVariable UUID workId, @RequestBody AddYouTubeVideoRequest request) {
        return addYouTubeHandler.handle(new AddYouTubeWorkVideoCommand(
                workId,
                request.youtubeUrlOrId(),
                request.expectedVideosVersion()));
    }

    @PutMapping("/order")
    Map<String, Object> reorder(@PathVariable UUID workId, @RequestBody ReorderVideosRequest request) {
        return reorderVideosHandler.handle(new ReorderWorkVideosCommand(
                workId,
                request.orderedVideoIds(),
                request.expectedVideosVersion()));
    }

    @DeleteMapping("/{videoId}")
    Map<String, Object> delete(@PathVariable UUID workId, @PathVariable UUID videoId, @RequestParam int expectedVideosVersion) {
        return deleteVideoHandler.handle(new DeleteWorkVideoCommand(workId, videoId, expectedVideosVersion));
    }

    public record IssueUploadRequest(String fileName, String contentType, long size, int expectedVideosVersion) {
    }

    public record ConfirmUploadRequest(UUID uploadSessionId, int expectedVideosVersion) {
    }

    public record AddYouTubeVideoRequest(String youtubeUrlOrId, int expectedVideosVersion) {
    }

    public record ReorderVideosRequest(List<UUID> orderedVideoIds, int expectedVideosVersion) {
    }
}
