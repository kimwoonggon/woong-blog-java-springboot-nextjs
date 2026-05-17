package com.woongblog.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class JsonSupport {
    private final ObjectMapper objectMapper;

    public JsonSupport(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> contentBody(String contentJson, String publicHtml, String publicMarkdown) {
        Map<String, Object> content = new LinkedHashMap<>();
        if (publicHtml != null && !publicHtml.isBlank()) {
            content.put("html", publicHtml);
        }
        if (publicMarkdown != null && !publicMarkdown.isBlank()) {
            content.put("markdown", publicMarkdown);
        }
        if (!content.isEmpty()) {
            return content;
        }

        JsonNode node = readTree(contentJson);
        if (node.hasNonNull("html")) {
            content.put("html", node.get("html").asText());
        }
        if (node.hasNonNull("markdown")) {
            content.put("markdown", node.get("markdown").asText());
        }
        return content;
    }

    public String contentHtml(String contentJson) {
        JsonNode node = readTree(contentJson);
        return node.hasNonNull("html") ? node.get("html").asText() : "";
    }

    public String normalizeJson(String value) {
        if (value == null || value.isBlank()) {
            return "{}";
        }
        try {
            objectMapper.readTree(value);
            return value;
        } catch (Exception exception) {
            throw new BadRequestException("contentJson must be valid JSON.");
        }
    }

    public JsonNode readTree(String value) {
        try {
            return objectMapper.readTree(value == null || value.isBlank() ? "{}" : value);
        } catch (Exception ignored) {
            return objectMapper.createObjectNode();
        }
    }
}
