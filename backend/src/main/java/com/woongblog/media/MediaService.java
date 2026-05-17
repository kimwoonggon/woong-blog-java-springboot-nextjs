package com.woongblog.media;

import com.woongblog.common.BadRequestException;
import com.woongblog.common.NotFoundException;
import com.woongblog.config.AppProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaService {
    private final JdbcTemplate jdbcTemplate;
    private final AppProperties properties;

    public MediaService(JdbcTemplate jdbcTemplate, AppProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    @Transactional
    public Map<String, Object> upload(MultipartFile file, String bucket) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("file is required.");
        }
        String safeBucket = sanitizePathPart(bucket == null || bucket.isBlank() ? "uploads" : bucket);
        String original = file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename();
        String extension = extension(original);
        String storagePath = safeBucket + "/" + UUID.randomUUID() + extension;
        Path target = mediaRoot().resolve(storagePath).normalize();
        if (!target.startsWith(mediaRoot())) {
            throw new BadRequestException("Invalid upload path.");
        }
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException exception) {
            throw new BadRequestException("Upload failed.");
        }
        UUID id = UUID.randomUUID();
        String publicUrl = "/media/" + storagePath;
        jdbcTemplate.update("""
                INSERT INTO "Assets" ("Id", "Bucket", "Path", "PublicUrl", "MimeType", "Size", "Kind", "CreatedAt")
                VALUES (?, ?, ?, ?, ?, ?, ?, now())
                """, id, safeBucket, storagePath, publicUrl, safeContentType(file.getContentType()), file.getSize(), kind(file.getContentType()));
        return Map.of("id", id, "url", publicUrl, "path", storagePath);
    }

    @Transactional
    public Map<String, Object> delete(UUID id) {
        String path = jdbcTemplate.query("""
                SELECT "Path" FROM "Assets" WHERE "Id" = ?
                """, rs -> rs.next() ? rs.getString("Path") : null, id);
        if (path == null) {
            throw new NotFoundException("Asset not found");
        }
        jdbcTemplate.update("DELETE FROM \"Assets\" WHERE \"Id\" = ?", id);
        try {
            Files.deleteIfExists(mediaRoot().resolve(path).normalize());
        } catch (IOException ignored) {
            // Deleting the metadata is enough for API parity; storage cleanup can be retried later.
        }
        return Map.of("success", true);
    }

    public Path writeBytes(String storagePath, byte[] bytes) {
        Path target = mediaRoot().resolve(storagePath).normalize();
        if (!target.startsWith(mediaRoot())) {
            throw new BadRequestException("Invalid storage path.");
        }
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
            return target;
        } catch (IOException exception) {
            throw new BadRequestException("Failed to write media.");
        }
    }

    public HlsProcessingResult prepareHlsVideo(UUID workId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("file is required.");
        }

        String directory = "videos/%s/%s/hls".formatted(workId, UUID.randomUUID());
        String sourceKey = directory + "/source-" + safeName(file.getOriginalFilename());
        String masterKey = directory + "/master.m3u8";
        String segmentPattern = mediaRoot().resolve(directory + "/segment_%05d.ts").normalize().toString();
        String spriteKey = directory + "/timeline-sprite.jpg";
        String vttKey = directory + "/timeline.vtt";

        Path source = writeBytes(sourceKey, file.getBytes());
        Path master = mediaRoot().resolve(masterKey).normalize();
        if (!master.startsWith(mediaRoot())) {
            throw new BadRequestException("Invalid storage path.");
        }

        runRequiredMediaCommand(List.of(
                "ffmpeg",
                "-y",
                "-i", source.toString(),
                "-map", "0:v:0",
                "-map", "0:a?",
                "-c", "copy",
                "-start_number", "0",
                "-hls_time", "1",
                "-hls_list_size", "0",
                "-hls_segment_filename", segmentPattern,
                master.toString()));

        writePreviewSprite(source, spriteKey);
        writeBytes(vttKey, """
                WEBVTT

                00:00:00.000 --> 00:10:00.000
                timeline-sprite.jpg#xywh=0,0,160,90
                """.getBytes(StandardCharsets.UTF_8));

        return new HlsProcessingResult(masterKey, vttKey, spriteKey);
    }

    public Path mediaRoot() {
        return properties.getAuth().getMediaRoot().toAbsolutePath().normalize();
    }

    private void writePreviewSprite(Path source, String spriteKey) {
        Path sprite = mediaRoot().resolve(spriteKey).normalize();
        if (!sprite.startsWith(mediaRoot())) {
            throw new BadRequestException("Invalid storage path.");
        }
        try {
            runRequiredMediaCommand(List.of(
                    "ffmpeg",
                    "-y",
                    "-ss", "0",
                    "-i", source.toString(),
                    "-frames:v", "1",
                    "-vf", "scale=160:90:force_original_aspect_ratio=decrease,pad=160:90:(ow-iw)/2:(oh-ih)/2",
                    sprite.toString()));
        } catch (BadRequestException ignored) {
            byte[] fallbackJpeg = Base64.getDecoder().decode(
                    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Ap//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z");
            writeBytes(spriteKey, fallbackJpeg);
        }
    }

    private void runRequiredMediaCommand(List<String> command) {
        Process process = null;
        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            builder.redirectErrorStream(true);
            process = builder.start();
            byte[] output = process.getInputStream().readAllBytes();
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new BadRequestException("MP4 must be H.264/AAC compatible for copy-mode HLS.");
            }
        } catch (IOException exception) {
            throw new BadRequestException("Video processing is unavailable.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Video processing was interrupted.");
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }

    private static String sanitizePathPart(String value) {
        String sanitized = value.replace('\\', '/').replaceAll("[^A-Za-z0-9/_-]+", "-");
        sanitized = sanitized.replaceAll("/+", "/").replaceAll("^/|/$", "");
        return sanitized.isBlank() || sanitized.contains("..") ? "uploads" : sanitized;
    }

    private static String extension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot).replaceAll("[^A-Za-z0-9.]", "").toLowerCase();
    }

    private static String safeName(String value) {
        String name = value == null || value.isBlank() ? "video.mp4" : value;
        return name.replaceAll("[^A-Za-z0-9._-]", "-");
    }

    private static String safeContentType(String contentType) {
        return contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType;
    }

    private static String kind(String contentType) {
        if (contentType == null) {
            return "other";
        }
        if (contentType.startsWith("image/")) {
            return "image";
        }
        if (contentType.equals("application/pdf")) {
            return "pdf";
        }
        if (contentType.startsWith("video/")) {
            return "video";
        }
        return "other";
    }

    public record HlsProcessingResult(String masterStorageKey, String timelineVttStorageKey, String timelineSpriteStorageKey) {
    }
}
