package com.woongblog.application.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.AdditionalMatchers.aryEq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.woongblog.content.ContentService;
import com.woongblog.common.BadRequestException;
import com.woongblog.media.MediaService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
@Tag("component")
class WorkVideoCommandHandlersTest {
    @Mock
    private ContentService contentService;

    @Mock
    private MediaService mediaService;

    @Test
    void issueUploadUrlCreatesLocalUploadSessionAndPreservesResponseShape() {
        UUID workId = UUID.randomUUID();
        FakeWorkVideoStore store = new FakeWorkVideoStore();
        IssueWorkVideoUploadUrlCommandHandler handler = new IssueWorkVideoUploadUrlCommandHandler(contentService, store);

        Map<String, Object> result = handler.handle(new IssueWorkVideoUploadUrlCommand(
                workId,
                "my clip!.mp4",
                "video/mp4",
                123L,
                7));

        verify(contentService).requireVideoVersion(workId, 7);
        assertThat(store.createdSession).isNotNull();
        assertThat(store.createdSession.id()).isInstanceOf(UUID.class);
        assertThat(store.createdSession.workId()).isEqualTo(workId);
        assertThat(store.createdSession.storageType()).isEqualTo("local");
        assertThat(store.createdSession.storageKey())
                .startsWith("videos/" + workId + "/")
                .endsWith("/my-clip-.mp4");
        assertThat(store.createdSession.originalFileName()).isEqualTo("my clip!.mp4");
        assertThat(store.createdSession.expectedMimeType()).isEqualTo("video/mp4");
        assertThat(store.createdSession.expectedSize()).isEqualTo(123L);
        assertThat(result)
                .containsEntry("uploadSessionId", store.createdSession.id())
                .containsEntry("uploadMethod", "local")
                .containsEntry("storageKey", store.createdSession.storageKey())
                .containsEntry(
                        "uploadUrl",
                        "/api/admin/works/%s/videos/upload?uploadSessionId=%s"
                                .formatted(workId, store.createdSession.id()));
    }

