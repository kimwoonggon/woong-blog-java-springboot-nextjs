package com.woongblog.content;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

@Tag("unit")
class DbSeederTests {
    @Test
    void supplementalWorkSeedsExplicitVideosVersionForExistingDevSchemas() {
        RecordingJdbcTemplate jdbcTemplate = new RecordingJdbcTemplate();

        new DbSeeder(jdbcTemplate).run(null);

        List<SqlCall> supplementalWorkInserts = jdbcTemplate.updates.stream()
                .filter(call -> call.sql().contains("INSERT INTO \"Works\""))
                .toList();
        assertThat(supplementalWorkInserts).hasSize(18);
        assertThat(supplementalWorkInserts)
                .allSatisfy(call -> {
                    assertThat(call.sql()).contains("\"VideosVersion\"");
                    assertThat(call.sql()).contains("\"CreatedAt\"");
                    assertThat(call.sql()).contains("\"UpdatedAt\"");
                    assertThat(call.args()).contains(0);
                });

        List<SqlCall> supplementalBlogInserts = jdbcTemplate.updates.stream()
                .filter(call -> call.sql().contains("INSERT INTO \"Blogs\""))
                .toList();
        assertThat(supplementalBlogInserts).hasSize(18);
        assertThat(supplementalBlogInserts)
                .allSatisfy(call -> assertThat(call.sql())
                        .contains("\"CreatedAt\"")
                        .contains("\"UpdatedAt\""));
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final List<SqlCall> updates = new ArrayList<>();

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType) {
            return requiredType.cast(1);
        }

        @Override
        public int update(String sql, Object... args) {
            updates.add(new SqlCall(sql, List.of(args)));
            return 1;
        }
    }

    private record SqlCall(String sql, List<Object> args) {
    }
}
