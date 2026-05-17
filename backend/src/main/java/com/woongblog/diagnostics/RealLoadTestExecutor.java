package com.woongblog.diagnostics;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

interface RealLoadTestExecutor {
    LoadTestExecution start(PreparedRealLoadTestRun run) throws IOException;
}

interface LoadTestExecution {
    int waitFor() throws InterruptedException;

    void stop();

    boolean isAlive();
}

record PreparedRealLoadTestRun(
        String runId,
        String scenario,
        String runner,
        String target,
        int rate,
        int peakRate,
        int durationSeconds,
        int maxVus,
        int startVus,
        String baseUrl,
        Path reportDirectory,
        List<RealLoadTestService.Target> targets) {
}