    @Test
    void issueUploadUrlRejectsInvalidFileMetadataBeforeVersionCheck() {
        UUID workId = UUID.randomUUID();
        FakeWorkVideoStore store = new FakeWorkVideoStore();
        IssueWorkVideoUploadUrlCommandHandler handler = new IssueWorkVideoUploadUrlCommandHandler(contentService, store);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> handler.handle(new IssueWorkVideoUploadUrlCommand(
                        workId,
                        "clip.txt",
                        "text/plain",
                        0L,
                        7)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Valid video file metadata is required.");

        verify(contentService, never()).requireVideoVersion(any(UUID.class), org.mockito.ArgumentMatchers.anyInt());
        assertThat(store.createdSession).isNull();
    }

    @Test
    void uploadWritesMultipartBytesAndMarksSessionWithoutAttachingVideo() throws IOException {
        UUID workId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        byte[] bytes = "video bytes".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "client.mp4", "video/mp4", bytes);
        FakeWorkVideoStore store = new FakeWorkVideoStore();
        store.activeSession = new WorkVideoUploadSession(
                "videos/work/session/client.mp4",
                "original.mp4",
                "video/mp4",
                999L);

        Map<String, Object> result = new UploadWorkVideoCommandHandler(store, mediaService, contentService)
                .handle(new UploadWorkVideoCommand(workId, sessionId, file));

        assertThat(result).containsEntry("success", true);
        assertThat(store.activeSessionLookups).containsExactly(new SessionLookup(sessionId, workId));
        assertThat(store.statusUpdates).containsExactly(new SessionStatusUpdate(sessionId, "uploaded"));
        verify(mediaService).writeBytes(eq(store.activeSession.storageKey()), aryEq(bytes));
        verify(contentService, never()).attachLocalVideo(
                any(UUID.class),
                any(String.class),
                any(String.class),
                any(String.class),
                any(String.class),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void confirmMarksSessionAndAttachesUsingExpectedVersion() {
        UUID workId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        FakeWorkVideoStore store = new FakeWorkVideoStore();
        store.activeSession = new WorkVideoUploadSession(
                "videos/work/session/uploaded.mp4",
                "uploaded.mp4",
                "video/mp4",
                321L);
        Map<String, Object> payload = Map.of("videosVersion", 8, "videos_version", 8, "videos", List.of());
        when(contentService.attachLocalVideo(
                workId,
                "local",
                store.activeSession.storageKey(),
                store.activeSession.originalFileName(),
                store.activeSession.expectedMimeType(),
                store.activeSession.expectedSize(),
                7)).thenReturn(payload);

        Map<String, Object> result = new ConfirmWorkVideoUploadCommandHandler(store, contentService)
                .handle(new ConfirmWorkVideoUploadCommand(workId, sessionId, 7));

        assertThat(result).isSameAs(payload);
        assertThat(store.activeSessionLookups).containsExactly(new SessionLookup(sessionId, workId));
        assertThat(store.statusUpdates).containsExactly(new SessionStatusUpdate(sessionId, "confirmed"));
        verify(contentService).attachLocalVideo(
                workId,
                "local",
                store.activeSession.storageKey(),
                store.activeSession.originalFileName(),
                store.activeSession.expectedMimeType(),
                store.activeSession.expectedSize(),
                7);
    }

    @Test
    void hlsJobWritesSourcePlaylistAndTimelineThenAttachesMasterPlaylist() throws IOException {
        UUID workId = UUID.randomUUID();
        byte[] bytes = "mov bytes".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "clip one.mov", "video/quicktime", bytes);
        MediaService.HlsProcessingResult hls = new MediaService.HlsProcessingResult(
                "videos/" + workId + "/prepared/hls/master.m3u8",
                "videos/" + workId + "/prepared/hls/timeline.vtt",
                "videos/" + workId + "/prepared/hls/timeline-sprite.jpg");
        Map<String, Object> payload = Map.of("videosVersion", 3, "videos_version", 3, "videos", List.of());
        when(mediaService.prepareHlsVideo(workId, file)).thenReturn(hls);
        when(contentService.attachHlsVideo(
                eq(workId),
                eq("local:" + hls.masterStorageKey()),
                eq(file.getOriginalFilename()),
                eq("application/vnd.apple.mpegurl"),
                eq(file.getSize()),
                eq(hls.timelineVttStorageKey()),
                eq(hls.timelineSpriteStorageKey()),
                eq(2))).thenReturn(payload);

        Map<String, Object> result = new CreateWorkVideoHlsJobCommandHandler(mediaService, contentService)
                .handle(new CreateWorkVideoHlsJobCommand(workId, file, 2));

        assertThat(result).isSameAs(payload);
        verify(mediaService).prepareHlsVideo(workId, file);
        verify(contentService).attachHlsVideo(
                workId,
                "local:" + hls.masterStorageKey(),
                file.getOriginalFilename(),
                "application/vnd.apple.mpegurl",
                file.getSize(),
                hls.timelineVttStorageKey(),
                hls.timelineSpriteStorageKey(),
                2);
    }

    @Test
    void simpleVideoCommandsDelegateToContentService() {
        UUID workId = UUID.randomUUID();
        UUID firstVideoId = UUID.randomUUID();
        UUID secondVideoId = UUID.randomUUID();
        Map<String, Object> youtubePayload = Map.of("videosVersion", 2, "videos_version", 2, "videos", List.of());
        Map<String, Object> reorderPayload = Map.of("videosVersion", 3, "videos_version", 3, "videos", List.of());
        Map<String, Object> deletePayload = Map.of("videosVersion", 4, "videos_version", 4, "videos", List.of());
        when(contentService.addYouTubeVideo(any(UUID.class), any(ContentService.AddYouTubeVideoRequest.class)))
                .thenReturn(youtubePayload);
        when(contentService.reorderVideos(any(UUID.class), any(ContentService.ReorderVideosRequest.class)))
                .thenReturn(reorderPayload);
        when(contentService.deleteVideo(workId, firstVideoId, 3)).thenReturn(deletePayload);

        assertThat(new AddYouTubeWorkVideoCommandHandler(contentService)
                .handle(new AddYouTubeWorkVideoCommand(workId, "https://youtu.be/abc123xyz99", 1)))
                .isSameAs(youtubePayload);
        assertThat(new ReorderWorkVideosCommandHandler(contentService)
                .handle(new ReorderWorkVideosCommand(workId, List.of(secondVideoId, firstVideoId), 2)))
                .isSameAs(reorderPayload);
        assertThat(new DeleteWorkVideoCommandHandler(contentService)
                .handle(new DeleteWorkVideoCommand(workId, firstVideoId, 3)))
                .isSameAs(deletePayload);

        ArgumentCaptor<ContentService.AddYouTubeVideoRequest> youtubeCaptor =
                ArgumentCaptor.forClass(ContentService.AddYouTubeVideoRequest.class);
        ArgumentCaptor<ContentService.ReorderVideosRequest> reorderCaptor =
                ArgumentCaptor.forClass(ContentService.ReorderVideosRequest.class);
        verify(contentService).addYouTubeVideo(eq(workId), youtubeCaptor.capture());
        verify(contentService).reorderVideos(eq(workId), reorderCaptor.capture());
        verify(contentService).deleteVideo(workId, firstVideoId, 3);
        assertThat(youtubeCaptor.getValue().youtubeUrlOrId()).isEqualTo("https://youtu.be/abc123xyz99");
        assertThat(youtubeCaptor.getValue().expectedVideosVersion()).isEqualTo(1);
        assertThat(reorderCaptor.getValue().orderedVideoIds()).containsExactly(secondVideoId, firstVideoId);
        assertThat(reorderCaptor.getValue().expectedVideosVersion()).isEqualTo(2);
    }

    private static final class FakeWorkVideoStore implements WorkVideoStore {
        private WorkVideoUploadSessionDraft createdSession;
        private WorkVideoUploadSession activeSession;
        private int currentVersion;
        private final List<SessionLookup> activeSessionLookups = new ArrayList<>();
        private final List<SessionStatusUpdate> statusUpdates = new ArrayList<>();

        @Override
        public void createUploadSession(WorkVideoUploadSessionDraft session) {
            this.createdSession = session;
        }

        @Override
        public WorkVideoUploadSession activeUploadSession(UUID sessionId, UUID workId) {
            this.activeSessionLookups.add(new SessionLookup(sessionId, workId));
            return activeSession;
        }

        @Override
        public void markUploadSessionStatus(UUID sessionId, String status) {
            this.statusUpdates.add(new SessionStatusUpdate(sessionId, status));
        }

        @Override
        public int currentVideoVersion(UUID workId) {
            return currentVersion;
        }
    }

    private record SessionLookup(UUID sessionId, UUID workId) {
    }

    private record SessionStatusUpdate(UUID sessionId, String status) {
    }
}
