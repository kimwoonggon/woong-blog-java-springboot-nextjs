package com.woongblog.content;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.common.JsonSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@Tag("unit")
class ContentServiceVideoSqlTests {
    @Test
    void videoInsertSqlsExplicitlySetCreatedAtForLegacyDevSchemas() {
        RecordingJdbcTemplate jdbcTemplate = new RecordingJdbcTemplate();
        ContentService contentService = new ContentService(jdbcTemplate, new JsonSupport(new ObjectMapper()));
        UUID workId = UUID.randomUUID();

        contentService.addYouTubeVideo(
                workId,
                new ContentService.AddYouTubeVideoRequest("https://youtu.be/abc123xyz99", 1));
        contentService.attachLocalVideo(
                workId,
                "hls",
                "local:videos/work/master.m3u8",
                "clip.mp4",
                "application/vnd.apple.mpegurl",
                1234L,
                1);
        contentService.attachHlsVideo(
                workId,
                "local:videos/work/hls/master.m3u8",
                "clip.mp4",
                "application/vnd.apple.mpegurl",
                1234L,
                "videos/work/hls/timeline.vtt",
                "videos/work/hls/timeline-sprite.jpg",
                1);

        List<SqlCall> videoInserts = jdbcTemplate.updates.stream()
                .filter(call -> call.sql().contains("INSERT INTO \"WorkVideos\""))
                .toList();
        assertThat(videoInserts).hasSize(3);
        assertThat(videoInserts)
                .allSatisfy(call -> assertThat(call.sql())
                        .contains("\"CreatedAt\"")
                        .contains("now()"));
        assertThat(videoInserts.get(2).sql())
                .contains("\"TimelinePreviewVttStorageKey\"")
                .contains("\"TimelinePreviewSpriteStorageKey\"");
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final List<SqlCall> updates = new ArrayList<>();

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (sql.contains("COUNT(*)")) {
                return requiredType.cast(0);
            }
            if (sql.contains("COALESCE(MAX")) {
                return requiredType.cast(-1);
            }
            if (sql.contains("SELECT \"VideosVersion\"")) {
                return requiredType.cast(1);
            }
            return requiredType.cast(0);
        }

        @Override
        public int update(String sql, Object... args) {
            updates.add(new SqlCall(sql, List.of(args)));
            return 1;
        }

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            return List.of();
        }
    }

    private record SqlCall(String sql, List<Object> args) {
    }
}
