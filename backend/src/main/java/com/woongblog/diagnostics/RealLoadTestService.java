package com.woongblog.diagnostics;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.common.BadRequestException;
import com.woongblog.common.ConflictException;
import com.woongblog.common.NotFoundException;
import com.woongblog.config.AppProperties;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.stereotype.Service;

@Service
public class RealLoadTestService {
    private static final Set<String> SCENARIOS = Set.of(
            "public-api-rps",
            "public-api-spike",
            "public-api-soak",
            "public-api-stress");
    private static final Set<String> RUNNERS = Set.of("k6", "fake");
    private static final Set<String> TARGETS = Set.of("public-api-mix", "public-works-only", "public-blogs-only");
    private static final int MAX_RATE = 100_000;
    private static final int MAX_DURATION_SECONDS = 60 * 60;
    private static final int MAX_VUS = 10_000;

    private final Map<String, RunRecord> runs = new ConcurrentHashMap<>();
    private final ExecutorService monitorExecutor = Executors.newCachedThreadPool();
    private final AppProperties properties;
    private final RuntimeDiagnosticsService diagnosticsService;
    private final RealLoadTestExecutor executor;
    private final ObjectMapper objectMapper;

    public RealLoadTestService(
            AppProperties properties,
            RuntimeDiagnosticsService diagnosticsService,
            RealLoadTestExecutor executor,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.diagnosticsService = diagnosticsService;
        this.executor = executor;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> start(StartRequest request) {
        PreparedRealLoadTestRun run = prepare(request);
        RunRecord record = new RunRecord(run);

        synchronized (runs) {
            if (runs.values().stream().anyMatch(RunRecord::active)) {
                throw new ConflictException("A real backend load test is already running.");
            }
            runs.put(run.runId(), record);
        }

        try {
            record.addDiagnostics(diagnosticsService.snapshot());
            persistRequest(run);

            if ("fake".equals(run.runner())) {
                Summary summary = fakeSummary(run);
                persistSummary(run, summary);
                record.complete(0, summary, diagnosticsService.snapshot());
                return record.statusPayload();
            }

            LoadTestExecution execution = executor.start(run);
            record.attach(execution);
            CompletableFuture.runAsync(() -> monitor(record), monitorExecutor);
            return record.statusPayload();
        } catch (IOException exception) {
            record.fail(exception.getMessage(), diagnosticsService.snapshot());
            runs.remove(run.runId());
            throw new BadRequestException("Unable to start k6 load test: " + exception.getMessage());
        } catch (RuntimeException exception) {
            runs.remove(run.runId());
            throw exception;
        }
    }

    public Map<String, Object> status(String runId) {
        return run(runId).statusPayload();
    }

    public Map<String, Object> metrics(String runId) {
        RunRecord record = run(runId);
        record.addDiagnostics(diagnosticsService.snapshot());
        if (record.summary == null) {
            java.nio.file.Path summaryPath = record.run.reportDirectory().resolve("summary.json");
            if (Files.exists(summaryPath)) {
                record.summary = summaryFromFile(summaryPath);
            }
        }
        return record.metricsPayload();
    }

    public Map<String, Object> stop(String runId) {
        RunRecord record = run(runId);
        record.stop(diagnosticsService.snapshot());
        return record.statusPayload();
    }

    @PreDestroy
    void shutdown() {
        monitorExecutor.shutdownNow();
    }

    private RunRecord run(String runId) {
        RunRecord record = runs.get(runId);
        if (record == null) {
            throw new NotFoundException("Real load test run not found.");
        }
        return record;
    }

    private void monitor(RunRecord record) {
        try {
            int exitCode = record.waitFor();
            if ("stopped".equals(record.status)) {
                return;
            }
            Summary summary = summaryFromFile(record.run.reportDirectory().resolve("summary.json"));
            record.complete(exitCode, summary, diagnosticsService.snapshot());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            record.fail("Load test monitor was interrupted.", diagnosticsService.snapshot());
        } catch (RuntimeException exception) {
            record.fail(exception.getMessage(), diagnosticsService.snapshot());
        }
    }

    private PreparedRealLoadTestRun prepare(StartRequest request) {
        String scenario = allowed("scenario", request.scenario(), "public-api-rps", SCENARIOS);
        String runner = allowed("runner", request.runner(), "k6", RUNNERS);
        String target = allowed("target", request.target(), "public-api-mix", TARGETS);
        int rate = clamp(request.rate(), 1, MAX_RATE);
        int peakRate = Math.max(rate, clamp(request.peakRate() == null ? rate : request.peakRate(), 1, MAX_RATE));
        int durationSeconds = clamp(request.durationSeconds(), 1, MAX_DURATION_SECONDS);
        int maxVus = clamp(request.maxVus(), 1, MAX_VUS);
        int startVus = clamp(request.startVus() == null ? 1 : request.startVus(), 1, maxVus);
        List<Target> targets = filterTargets(target, sanitizeTargets(request.targets()));
        String runId = UUID.randomUUID().toString();
        return new PreparedRealLoadTestRun(
                runId,
                scenario,
                runner,
                target,
                rate,
                peakRate,
                durationSeconds,
                maxVus,
                startVus,
                properties.getLoadTesting().getBaseUrl(),
                properties.getLoadTesting().getReportRoot().resolve(runId).normalize(),
                targets);
    }

    private void persistRequest(PreparedRealLoadTestRun run) {
        try {
            Files.createDirectories(run.reportDirectory());
            objectMapper.writeValue(run.reportDirectory().resolve("request.json").toFile(), requestReport(run));
        } catch (IOException exception) {
            throw new BadRequestException("Unable to persist load test request: " + exception.getMessage());
        }
    }

    private void persistSummary(PreparedRealLoadTestRun run, Summary summary) {
        try {
            Files.createDirectories(run.reportDirectory());
            objectMapper.writeValue(run.reportDirectory().resolve("summary.json").toFile(), summary.toK6Summary());
            Files.writeString(run.reportDirectory().resolve("metrics.ndjson"), "");
        } catch (IOException exception) {
            throw new BadRequestException("Unable to persist load test summary: " + exception.getMessage());
        }
    }

    private static Map<String, Object> requestReport(PreparedRealLoadTestRun run) {
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("runId", run.runId());
        report.put("scenario", run.scenario());
        report.put("runner", run.runner());
        report.put("target", run.target());
        report.put("rate", run.rate());
        report.put("peakRate", run.peakRate());
        report.put("durationSeconds", run.durationSeconds());
        report.put("maxVus", run.maxVus());
        report.put("startVus", run.startVus());
        report.put("baseUrl", run.baseUrl());
        report.put("targets", run.targets());
        return report;
    }

    private Summary summaryFromFile(java.nio.file.Path path) {
        if (!Files.exists(path)) {
            return Summary.empty();
        }
        try {
            JsonNode root = objectMapper.readTree(path.toFile());
            return Summary.fromK6(root.path("metrics"));
        } catch (IOException exception) {
            throw new BadRequestException("Unable to read k6 summary: " + exception.getMessage());
        }
    }

    private static Summary fakeSummary(PreparedRealLoadTestRun run) {
        long requests = Math.max(1, (long) run.rate() * run.durationSeconds());
        return new Summary(requests, run.rate(), 0, 10, 20, 30, 40, 50);
    }

    private static List<Target> sanitizeTargets(List<Target> targets) {
        if (targets == null || targets.isEmpty()) {
            throw new BadRequestException("At least one load test target is required.");
        }
        return targets.stream()
                .map(Target::sanitize)
                .toList();
    }

    private static List<Target> filterTargets(String targetMode, List<Target> targets) {
        List<Target> filtered = switch (targetMode) {
            case "public-works-only" -> targets.stream().filter(target -> target.group().equals("work")).toList();
            case "public-blogs-only" -> targets.stream().filter(target -> target.group().equals("study")).toList();
            default -> targets;
        };
        if (filtered.isEmpty()) {
            throw new BadRequestException("Selected load test target group has no runnable targets.");
        }
        return filtered;
    }

    private static String allowed(String label, String value, String fallback, Set<String> allowedValues) {
        String normalized = value == null || value.isBlank()
                ? fallback
                : value.trim().toLowerCase(Locale.ROOT);
        if (!allowedValues.contains(normalized)) {
            throw new BadRequestException("Unsupported load test " + label + ": " + value);
        }
        return normalized;
    }

    private static int clamp(int value, int min, int max) {
        return Math.min(Math.max(value, min), max);
    }

    public record StartRequest(
            String scenario,
            String runner,
            String target,
            int rate,
            Integer peakRate,
            int durationSeconds,
            @JsonAlias("maxVUs") int maxVus,
            @JsonAlias("startVUs") Integer startVus,
            List<Target> targets) {
    }

    public record Target(String id, String label, String path, String group) {
        Target sanitize() {
            String safeId = required("target id", id);
            String safeLabel = required("target label", label);
            String safePath = required("target path", path);
            String safeGroup = required("target group", group).toLowerCase(Locale.ROOT);
            if (!safePath.startsWith("/")) {
                throw new BadRequestException("Load test target path must start with '/'.");
            }
            if (!safeGroup.equals("work") && !safeGroup.equals("study")) {
                throw new BadRequestException("Load test target group must be work or study.");
            }
            return new Target(safeId, safeLabel, safePath, safeGroup);
        }

        private static String required(String label, String value) {
            if (value == null || value.isBlank()) {
                throw new BadRequestException("Load test " + label + " is required.");
            }
            return value.trim();
        }
    }

    private static final class RunRecord {
        private final PreparedRealLoadTestRun run;
        private final Instant startedAt = Instant.now();
        private final List<Map<String, Object>> diagnostics = new ArrayList<>();
        private volatile String status = "running";
        private volatile Instant finishedAt;
        private volatile String error;
        private volatile LoadTestExecution execution;
        private volatile Summary summary;

        private RunRecord(PreparedRealLoadTestRun run) {
            this.run = run;
        }

        private boolean active() {
            return status.equals("running") || status.equals("queued") || status.equals("starting");
        }

        private void attach(LoadTestExecution execution) {
            this.execution = execution;
        }

        private int waitFor() throws InterruptedException {
            return execution == null ? 0 : execution.waitFor();
        }

        private void complete(int exitCode, Summary summary, Map<String, Object> diagnosticsSnapshot) {
            this.summary = summary;
            this.finishedAt = Instant.now();
            this.status = exitCode == 0 ? "completed" : "failed";
            this.error = exitCode == 0 ? null : "k6 exited with code " + exitCode + ".";
            addDiagnostics(diagnosticsSnapshot);
        }

        private void fail(String message, Map<String, Object> diagnosticsSnapshot) {
            this.finishedAt = Instant.now();
            this.status = "failed";
            this.error = message;
            addDiagnostics(diagnosticsSnapshot);
        }

        private void stop(Map<String, Object> diagnosticsSnapshot) {
            if (!active()) {
                return;
            }
            LoadTestExecution currentExecution = execution;
            if (currentExecution != null && currentExecution.isAlive()) {
                currentExecution.stop();
            }
            this.finishedAt = Instant.now();
            this.status = "stopped";
            addDiagnostics(diagnosticsSnapshot);
        }

        private synchronized void addDiagnostics(Map<String, Object> snapshot) {
            diagnostics.add(snapshot);
            if (diagnostics.size() > 120) {
                diagnostics.removeFirst();
            }
        }

        private Map<String, Object> statusPayload() {
            Map<String, Object> payload = basePayload();
            payload.put("metricsPending", summary == null && active());
            payload.put("error", error);
            payload.putAll(metricsFields());
            return payload;
        }

        private Map<String, Object> metricsPayload() {
            Map<String, Object> payload = statusPayload();
            payload.put("metrics", summary == null ? List.of() : List.of(metricPoint()));
            payload.put("diagnostics", List.copyOf(diagnostics));
            return payload;
        }

        private Map<String, Object> basePayload() {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("runId", run.runId());
            payload.put("status", status);
            payload.put("scenario", run.scenario());
            payload.put("runner", run.runner());
            payload.put("target", run.target());
            payload.put("startedAt", startedAt);
            payload.put("finishedAt", finishedAt);
            payload.put("reportDirectory", run.reportDirectory().toString());
            return payload;
        }

        private Map<String, Object> metricsFields() {
            Summary current = summary == null ? Summary.empty() : summary;
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("requests", current.requests());
            fields.put("totalRequests", current.requests());
            fields.put("throughputRps", current.throughputRps());
            fields.put("currentRps", current.throughputRps());
            fields.put("latencyMs", current.p95Ms());
            fields.put("p95Ms", current.p95Ms());
            fields.put("statusCounts", current.statusCounts());
            fields.put("httpCounts", current.httpCounts());
            fields.put("latencyBreakdown", current.latencyBreakdown());
            fields.put("targetMetrics", current.targetMetrics(run.targets()));
            return fields;
        }

        private Map<String, Object> metricPoint() {
            Map<String, Object> point = new LinkedHashMap<>();
            point.putAll(metricsFields());
            point.put("diagnostics", diagnostics.isEmpty() ? null : diagnostics.getLast());
            return point;
        }
    }

    private record Summary(
            long requests,
            double throughputRps,
            long failed,
            double minMs,
            double p50Ms,
            double p95Ms,
            double p99Ms,
            double maxMs) {
        private static Summary empty() {
            return new Summary(0, 0, 0, 0, 0, 0, 0, 0);
        }

        private static Summary fromK6(JsonNode metrics) {
            long requests = metrics.path("http_reqs").path("count").asLong(0);
            double throughput = metrics.path("http_reqs").path("rate").asDouble(0);
            double failedRate = metrics.path("http_req_failed").path("rate").asDouble(0);
            long failed = Math.round(requests * failedRate);
            JsonNode duration = metrics.path("http_req_duration");
            return new Summary(
                    requests,
                    throughput,
                    failed,
                    duration.path("min").asDouble(0),
                    duration.path("med").asDouble(0),
                    duration.path("p(95)").asDouble(0),
                    duration.path("p(99)").asDouble(0),
                    duration.path("max").asDouble(0));
        }

        private Map<String, Object> toK6Summary() {
            Map<String, Object> httpReqs = new LinkedHashMap<>();
            httpReqs.put("count", requests);
            httpReqs.put("rate", throughputRps);
            Map<String, Object> failedMetric = new LinkedHashMap<>();
            failedMetric.put("rate", requests == 0 ? 0 : failed / (double) requests);
            Map<String, Object> duration = new LinkedHashMap<>();
            duration.put("min", minMs);
            duration.put("med", p50Ms);
            duration.put("p(95)", p95Ms);
            duration.put("p(99)", p99Ms);
            duration.put("max", maxMs);
            return Map.of("metrics", Map.of(
                    "http_reqs", httpReqs,
                    "http_req_failed", failedMetric,
                    "http_req_duration", duration));
        }

        private Map<String, Object> latencyBreakdown() {
            Map<String, Object> breakdown = new LinkedHashMap<>();
            breakdown.put("minMs", minMs);
            breakdown.put("p50Ms", p50Ms);
            breakdown.put("p95Ms", p95Ms);
            breakdown.put("p99Ms", p99Ms);
            breakdown.put("maxMs", maxMs);
            breakdown.put("appElapsedP95Ms", null);
            breakdown.put("nginxRequestTimeP95Ms", null);
            breakdown.put("nginxUpstreamP95Ms", null);
            return breakdown;
        }

        private Map<String, Object> statusCounts() {
            long success = Math.max(0, requests - failed);
            Map<String, Object> counts = new LinkedHashMap<>();
            counts.put("2xx", success);
            counts.put("3xx", 0);
            counts.put("4xx", 0);
            counts.put("5xx", failed);
            return counts;
        }

        private Map<String, Object> httpCounts() {
            long success = Math.max(0, requests - failed);
            Map<String, Object> counts = new LinkedHashMap<>();
            counts.put("total", requests);
            counts.put("success", success);
            counts.put("failed", failed);
            counts.put("status2xx", success);
            counts.put("status3xx", 0);
            counts.put("status4xx", 0);
            counts.put("status5xx", failed);
            return counts;
        }

        private List<Map<String, Object>> targetMetrics(List<Target> targets) {
            if (targets.isEmpty()) {
                return List.of();
            }
            long perTargetRequests = requests / targets.size();
            long remainder = requests % targets.size();
            List<Map<String, Object>> metrics = new ArrayList<>();
            for (int index = 0; index < targets.size(); index++) {
                Target target = targets.get(index);
                long requestCount = perTargetRequests + (index < remainder ? 1 : 0);
                Map<String, Object> metric = new LinkedHashMap<>();
                metric.put("targetId", target.id());
                metric.put("targetLabel", target.label());
                metric.put("targetPath", target.path());
                metric.put("group", target.group());
                metric.put("requestCount", requestCount);
                metric.put("successCount", requestCount);
                metric.put("failureCount", 0);
                metric.put("p95Ms", p95Ms);
                metric.put("responseBytesP95", null);
                metric.put("receiveP95Ms", null);
                metric.put("dbCommandElapsedP95Ms", null);
                metric.put("dbCommandCountP95", null);
                metric.put("statusCounts", statusCounts());
                metrics.add(metric);
            }
            return metrics;
        }
    }
}
