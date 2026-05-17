package com.woongblog.config;

import java.nio.file.Path;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private final Auth auth = new Auth();
    private final Ai ai = new Ai();
    private final LoadTesting loadTesting = new LoadTesting();

    public Auth getAuth() {
        return auth;
    }

    public Ai getAi() {
        return ai;
    }

    public LoadTesting getLoadTesting() {
        return loadTesting;
    }

    public static class Auth {
        private boolean enabled;
        private String cookieName = "portfolio_auth";
        private String adminEmails = "admin@example.com";
        private boolean enableTestLoginEndpoint;
        private boolean secureCookies;
        private Path mediaRoot = Path.of("/app/media");
        private Duration sessionTtl = Duration.ofHours(8);

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getCookieName() {
            return cookieName;
        }

        public void setCookieName(String cookieName) {
            this.cookieName = cookieName;
        }

        public String getAdminEmails() {
            return adminEmails;
        }

        public void setAdminEmails(String adminEmails) {
            this.adminEmails = adminEmails;
        }

        public List<String> adminEmailList() {
            return Arrays.stream(adminEmails.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .map(String::toLowerCase)
                    .toList();
        }

        public boolean isEnableTestLoginEndpoint() {
            return enableTestLoginEndpoint;
        }

        public void setEnableTestLoginEndpoint(boolean enableTestLoginEndpoint) {
            this.enableTestLoginEndpoint = enableTestLoginEndpoint;
        }

        public boolean isSecureCookies() {
            return secureCookies;
        }

        public void setSecureCookies(boolean secureCookies) {
            this.secureCookies = secureCookies;
        }

        public Path getMediaRoot() {
            return mediaRoot;
        }

        public void setMediaRoot(Path mediaRoot) {
            this.mediaRoot = mediaRoot;
        }

        public Duration getSessionTtl() {
            return sessionTtl;
        }

        public void setSessionTtl(Duration sessionTtl) {
            this.sessionTtl = sessionTtl;
        }
    }

    public static class Ai {
        private String provider = "fake";
        private String defaultModel = "gpt-5.4-mini";
        private String codexModel = "gpt-5.4-mini";
        private String codexReasoningEffort = "medium";
        private int batchConcurrency = 2;
        private int batchCompletedRetentionDays = 7;

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public String getDefaultModel() {
            return defaultModel;
        }

        public void setDefaultModel(String defaultModel) {
            this.defaultModel = defaultModel;
        }

        public String getCodexModel() {
            return codexModel;
        }

        public void setCodexModel(String codexModel) {
            this.codexModel = codexModel;
        }

        public String getCodexReasoningEffort() {
            return codexReasoningEffort;
        }

        public void setCodexReasoningEffort(String codexReasoningEffort) {
            this.codexReasoningEffort = codexReasoningEffort;
        }

        public int getBatchConcurrency() {
            return batchConcurrency;
        }

        public void setBatchConcurrency(int batchConcurrency) {
            this.batchConcurrency = batchConcurrency;
        }

        public int getBatchCompletedRetentionDays() {
            return batchCompletedRetentionDays;
        }

        public void setBatchCompletedRetentionDays(int batchCompletedRetentionDays) {
            this.batchCompletedRetentionDays = batchCompletedRetentionDays;
        }
    }

    public static class LoadTesting {
        private String baseUrl = "http://localhost";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }
}
