package com.woongblog.config;

import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AppProperties properties;

    public WebConfig(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path mediaRoot = properties.getAuth().getMediaRoot().toAbsolutePath().normalize();
        try {
            Files.createDirectories(mediaRoot);
        } catch (Exception ignored) {
            // Startup should continue; upload paths will report concrete failures.
        }
        registry.addResourceHandler("/media/**")
                .addResourceLocations(mediaRoot.toUri().toString());
    }
}
