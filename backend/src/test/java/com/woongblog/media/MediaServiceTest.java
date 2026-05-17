package com.woongblog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.woongblog.common.BadRequestException;
import com.woongblog.common.NotFoundException;
import com.woongblog.config.AppProperties;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.sql.ResultSet;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedConstruction;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
class MediaServiceTest {
    @TempDir
    private Path mediaRoot;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private AppProperties properties;

    @Mock
    private AppProperties.Auth auth;

    private MediaService mediaService;

    @BeforeEach
    void setUp() {
        lenient().when(properties.getAuth()).thenReturn(auth);
        lenient().when(auth.getMediaRoot()).thenReturn(mediaRoot);
        mediaService = new MediaService(jdbcTemplate, properties);
    }

    @Test
    void uploadSanitizesBucketStoresFileAndPersistsAssetMetadata() throws Exception {
        byte[] content = "image-bytes".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "Hero Shot.PNG", "image/png", content);

        Map<String, Object> result = mediaService.upload(file, "/gallery//Unsafe name/");

        assertThat(result.get("id")).isInstanceOf(UUID.class);
        assertThat(result.get("path"))
                .asString()
                .startsWith("gallery/Unsafe-name/")
                .endsWith(".png");
        assertThat(result).containsEntry("url", "/media/" + result.get("path"));
        assertThat(Files.readAllBytes(mediaRoot.resolve((String) result.get("path")))).isEqualTo(content);

