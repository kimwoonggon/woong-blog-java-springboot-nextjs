package com.woongblog.content;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.common.JsonSupport;
import com.woongblog.common.PagedResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@Tag("unit")
class ContentServiceQueryTests {
    @Test
    void publicBlogsClampsPagingAndBuildsDefaultFullTextSearchQuery() {
        RecordingJdbcTemplate jdbcTemplate = new RecordingJdbcTemplate(42L);
        ContentService contentService = contentService(jdbcTemplate);

        PagedResponse<Map<String, Object>> response = contentService.publicBlogs(
                0,
                250,
                "  Spring Boot  ",
                null);

        assertThat(response.page()).isEqualTo(1);
        assertThat(response.pageSize()).isEqualTo(100);
        assertThat(response.totalItems()).isEqualTo(42L);
        assertThat(response.totalPages()).isEqualTo(1);
        assertThat(jdbcTemplate.countQueries)
                .singleElement()
                .satisfies(call -> {
                    assertThat(call.sql())
                            .contains("SELECT COUNT(*) FROM \"Blogs\"")
                            .contains("lower(\"Title\") LIKE ?")
                            .contains("lower(\"Excerpt\") LIKE ?")
                            .contains("lower(\"ContentJson\"::text) LIKE ?");
                    assertThat(call.args()).containsExactly("%spring boot%", "%spring boot%", "%spring boot%");
                });
        assertThat(jdbcTemplate.listQueries)
                .singleElement()
                .satisfies(call -> {
                    assertThat(call.sql())
                            .contains("FROM \"Blogs\"")
                            .contains("WHERE \"Published\" = true")
                            .contains("ORDER BY \"PublishedAt\" DESC NULLS LAST, \"CreatedAt\" DESC");
                    assertThat(call.args())
                            .containsExactly("%spring boot%", "%spring boot%", "%spring boot%", 100, 0);
                });
    }

    @Test
    void publicWorksTitleSearchRestrictsSearchPredicateAndCalculatesOffset() {
        RecordingJdbcTemplate jdbcTemplate = new RecordingJdbcTemplate(21L);
        ContentService contentService = contentService(jdbcTemplate);

        PagedResponse<Map<String, Object>> response = contentService.publicWorks(
                3,
                5,
                "  Portfolio  ",
                "title");

        assertThat(response.page()).isEqualTo(3);
        assertThat(response.pageSize()).isEqualTo(5);
        assertThat(response.totalItems()).isEqualTo(21L);
        assertThat(response.totalPages()).isEqualTo(5);
        assertThat(jdbcTemplate.countQueries)
                .singleElement()
                .satisfies(call -> {
                    assertThat(call.sql())
                            .contains("SELECT COUNT(*) FROM \"Works\"")
                            .contains("AND lower(\"Title\") LIKE ?")
                            .doesNotContain("lower(\"Excerpt\") LIKE ?")
                            .doesNotContain("lower(\"ContentJson\"::text) LIKE ?");
                    assertThat(call.args()).containsExactly("%portfolio%");
                });
        assertThat(jdbcTemplate.listQueries)
                .singleElement()
                .satisfies(call -> {
                    assertThat(call.sql())
                            .contains("FROM \"Works\"")
                            .contains("AND lower(\"Title\") LIKE ?")
                            .doesNotContain("lower(\"Excerpt\") LIKE ?");
                    assertThat(call.args()).containsExactly("%portfolio%", 5, 10);
                });
    }

    @Test
    void publicBlogsWithoutQueryDoesNotAddSearchPredicate() {
        RecordingJdbcTemplate jdbcTemplate = new RecordingJdbcTemplate(0L);
        ContentService contentService = contentService(jdbcTemplate);

        PagedResponse<Map<String, Object>> response = contentService.publicBlogs(
                2,
                10,
                " ",
                "title");

        assertThat(response.totalItems()).isZero();
        assertThat(response.totalPages()).isZero();
        assertThat(jdbcTemplate.countQueries)
                .singleElement()
                .satisfies(call -> {
                    assertThat(call.sql())
                            .contains("WHERE \"Published\" = true")
                            .doesNotContain("lower(\"Title\") LIKE ?")
                            .doesNotContain("lower(\"Excerpt\") LIKE ?");
                    assertThat(call.args()).isEmpty();
                });
        assertThat(jdbcTemplate.listQueries)
                .singleElement()
                .satisfies(call -> assertThat(call.args()).containsExactly(10, 10));
    }

    private static ContentService contentService(JdbcTemplate jdbcTemplate) {
        return new ContentService(jdbcTemplate, new JsonSupport(new ObjectMapper()));
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final long total;
        private final List<SqlCall> countQueries = new ArrayList<>();
        private final List<SqlCall> listQueries = new ArrayList<>();

        private RecordingJdbcTemplate(long total) {
            this.total = total;
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            countQueries.add(new SqlCall(sql, List.of(args)));
            return requiredType.cast(total);
        }

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            listQueries.add(new SqlCall(sql, List.of(args)));
            return List.of();
        }
    }

    private record SqlCall(String sql, List<Object> args) {
    }
}
