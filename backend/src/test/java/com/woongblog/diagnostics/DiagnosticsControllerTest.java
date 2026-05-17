package com.woongblog.diagnostics;

import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.common.ApiExceptionHandler;
import com.woongblog.config.AppProperties;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@Tag("web")
class DiagnosticsControllerTest {
    private static final String BASE_URL = "https://load.example.test";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AppProperties properties = new AppProperties();
        properties.getLoadTesting().setBaseUrl(BASE_URL);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new DiagnosticsController(properties))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void diagnosticsReturnsRuntimeSnapshotAndConfiguredBaseUrl() throws Exception {
        mockMvc.perform(get("/api/admin/load-test/diagnostics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capturedAt").exists())
                .andExpect(jsonPath("$.processUptimeMs").isNumber())
                .andExpect(jsonPath("$.availableProcessors").isNumber())
                .andExpect(jsonPath("$.heapUsedBytes").isNumber())
                .andExpect(jsonPath("$.heapCommittedBytes").isNumber())
                .andExpect(jsonPath("$.loadTestingBaseUrl").value(BASE_URL));
    }

    @Test
    void startStatusMetricsAndStopUseStoredRunState() throws Exception {
        MvcResult started = mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scenario": "smoke",
                                  "runner": "k6",
                                  "target": "public-home",
                                  "rate": 3,
                                  "peakRate": 5,
                                  "durationSeconds": 60,
                                  "maxVus": 10,
                                  "startVus": 1,
                                  "targets": [{"path": "/"}]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").isString())
                .andExpect(jsonPath("$.status").value("running"))
                .andExpect(jsonPath("$.startedAt").exists())
                .andReturn();

        JsonNode startBody = objectMapper.readTree(started.getResponse().getContentAsString());
        String runId = startBody.get("runId").asText();

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId))
                .andExpect(jsonPath("$.scenario").value("smoke"))
                .andExpect(jsonPath("$.runner").value("k6"))
                .andExpect(jsonPath("$.target").value("public-home"))
                .andExpect(jsonPath("$.status").value("running"))
                .andExpect(jsonPath("$.startedAt").exists());

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}/metrics", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId))
                .andExpect(jsonPath("$.status").value("running"))
                .andExpect(jsonPath("$.httpReqs").value(0))
                .andExpect(jsonPath("$.httpReqFailedRate").value(0))
                .andExpect(jsonPath("$.p95Ms").value(0))
                .andExpect(jsonPath("$.baseUrl").value(BASE_URL));

        mockMvc.perform(post("/api/admin/load-tests/real/{runId}/stop", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId))
                .andExpect(jsonPath("$.status").value("stopped"))
                .andExpect(jsonPath("$.finishedAt").exists());

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId))
                .andExpect(jsonPath("$.status").value("stopped"))
                .andExpect(jsonPath("$.finishedAt").exists());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unknownRunRequests")
    void unknownRunRequestsReturnNotFound(String label, RequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Real load test run not found."));
    }

    private static Stream<Arguments> unknownRunRequests() {
        return Stream.of(
                arguments("status", get("/api/admin/load-tests/real/missing-run")),
                arguments("metrics", get("/api/admin/load-tests/real/missing-run/metrics")),
                arguments("stop", post("/api/admin/load-tests/real/missing-run/stop")));
    }
}
