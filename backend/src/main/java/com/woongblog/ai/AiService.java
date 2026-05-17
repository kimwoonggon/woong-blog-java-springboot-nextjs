package com.woongblog.ai;

import com.woongblog.common.NotFoundException;
import com.woongblog.common.JdbcData;
import com.woongblog.common.BadRequestException;
import com.woongblog.config.AppProperties;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiService {
    private final JdbcTemplate jdbcTemplate;
    private final AppProperties properties;

    public AiService(JdbcTemplate jdbcTemplate, AppProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    public Map<String, Object> runtimeConfig() {
        AppProperties.Ai ai = properties.getAi();
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("provider", ai.getProvider());
        config.put("availableProviders", List.of("fake", "openai", "azure-openai", "codex"));
        config.put("defaultModel", ai.getDefaultModel());
        config.put("codexModel", ai.getCodexModel());
        config.put("codexReasoningEffort", ai.getCodexReasoningEffort());
        config.put("allowedCodexModels", List.of("gpt-5.4-mini", "gpt-5.4", "gpt-5.5"));
        config.put("allowedCodexReasoningEfforts", List.of("low", "medium", "high", "xhigh"));
        config.put("batchConcurrency", ai.getBatchConcurrency());
        config.put("batchCompletedRetentionDays", ai.getBatchCompletedRetentionDays());
        config.put("defaultSystemPrompt", "Improve content while preserving meaning and HTML structure.");
        config.put("defaultBlogFixPrompt", "Fix blog HTML clarity, structure, and grammar.");
        config.put("defaultWorkEnrichPrompt", "Enrich work case-study HTML while preserving factual content.");
        return config;
    }

    public Map<String, Object> fixHtml(FixHtmlRequest request) {
        if (request.html() == null || request.html().isBlank()) {
            throw new BadRequestException("HTML content is required.");
        }
        String fixed = request.html() == null ? "" : request.html().trim();
        return Map.of(
                "fixedHtml", fixed,
                "provider", provider(request.provider()),
                "model", model(request.codexModel()),
                "reasoningEffort", reasoning(request.codexReasoningEffort()));
    }

    @Transactional
    public Map<String, Object> fixBatch(BatchJobRequest request) {
        validateBlogSelection(request);
        List<BlogCandidate> blogs = selectBlogs(request);
        String provider = provider(request.provider());
        String model = model(request.codexModel());
        String reasoning = reasoning(request.codexReasoningEffort());
        List<Map<String, Object>> results = new ArrayList<>();
        for (BlogCandidate blog : blogs) {
            String fixedHtml = blog.html().trim();
            if (request.apply()) {
                applyFixedHtml(blog.id(), fixedHtml);
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("blogId", blog.id());
            item.put("title", blog.title());
            item.put("status", "fixed");
            item.put("fixedHtml", fixedHtml);
            item.put("error", null);
            item.put("provider", provider);
            item.put("model", model);
            item.put("reasoningEffort", reasoning);
            results.add(item);
        }
        return Map.of("results", results, "applied", request.apply());
    }

    @Transactional
    public Map<String, Object> createBatchJob(BatchJobRequest request) {
        validateBlogSelection(request);
        List<BlogCandidate> blogs = selectBlogs(request);
        if (blogs.isEmpty()) {
            throw new BadRequestException("No matching blogs were found.");
        }
        UUID jobId = UUID.randomUUID();
        String provider = provider(request.provider());
        String model = model(request.codexModel());
        String reasoning = reasoning(request.codexReasoningEffort());
        jdbcTemplate.update("""
                INSERT INTO "AiBatchJobs" ("Id", "TargetType", "Status", "SelectionMode", "SelectionLabel", "SelectionKey", "All", "AutoApply", "WorkerCount",
                                           "CancelRequested", "TotalCount", "ProcessedCount", "SucceededCount", "FailedCount", "Provider", "Model",
                                           "ReasoningEffort", "PromptMode", "CustomPrompt", "CreatedAt", "StartedAt", "FinishedAt", "UpdatedAt")
                VALUES (?, 'blog', 'completed', ?, ?, ?, ?, ?, ?, false, ?, ?, ?, 0, ?, ?, ?, 'custom-or-default', ?, now(), now(), now(), now())
                """,
                jobId,
                valueOrDefault(request.selectionMode(), request.all() ? "all" : "selected"),
                valueOrDefault(request.selectionLabel(), request.all() ? "All blogs" : "Selected blogs"),
                valueOrDefault(request.selectionKey(), request.all() ? "all" : "selected"),
                request.all(),
                request.autoApply(),
                request.workerCount(),
                blogs.size(),
                blogs.size(),
                blogs.size(),
                provider,
                model,
                reasoning,
                request.customPrompt());
        for (BlogCandidate blog : blogs) {
            String fixedHtml = blog.html().trim();
            jdbcTemplate.update("""
                    INSERT INTO "AiBatchJobItems" ("Id", "JobId", "EntityId", "Title", "Status", "FixedHtml", "Provider", "Model", "ReasoningEffort", "CreatedAt", "StartedAt", "FinishedAt", "AppliedAt")
                    VALUES (?, ?, ?, ?, 'succeeded', ?, ?, ?, ?, now(), now(), now(), CASE WHEN ? THEN now() ELSE NULL END)
                    """, UUID.randomUUID(), jobId, blog.id(), blog.title(), fixedHtml, provider, model, reasoning, request.autoApply());
            if (request.autoApply()) {
                applyFixedHtml(blog.id(), fixedHtml);
            }
        }
        return jobSummary(jobId);
    }

    public Map<String, Object> listJobs() {
        List<Map<String, Object>> jobs = jdbcTemplate.query("""
                SELECT "Id" FROM "AiBatchJobs" ORDER BY "CreatedAt" DESC
                """, (rs, rowNum) -> jobSummary(rs.getObject("Id", UUID.class)));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("jobs", jobs);
        payload.put("runningCount", countStatus("running"));
        payload.put("queuedCount", countStatus("queued"));
        payload.put("completedCount", countStatus("completed"));
        payload.put("failedCount", countStatus("failed"));
        payload.put("cancelledCount", countStatus("cancelled"));
        return payload;
    }

    public Map<String, Object> getJob(UUID jobId) {
        Map<String, Object> summary = jobSummary(jobId);
        summary.put("items", jdbcTemplate.query("""
                SELECT "Id", "EntityId", "Title", "Status", "FixedHtml", "Error", "Provider", "Model", "ReasoningEffort", "AppliedAt"
                FROM "AiBatchJobItems" WHERE "JobId" = ? ORDER BY "CreatedAt"
                """, (rs, rowNum) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("jobItemId", rs.getObject("Id", UUID.class));
            item.put("blogId", rs.getObject("EntityId", UUID.class));
            item.put("title", rs.getString("Title"));
            item.put("status", rs.getString("Status"));
            item.put("fixedHtml", rs.getString("FixedHtml"));
            item.put("error", rs.getString("Error"));
            item.put("provider", rs.getString("Provider"));
            item.put("model", rs.getString("Model"));
            item.put("reasoningEffort", rs.getString("ReasoningEffort"));
            item.put("appliedAt", JdbcData.nullableInstant(rs, "AppliedAt"));
            return item;
        }, jobId));
        return summary;
    }

    @Transactional
    public Map<String, Object> applyJob(UUID jobId, ApplyJobRequest request) {
        List<Map<String, Object>> items = jdbcTemplate.query("""
                SELECT "Id", "EntityId", "FixedHtml" FROM "AiBatchJobItems"
                WHERE "JobId" = ? AND "Status" = 'succeeded'
                """, (rs, rowNum) -> Map.of(
                "id", rs.getObject("Id", UUID.class),
                "entityId", rs.getObject("EntityId", UUID.class),
                "fixedHtml", rs.getString("FixedHtml")), jobId);
        List<UUID> requested = request.jobItemIds() == null ? List.of() : request.jobItemIds();
        int applied = 0;
        for (Map<String, Object> item : items) {
            UUID itemId = (UUID) item.get("id");
            if (!requested.isEmpty() && !requested.contains(itemId)) {
                continue;
            }
            applyFixedHtml((UUID) item.get("entityId"), (String) item.get("fixedHtml"));
            jdbcTemplate.update("UPDATE \"AiBatchJobItems\" SET \"AppliedAt\" = now() WHERE \"Id\" = ?", itemId);
            applied += 1;
        }
        Map<String, Object> response = jobSummary(jobId);
        response.put("applied", applied);
        return response;
    }

    public Map<String, Object> cancelJob(UUID jobId) {
        int updated = jdbcTemplate.update("""
                UPDATE "AiBatchJobs" SET "CancelRequested" = true, "Status" = 'cancelled', "FinishedAt" = now(), "UpdatedAt" = now()
                WHERE "Id" = ?
                """, jobId);
        if (updated == 0) {
            throw new NotFoundException("AI batch job not found.");
        }
        return jobSummary(jobId);
    }

    public Map<String, Object> cancelQueuedJobs() {
        int cancelled = jdbcTemplate.update("""
                UPDATE "AiBatchJobs" SET "CancelRequested" = true, "Status" = 'cancelled', "FinishedAt" = now(), "UpdatedAt" = now()
                WHERE "Status" = 'queued'
                """);
        return Map.of("cancelled", cancelled);
    }

    public Map<String, Object> clearCompletedJobs() {
        int cleared = jdbcTemplate.update("DELETE FROM \"AiBatchJobs\" WHERE \"Status\" IN ('completed', 'failed', 'cancelled')");
        return Map.of("cleared", cleared);
    }

    public Map<String, Object> deleteJob(UUID jobId) {
        int removed = jdbcTemplate.update("DELETE FROM \"AiBatchJobs\" WHERE \"Id\" = ?", jobId);
        return Map.of("removed", removed > 0, "jobId", jobId);
    }

    private Map<String, Object> jobSummary(UUID jobId) {
        return jdbcTemplate.query("""
                SELECT "Id", "Status", "SelectionMode", "SelectionLabel", "SelectionKey", "All", "AutoApply", "WorkerCount",
                       "TotalCount", "ProcessedCount", "SucceededCount", "FailedCount", "Provider", "Model", "ReasoningEffort",
                       "CustomPrompt", "CreatedAt", "StartedAt", "FinishedAt", "CancelRequested"
                FROM "AiBatchJobs" WHERE "Id" = ?
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("AI batch job not found.");
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("jobId", rs.getObject("Id", UUID.class));
            item.put("status", rs.getString("Status"));
            item.put("selectionMode", rs.getString("SelectionMode"));
            item.put("selectionLabel", rs.getString("SelectionLabel"));
            item.put("selectionKey", rs.getString("SelectionKey"));
            item.put("all", rs.getBoolean("All"));
            item.put("autoApply", rs.getBoolean("AutoApply"));
            item.put("workerCount", rs.getObject("WorkerCount"));
            item.put("totalCount", rs.getInt("TotalCount"));
            item.put("processedCount", rs.getInt("ProcessedCount"));
            item.put("succeededCount", rs.getInt("SucceededCount"));
            item.put("failedCount", rs.getInt("FailedCount"));
            item.put("provider", rs.getString("Provider"));
            item.put("model", rs.getString("Model"));
            item.put("reasoningEffort", rs.getString("ReasoningEffort"));
            item.put("customPrompt", rs.getString("CustomPrompt"));
            item.put("createdAt", JdbcData.nullableInstant(rs, "CreatedAt"));
            item.put("startedAt", JdbcData.nullableInstant(rs, "StartedAt"));
            item.put("finishedAt", JdbcData.nullableInstant(rs, "FinishedAt"));
            item.put("cancelRequested", rs.getBoolean("CancelRequested"));
            return item;
        }, jobId);
    }

    private List<BlogCandidate> selectBlogs(BatchJobRequest request) {
        if (request.all()) {
            return jdbcTemplate.query("""
                    SELECT "Id", "Title", "ContentJson" FROM "Blogs" ORDER BY "PublishedAt" DESC NULLS LAST
                    """, (rs, rowNum) -> new BlogCandidate(
                    rs.getObject("Id", UUID.class),
                    rs.getString("Title"),
                    htmlFromJson(rs.getString("ContentJson"))));
        }
        List<UUID> ids = request.blogIds() == null ? List.of() : request.blogIds();
        if (ids.isEmpty()) {
            return List.of();
        }
        String placeholders = String.join(",", ids.stream().map(ignored -> "?").toList());
        return jdbcTemplate.query("""
                SELECT "Id", "Title", "ContentJson" FROM "Blogs" WHERE "Id" IN (%s)
                """.formatted(placeholders), (rs, rowNum) -> new BlogCandidate(
                rs.getObject("Id", UUID.class),
                rs.getString("Title"),
                htmlFromJson(rs.getString("ContentJson"))), ids.toArray());
    }

    private void applyFixedHtml(UUID blogId, String fixedHtml) {
        jdbcTemplate.update("""
                UPDATE "Blogs"
                SET "ContentJson" = jsonb_build_object('html', ?), "PublicContentHtml" = ?, "UpdatedAt" = now()
                WHERE "Id" = ?
                """, fixedHtml, fixedHtml, blogId);
    }

    private int countStatus(String status) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"AiBatchJobs\" WHERE \"Status\" = ?", Integer.class, status);
        return count == null ? 0 : count;
    }

    private static void validateBlogSelection(BatchJobRequest request) {
        if (!request.all() && (request.blogIds() == null || request.blogIds().isEmpty())) {
            throw new BadRequestException("Either blogIds or all=true is required.");
        }
    }

    private String provider(String requested) {
        return requested == null || requested.isBlank() ? properties.getAi().getProvider() : requested;
    }

    private String model(String requested) {
        return requested == null || requested.isBlank() ? properties.getAi().getCodexModel() : requested;
    }

    private String reasoning(String requested) {
        return requested == null || requested.isBlank() ? properties.getAi().getCodexReasoningEffort() : requested;
    }

    private static String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String htmlFromJson(String contentJson) {
        if (contentJson == null) {
            return "";
        }
        int marker = contentJson.indexOf("\"html\"");
        if (marker < 0) {
            return contentJson;
        }
        return contentJson.replaceAll("(?s).*\"html\"\\s*:\\s*\"(.*?)\".*", "$1");
    }

    private record BlogCandidate(UUID id, String title, String html) {
    }

    public record FixHtmlRequest(String html, String title, String provider, String codexModel, String codexReasoningEffort, String customPrompt) {
    }

    public record BatchJobRequest(
            List<UUID> blogIds,
            boolean all,
            boolean apply,
            boolean autoApply,
            String selectionMode,
            String selectionLabel,
            String selectionKey,
            Integer workerCount,
            String provider,
            String codexModel,
            String codexReasoningEffort,
            String customPrompt) {
    }

    public record ApplyJobRequest(List<UUID> jobItemIds) {
    }
}
