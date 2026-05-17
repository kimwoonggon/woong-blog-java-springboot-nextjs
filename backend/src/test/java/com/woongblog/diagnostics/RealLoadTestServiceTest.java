package com.woongblog.diagnostics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.fail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.common.BadRequestException;
import com.woongblog.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@Tag("component")
class RealLoadTestServiceTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private RealLoadTestService service;
    private AppProperties properties;

    @TempDir
    private Path reportRoot;

    @BeforeEach
    void setUp() {
        properties = new AppProperties();
        properties.getLoadTesting().setBaseUrl("https://backend.example.test");
        properties.getLoadTesting().setReportRoot(reportRoot);
    }

    @AfterEach
    void tearDown() {
        if (service != null) {
            service.shutdown();
        }
    }

    @Test
    void k6RunnerCompletesFromSummaryAndExposesParsedMetrics() throws Exception {
        BlockingExecution execution = new BlockingExecution();
        service = service(new BlockingSummaryWritingExecutor(execution));

        Map<String, Object> started = service.start(new RealLoadTestService.StartRequest(
                "public-api-spike",
                "k6",
                "public-api-mix",
                12,
                30,
                15,
                20,
                2,
                targets()));

        assertThat(started)
                .containsEntry("status", "running")
                .containsEntry("metricsPending", true);
        execution.release();
        Map<String, Object> completed = awaitStatus((String) started.get("runId"), "completed");
        assertThat(completed)
                .containsEntry("requests", 24L)
                .containsEntry("throughputRps", 6.5)
                .containsEntry("p95Ms", 150.0)
                .containsEntry("error", null);

        Map<String, Object> metrics = service.metrics((String) started.get("runId"));
        assertThat(metrics.get("metrics")).asList().hasSize(1);
        assertThat(metrics.get("diagnostics")).asList().isNotEmpty();
        assertThat(httpCounts(metrics)).containsEntry("failed", 6L);
        assertThat(statusCounts(metrics)).containsEntry("5xx", 6L);
        assertThat(latencyBreakdown(metrics))
                .containsEntry("minMs", 12.0)
                .containsEntry("p50Ms", 80.0)
                .containsEntry("p95Ms", 150.0)
                .containsEntry("p99Ms", 250.0)
                .containsEntry("maxMs", 450.0);
        assertThat(targetMetrics(metrics)).hasSize(2);
    }

    @Test
    void k6RunnerMarksRunFailedWhenProcessExitsNonZero() throws Exception {
        service = service(new SummaryWritingExecutor(27));

        Map<String, Object> started = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "k6",
                "public-api-mix",
                4,
                null,
                3,
                5,
                null,
                targets()));

        Map<String, Object> failed = awaitStatus((String) started.get("runId"), "failed");
        assertThat(failed)
                .containsEntry("error", "k6 exited with code 27.")
                .containsEntry("requests", 24L);
    }

    @Test
    void metricsLoadsSummaryFileWhileK6RunIsStillActive() throws Exception {
        BlockingExecution execution = new BlockingExecution();
        service = service(new BlockingSummaryWritingExecutor(execution));

        Map<String, Object> started = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "k6",
                "public-api-mix",
                3,
                null,
                10,
                5,
                null,
                targets()));

        Map<String, Object> metrics = service.metrics((String) started.get("runId"));

        assertThat(metrics)
                .containsEntry("status", "running")
                .containsEntry("requests", 24L)
                .containsEntry("metricsPending", false);
        execution.release();
        assertThat(awaitStatus((String) started.get("runId"), "completed"))
                .containsEntry("requests", 24L);
    }

    @Test
    void k6RunnerCompletesWithEmptySummaryWhenSummaryFileIsMissing() throws Exception {
        service = service(run -> new ImmediateExecution(0));

        Map<String, Object> started = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "k6",
                "public-api-mix",
                4,
                null,
                3,
                5,
                null,
                targets()));

        Map<String, Object> completed = awaitStatus((String) started.get("runId"), "completed");
        assertThat(completed)
                .containsEntry("requests", 0L)
                .containsEntry("throughputRps", 0.0);
    }

    @Test
    void k6RunnerFailsWhenSummaryFileIsMalformed() throws Exception {
        service = service(run -> {
            Files.writeString(run.reportDirectory().resolve("summary.json"), "{not-json");
            return new ImmediateExecution(0);
        });

        Map<String, Object> started = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "k6",
                "public-api-mix",
                4,
                null,
                3,
                5,
                null,
                targets()));

        Map<String, Object> failed = awaitStatus((String) started.get("runId"), "failed");
        assertThat((String) failed.get("error")).startsWith("Unable to read k6 summary:");
    }

    @Test
    void k6RunnerFailsWhenMonitorIsInterrupted() throws Exception {
        service = service(run -> new InterruptedExecution());

        Map<String, Object> started = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "k6",
                "public-api-mix",
                4,
                null,
                3,
                5,
                null,
                targets()));

        assertThat(awaitStatus((String) started.get("runId"), "failed"))
                .containsEntry("error", "Load test monitor was interrupted.");
    }

    @Test
    void k6StartFailureReturnsBadRequestAndDoesNotBlockNextRun() {
        service = service(run -> {
            throw new IOException("k6 executable not found");
        });

        assertThatThrownBy(() -> service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "k6",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                targets())))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Unable to start k6 load test: k6 executable not found");

        Map<String, Object> recovered = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                targets()));

        assertThat(recovered).containsEntry("status", "completed");
    }

    @Test
    void defaultedFakeRunnerClampsRequestValuesAndStopIsNoopAfterCompletion() throws Exception {
        service = service(new SummaryWritingExecutor(0));

        Map<String, Object> completed = service.start(new RealLoadTestService.StartRequest(
                null,
                "fake",
                null,
                0,
                null,
                0,
                0,
                50,
                targets()));

        assertThat(completed)
                .containsEntry("status", "completed")
                .containsEntry("scenario", "public-api-rps")
                .containsEntry("target", "public-api-mix")
                .containsEntry("requests", 1L);
        Map<String, Object> stopped = service.stop((String) completed.get("runId"));
        assertThat(stopped).containsEntry("status", "completed");

        JsonNode request = objectMapper.readTree(reportRoot.resolve((String) completed.get("runId"))
                .resolve("request.json")
                .toFile());
        assertThat(request.get("rate").asInt()).isEqualTo(1);
        assertThat(request.get("durationSeconds").asInt()).isEqualTo(1);
        assertThat(request.get("maxVus").asInt()).isEqualTo(1);
        assertThat(request.get("startVus").asInt()).isEqualTo(1);
        assertThat(request.get("peakRate").asInt()).isEqualTo(1);
    }

    @Test
    void metricsKeepOnlyRecentDiagnosticsSnapshots() throws Exception {
        service = service(new SummaryWritingExecutor(0));
        Map<String, Object> completed = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                targets()));

        String runId = (String) completed.get("runId");
        for (int index = 0; index < 130; index++) {
            service.metrics(runId);
        }

        assertThat(service.metrics(runId).get("diagnostics")).asList().hasSize(120);
    }

    @Test
    void rejectsInvalidTargetPayloads() {
        service = service(new SummaryWritingExecutor(0));

        assertThatThrownBy(() -> service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                List.of(new RealLoadTestService.Target("bad", "Bad", "api/no-leading-slash", "work")))))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Load test target path must start with '/'.");

        assertThatThrownBy(() -> service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                List.of(new RealLoadTestService.Target("bad", "Bad", "/api/public/works/demo", "other")))))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Load test target group must be work or study.");

        assertThatThrownBy(() -> service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-blogs-only",
                1,
                null,
                1,
                1,
                null,
                List.of(new RealLoadTestService.Target("work", "Work", "/api/public/works/demo", "work")))))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Selected load test target group has no runnable targets.");

        assertThatThrownBy(() -> service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                List.of())))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("At least one load test target is required.");

        assertThatThrownBy(() -> service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                List.of(new RealLoadTestService.Target("blank", " ", "/api/public/works/demo", "work")))))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Load test target label is required.");
    }

    @Test
    void requestPersistenceFailureReturnsBadRequest() throws Exception {
        Path blockedRoot = reportRoot.resolve("blocked-root");
        Files.writeString(blockedRoot, "not a directory");
        properties.getLoadTesting().setReportRoot(blockedRoot);
        service = service(new SummaryWritingExecutor(0));

        assertThatThrownBy(() -> service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                targets())))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Unable to persist load test request:");

        properties.getLoadTesting().setReportRoot(reportRoot);
        Map<String, Object> recovered = service.start(new RealLoadTestService.StartRequest(
                "public-api-rps",
                "fake",
                "public-api-mix",
                1,
                null,
                1,
                1,
                null,
                targets()));
        assertThat(recovered).containsEntry("status", "completed");
    }

    private RealLoadTestService service(RealLoadTestExecutor executor) {
        RuntimeDiagnosticsService diagnosticsService = new RuntimeDiagnosticsService(
                properties,
                (org.springframework.jdbc.core.JdbcTemplate) null);
        return new RealLoadTestService(properties, diagnosticsService, executor, objectMapper);
    }

    private Map<String, Object> awaitStatus(String runId, String expectedStatus) throws InterruptedException {
        for (int attempt = 0; attempt < 100; attempt++) {
            Map<String, Object> status = service.status(runId);
            if (expectedStatus.equals(status.get("status"))) {
                return status;
            }
            Thread.sleep(20);
        }
        fail("Timed out waiting for run " + runId + " to reach " + expectedStatus);
        return Map.of();
    }

    private static List<RealLoadTestService.Target> targets() {
        return List.of(
                new RealLoadTestService.Target("work-read", "Work read", "/api/public/works/demo", "work"),
                new RealLoadTestService.Target("blog-read", "Blog read", "/api/public/blogs/demo", "study"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> httpCounts(Map<String, Object> metrics) {
        return (Map<String, Object>) metrics.get("httpCounts");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> statusCounts(Map<String, Object> metrics) {
        return (Map<String, Object>) metrics.get("statusCounts");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> latencyBreakdown(Map<String, Object> metrics) {
        return (Map<String, Object>) metrics.get("latencyBreakdown");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> targetMetrics(Map<String, Object> metrics) {
        return (List<Map<String, Object>>) metrics.get("targetMetrics");
    }

    private final class SummaryWritingExecutor implements RealLoadTestExecutor {
        private final int exitCode;

        private SummaryWritingExecutor(int exitCode) {
            this.exitCode = exitCode;
        }

        @Override
        public LoadTestExecution start(PreparedRealLoadTestRun run) throws IOException {
            objectMapper.writeValue(run.reportDirectory().resolve("summary.json").toFile(), Map.of(
                    "metrics", Map.of(
                            "http_reqs", Map.of(
                                    "count", 24,
                                    "rate", 6.5),
                            "http_req_failed", Map.of(
                                    "rate", 0.25),
                            "http_req_duration", Map.of(
                                    "min", 12,
                                    "med", 80,
                                    "p(95)", 150,
                                    "p(99)", 250,
                                    "max", 450))));
            return new ImmediateExecution(exitCode);
        }
    }

    private final class BlockingSummaryWritingExecutor implements RealLoadTestExecutor {
        private final BlockingExecution execution;

        private BlockingSummaryWritingExecutor(BlockingExecution execution) {
            this.execution = execution;
        }

        @Override
        public LoadTestExecution start(PreparedRealLoadTestRun run) throws IOException {
            objectMapper.writeValue(run.reportDirectory().resolve("summary.json").toFile(), Map.of(
                    "metrics", Map.of(
                            "http_reqs", Map.of(
                                    "count", 24,
                                    "rate", 6.5),
                            "http_req_failed", Map.of(
                                    "rate", 0.25),
                            "http_req_duration", Map.of(
                                    "min", 12,
                                    "med", 80,
                                    "p(95)", 150,
                                    "p(99)", 250,
                                    "max", 450))));
            return execution;
        }
    }

    private record ImmediateExecution(int exitCode) implements LoadTestExecution {
        @Override
        public int waitFor() {
            return exitCode;
        }

        @Override
        public void stop() {
        }

        @Override
        public boolean isAlive() {
            return false;
        }
    }

    private static final class BlockingExecution implements LoadTestExecution {
        private final CountDownLatch latch = new CountDownLatch(1);

        @Override
        public int waitFor() throws InterruptedException {
            latch.await(5, TimeUnit.SECONDS);
            return 0;
        }

        @Override
        public void stop() {
            latch.countDown();
        }

        @Override
        public boolean isAlive() {
            return latch.getCount() > 0;
        }

        private void release() {
            latch.countDown();
        }
    }

    private static final class InterruptedExecution implements LoadTestExecution {
        @Override
        public int waitFor() throws InterruptedException {
            throw new InterruptedException("test interrupt");
        }

        @Override
        public void stop() {
        }

        @Override
        public boolean isAlive() {
            return false;
        }
    }
}
