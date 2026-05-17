package com.woongblog.component;

import static org.assertj.core.api.Assertions.assertThat;

import com.woongblog.config.AppProperties;
import java.time.Duration;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;

@Tag("component")
@SpringBootTest(
        classes = AuthConfigurationComponentTest.Config.class,
        properties = {
                "app.auth.enabled=true",
                "app.auth.cookie-name=portfolio_auth_component",
                "app.auth.admin-emails=admin@example.com, Owner@Example.com ",
                "app.auth.enable-test-login-endpoint=true",
                "app.auth.secure-cookies=true",
                "app.auth.media-root=/tmp/component-media",
                "app.auth.session-ttl=PT2H"
        })
class AuthConfigurationComponentTest {
    @Autowired
    private AppProperties properties;

    @Test
    void bindsAuthSettingsUsedByCookieSessionRuntime() {
        AppProperties.Auth auth = properties.getAuth();

        assertThat(auth.isEnabled()).isTrue();
        assertThat(auth.getCookieName()).isEqualTo("portfolio_auth_component");
        assertThat(auth.adminEmailList()).containsExactly("admin@example.com", "owner@example.com");
        assertThat(auth.isEnableTestLoginEndpoint()).isTrue();
        assertThat(auth.isSecureCookies()).isTrue();
        assertThat(auth.getMediaRoot().toString()).isEqualTo("/tmp/component-media");
        assertThat(auth.getSessionTtl()).isEqualTo(Duration.ofHours(2));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(AppProperties.class)
    static class Config {
    }
}
