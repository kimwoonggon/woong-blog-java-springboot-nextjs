package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GetAiRuntimeConfigQueryHandler {
    private final AiService aiService;

    public GetAiRuntimeConfigQueryHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(GetAiRuntimeConfigQuery query) {
        return aiService.runtimeConfig();
    }
}
