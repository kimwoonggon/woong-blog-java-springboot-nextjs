package com.woongblog.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.woongblog.common.BadRequestException;
import com.woongblog.common.NotFoundException;
import com.woongblog.config.AppProperties;
import java.sql.ResultSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
class AiServiceTests {
    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private AppProperties properties;

    @Mock
    private AppProperties.Ai aiProperties;

    @Test
    void runtimeConfigExposesConfiguredAiDefaultsAndAllowedCodexValues() {
        when(properties.getAi()).thenReturn(aiProperties);
        when(aiProperties.getProvider()).thenReturn("codex");
        when(aiProperties.getDefaultModel()).thenReturn("gpt-5.4");
        when(aiProperties.getCodexModel()).thenReturn("gpt-5.5");
        when(aiProperties.getCodexReasoningEffort()).thenReturn("xhigh");
        when(aiProperties.getBatchConcurrency()).thenReturn(7);
        when(aiProperties.getBatchCompletedRetentionDays()).thenReturn(3);

        Map<String, Object> config = new AiService(jdbcTemplate, properties).runtimeConfig();

        assertThat(config)
                .containsEntry("provider", "codex")
                .containsEntry("defaultModel", "gpt-5.4")
                .containsEntry("codexModel", "gpt-5.5")
                .containsEntry("codexReasoningEffort", "xhigh")
                .containsEntry("batchConcurrency", 7)
                .containsEntry("batchCompletedRetentionDays", 3);
        assertThat(config.get("allowedCodexModels"))
                .asList()
                .containsExactly("gpt-5.4-mini", "gpt-5.4", "gpt-5.5");
        assertThat(config.get("allowedCodexReasoningEfforts"))
                .asList()
                .containsExactly("low", "medium", "high", "xhigh");
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void fixHtmlRejectsBlankHtmlBeforeReadingRuntimeDefaults() {
        AiService service = new AiService(jdbcTemplate, properties);

        assertThatThrownBy(() -> service.fixHtml(new AiService.FixHtmlRequest(
                "   ",
                "Draft",
                null,
                null,
                null,
                null)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("HTML content is required.");

        verifyNoInteractions(jdbcTemplate, properties);
    }

    @Test
    void fixHtmlTrimsHtmlAndUsesConfiguredDefaultsForBlankAiOptions() {
        when(properties.getAi()).thenReturn(aiProperties);
        when(aiProperties.getProvider()).thenReturn("fake");
        when(aiProperties.getCodexModel()).thenReturn("gpt-5.4-mini");
        when(aiProperties.getCodexReasoningEffort()).thenReturn("medium");

        Map<String, Object> result = new AiService(jdbcTemplate, properties).fixHtml(new AiService.FixHtmlRequest(
                "  <p>Needs polish</p>  ",
                "Draft",
                "",
                " ",
                null,
                null));

        assertThat(result)
                .containsEntry("fixedHtml", "<p>Needs polish</p>")
                .containsEntry("provider", "fake")
                .containsEntry("model", "gpt-5.4-mini")
                .containsEntry("reasoningEffort", "medium");
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void fixBatchAppliesTrimmedSelectedBlogHtmlWithResolvedAiOptions() throws Exception {
        UUID blogId = UUID.randomUUID();
        when(properties.getAi()).thenReturn(aiProperties);
        when(aiProperties.getProvider()).thenReturn("codex");
        when(aiProperties.getCodexModel()).thenReturn("gpt-5.5");
        when(aiProperties.getCodexReasoningEffort()).thenReturn("high");
        stubSelectedBlog(blogId, "First Post", "{\"html\":\"  <p>Fixed</p>  \"}");
        when(jdbcTemplate.update(
                contains("UPDATE \"Blogs\""),
                eq("<p>Fixed</p>"),
                eq("<p>Fixed</p>"),
                eq(blogId)))
                .thenReturn(1);

        Map<String, Object> response = new AiService(jdbcTemplate, properties).fixBatch(new AiService.BatchJobRequest(
                List.of(blogId),
                false,
                true,
                false,
                "selected",
                "Selected blogs",
                "selected",
                2,
                "",
                null,
                " ",
                null));

        assertThat(response).containsEntry("applied", true);
        assertThat(batchResults(response))
                .singleElement()
                .satisfies(item -> assertThat(item)
                        .containsEntry("blogId", blogId)
                        .containsEntry("title", "First Post")
                        .containsEntry("status", "fixed")
                        .containsEntry("fixedHtml", "<p>Fixed</p>")
                        .containsEntry("provider", "codex")
                        .containsEntry("model", "gpt-5.5")
                        .containsEntry("reasoningEffort", "high"));
        verify(jdbcTemplate).update(
                contains("UPDATE \"Blogs\""),
                eq("<p>Fixed</p>"),
                eq("<p>Fixed</p>"),
                eq(blogId));
    }

    @Test
    void createBatchJobRejectsSelectionThatMatchesNoBlogsBeforeWritingJobRows() {
        UUID blogId = UUID.randomUUID();
        when(jdbcTemplate.query(
                contains("FROM \"Blogs\" WHERE \"Id\" IN"),
                ArgumentMatchers.<RowMapper<Object>>any(),
                eq(blogId)))
                .thenReturn(List.of());

        AiService service = new AiService(jdbcTemplate, properties);

        assertThatThrownBy(() -> service.createBatchJob(new AiService.BatchJobRequest(
                List.of(blogId),
                false,
                false,
                true,
                "selected",
                "Selected blogs",
                "selected",
                1,
                "codex",
                "gpt-5.4-mini",
                "medium",
                "Fix these")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("No matching blogs were found.");

        verify(jdbcTemplate, never()).update(
                contains("INSERT INTO \"AiBatchJobs\""),
                ArgumentMatchers.<Object[]>any());
    }

    @Test
    void applyJobOnlyAppliesRequestedSucceededItemsAndReportsAppliedCount() {
        UUID jobId = UUID.randomUUID();
        UUID skippedItemId = UUID.randomUUID();
        UUID appliedItemId = UUID.randomUUID();
        UUID skippedBlogId = UUID.randomUUID();
        UUID appliedBlogId = UUID.randomUUID();
        when(jdbcTemplate.query(
                contains("FROM \"AiBatchJobItems\""),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                eq(jobId)))
                .thenReturn(List.of(
                        Map.of("id", skippedItemId, "entityId", skippedBlogId, "fixedHtml", "<p>Skip</p>"),
                        Map.of("id", appliedItemId, "entityId", appliedBlogId, "fixedHtml", "<p>Apply</p>")));
        when(jdbcTemplate.update(
                contains("UPDATE \"Blogs\""),
                eq("<p>Apply</p>"),
                eq("<p>Apply</p>"),
                eq(appliedBlogId)))
                .thenReturn(1);
        when(jdbcTemplate.update(
                contains("UPDATE \"AiBatchJobItems\" SET \"AppliedAt\""),
                eq(appliedItemId)))
                .thenReturn(1);
        when(jdbcTemplate.query(
                contains("FROM \"AiBatchJobs\" WHERE \"Id\" = ?"),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any(),
                eq(jobId)))
                .thenReturn(new LinkedHashMap<>(Map.of("jobId", jobId, "status", "completed")));

        Map<String, Object> response = new AiService(jdbcTemplate, properties).applyJob(
                jobId,
                new AiService.ApplyJobRequest(List.of(appliedItemId)));

        assertThat(response)
                .containsEntry("jobId", jobId)
                .containsEntry("status", "completed")
                .containsEntry("applied", 1);
        verify(jdbcTemplate).update(
                contains("UPDATE \"Blogs\""),
                eq("<p>Apply</p>"),
                eq("<p>Apply</p>"),
                eq(appliedBlogId));
        verify(jdbcTemplate, never()).update(
                contains("UPDATE \"Blogs\""),
                eq("<p>Skip</p>"),
                eq("<p>Skip</p>"),
                eq(skippedBlogId));
        verify(jdbcTemplate, never()).update(
                contains("UPDATE \"AiBatchJobItems\" SET \"AppliedAt\""),
                eq(skippedItemId));
    }

    @Test
    void cancelJobThrowsNotFoundWhenNoRowWasUpdated() {
        UUID jobId = UUID.randomUUID();
        when(jdbcTemplate.update(contains("UPDATE \"AiBatchJobs\""), eq(jobId))).thenReturn(0);

        assertThatThrownBy(() -> new AiService(jdbcTemplate, properties).cancelJob(jobId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("AI batch job not found.");
    }

    @Test
    void createBatchJobWithAllBlogsAutoAppliesDefaultsAndHandlesNonWrappedHtml() throws Exception {
        UUID nullContentBlogId = UUID.randomUUID();
        UUID plainContentBlogId = UUID.randomUUID();
        when(properties.getAi()).thenReturn(aiProperties);
        when(aiProperties.getProvider()).thenReturn("fake");
        when(aiProperties.getCodexModel()).thenReturn("gpt-5.4-mini");
        when(aiProperties.getCodexReasoningEffort()).thenReturn("medium");
        when(jdbcTemplate.query(
                contains("FROM \"Blogs\" ORDER BY \"PublishedAt\""),
                ArgumentMatchers.<RowMapper<Object>>any()))
                .thenAnswer(invocation -> {
                    RowMapper<Object> rowMapper = invocation.getArgument(1);
                    return List.of(
                            rowMapper.mapRow(blogRow(nullContentBlogId, "Empty Content", null), 0),
                            rowMapper.mapRow(blogRow(plainContentBlogId, "Plain Content", "plain html"), 1));
                });
        when(jdbcTemplate.query(
                contains("FROM \"AiBatchJobs\" WHERE \"Id\" = ?"),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any(),
                any(UUID.class)))
                .thenAnswer(invocation -> {
                    ResultSetExtractor<Map<String, Object>> extractor = invocation.getArgument(1);
                    return extractor.extractData(jobSummaryRow(invocation.getArgument(2)));
                });
        Map<String, Object> summary = new AiService(jdbcTemplate, properties).createBatchJob(new AiService.BatchJobRequest(
                null,
                true,
                false,
                true,
                "",
                " ",
                null,
                2,
                "",
                null,
                " ",
                "Improve all"));

        assertThat(summary)
                .containsEntry("status", "completed")
                .containsEntry("selectionMode", "all")
                .containsEntry("selectionLabel", "All blogs")
                .containsEntry("selectionKey", "all")
                .containsEntry("autoApply", true);
        verify(jdbcTemplate).update(
                contains("UPDATE \"Blogs\""),
                eq(""),
                eq(""),
                eq(nullContentBlogId));
        verify(jdbcTemplate).update(
                contains("UPDATE \"Blogs\""),
                eq("plain html"),
                eq("plain html"),
                eq(plainContentBlogId));
    }

    @Test
    void getJobThrowsNotFoundWhenSummaryRowIsMissing() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(jdbcTemplate.query(
                contains("FROM \"AiBatchJobs\" WHERE \"Id\" = ?"),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any(),
                eq(jobId)))
                .thenAnswer(invocation -> {
                    ResultSetExtractor<Map<String, Object>> extractor = invocation.getArgument(1);
                    ResultSet resultSet = org.mockito.Mockito.mock(ResultSet.class);
                    when(resultSet.next()).thenReturn(false);
                    return extractor.extractData(resultSet);
                });

        assertThatThrownBy(() -> new AiService(jdbcTemplate, properties).getJob(jobId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("AI batch job not found.");
    }

    @Test
    void listJobsDefaultsNullStatusCountsToZero() {
        when(jdbcTemplate.query(
                contains("FROM \"AiBatchJobs\" ORDER BY"),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any()))
                .thenReturn(List.of());
        when(jdbcTemplate.queryForObject(
                contains("COUNT(*) FROM \"AiBatchJobs\""),
                eq(Integer.class),
                anyString()))
                .thenReturn(null);

        Map<String, Object> response = new AiService(jdbcTemplate, properties).listJobs();

        assertThat(response)
                .containsEntry("jobs", List.of())
                .containsEntry("runningCount", 0)
                .containsEntry("queuedCount", 0)
                .containsEntry("completedCount", 0)
                .containsEntry("failedCount", 0)
                .containsEntry("cancelledCount", 0);
    }

    private void stubSelectedBlog(UUID blogId, String title, String contentJson) throws Exception {
        when(jdbcTemplate.query(
                contains("FROM \"Blogs\" WHERE \"Id\" IN"),
                ArgumentMatchers.<RowMapper<Object>>any(),
                eq(blogId)))
                .thenAnswer(invocation -> {
                    RowMapper<Object> rowMapper = invocation.getArgument(1);
                    ResultSet resultSet = org.mockito.Mockito.mock(ResultSet.class);
                    when(resultSet.getObject("Id", UUID.class)).thenReturn(blogId);
                    when(resultSet.getString("Title")).thenReturn(title);
                    when(resultSet.getString("ContentJson")).thenReturn(contentJson);
                    return List.of(rowMapper.mapRow(resultSet, 0));
                });
    }

    private static ResultSet blogRow(UUID id, String title, String contentJson) throws Exception {
        ResultSet resultSet = org.mockito.Mockito.mock(ResultSet.class);
        when(resultSet.getObject("Id", UUID.class)).thenReturn(id);
        when(resultSet.getString("Title")).thenReturn(title);
        when(resultSet.getString("ContentJson")).thenReturn(contentJson);
        return resultSet;
    }

    private static ResultSet jobSummaryRow(Object jobId) throws Exception {
        ResultSet resultSet = org.mockito.Mockito.mock(ResultSet.class);
        when(resultSet.next()).thenReturn(true);
        when(resultSet.getObject("Id", UUID.class)).thenReturn((UUID) jobId);
        when(resultSet.getString("Status")).thenReturn("completed");
        when(resultSet.getString("SelectionMode")).thenReturn("all");
        when(resultSet.getString("SelectionLabel")).thenReturn("All blogs");
        when(resultSet.getString("SelectionKey")).thenReturn("all");
        when(resultSet.getBoolean("All")).thenReturn(true);
        when(resultSet.getBoolean("AutoApply")).thenReturn(true);
        when(resultSet.getObject("WorkerCount")).thenReturn(2);
        when(resultSet.getInt("TotalCount")).thenReturn(2);
        when(resultSet.getInt("ProcessedCount")).thenReturn(2);
        when(resultSet.getInt("SucceededCount")).thenReturn(2);
        when(resultSet.getInt("FailedCount")).thenReturn(0);
        when(resultSet.getString("Provider")).thenReturn("fake");
        when(resultSet.getString("Model")).thenReturn("gpt-5.4-mini");
        when(resultSet.getString("ReasoningEffort")).thenReturn("medium");
        when(resultSet.getString("CustomPrompt")).thenReturn("Improve all");
        when(resultSet.getObject("CreatedAt")).thenReturn(null);
        when(resultSet.getObject("StartedAt")).thenReturn(null);
        when(resultSet.getObject("FinishedAt")).thenReturn(null);
        when(resultSet.getBoolean("CancelRequested")).thenReturn(false);
        return resultSet;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> batchResults(Map<String, Object> response) {
        return (List<Map<String, Object>>) response.get("results");
    }
}
