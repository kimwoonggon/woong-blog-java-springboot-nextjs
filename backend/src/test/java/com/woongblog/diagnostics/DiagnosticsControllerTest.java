package com.woongblog.diagnostics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.common.ApiExceptionHandler;
import com.woongblog.config.AppProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@Tag("web")
@Tag("component")
class DiagnosticsControllerTest {
    private static final String BASE_URL = "https://load.example.test";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;
    private RealLoadTestService loadTestService;
    private ControllableExecutor executor;

    @TempDir
    private Path reportRoot;

    @BeforeEach
    void setUp() {
        AppProperties properties = new AppProperties();
        properties.getLoadTesting().setBaseUrl(BASE_URL);
        properties.getLoadTesting().setReportRoot(reportRoot);
        RuntimeDiagnosticsService diagnosticsService = new RuntimeDiagnosticsService(
                properties,
                (org.springframework.jdbc.core.JdbcTemplate) null);
        executor = new ControllableExecutor();
        loadTestService = new RealLoadTestService(properties, diagnosticsService, executor, objectMapper);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new DiagnosticsController(diagnosticsService, loadTestService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        loadTestService.shutdown();
    }

    @Test
    void diagnosticsReturnsJavaRuntimeSnapshotAndConfiguredBaseUrl() throws Exception {
        mockMvc.perform(get("/api/admin/load-test/diagnostics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.process.memoryBytes").isNumber())
                .andExpect(jsonPath("$.process.processorCount").isNumber())
                .andExpect(jsonPath("$.gc.heapSizeBytes").isNumber())
                .andExpect(jsonPath("$.threadPool.workerThreads").isNumber())
                .andExpect(jsonPath("$.runtime.platform").value("jvm"))
                .andExpect(jsonPath("$.runtime.heapUsedBytes").isNumber())
                .andExpect(jsonPath("$.runtime.liveThreads").isNumber())
                .andExpect(jsonPath("$.database.status").value("unavailable"))
                .andExpect(jsonPath("$.database.timeoutCount").value(0))
                .andExpect(jsonPath("$.loadTestingBaseUrl").value(BASE_URL));
    }

    @Test
    void fakeRunnerCompletesRunAndPersistsReportArtifacts() throws Exception {
        MvcResult started = mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scenario": "public-api-rps",
                                  "runner": "fake",
                                  "target": "public-works-only",
                                  "rate": 3,
                                  "durationSeconds": 2,
                                  "maxVUs": 10,
                                  "startVUs": 1,
                                  "targets": [
                                    {"id": "work-read", "label": "Work read", "path": "/api/public/works/demo", "group": "work"},
                                    {"id": "blog-read", "label": "Blog read", "path": "/api/public/blogs/demo", "group": "study"}
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").isString())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.metricsPending").value(false))
                .andExpect(jsonPath("$.requests").value(6))
                .andExpect(jsonPath("$.httpCounts.total").value(6))
                .andExpect(jsonPath("$.latencyBreakdown.p95Ms").value(30))
                .andExpect(jsonPath("$.targetMetrics[0].targetId").value("work-read"))
                .andReturn();

        JsonNode startBody = objectMapper.readTree(started.getResponse().getContentAsString());
        String runId = startBody.get("runId").asText();
        Path runDirectory = reportRoot.resolve(runId);
        assertThat(Files.exists(runDirectory.resolve("request.json"))).isTrue();
        assertThat(Files.exists(runDirectory.resolve("summary.json"))).isTrue();
        assertThat(Files.exists(runDirectory.resolve("metrics.ndjson"))).isTrue();

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId))
                .andExpect(jsonPath("$.scenario").value("public-api-rps"))
                .andExpect(jsonPath("$.runner").value("fake"))
                .andExpect(jsonPath("$.status").value("completed"));

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}/metrics", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId))
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.metrics[0].requests").value(6))
                .andExpect(jsonPath("$.diagnostics[0].runtime.platform").value("jvm"))
                .andExpect(jsonPath("$.targetMetrics[0].targetPath").value("/api/public/works/demo"));
    }

    @Test
    void k6RunnerUsesActiveRunControlAndCanBeStopped() throws Exception {
        MvcResult started = mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scenario": "public-api-soak",
                                  "runner": "k6",
                                  "target": "public-api-mix",
                                  "rate": 2,
                                  "durationSeconds": 60,
                                  "maxVus": 5,
                                  "targets": [
                                    {"id": "work-read", "label": "Work read", "path": "/api/public/works/demo", "group": "work"}
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("running"))
                .andExpect(jsonPath("$.metricsPending").value(true))
                .andReturn();

        JsonNode startBody = objectMapper.readTree(started.getResponse().getContentAsString());
        String runId = startBody.get("runId").asText();
        assertThat(executor.startedRun.scenario()).isEqualTo("public-api-soak");

        mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scenario": "public-api-rps",
                                  "runner": "k6",
                                  "target": "public-api-mix",
                                  "rate": 1,
                                  "durationSeconds": 1,
                                  "maxVus": 1,
                                  "targets": [
                                    {"id": "work-read", "label": "Work read", "path": "/api/public/works/demo", "group": "work"}
                                  ]
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("A real backend load test is already running."));

        mockMvc.perform(get("/api/admin/load-tests/real/{runId}/metrics", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metricsPending").value(true))
                .andExpect(jsonPath("$.metrics").isArray());

        mockMvc.perform(post("/api/admin/load-tests/real/{runId}/stop", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("stopped"))
                .andExpect(jsonPath("$.finishedAt").exists());

        assertThat(executor.execution.stopped).isTrue();
    }

    @Test
    void invalidLoadTestInputsReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/admin/load-tests/real/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "scenario": "unknown",
                                  "runner": "fake",
                                  "target": "public-api-mix",
                                  "rate": 1,
                                  "durationSeconds": 1,
                                  "maxVus": 1,
                                  "targets": [
                                    {"id": "bad", "label": "Bad", "path": "not-relative", "group": "work"}
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Unsupported load test scenario: unknown"));
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

    private static final class ControllableExecutor implements RealLoadTestExecutor {
        private BlockingExecution execution;
        private PreparedRealLoadTestRun startedRun;

        @Override
        public LoadTestExecution start(PreparedRealLoadTestRun run) {
            startedRun = run;
            execution = new BlockingExecution();
            return execution;
        }
    }

    private static final class BlockingExecution implements LoadTestExecution {
        private final CountDownLatch stoppedLatch = new CountDownLatch(1);
        private final AtomicBoolean alive = new AtomicBoolean(true);
        private volatile boolean stopped;

        @Override
        public int waitFor() throws InterruptedException {
            stoppedLatch.await(5, TimeUnit.SECONDS);
            return stopped ? 130 : 0;
        }

        @Override
        public void stop() {
            stopped = true;
            alive.set(false);
            stoppedLatch.countDown();
        }

        @Override
        public boolean isAlive() {
            return alive.get();
        }
    }
}
