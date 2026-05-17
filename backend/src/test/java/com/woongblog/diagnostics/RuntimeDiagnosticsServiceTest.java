package com.woongblog.diagnostics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.when;

import com.woongblog.config.AppProperties;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

@Tag("component")
@ExtendWith(MockitoExtension.class)
class RuntimeDiagnosticsServiceTest {
    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void snapshotReportsAvailableDatabaseCountsAndJvmRuntime() {
        when(jdbcTemplate.queryForObject("select 1", Integer.class)).thenReturn(1);
        when(jdbcTemplate.queryForMap(contains("pg_stat_activity"))).thenReturn(Map.of(
                "openConnections", 7,
                "activeConnections", 2,
                "idleConnections", 4,
                "idleInTransactionConnections", 1));

        Map<String, Object> snapshot = new RuntimeDiagnosticsService(properties(), jdbcTemplate).snapshot();

        assertThat(snapshot).containsEntry("loadTestingBaseUrl", "https://backend.example.test");
        assertThat(snapshot.get("process")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsKeys("memoryBytes", "processorCount", "memoryLimitBytes", "cpuQuotaCores");
        assertThat(snapshot.get("runtime")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("platform", "jvm")
                .containsKeys("heapUsedBytes", "heapCommittedBytes", "nonHeapUsedBytes", "garbageCollectors");
        assertThat(snapshot.get("database")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("status", "available")
                .containsEntry("openConnections", 7)
                .containsEntry("activeConnections", 2)
                .containsEntry("idleConnections", 4)
                .containsEntry("idleInTransactionConnections", 1)
                .containsEntry("error", null);
        assertThat(database(snapshot).get("pool")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("databaseProvider", "PostgreSQL/JDBC")
                .containsEntry("jdbcPoolSource", "spring.datasource.hikari");
    }

    @Test
    void snapshotKeepsDatabaseAvailableWhenPgStatActivityIsUnavailable() {
        when(jdbcTemplate.queryForObject("select 1", Integer.class)).thenReturn(1);
        when(jdbcTemplate.queryForMap(contains("pg_stat_activity")))
                .thenThrow(new DataAccessResourceFailureException("stats denied"));

        Map<String, Object> snapshot = new RuntimeDiagnosticsService(properties(), jdbcTemplate).snapshot();

        assertThat(database(snapshot))
                .containsEntry("status", "available")
                .containsEntry("openConnections", null)
                .containsEntry("activeConnections", null)
                .containsEntry("errorCount", 0);
    }

    @Test
    void snapshotReportsDatabaseErrorWhenHealthQueryFails() {
        when(jdbcTemplate.queryForObject("select 1", Integer.class))
                .thenThrow(new DataAccessResourceFailureException("database down"));

        Map<String, Object> snapshot = new RuntimeDiagnosticsService(properties(), jdbcTemplate).snapshot();

        assertThat(database(snapshot))
                .containsEntry("status", "error")
                .containsEntry("errorCount", 1)
                .containsEntry("errorCategory", "DataAccessResourceFailureException")
                .containsEntry("error", "database down");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> database(Map<String, Object> snapshot) {
        return (Map<String, Object>) snapshot.get("database");
    }

    private static AppProperties properties() {
        AppProperties properties = new AppProperties();
        properties.getLoadTesting().setBaseUrl("https://backend.example.test");
        return properties;
    }
}
