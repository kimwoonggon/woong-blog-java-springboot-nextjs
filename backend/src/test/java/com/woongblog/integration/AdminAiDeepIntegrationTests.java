package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class AdminAiDeepIntegrationTests extends IntegrationTestSupport {
    @Test
    void adminAiEndpointsRejectAnonymousRequests() throws Exception {
        mockMvc.perform(get("/api/admin/ai/runtime-config"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/ai/blog-fix")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid or missing CSRF token."));
    }

    @Test
    void runtimeConfigReturnsConfiguredProviderMetadata() throws Exception {
        Cookie authCookie = testLoginCookie();

        mockMvc.perform(get("/api/admin/ai/runtime-config").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").exists())
                .andExpect(jsonPath("$.availableProviders").isArray())
                .andExpect(jsonPath("$.allowedCodexModels").isArray())
                .andExpect(jsonPath("$.defaultBlogFixPrompt").exists());
    }

    @Test
    void fixBlogReturnsBadRequestWhenHtmlMissing() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/ai/blog-fix")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", "Missing html"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("HTML content is required."));
    }

    @Test
    void fixBlogReturnsProviderPayloadAndForwardsRequestedProvider() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/ai/blog-fix")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "html", "  <p>Draft</p>  ",
                                "title", "Draft",
                                "provider", "codex",
                                "codexModel", "gpt-5.4-mini",
                                "codexReasoningEffort", "medium"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fixedHtml").value("<p>Draft</p>"))
                .andExpect(jsonPath("$.provider").value("codex"))
                .andExpect(jsonPath("$.model").value("gpt-5.4-mini"))
                .andExpect(jsonPath("$.reasoningEffort").value("medium"));
    }

    @Test
    void workEnrichReturnsProviderPayload() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/ai/work-enrich")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "html", "  <section>Work</section>  ",
                                "title", "Work",
                                "provider", "fake"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fixedHtml").value("<section>Work</section>"))
                .andExpect(jsonPath("$.provider").value("fake"));
    }

    @Test
    void createBatchJobReturnsBadRequestWhenNoTargetsRequested() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("all", false, "blogIds", List.of()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Either blogIds or all=true is required."));
    }

    @Test
    void createBatchJobListsAndReturnsDetail() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode created = createBatchJob(authCookie, csrf, SEEDED_BLOG_ID);
        String jobId = created.get("jobId").asText();

        mockMvc.perform(get("/api/admin/ai/blog-fix-batch-jobs").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobs").isArray());

        mockMvc.perform(get("/api/admin/ai/blog-fix-batch-jobs/{jobId}", jobId).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(jobId))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].blogId").value(SEEDED_BLOG_ID.toString()));
    }

    @Test
    void completedBatchJobCanBeRemoved() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode created = createBatchJob(authCookie, csrf, SEEDED_BLOG_ID);
        UUID jobId = UUID.fromString(created.get("jobId").asText());

        mockMvc.perform(delete("/api/admin/ai/blog-fix-batch-jobs/{jobId}", jobId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.removed").value(true));

        mockMvc.perform(get("/api/admin/ai/blog-fix-batch-jobs/{jobId}", jobId).cookie(authCookie))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("AI batch job not found."));
    }

    private JsonNode createBatchJob(Cookie authCookie, CsrfContext csrf, UUID blogId) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("blogIds", List.of(blogId));
        payload.put("all", false);
        payload.put("apply", false);
        payload.put("autoApply", false);
        payload.put("selectionMode", "selected");
        payload.put("selectionLabel", "Selected blogs");
        payload.put("selectionKey", "selected");
        payload.put("workerCount", 2);
        payload.put("provider", "fake");
        payload.put("codexModel", "gpt-5.4-mini");
        payload.put("codexReasoningEffort", "medium");
        payload.put("customPrompt", "Fix selected blogs");

        MvcResult result = mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andReturn();
        JsonNode json = body(result);
        assertThat(json.get("succeededCount").asInt()).isEqualTo(1);
        return json;
    }
}
