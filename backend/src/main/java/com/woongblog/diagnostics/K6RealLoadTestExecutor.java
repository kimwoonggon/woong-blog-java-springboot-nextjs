package com.woongblog.diagnostics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class K6RealLoadTestExecutor implements RealLoadTestExecutor {
    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final ProcessLauncher processLauncher;

    @Autowired
    public K6RealLoadTestExecutor(AppProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, new DefaultProcessLauncher());
    }

    K6RealLoadTestExecutor(AppProperties properties, ObjectMapper objectMapper, ProcessLauncher processLauncher) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.processLauncher = processLauncher;
    }

    @Override
    public LoadTestExecution start(PreparedRealLoadTestRun run) throws IOException {
        Files.createDirectories(run.reportDirectory());
        Path scriptPath = run.reportDirectory().resolve("run.js");
        Path targetsPath = run.reportDirectory().resolve("targets.json");
        Path summaryPath = run.reportDirectory().resolve("summary.json");
        Path metricsPath = run.reportDirectory().resolve("metrics.ndjson");
        Path logPath = run.reportDirectory().resolve("k6.log");

        objectMapper.writeValue(targetsPath.toFile(), run.targets());
        Files.writeString(scriptPath, script(run));

        List<String> command = new ArrayList<>();
        command.add(properties.getLoadTesting().getK6Bin());
        command.add("run");
        command.add("--summary-export");
        command.add(summaryPath.toString());
        command.add("--out");
        command.add("json=" + metricsPath);
        command.add(scriptPath.toString());

        Map<String, String> environment = new LinkedHashMap<>();
        environment.put("BASE_URL", run.baseUrl());
        environment.put("RATE", Integer.toString(run.rate()));
        environment.put("PEAK_RATE", Integer.toString(run.peakRate()));
        environment.put("DURATION_SECONDS", Integer.toString(run.durationSeconds()));
        environment.put("MAX_VUS", Integer.toString(run.maxVus()));
        environment.put("START_VUS", Integer.toString(run.startVus()));

        return processLauncher.start(command, environment, run.reportDirectory(), logPath);
    }

    private static String script(PreparedRealLoadTestRun run) {
        return """
                import http from 'k6/http';
                import { check, sleep } from 'k6';

                const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';
                const targets = JSON.parse(open('./targets.json'));
                const rate = Number.parseInt(__ENV.RATE || '10', 10);
                const peakRate = Number.parseInt(__ENV.PEAK_RATE || '20', 10);
                const durationSeconds = Number.parseInt(__ENV.DURATION_SECONDS || '30', 10);
                const maxVus = Number.parseInt(__ENV.MAX_VUS || '10', 10);
                const startVus = Number.parseInt(__ENV.START_VUS || '1', 10);

                export const options = {
                  scenarios: {
                %s
                  },
                  thresholds: {
                    http_req_failed: ['rate<0.05'],
                    http_req_duration: ['p(95)<1500'],
                  },
                };

                function cacheBust(path) {
                  const separator = path.includes('?') ? '&' : '?';
                  return `${baseUrl}${path}${separator}__k6Vu=${__VU}&__k6Iter=${__ITER}`;
                }

                export default function realBackendLoad() {
                  const target = targets[__ITER %% targets.length];
                  const response = http.get(cacheBust(target.path), {
                    tags: {
                      scenario: '%s',
                      targetId: target.id,
                      targetGroup: target.group,
                    },
                  });
                  check(response, {
                    'status is < 500': (r) => r.status < 500,
                  });
                %s
                }
                """.formatted(
                scenarioBlock(run.scenario()),
                run.scenario(),
                "public-api-soak".equals(run.scenario()) ? "  sleep(1);" : "");
    }

    private static String scenarioBlock(String scenario) {
        return switch (scenario) {
            case "public-api-spike" -> """
                    public_api_spike: {
                      executor: 'ramping-arrival-rate',
                      startRate: rate,
                      timeUnit: '1s',
                      preAllocatedVUs: Math.min(200, maxVus),
                      maxVUs,
                      stages: [
                        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.3))}s`, target: rate },
                        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.2))}s`, target: peakRate },
                        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.2))}s`, target: peakRate },
                        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.3))}s`, target: rate },
                      ],
                    },
                    """;
            case "public-api-soak" -> """
                    public_api_soak: {
                      executor: 'constant-vus',
                      vus: maxVus,
                      duration: `${durationSeconds}s`,
                    },
                    """;
            case "public-api-stress" -> """
                    public_api_stress: {
                      executor: 'ramping-vus',
                      startVUs: startVus,
                      stages: [
                        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: Math.floor(maxVus * 0.4) },
                        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: Math.floor(maxVus * 0.7) },
                        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: maxVus },
                        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: Math.floor(maxVus * 0.3) },
                      ],
                    },
                    """;
            default -> """
                    public_api_rps: {
                      executor: 'constant-arrival-rate',
                      rate,
                      timeUnit: '1s',
                      duration: `${durationSeconds}s`,
                      preAllocatedVUs: Math.min(200, maxVus),
                      maxVUs,
                    },
                    """;
        };
    }
}

interface ProcessLauncher {
    LoadTestExecution start(List<String> command, Map<String, String> environment, Path workDirectory, Path logPath) throws IOException;
}

class DefaultProcessLauncher implements ProcessLauncher {
    @Override
    public LoadTestExecution start(List<String> command, Map<String, String> environment, Path workDirectory, Path logPath) throws IOException {
        ProcessBuilder builder = new ProcessBuilder(command)
                .directory(workDirectory.toFile())
                .redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.appendTo(logPath.toFile()));
        builder.environment().putAll(environment);
        Process process = builder.start();
        return new ProcessLoadTestExecution(process);
    }
}

class ProcessLoadTestExecution implements LoadTestExecution {
    private final Process process;

    ProcessLoadTestExecution(Process process) {
        this.process = process;
    }

    @Override
    public int waitFor() throws InterruptedException {
        return process.waitFor();
    }

    @Override
    public void stop() {
        process.destroy();
    }

    @Override
    public boolean isAlive() {
        return process.isAlive();
    }
}
