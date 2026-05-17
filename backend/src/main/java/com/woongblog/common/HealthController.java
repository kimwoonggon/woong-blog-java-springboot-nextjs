package com.woongblog.common;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/api/health")
    Map<String, Object> health() {
        return Map.of("status", "ok", "service", "portfolio-api", "timestamp", Instant.now());
    }

    @GetMapping("/")
    ResponseEntity<Void> root() {
        return ResponseEntity.status(302).location(URI.create("/api/health")).build();
    }
}
