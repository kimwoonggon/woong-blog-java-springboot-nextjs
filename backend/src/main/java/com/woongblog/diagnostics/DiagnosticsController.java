package com.woongblog.diagnostics;

import com.woongblog.config.AppProperties;
import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class DiagnosticsController {
    private final Map<String, RunState> runs = new ConcurrentHashMap<>();
    private final AppProperties properties;

    public DiagnosticsController(AppProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/load-test/diagnostics")
    Map<String, Object> diagnostics() {
        Runtime runtime = Runtime.getRuntime();
        return Map.of(
                "capturedAt", Instant.now(),
                "processUptimeMs", ManagementFactory.getRuntimeMXBean().getUptime(),
                "availableProcessors", runtime.availableProcessors(),
                "heapUsedBytes", runtime.totalMemory() - runtime.freeMemory(),
                "heapCommittedBytes", runtime.totalMemory(),
                "loadTestingBaseUrl", properties.getLoadTesting().getBaseUrl());
    }

    @PostMapping("/load-tests/real/start")
    Map<String, Object> start(@RequestBody StartRealLoadTestRequest request) {
        String runId = UUID.randomUUID().toString();
        RunState state = new RunState(runId, request.scenario(), request.runner(), request.target(), "running", Instant.now(), null);
        runs.put(runId, state);
        return Map.of("runId", runId, "status", state.status(), "startedAt", state.startedAt());
    }

    @GetMapping("/load-tests/real/{runId}")
    RunState status(@PathVariable String runId) {
        RunState state = runs.get(runId);
        if (state == null) {
            throw new com.woongblog.common.NotFoundException("Real load test run not found.");
        }
        return state;
    }

    @GetMapping("/load-tests/real/{runId}/metrics")
    Map<String, Object> metrics(@PathVariable String runId) {
        RunState state = status(runId);
        return Map.of(
                "runId", state.runId(),
                "status", state.status(),
                "httpReqs", 0,
                "httpReqFailedRate", 0,
                "p95Ms", 0,
                "baseUrl", properties.getLoadTesting().getBaseUrl());
    }

    @PostMapping("/load-tests/real/{runId}/stop")
    Map<String, Object> stop(@PathVariable String runId) {
        RunState state = status(runId);
        RunState stopped = new RunState(state.runId(), state.scenario(), state.runner(), state.target(), "stopped", state.startedAt(), Instant.now());
        runs.put(runId, stopped);
        return Map.of("runId", runId, "status", "stopped", "finishedAt", stopped.finishedAt());
    }

    public record StartRealLoadTestRequest(
            String scenario,
            String runner,
            String target,
            int rate,
            Integer peakRate,
            int durationSeconds,
            int maxVus,
            Integer startVus,
            java.util.List<Map<String, Object>> targets) {
    }

    public record RunState(
            String runId,
            String scenario,
            String runner,
            String target,
            String status,
            Instant startedAt,
            Instant finishedAt) {
    }
}
