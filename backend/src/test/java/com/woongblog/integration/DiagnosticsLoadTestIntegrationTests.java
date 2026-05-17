package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class DiagnosticsLoadTestIntegrationTests extends IntegrationTestSupport {
    @Test
    void diagnosticsEndpointRequiresAdminAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/load-test/diagnostics"))
                .andExpect(status().isForbidden());
    }

    @Test
    void diagnosticsEndpointReportsJvmHeapGcThreadsAndPostgresHealth() throws Exception {
        Cookie authCookie = testLoginCookie();

        mockMvc.perform(get("/api/admin/load-test/diagnostics").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runtime.platform").value("jvm"))
                .andExpect(jsonPath("$.runtime.heapUsedBytes").isNumber())
                .andExpect(jsonPath("$.runtime.heapCommittedBytes").isNumber())
                .andExpect(jsonPath("$.runtime.garbageCollectors").isArray())
                .andExpect(jsonPath("$.gc.heapSizeBytes").isNumber())
                .andExpect(jsonPath("$.threadPool.workerThreads").isNumber())
                .andExpect(jsonPath("$.database.status").value("available"))
                .andExpect(jsonPath("$.database.pool.jdbcPoolSource").value("spring.datasource.hikari"));
    }

    @Test
    void fakeBackendLoadTestPersistsRequestSummaryAndExposesMetrics() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        MvcResult started = mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fakeLoadPayload("public-api-rps", "public-api-mix"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.runner").value("fake"))
                .andExpect(jsonPath("$.requests").value(6))
                .andExpect(jsonPath("$.targetMetrics").isArray())
                .andReturn();

        JsonNode startJson = body(started);
        String runId = startJson.get("runId").asText();
        String reportDirectory = startJson.get("reportDirectory").asText();
        assertThat(java.nio.file.Files.exists(java.nio.file.Path.of(reportDirectory, "request.json"))).isTrue();
        assertThat(java.nio.file.Files.exists(java.nio.file.Path.of(reportDirectory, "summary.json"))).isTrue();

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}", runId).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId))
                .andExpect(jsonPath("$.status").value("completed"));

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}/metrics", runId).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics[0].requests").value(6))
                .andExpect(jsonPath("$.diagnostics[0].runtime.platform").value("jvm"));
    }

    @Test
    void loadTestStartRejectsMissingTargets() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        Map<String, Object> payload = fakeLoadPayload("public-api-rps", "public-api-mix");
        payload.put("targets", List.of());

        mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("At least one load test target is required."));
    }

    @Test
    void loadTestStartRejectsUnknownScenario() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fakeLoadPayload("unknown", "public-api-mix"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Unsupported load test scenario: unknown"));
    }

    @Test
    void loadTestStartRejectsTargetFiltersThatProduceNoRunnableUrls() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        Map<String, Object> payload = fakeLoadPayload("public-api-rps", "public-works-only");
        payload.put("targets", List.of(Map.of(
                "id", "study-only",
                "label", "Study only",
                "path", "/api/public/blogs/seeded-blog",
                "group", "study")));

        mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Selected load test target group has no runnable targets."));
    }

    @Test
    void unknownLoadTestRunRequestsReturnNotFound() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(get("/api/admin/load-tests/real/missing-run").cookie(authCookie))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Real load test run not found."));

        mockMvc.perform(get("/api/admin/load-tests/real/missing-run/metrics").cookie(authCookie))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Real load test run not found."));

        mockMvc.perform(post("/api/admin/load-tests/real/missing-run/stop")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Real load test run not found."));
    }

    @Test
    void completedFakeLoadTestStopIsIdempotent() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        MvcResult started = mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fakeLoadPayload("public-api-spike", "public-api-mix"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andReturn();
        String runId = body(started).get("runId").asText();

        mockMvc.perform(post("/api/admin/load-tests/real/{runId}/stop", runId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.metricsPending").value(false));
    }

    private Map<String, Object> fakeLoadPayload(String scenario, String targetMode) {
        return new java.util.LinkedHashMap<>(Map.of(
                "scenario", scenario,
                "runner", "fake",
                "target", targetMode,
                "rate", 3,
                "durationSeconds", 2,
                "maxVUs", 10,
                "startVUs", 1,
                "targets", List.of(
                        Map.of(
                                "id", "work-read",
                                "label", "Work read",
                                "path", "/api/public/works/seeded-work",
                                "group", "work"),
                        Map.of(
                                "id", "blog-read",
                                "label", "Blog read",
                                "path", "/api/public/blogs/seeded-blog",
                                "group", "study"))));
    }
}
