package com.woongblog.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

@Tag("unit")
class SecurityConfigTest {
    @Test
    void corsConfigurationAllowsLocalFrontendOriginsForApiRoutes() {
        CorsConfigurationSource source = new SecurityConfig().corsConfigurationSource();

        CorsConfiguration config = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/blogs"));

        assertThat(config).isNotNull();
        assertThat(config.getAllowedOriginPatterns())
                .containsExactly(
                        "http://localhost:*",
                        "https://localhost:*",
                        "http://127.0.0.1:*",
                        "https://127.0.0.1:*");
        assertThat(config.getAllowedMethods()).containsExactly("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertThat(config.getAllowedHeaders()).containsExactly("*");
        assertThat(config.getExposedHeaders()).containsExactly(HttpHeaders.LOCATION);
        assertThat(config.getAllowCredentials()).isTrue();
        assertThat(config.getMaxAge()).isEqualTo(3600L);
    }

    @Test
    void corsConfigurationDoesNotApplyOutsideApiRoutes() {
        CorsConfigurationSource source = new SecurityConfig().corsConfigurationSource();

        assertThat(source.getCorsConfiguration(new MockHttpServletRequest("GET", "/media/image.png"))).isNull();
    }
}
