package com.woongblog.application.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.woongblog.common.NotFoundException;
import java.sql.ResultSet;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
class JdbcWorkVideoStoreTest {
    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void createUploadSessionPersistsDraftWithExpectedColumnsAndValues() {
        UUID sessionId = UUID.randomUUID();
        UUID workId = UUID.randomUUID();
        WorkVideoUploadSessionDraft draft = new WorkVideoUploadSessionDraft(
                sessionId,
                workId,
                "local",
                "videos/work/clip.mp4",
                "clip.mp4",
                "video/mp4",
                2048L,
                "pending");

        new JdbcWorkVideoStore(jdbcTemplate).createUploadSession(draft);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                eq(sessionId),
                eq(workId),
                eq("local"),
                eq("videos/work/clip.mp4"),
                eq("clip.mp4"),
                eq("video/mp4"),
                eq(2048L),
                eq("pending"));
        assertThat(sqlCaptor.getValue())
                .contains("INSERT INTO \"WorkVideoUploadSessions\"")
                .contains("\"Id\"", "\"WorkId\"", "\"StorageType\"", "\"StorageKey\"")
                .contains("\"OriginalFileName\"", "\"ExpectedMimeType\"", "\"ExpectedSize\"", "\"Status\"")
                .contains("now() + interval '30 minutes'", "now()");
    }

    @Test
    void activeUploadSessionMapsLiveSessionRow() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID workId = UUID.randomUUID();
        when(jdbcTemplate.query(
                contains("FROM \"WorkVideoUploadSessions\""),
                ArgumentMatchers.<ResultSetExtractor<WorkVideoUploadSession>>any(),
                eq(sessionId),
                eq(workId)))
                .thenAnswer(invocation -> {
                    ResultSetExtractor<WorkVideoUploadSession> extractor = invocation.getArgument(1);
                    ResultSet resultSet = mock(ResultSet.class);
                    when(resultSet.next()).thenReturn(true);
                    when(resultSet.getString("StorageKey")).thenReturn("videos/work/clip.mp4");
                    when(resultSet.getString("OriginalFileName")).thenReturn("clip.mp4");
                    when(resultSet.getString("ExpectedMimeType")).thenReturn("video/mp4");
                    when(resultSet.getLong("ExpectedSize")).thenReturn(2048L);
                    return extractor.extractData(resultSet);
                });

        WorkVideoUploadSession session = new JdbcWorkVideoStore(jdbcTemplate).activeUploadSession(sessionId, workId);

        assertThat(session)
                .isEqualTo(new WorkVideoUploadSession(
                        "videos/work/clip.mp4",
                        "clip.mp4",
                        "video/mp4",
                        2048L));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(
                sqlCaptor.capture(),
                ArgumentMatchers.<ResultSetExtractor<WorkVideoUploadSession>>any(),
                eq(sessionId),
                eq(workId));
        assertThat(sqlCaptor.getValue())
                .contains("SELECT \"StorageKey\", \"OriginalFileName\", \"ExpectedMimeType\", \"ExpectedSize\"")
                .contains("WHERE \"Id\" = ? AND \"WorkId\" = ? AND \"ExpiresAt\" > now()");
    }

    @Test
    void activeUploadSessionThrowsNotFoundWhenNoLiveSessionExists() {
        UUID sessionId = UUID.randomUUID();
        UUID workId = UUID.randomUUID();
        when(jdbcTemplate.query(
                contains("FROM \"WorkVideoUploadSessions\""),
                ArgumentMatchers.<ResultSetExtractor<WorkVideoUploadSession>>any(),
                eq(sessionId),
                eq(workId)))
                .thenAnswer(invocation -> {
                    ResultSetExtractor<WorkVideoUploadSession> extractor = invocation.getArgument(1);
                    ResultSet resultSet = mock(ResultSet.class);
                    when(resultSet.next()).thenReturn(false);
                    return extractor.extractData(resultSet);
                });

        assertThatThrownBy(() -> new JdbcWorkVideoStore(jdbcTemplate).activeUploadSession(sessionId, workId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Upload session not found.");
    }

    @Test
    void markUploadSessionStatusUpdatesStatusBySessionId() {
        UUID sessionId = UUID.randomUUID();

        new JdbcWorkVideoStore(jdbcTemplate).markUploadSessionStatus(sessionId, "uploaded");

        verify(jdbcTemplate).update(
                "UPDATE \"WorkVideoUploadSessions\" SET \"Status\" = ? WHERE \"Id\" = ?",
                "uploaded",
                sessionId);
    }

    @Test
    void currentVideoVersionReturnsWorkVideosVersion() {
        UUID workId = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(
                "SELECT \"VideosVersion\" FROM \"Works\" WHERE \"Id\" = ?",
                Integer.class,
                workId))
                .thenReturn(7);

        int version = new JdbcWorkVideoStore(jdbcTemplate).currentVideoVersion(workId);

        assertThat(version).isEqualTo(7);
    }

    @Test
    void currentVideoVersionThrowsNotFoundWhenWorkDoesNotExist() {
        UUID workId = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(
                "SELECT \"VideosVersion\" FROM \"Works\" WHERE \"Id\" = ?",
                Integer.class,
                workId))
                .thenReturn(null);

        assertThatThrownBy(() -> new JdbcWorkVideoStore(jdbcTemplate).currentVideoVersion(workId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Work not found.");
    }
}
