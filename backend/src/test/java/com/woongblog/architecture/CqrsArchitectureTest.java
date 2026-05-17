package com.woongblog.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("architecture")
class CqrsArchitectureTest {
    @Test
    void httpControllersDelegateToApplicationHandlersInsteadOfInfrastructureServices() throws IOException {
        Path sourceRoot = repoPath("backend/src/main/java");

        String publicController = read(sourceRoot.resolve("com/woongblog/api/publicapi/PublicContentController.java"));
        assertThat(publicController).contains("com.woongblog.application.");
        assertThat(publicController).doesNotContain("ContentService");

        String adminController = read(sourceRoot.resolve("com/woongblog/api/admin/AdminContentController.java"));
        assertThat(adminController).contains("com.woongblog.application.");
        assertThat(adminController).doesNotContain("ContentService");

        String aiController = read(sourceRoot.resolve("com/woongblog/ai/AiController.java"));
        assertThat(aiController).contains("com.woongblog.application.ai.");
        assertThat(aiController).doesNotContain("AiService");

        String workVideoController = read(sourceRoot.resolve("com/woongblog/media/WorkVideoController.java"));
        assertThat(workVideoController).contains("com.woongblog.application.media.");
        assertThat(workVideoController)
                .doesNotContain("JdbcTemplate")
                .doesNotContain("ContentService")
                .doesNotContain("MediaService");
    }

    @Test
    void devCiKeepsCSharpGitFlowShapeWithJavaBackendJobs() throws IOException {
        String workflow = read(repoPath(".github/workflows/ci-dev.yml"));

        assertThat(workflow)
                .contains("branches:")
                .contains("- dev")
                .contains("\"feature/**\"")
                .contains("backend-unit-tests")
                .contains("backend-component-tests")
                .contains("backend-architecture-tests")
                .contains("backend-web-tests")
                .contains("backend-integration-tests")
                .contains("contract-tests")
                .contains("actions/setup-java@v4")
                .contains("java-version: 21")
                .contains("bash ./scripts/run-unit-tests.sh")
                .contains("bash ./scripts/run-component-tests.sh")
                .contains("bash ./scripts/run-architecture-tests.sh")
                .contains("bash ./scripts/run-web-tests.sh")
                .contains("bash ./scripts/run-integration-tests.sh")
                .doesNotContain("actions/setup-dotnet")
                .doesNotContain("dotnet test");
    }

    @Test
    void legacyDevSchemaMigrationKeepsPersistedLocalDatabasesUsable() throws IOException {
        String migration = read(repoPath("backend/src/main/resources/db/migration/V2__legacy_dev_schema_defaults.sql"));
        String workVideoMigration = read(repoPath("backend/src/main/resources/db/migration/V3__work_video_created_at_default.sql"));

        assertThat(migration)
                .contains("\"AuthSessions\"")
                .contains("\"UserAgent\"")
                .contains("\"IpAddress\"")
                .contains("SET DEFAULT ''''")
                .contains("\"Works\"")
                .contains("\"VideosVersion\"")
                .contains("\"CreatedAt\"")
                .contains("\"UpdatedAt\"");
        assertThat(workVideoMigration)
                .contains("\"WorkVideos\"")
                .contains("ALTER COLUMN \"CreatedAt\" SET DEFAULT now()");
    }

    private static String read(Path path) throws IOException {
        assertThat(path).exists();
        return Files.readString(path);
    }

    private static Path repoPath(String relativePath) {
        Path current = Path.of("").toAbsolutePath();
        if (Files.exists(current.resolve(relativePath))) {
            return current.resolve(relativePath);
        }
        Path parent = current.getParent();
        if (parent != null && Files.exists(parent.resolve(relativePath))) {
            return parent.resolve(relativePath);
        }
        return current.resolve(relativePath);
    }
}
