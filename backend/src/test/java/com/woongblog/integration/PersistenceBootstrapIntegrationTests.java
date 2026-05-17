package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.woongblog.content.DbSeeder;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@Tag("integration")
class PersistenceBootstrapIntegrationTests extends IntegrationTestSupport {
    @Autowired
    private DbSeeder dbSeeder;

    @Test
    void flywayCreatesCoreTablesNeededByPublicAdminAuthAndAiFlows() {
        List<String> tables = jdbcTemplate.queryForList("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                """, String.class);

        assertThat(tables).contains(
                "Assets",
                "SiteSettings",
                "Profiles",
                "Pages",
                "Blogs",
                "Works",
                "WorkVideos",
                "AuthSessions",
                "AiBatchJobs",
                "AiBatchJobItems");
    }

    @Test
    void flywayCreatesSearchExtensionAndTrigramIndexesForPublicLists() {
        Integer extensionCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_trgm'
                """, Integer.class);
        List<String> indexes = jdbcTemplate.queryForList("""
                SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
                """, String.class);

        assertThat(extensionCount).isEqualTo(1);
        assertThat(indexes).contains(
                "IX_Blogs_SearchTitle_Trgm",
                "IX_Blogs_SearchText_Trgm",
                "IX_Works_SearchTitle_Trgm",
                "IX_Works_SearchText_Trgm");
    }

    @Test
    void seededDatasetHasEnoughRowsForPaginationAndDetailContextTests() {
        Integer blogCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM "Blogs" WHERE "Published" = true
                """, Integer.class);
        Integer workCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM "Works" WHERE "Published" = true
                """, Integer.class);
        Integer pageCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM "Pages"
                """, Integer.class);

        assertThat(blogCount).isGreaterThanOrEqualTo(20);
        assertThat(workCount).isGreaterThanOrEqualTo(20);
        assertThat(pageCount).isGreaterThanOrEqualTo(3);
    }

    @Test
    void dbSeederIsIdempotentAfterInitialBootstrapping() {
        Map<String, Integer> before = seededCounts();

        dbSeeder.run(null);

        assertThat(seededCounts()).isEqualTo(before);
    }

    @Test
    void authSessionAndWorkVideoUniquenessIndexesMatchLegacyConstraints() {
        List<String> indexes = jdbcTemplate.queryForList("""
                SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
                """, String.class);

        assertThat(indexes).contains(
                "IX_AuthSessions_SessionKey",
                "IX_WorkVideos_WorkId_SortOrder");
    }

    @Test
    void aiBatchJobItemRowsCascadeWhenParentJobIsDeleted() {
        UUID jobId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO "AiBatchJobs" ("Id", "TargetType", "Status", "SelectionMode", "SelectionLabel", "SelectionKey", "All", "AutoApply", "WorkerCount",
                                           "CancelRequested", "TotalCount", "ProcessedCount", "SucceededCount", "FailedCount", "Provider", "Model",
                                           "ReasoningEffort", "PromptMode", "CustomPrompt", "CreatedAt", "UpdatedAt")
                VALUES (?, 'blog', 'completed', 'selected', 'Cascade test', 'cascade', false, false, 1,
                        false, 1, 1, 1, 0, 'fake', 'gpt-5.4-mini', 'medium', 'default', null, now(), now())
                """, jobId);
        jdbcTemplate.update("""
                INSERT INTO "AiBatchJobItems" ("Id", "JobId", "EntityId", "Title", "Status", "FixedHtml", "CreatedAt")
                VALUES (?, ?, ?, 'Cascade item', 'fixed', '<p>fixed</p>', now())
                """, itemId, jobId, entityId);

        jdbcTemplate.update("DELETE FROM \"AiBatchJobs\" WHERE \"Id\" = ?", jobId);

        Integer itemCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM "AiBatchJobItems" WHERE "Id" = ?
                """, Integer.class, itemId);
        assertThat(itemCount).isZero();
    }

    @Test
    void flywayMigrationHistoryIsRecordedForAllKnownMigrations() {
        List<String> migrations = jdbcTemplate.queryForList("""
                SELECT script FROM flyway_schema_history WHERE success = true ORDER BY installed_rank
                """, String.class);

        assertThat(migrations).contains(
                "V1__initial_schema.sql",
                "V2__legacy_dev_schema_defaults.sql",
                "V3__work_video_created_at_default.sql");
    }

    @Test
    void authSessionsAcceptMinimalCurrentSessionRowsWithoutLegacyClientColumns() {
        UUID sessionId = UUID.randomUUID();
        UUID profileId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        String sessionKey = "session-" + UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO "AuthSessions" ("Id", "ProfileId", "SessionKey", "ExpiresAt")
                VALUES (?, ?, ?, now() + interval '1 hour')
                """, sessionId, profileId, sessionKey);

        Map<String, Object> row = jdbcTemplate.queryForMap("""
                SELECT "SessionKey", "LastSeenAt", "ExpiresAt" FROM "AuthSessions" WHERE "Id" = ?
                """, sessionId);

        assertThat(row.get("SessionKey")).isEqualTo(sessionKey);
        assertThat(row.get("LastSeenAt")).isNotNull();
        assertThat(row.get("ExpiresAt")).isNotNull();
    }

    private Map<String, Integer> seededCounts() {
        return Map.of(
                "pages", jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"Pages\"", Integer.class),
                "blogs", jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"Blogs\"", Integer.class),
                "works", jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"Works\"", Integer.class));
    }
}