        ArgumentCaptor<UUID> idCaptor = ArgumentCaptor.forClass(UUID.class);
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> publicUrlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                contains("INSERT INTO \"Assets\""),
                idCaptor.capture(),
                eq("gallery/Unsafe-name"),
                pathCaptor.capture(),
                publicUrlCaptor.capture(),
                eq("image/png"),
                eq((long) content.length),
                eq("image"));
        assertThat(idCaptor.getValue()).isInstanceOf(UUID.class);
        assertThat(pathCaptor.getValue()).isEqualTo(result.get("path"));
        assertThat(publicUrlCaptor.getValue()).isEqualTo(result.get("url"));
    }

    @Test
    void uploadUsesSafeDefaultsForBlankBucketMissingNameAndMissingContentType() {
        MockMultipartFile file = new MockMultipartFile("file", "ignored", null, "payload".getBytes(StandardCharsets.UTF_8)) {
            @Override
            public String getOriginalFilename() {
                return null;
            }
        };

        Map<String, Object> result = mediaService.upload(file, "   ");

        assertThat(result.get("path"))
                .asString()
                .startsWith("uploads/")
                .endsWith(".bin");
        verify(jdbcTemplate).update(
                contains("INSERT INTO \"Assets\""),
                any(UUID.class),
                eq("uploads"),
                eq(result.get("path")),
                eq(result.get("url")),
                eq("application/octet-stream"),
                eq(7L),
                eq("other"));
    }

    @Test
    void uploadWrapsTransferFailureAsBadRequestBeforePersistingMetadata() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("avatar.png");
        doThrow(new IOException("disk full")).when(file).transferTo(any(Path.class));

        assertThatThrownBy(() -> mediaService.upload(file, "avatars"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Upload failed.");

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void uploadRejectsPathWhenResolvedTargetLeavesCurrentMediaRoot() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "image-bytes".getBytes(StandardCharsets.UTF_8));
        stubMediaRoots(mediaRoot.resolve("first-root"), mediaRoot.resolve("second-root"));

        assertThatThrownBy(() -> mediaService.upload(file, "avatars"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid upload path.");

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void uploadClassifiesPdfVideoAndUnknownContentTypes() {
        assertUploadedKind("document.PDF", "application/pdf", ".pdf", "pdf");
        assertUploadedKind("clip.MP4", "video/mp4", ".mp4", "video");
        assertUploadedKind("README", "text/plain", "", "other");
    }

    @Test
    void uploadRejectsEmptyFileBeforePersistingAnything() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> mediaService.upload(file, "uploads"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("file is required.");

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void deleteRemovesAssetMetadataAndStoredFile() throws Exception {
        UUID id = UUID.randomUUID();
        Path existingFile = mediaRoot.resolve("uploads/old.txt");
        Files.createDirectories(existingFile.getParent());
        Files.writeString(existingFile, "old", StandardCharsets.UTF_8);
        stubAssetPathLookup(id, "uploads/old.txt");

        Map<String, Object> result = mediaService.delete(id);

        assertThat(result).containsEntry("success", true);
        assertThat(existingFile).doesNotExist();
        verify(jdbcTemplate).update("DELETE FROM \"Assets\" WHERE \"Id\" = ?", id);
    }

    @Test
    void deleteThrowsNotFoundWhenAssetDoesNotExist() {
        UUID id = UUID.randomUUID();
        stubAssetPathLookup(id, null);

        assertThatThrownBy(() -> mediaService.delete(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Asset not found");

        verify(jdbcTemplate, never()).update(eq("DELETE FROM \"Assets\" WHERE \"Id\" = ?"), any(UUID.class));
    }

    @Test
    void deleteReturnsSuccessWhenStorageCleanupFails() throws Exception {
        UUID id = UUID.randomUUID();
        Path nonEmptyDirectory = mediaRoot.resolve("uploads/non-empty");
        Files.createDirectories(nonEmptyDirectory);
        Files.writeString(nonEmptyDirectory.resolve("child.txt"), "still here", StandardCharsets.UTF_8);
        stubAssetPathLookup(id, "uploads/non-empty");

        Map<String, Object> result = mediaService.delete(id);

        assertThat(result).containsEntry("success", true);
        assertThat(nonEmptyDirectory).exists();
        verify(jdbcTemplate).update("DELETE FROM \"Assets\" WHERE \"Id\" = ?", id);
    }

    @Test
    void writeBytesRejectsStoragePathTraversal() {
        assertThatThrownBy(() -> mediaService.writeBytes("../outside.txt", "x".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid storage path.");
    }

    @Test
    void writeBytesWrapsDirectoryCreationFailure() throws Exception {
        Files.writeString(mediaRoot.resolve("blocked"), "not a directory", StandardCharsets.UTF_8);

        assertThatThrownBy(() -> mediaService.writeBytes("blocked/file.txt", "x".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Failed to write media.");
    }

    @Test
    void prepareHlsVideoRejectsEmptyUploadBeforeStartingProcessing() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.mp4", "video/mp4", new byte[0]);

        assertThatThrownBy(() -> mediaService.prepareHlsVideo(UUID.randomUUID(), file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("file is required.");
    }

    @Test
    void prepareHlsVideoWrapsUnavailableProcessingAsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "not-a-video".getBytes(StandardCharsets.UTF_8));

        try (MockedConstruction<ProcessBuilder> ignored = mockConstruction(ProcessBuilder.class, (builder, context) -> {
            when(builder.redirectErrorStream(true)).thenReturn(builder);
            when(builder.start()).thenThrow(new IOException("ffmpeg unavailable"));
        })) {
            assertThatThrownBy(() -> mediaService.prepareHlsVideo(UUID.randomUUID(), file))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessage("Video processing is unavailable.");
        }
    }

    @Test
    void prepareHlsVideoRejectsMasterPathWhenMediaRootChangesBeforeValidation() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "video-bytes".getBytes(StandardCharsets.UTF_8));
        Path firstRoot = mediaRoot.resolve("first-root");
        Path secondRoot = mediaRoot.resolve("second-root");
        stubMediaRoots(firstRoot, firstRoot, firstRoot, firstRoot, secondRoot);

        assertThatThrownBy(() -> mediaService.prepareHlsVideo(UUID.randomUUID(), file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid storage path.");
    }

    @Test
    void prepareHlsVideoReturnsKeysAndWritesTimelineWhenProcessingSucceeds() throws Exception {
        UUID workId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "Clip One.mp4",
                "video/mp4",
                "video-bytes".getBytes(StandardCharsets.UTF_8));
        Process hlsProcess = processWithExitCode(0);
        Process spriteProcess = processWithExitCode(0);
        List<List<String>> commands = new ArrayList<>();

        try (MockedConstruction<ProcessBuilder> construction = mockProcessBuilders(commands, hlsProcess, spriteProcess)) {
            MediaService.HlsProcessingResult result = mediaService.prepareHlsVideo(workId, file);

            assertThat(result.masterStorageKey()).startsWith("videos/" + workId + "/").endsWith("/master.m3u8");
            assertThat(result.timelineVttStorageKey()).startsWith("videos/" + workId + "/").endsWith("/timeline.vtt");
            assertThat(result.timelineSpriteStorageKey()).startsWith("videos/" + workId + "/").endsWith("/timeline-sprite.jpg");
            assertThat(Files.readString(mediaRoot.resolve(result.timelineVttStorageKey()), StandardCharsets.UTF_8))
                    .contains("WEBVTT", "timeline-sprite.jpg#xywh=0,0,160,90");
            assertThat(Files.exists(mediaRoot.resolve(result.masterStorageKey()).getParent().resolve("source-Clip-One.mp4"))).isTrue();
            assertThat(construction.constructed()).hasSize(2);
        }

        assertThat(commands).hasSize(2);
        assertThat(commands.get(0)).contains("ffmpeg", "-hls_segment_filename");
        assertThat(commands.get(1)).contains("ffmpeg", "-vf");
    }

    @Test
    void prepareHlsVideoRejectsSpritePathWhenMediaRootChangesBeforeValidation() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "video-bytes".getBytes(StandardCharsets.UTF_8));
        Path firstRoot = mediaRoot.resolve("first-root");
        Path secondRoot = mediaRoot.resolve("second-root");
        stubMediaRoots(firstRoot, firstRoot, firstRoot, firstRoot, firstRoot, firstRoot, secondRoot);
        Process hlsProcess = processWithExitCode(0);

        try (MockedConstruction<ProcessBuilder> construction = mockProcessBuilders(new ArrayList<>(), hlsProcess)) {
            assertThatThrownBy(() -> mediaService.prepareHlsVideo(UUID.randomUUID(), file))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessage("Invalid storage path.");

            assertThat(construction.constructed()).hasSize(1);
        }
    }

    @Test
    void prepareHlsVideoWritesFallbackSpriteWhenPreviewGenerationFails() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "video-bytes".getBytes(StandardCharsets.UTF_8));
        Process hlsProcess = processWithExitCode(0);
        Process failedSpriteProcess = processWithExitCode(1);

        MediaService.HlsProcessingResult result;
        try (MockedConstruction<ProcessBuilder> ignored = mockProcessBuilders(new ArrayList<>(), hlsProcess, failedSpriteProcess)) {
            result = mediaService.prepareHlsVideo(UUID.randomUUID(), file);
        }

        Path fallbackSprite = mediaRoot.resolve(result.timelineSpriteStorageKey());
        assertThat(fallbackSprite).exists();
        assertThat(Files.size(fallbackSprite)).isGreaterThan(0L);
    }

    @Test
    void prepareHlsVideoWrapsNonZeroHlsExit() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "video-bytes".getBytes(StandardCharsets.UTF_8));
        Process failedHlsProcess = processWithExitCode(1);

        try (MockedConstruction<ProcessBuilder> ignored = mockProcessBuilders(new ArrayList<>(), failedHlsProcess)) {
            assertThatThrownBy(() -> mediaService.prepareHlsVideo(UUID.randomUUID(), file))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessage("MP4 must be H.264/AAC compatible for copy-mode HLS.");
        }
    }

    @Test
    void prepareHlsVideoRestoresInterruptAndDestroysLiveProcessWhenProcessingIsInterrupted() throws Exception {
        Thread.interrupted();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "video-bytes".getBytes(StandardCharsets.UTF_8));
        Process interruptedProcess = processInterruptedWhileAlive();

        try (MockedConstruction<ProcessBuilder> ignored = mockProcessBuilders(new ArrayList<>(), interruptedProcess)) {
            assertThatThrownBy(() -> mediaService.prepareHlsVideo(UUID.randomUUID(), file))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessage("Video processing was interrupted.");
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
            verify(interruptedProcess).destroyForcibly();
        } finally {
            Thread.interrupted();
        }
    }

    private void assertUploadedKind(String fileName, String contentType, String expectedExtension, String expectedKind) {
        byte[] content = "data".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", fileName, contentType, content);

        Map<String, Object> result = mediaService.upload(file, "uploads");

        String path = (String) result.get("path");
        assertThat(path).startsWith("uploads/");
        if (expectedExtension.isEmpty()) {
            assertThat(path.substring(path.lastIndexOf('/') + 1)).doesNotContain(".");
        } else {
            assertThat(path).endsWith(expectedExtension);
        }
        verify(jdbcTemplate).update(
                contains("INSERT INTO \"Assets\""),
                any(UUID.class),
                eq("uploads"),
                eq(result.get("path")),
                eq(result.get("url")),
                eq(contentType),
                eq((long) content.length),
                eq(expectedKind));
    }

    private void stubAssetPathLookup(UUID id, String path) {
        when(jdbcTemplate.query(
                contains("SELECT \"Path\""),
                any(ResultSetExtractor.class),
                eq(id))).thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    ResultSetExtractor<String> extractor = invocation.getArgument(1);
                    ResultSet resultSet = mock(ResultSet.class);
                    when(resultSet.next()).thenReturn(path != null);
                    if (path != null) {
                        when(resultSet.getString("Path")).thenReturn(path);
                    }
                    return extractor.extractData(resultSet);
                });
    }

    private void stubMediaRoots(Path firstRoot, Path... remainingRoots) {
        when(auth.getMediaRoot()).thenReturn(firstRoot, remainingRoots);
    }

    private static Process processWithExitCode(int exitCode) throws Exception {
        Process process = mock(Process.class);
        when(process.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[0]));
        when(process.waitFor()).thenReturn(exitCode);
        when(process.isAlive()).thenReturn(false);
        return process;
    }

    private static Process processInterruptedWhileAlive() throws Exception {
        Process process = mock(Process.class);
        when(process.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[0]));
        when(process.waitFor()).thenThrow(new InterruptedException("interrupted"));
        when(process.isAlive()).thenReturn(true);
        when(process.destroyForcibly()).thenReturn(process);
        return process;
    }

    private static MockedConstruction<ProcessBuilder> mockProcessBuilders(List<List<String>> commands, Process... processes) {
        AtomicInteger processIndex = new AtomicInteger();
        return mockConstruction(ProcessBuilder.class, (builder, context) -> {
            @SuppressWarnings("unchecked")
            List<String> command = (List<String>) context.arguments().get(0);
            commands.add(command);
            when(builder.redirectErrorStream(true)).thenReturn(builder);
            when(builder.start()).thenAnswer(invocation -> processes[processIndex.getAndIncrement()]);
        });
    }
}
