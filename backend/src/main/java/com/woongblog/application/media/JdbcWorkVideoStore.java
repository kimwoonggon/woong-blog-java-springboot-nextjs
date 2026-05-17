package com.woongblog.application.media;

import com.woongblog.common.NotFoundException;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcWorkVideoStore implements WorkVideoStore {
    private final JdbcTemplate jdbcTemplate;

    public JdbcWorkVideoStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void createUploadSession(WorkVideoUploadSessionDraft session) {
        jdbcTemplate.update("""
                INSERT INTO "WorkVideoUploadSessions" ("Id", "WorkId", "StorageType", "StorageKey", "OriginalFileName", "ExpectedMimeType", "ExpectedSize", "Status", "ExpiresAt", "CreatedAt")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, now() + interval '30 minutes', now())
                """,
                session.id(),
                session.workId(),
                session.storageType(),
                session.storageKey(),
                session.originalFileName(),
                session.expectedMimeType(),
                session.expectedSize(),
                session.status());
    }

    @Override
    public WorkVideoUploadSession activeUploadSession(UUID sessionId, UUID workId) {
        return jdbcTemplate.query("""
                SELECT "StorageKey", "OriginalFileName", "ExpectedMimeType", "ExpectedSize"
                FROM "WorkVideoUploadSessions"
                WHERE "Id" = ? AND "WorkId" = ? AND "ExpiresAt" > now()
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Upload session not found.");
            }
            return new WorkVideoUploadSession(
                    rs.getString("StorageKey"),
                    rs.getString("OriginalFileName"),
                    rs.getString("ExpectedMimeType"),
                    rs.getLong("ExpectedSize"));
        }, sessionId, workId);
    }

    @Override
    public void markUploadSessionStatus(UUID sessionId, String status) {
        jdbcTemplate.update("UPDATE \"WorkVideoUploadSessions\" SET \"Status\" = ? WHERE \"Id\" = ?", status, sessionId);
    }

    @Override
    public int currentVideoVersion(UUID workId) {
        Integer version;
        try {
            version = jdbcTemplate.queryForObject("SELECT \"VideosVersion\" FROM \"Works\" WHERE \"Id\" = ?", Integer.class, workId);
        } catch (EmptyResultDataAccessException exception) {
            throw new NotFoundException("Work not found.");
        }
        if (version == null) {
            throw new NotFoundException("Work not found.");
        }
        return version;
    }
}
