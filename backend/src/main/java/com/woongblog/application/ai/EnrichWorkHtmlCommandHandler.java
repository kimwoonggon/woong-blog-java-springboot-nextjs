package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class EnrichWorkHtmlCommandHandler {
    private final AiService aiService;

    public EnrichWorkHtmlCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(EnrichWorkHtmlCommand command) {
        return aiService.fixHtml(AiServiceRequestMapper.toFixHtmlRequest(command));
    }
}
