package com.woongblog.diagnostics;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class DiagnosticsController {
    private final RuntimeDiagnosticsService diagnosticsService;
    private final RealLoadTestService loadTestService;

    public DiagnosticsController(RuntimeDiagnosticsService diagnosticsService, RealLoadTestService loadTestService) {
        this.diagnosticsService = diagnosticsService;
        this.loadTestService = loadTestService;
    }

    @GetMapping("/load-test/diagnostics")
    Map<String, Object> diagnostics() {
        return diagnosticsService.snapshot();
    }

    @PostMapping("/load-tests/real/start")
    Map<String, Object> start(@RequestBody RealLoadTestService.StartRequest request) {
        return loadTestService.start(request);
    }

    @GetMapping("/load-tests/real/{runId}")
    Map<String, Object> status(@PathVariable String runId) {
        return loadTestService.status(runId);
    }

    @GetMapping("/load-tests/real/{runId}/metrics")
    Map<String, Object> metrics(@PathVariable String runId) {
        return loadTestService.metrics(runId);
    }

    @PostMapping("/load-tests/real/{runId}/stop")
    Map<String, Object> stop(@PathVariable String runId) {
        return loadTestService.stop(runId);
    }
}
