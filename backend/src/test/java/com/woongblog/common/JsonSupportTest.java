package com.woongblog.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("unit")
class JsonSupportTest {
    private final JsonSupport jsonSupport = new JsonSupport(new ObjectMapper());

    @Test
    void contentBodyPrefersExplicitPublicContentOverStoredJson() {
        assertThat(jsonSupport.contentBody(
                        "{\"html\":\"<p>Stored</p>\",\"markdown\":\"stored\"}",
                        "<p>Published</p>",
                        "published"))
                .containsExactly(entry("html", "<p>Published</p>"), entry("markdown", "published"));
    }

    @Test
    void contentBodyFallsBackToHtmlAndMarkdownFromJson() {
        assertThat(jsonSupport.contentBody(
                        "{\"html\":\"<p>Stored</p>\",\"markdown\":\"stored\"}",
                        " ",
                        null))
                .containsExactly(entry("html", "<p>Stored</p>"), entry("markdown", "stored"));
    }

    @Test
    void contentBodyReturnsEmptyMapWhenJsonIsInvalidOrMissingContentFields() {
        assertThat(jsonSupport.contentBody("not-json", null, null)).isEmpty();
        assertThat(jsonSupport.contentBody("{\"title\":\"Only title\"}", null, null)).isEmpty();
    }

    @Test
    void contentHtmlReturnsHtmlValueOrEmptyString() {
        assertThat(jsonSupport.contentHtml("{\"html\":\"<p>Stored</p>\"}")).isEqualTo("<p>Stored</p>");
        assertThat(jsonSupport.contentHtml("{\"markdown\":\"stored\"}")).isEmpty();
        assertThat(jsonSupport.contentHtml("not-json")).isEmpty();
    }

    @Test
    void normalizeJsonReturnsDefaultForBlankAndOriginalForValidJson() {
        assertThat(jsonSupport.normalizeJson(null)).isEqualTo("{}");
        assertThat(jsonSupport.normalizeJson("  ")).isEqualTo("{}");
        assertThat(jsonSupport.normalizeJson("{\"html\":\"<p>Stored</p>\"}"))
                .isEqualTo("{\"html\":\"<p>Stored</p>\"}");
    }

    @Test
    void normalizeJsonRejectsInvalidJson() {
        assertThatThrownBy(() -> jsonSupport.normalizeJson("{invalid"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("contentJson must be valid JSON.");
    }

    @Test
    void readTreeUsesEmptyObjectForBlankOrInvalidJson() {
        assertThat(jsonSupport.readTree(null).isObject()).isTrue();
        assertThat(jsonSupport.readTree(" ").isObject()).isTrue();
        assertThat(jsonSupport.readTree("not-json").isObject()).isTrue();
        assertThat(jsonSupport.readTree("not-json").size()).isZero();
    }
}
