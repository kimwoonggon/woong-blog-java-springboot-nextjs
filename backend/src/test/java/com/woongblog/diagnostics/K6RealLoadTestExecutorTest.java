package com.woongblog.diagnostics;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@Tag("unit")
class K6RealLoadTestExecutorTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @TempDir
    private Path reportRoot;

    @ParameterizedTest
    @CsvSource({
            "public-api-rps,constant-arrival-rate,public_api_rps",
            "public-api-spike,ramping-arrival-rate,public_api_spike",
            "public-api-soak,constant-vus,public_api_soak",
            "public-api-stress,ramping-vus,public_api_stress"
    })
    void startWritesScenarioScriptTargetsAndK6Command(String scenario, String executorName, String scenarioName)
            throws Exception {
        AppProperties properties = new AppProperties();
        properties.getLoadTesting().setK6Bin("/opt/bin/k6");
        CapturingProcessLauncher launcher = new CapturingProcessLauncher();
        K6RealLoadTestExecutor executor = new K6RealLoadTestExecutor(properties, objectMapper, launcher);
        PreparedRealLoadTestRun run = run(scenario, reportRoot.resolve(scenario));

        LoadTestExecution execution = executor.start(run);

        assertThat(execution.waitFor()).isZero();
        assertThat(launcher.command).containsExactly(
                "/opt/bin/k6",
                "run",
                "--summary-export",
                run.reportDirectory().resolve("summary.json").toString(),
                "--out",
                "json=" + run.reportDirectory().resolve("metrics.ndjson"),
                run.reportDirectory().resolve("run.js").toString());
        assertThat(launcher.environment)
                .containsEntry("BASE_URL", "https://backend.example.test")
                .containsEntry("RATE", "12")
                .containsEntry("PEAK_RATE", "40")
                .containsEntry("DURATION_SECONDS", "90")
                .containsEntry("MAX_VUS", "30")
                .containsEntry("START_VUS", "3");
        assertThat(launcher.workDirectory).isEqualTo(run.reportDirectory());
        assertThat(launcher.logPath).isEqualTo(run.reportDirectory().resolve("k6.log"));

        String script = Files.readString(run.reportDirectory().resolve("run.js"));
        assertThat(script)
                .contains("JSON.parse(open('./targets.json'))")
                .contains(executorName)
                .contains(scenarioName)
                .contains("status is < 500");
        if ("public-api-soak".equals(scenario)) {
            assertThat(script).contains("sleep(1)");
        }

        JsonNode targets = objectMapper.readTree(run.reportDirectory().resolve("targets.json").toFile());
        assertThat(targets).hasSize(2);
        assertThat(targets.get(0).get("path").asText()).isEqualTo("/api/public/works/demo");
        assertThat(targets.get(1).get("group").asText()).isEqualTo("study");
    }

    @Test
    void defaultLauncherRunsProcessWithEnvironmentAndLogCapture() throws Exception {
        DefaultProcessLauncher launcher = new DefaultProcessLauncher();
        Path logPath = reportRoot.resolve("process.log");

        LoadTestExecution execution = launcher.start(
                List.of("sh", "-c", "printf %s \"$LOAD_TEST_MARKER\""),
                Map.of("LOAD_TEST_MARKER", "k6-ready"),
                reportRoot,
                logPath);

        assertThat(execution.waitFor()).isZero();
        assertThat(execution.isAlive()).isFalse();
        execution.stop();
        assertThat(Files.readString(logPath)).isEqualTo("k6-ready");
    }

    private static PreparedRealLoadTestRun run(String scenario, Path reportDirectory) {
        return new PreparedRealLoadTestRun(
                "run-" + scenario,
                scenario,
                "k6",
                "public-api-mix",
                12,
                40,
                90,
                30,
                3,
                "https://backend.example.test",
                reportDirectory,
                List.of(
                        new RealLoadTestService.Target(
                                "work-read",
                                "Work read",
                                "/api/public/works/demo",
                                "work"),
                        new RealLoadTestService.Target(
                                "blog-read",
                                "Blog read",
                                "/api/public/blogs/demo",
                                "study")));
    }

    private static final class CapturingProcessLauncher implements ProcessLauncher {
        private List<String> command = List.of();
        private Map<String, String> environment = Map.of();
        private Path workDirectory;
        private Path logPath;

        @Override
        public LoadTestExecution start(List<String> command, Map<String, String> environment, Path workDirectory, Path logPath)
                throws IOException {
            this.command = List.copyOf(command);
            this.environment = Map.copyOf(environment);
            this.workDirectory = workDirectory;
            this.logPath = logPath;
            return new CompletedExecution();
        }
    }

    private static final class CompletedExecution implements LoadTestExecution {
        @Override
        public int waitFor() {
            return 0;
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
