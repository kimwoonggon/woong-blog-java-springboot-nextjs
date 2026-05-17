package com.woongblog.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.support.StaticApplicationContext;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.accept.ContentNegotiationManager;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;

@Tag("unit")
class WebConfigTest {
    @TempDir
    private Path tempDir;

    @Test
    void addResourceHandlersCreatesMediaRootAndRegistersMediaPattern() {
        Path mediaRoot = tempDir.resolve("media");
        AppProperties properties = new AppProperties();
        properties.getAuth().setMediaRoot(mediaRoot);
        ResourceHandlerRegistry registry = resourceHandlerRegistry();

        new WebConfig(properties).addResourceHandlers(registry);

        assertThat(Files.isDirectory(mediaRoot)).isTrue();
        assertThat(registry.hasMappingForPattern("/media/**")).isTrue();
    }

    @Test
    void addResourceHandlersStillRegistersMediaPatternWhenDirectoryCreationFails() throws Exception {
        Path mediaRoot = tempDir.resolve("existing-file");
        Files.createFile(mediaRoot);
        AppProperties properties = new AppProperties();
        properties.getAuth().setMediaRoot(mediaRoot);
        ResourceHandlerRegistry registry = resourceHandlerRegistry();

        new WebConfig(properties).addResourceHandlers(registry);

        assertThat(Files.isRegularFile(mediaRoot)).isTrue();
        assertThat(registry.hasMappingForPattern("/media/**")).isTrue();
    }

    private static ResourceHandlerRegistry resourceHandlerRegistry() {
        return new ResourceHandlerRegistry(
                new StaticApplicationContext(),
                new MockServletContext(),
                new ContentNegotiationManager());
    }
}
