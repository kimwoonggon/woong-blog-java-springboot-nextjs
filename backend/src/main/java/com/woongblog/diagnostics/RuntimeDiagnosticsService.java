package com.woongblog.diagnostics;

import com.woongblog.config.AppProperties;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.ThreadMXBean;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class RuntimeDiagnosticsService {
    private static final int JAVA_THREAD_POOL_COMPAT_MAX = 32767;

    private final AppProperties properties;
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public RuntimeDiagnosticsService(AppProperties properties, ObjectProvider<JdbcTemplate> jdbcTemplateProvider) {
        this(properties, jdbcTemplateProvider.getIfAvailable());
    }

    RuntimeDiagnosticsService(AppProperties properties, JdbcTemplate jdbcTemplate) {
        this.properties = properties;
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> snapshot() {
        Runtime runtime = Runtime.getRuntime();
        MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
        ThreadMXBean threads = ManagementFactory.getThreadMXBean();
        long heapUsedBytes = memory.getHeapMemoryUsage().getUsed();
        long heapCommittedBytes = memory.getHeapMemoryUsage().getCommitted();
        int threadCount = threads.getThreadCount();

        Map<String, Object> process = new LinkedHashMap<>();
        process.put("memoryBytes", heapUsedBytes);
        process.put("processorCount", runtime.availableProcessors());
        process.put("memoryLimitBytes", runtime.maxMemory());
        process.put("cpuQuotaCores", null);

        Map<String, Object> gc = new LinkedHashMap<>();
        List<Long> collections = ManagementFactory.getGarbageCollectorMXBeans().stream()
                .map(bean -> Math.max(0, bean.getCollectionCount()))
                .toList();
        gc.put("heapSizeBytes", heapUsedBytes);
        gc.put("gen0Collections", collections.isEmpty() ? 0 : collections.getFirst());
        gc.put("gen1Collections", collections.size() < 2 ? 0 : collections.get(1));
        gc.put("gen2Collections", collections.stream().skip(2).mapToLong(Long::longValue).sum());
        gc.put("timeInGcPercent", 0);

        Map<String, Object> threadPool = new LinkedHashMap<>();
        threadPool.put("workerThreads", threadCount);
        threadPool.put("pendingWorkItemCount", 0);
        threadPool.put("completedWorkItemCount", null);
        threadPool.put("availableWorkerThreads", Math.max(0, JAVA_THREAD_POOL_COMPAT_MAX - threadCount));
        threadPool.put("maxWorkerThreads", JAVA_THREAD_POOL_COMPAT_MAX);

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("timestamp", java.time.Instant.now().toString());
        snapshot.put("process", process);
        snapshot.put("gc", gc);
        snapshot.put("threadPool", threadPool);
        snapshot.put("runtime", jvmRuntime(heapUsedBytes, heapCommittedBytes, memory, threads));
        snapshot.put("database", databaseSnapshot());
        snapshot.put("loadTestingBaseUrl", properties.getLoadTesting().getBaseUrl());
        return snapshot;
    }

    private static Map<String, Object> jvmRuntime(long heapUsedBytes, long heapCommittedBytes, MemoryMXBean memory, ThreadMXBean threads) {
        Map<String, Object> runtime = new LinkedHashMap<>();
        runtime.put("platform", "jvm");
        runtime.put("uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime());
        runtime.put("heapUsedBytes", heapUsedBytes);
        runtime.put("heapCommittedBytes", heapCommittedBytes);
        runtime.put("nonHeapUsedBytes", memory.getNonHeapMemoryUsage().getUsed());
        runtime.put("liveThreads", threads.getThreadCount());
        runtime.put("daemonThreads", threads.getDaemonThreadCount());
        runtime.put("peakThreads", threads.getPeakThreadCount());
        runtime.put("garbageCollectors", ManagementFactory.getGarbageCollectorMXBeans().stream()
                .map(bean -> Map.of(
                        "name", bean.getName(),
                        "collectionCount", Math.max(0, bean.getCollectionCount()),
                        "collectionTimeMs", Math.max(0, bean.getCollectionTime())))
                .toList());
        return runtime;
    }

    private Map<String, Object> databaseSnapshot() {
        if (jdbcTemplate == null) {
            return databaseUnavailable("No JdbcTemplate is configured.");
        }

        long started = System.nanoTime();
        try {
            jdbcTemplate.queryForObject("select 1", Integer.class);
            double latencyMs = elapsedMillis(started);
            Map<String, Object> counts = connectionCounts();
            Map<String, Object> database = new LinkedHashMap<>();
            database.put("status", "available");
            database.put("latencyMs", latencyMs);
            database.put("openConnections", count(counts, "openConnections"));
            database.put("activeConnections", count(counts, "activeConnections"));
            database.put("idleConnections", count(counts, "idleConnections"));
            database.put("idleInTransactionConnections", count(counts, "idleInTransactionConnections"));
            database.put("commandLatency", latency(latencyMs));
            database.put("connectionOpenLatency", latency(null));
            database.put("slowQueryCount", 0);
            database.put("recentSlowQueries", List.of());
            database.put("timeoutCount", 0);
            database.put("errorCount", 0);
            database.put("errorCategory", null);
            database.put("error", null);
            database.put("pool", poolSnapshot());
            return database;
        } catch (RuntimeException exception) {
            Map<String, Object> database = databaseUnavailable(exception.getMessage());
            database.put("status", "error");
            database.put("errorCount", 1);
            database.put("errorCategory", exception.getClass().getSimpleName());
            return database;
        }
    }

    private Map<String, Object> connectionCounts() {
        try {
            return jdbcTemplate.queryForMap("""
                    select
                      count(*)::int as "openConnections",
                      count(*) filter (where state = 'active')::int as "activeConnections",
                      count(*) filter (where state = 'idle')::int as "idleConnections",
                      count(*) filter (where state = 'idle in transaction')::int as "idleInTransactionConnections"
                    from pg_stat_activity
                    where datname = current_database()
                    """);
        } catch (RuntimeException exception) {
            return Map.of();
        }
    }

    private static Integer count(Map<String, Object> values, String key) {
        Object value = values.get(key);
        return value instanceof Number number ? number.intValue() : null;
    }

    private static Map<String, Object> databaseUnavailable(String reason) {
        Map<String, Object> database = new LinkedHashMap<>();
        database.put("status", "unavailable");
        database.put("latencyMs", null);
        database.put("openConnections", null);
        database.put("activeConnections", null);
        database.put("idleConnections", null);
        database.put("idleInTransactionConnections", null);
        database.put("commandLatency", latency(null));
        database.put("connectionOpenLatency", latency(null));
        database.put("slowQueryCount", 0);
        database.put("recentSlowQueries", List.of());
        database.put("timeoutCount", 0);
        database.put("errorCount", 0);
        database.put("errorCategory", null);
        database.put("error", reason);
        database.put("pool", poolSnapshot());
        return database;
    }

    private static Map<String, Object> latency(Double value) {
        Map<String, Object> latency = new LinkedHashMap<>();
        latency.put("sampleCount", value == null ? 0 : 1);
        latency.put("p50Ms", value);
        latency.put("p95Ms", value);
        latency.put("p99Ms", value);
        return latency;
    }

    private static Map<String, Object> poolSnapshot() {
        Map<String, Object> pool = new LinkedHashMap<>();
        pool.put("databaseProvider", "PostgreSQL/JDBC");
        pool.put("dbContextPoolSize", 0);
        pool.put("npgsqlMinimumPoolSize", null);
        pool.put("npgsqlMaximumPoolSize", null);
        pool.put("npgsqlPoolLimitSource", "spring.datasource.hikari");
        pool.put("jdbcPoolSource", "spring.datasource.hikari");
        return pool;
    }

    private static double elapsedMillis(long started) {
        return Math.round(((System.nanoTime() - started) / 1_000_000.0) * 10.0) / 10.0;
    }
}
