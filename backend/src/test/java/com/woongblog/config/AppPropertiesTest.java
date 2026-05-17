package com.woongblog.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("component")
class AppPropertiesTest {
    @Test
    void exposesDefaultConfigurationValues() {
        AppProperties properties = new AppProperties();

        assertThat(properties.getAuth().isEnabled()).isFalse();
        assertThat(properties.getAuth().getCookieName()).isEqualTo("portfolio_auth");
        assertThat(properties.getAuth().getAdminEmails()).isEqualTo("admin@example.com");
        assertThat(properties.getAuth().adminEmailList()).containsExactly("admin@example.com");
        assertThat(properties.getAuth().isEnableTestLoginEndpoint()).isFalse();
        assertThat(properties.getAuth().isSecureCookies()).isFalse();
        assertThat(properties.getAuth().getMediaRoot()).isEqualTo(Path.of("/app/media"));
        assertThat(properties.getAuth().getSessionTtl()).isEqualTo(Duration.ofHours(8));
        assertThat(properties.getAi().getProvider()).isEqualTo("fake");
        assertThat(properties.getAi().getDefaultModel()).isEqualTo("gpt-5.4-mini");
        assertThat(properties.getAi().getCodexModel()).isEqualTo("gpt-5.4-mini");
        assertThat(properties.getAi().getCodexReasoningEffort()).isEqualTo("medium");
        assertThat(properties.getAi().getBatchConcurrency()).isEqualTo(2);
        assertThat(properties.getAi().getBatchCompletedRetentionDays()).isEqualTo(7);
        assertThat(properties.getLoadTesting().getBaseUrl()).isEqualTo("http://localhost");
        assertThat(properties.getLoadTesting().getReportRoot()).isEqualTo(Path.of("reports/loadtest"));
        assertThat(properties.getLoadTesting().getK6Bin()).isEqualTo("k6");
    }

    @Test
    void settersExposeConfiguredValuesAndNormalizeAdminEmails() {
        AppProperties properties = new AppProperties();

        properties.getAuth().setEnabled(true);
        properties.getAuth().setCookieName("custom_auth");
        properties.getAuth().setAdminEmails(" Owner@Example.com, ,ADMIN@Example.com ");
        properties.getAuth().setEnableTestLoginEndpoint(true);
        properties.getAuth().setSecureCookies(true);
        properties.getAuth().setMediaRoot(Path.of("/tmp/media-root"));
        properties.getAuth().setSessionTtl(Duration.ofMinutes(45));
        properties.getAi().setProvider("openai");
        properties.getAi().setDefaultModel("gpt-5.5");
        properties.getAi().setCodexModel("gpt-5.4");
        properties.getAi().setCodexReasoningEffort("high");
        properties.getAi().setBatchConcurrency(6);
        properties.getAi().setBatchCompletedRetentionDays(14);
        properties.getLoadTesting().setBaseUrl("https://example.test");
        properties.getLoadTesting().setReportRoot(Path.of("/tmp/loadtest"));
        properties.getLoadTesting().setK6Bin("/usr/local/bin/k6");

        assertThat(properties.getAuth().isEnabled()).isTrue();
        assertThat(properties.getAuth().getCookieName()).isEqualTo("custom_auth");
        assertThat(properties.getAuth().getAdminEmails()).isEqualTo(" Owner@Example.com, ,ADMIN@Example.com ");
        assertThat(properties.getAuth().adminEmailList()).containsExactly("owner@example.com", "admin@example.com");
        assertThat(properties.getAuth().isEnableTestLoginEndpoint()).isTrue();
        assertThat(properties.getAuth().isSecureCookies()).isTrue();
        assertThat(properties.getAuth().getMediaRoot()).isEqualTo(Path.of("/tmp/media-root"));
        assertThat(properties.getAuth().getSessionTtl()).isEqualTo(Duration.ofMinutes(45));
        assertThat(properties.getAi().getProvider()).isEqualTo("openai");
        assertThat(properties.getAi().getDefaultModel()).isEqualTo("gpt-5.5");
        assertThat(properties.getAi().getCodexModel()).isEqualTo("gpt-5.4");
        assertThat(properties.getAi().getCodexReasoningEffort()).isEqualTo("high");
        assertThat(properties.getAi().getBatchConcurrency()).isEqualTo(6);
        assertThat(properties.getAi().getBatchCompletedRetentionDays()).isEqualTo(14);
        assertThat(properties.getLoadTesting().getBaseUrl()).isEqualTo("https://example.test");
        assertThat(properties.getLoadTesting().getReportRoot()).isEqualTo(Path.of("/tmp/loadtest"));
        assertThat(properties.getLoadTesting().getK6Bin()).isEqualTo("/usr/local/bin/k6");
    }
}
