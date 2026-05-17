package com.woongblog.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@Tag("unit")
class SlugSupportTest {
    @ParameterizedTest
    @MethodSource("titles")
    void fromTitleNormalizesTitlesIntoUrlSlugs(String title, String expectedSlug) {
        assertThat(SlugSupport.fromTitle(title)).isEqualTo(expectedSlug);
    }

    private static Stream<Arguments> titles() {
        return Stream.of(
                Arguments.arguments(null, "untitled"),
                Arguments.arguments("", "untitled"),
                Arguments.arguments("   ---   ", "untitled"),
                Arguments.arguments("Hello, Spring Boot!", "hello-spring-boot"),
                Arguments.arguments("R\u00e9sum\u00e9: Spring Boot 3.5", "resume-spring-boot-3-5"),
                Arguments.arguments("Already---slugged__value", "already-slugged-value"),
                Arguments.arguments("\uD55C\uAE00 \uC81C\uBAA9", "untitled"));
    }
}
