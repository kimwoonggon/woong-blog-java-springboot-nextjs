package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class FixBlogHtmlCommandHandler {
    private final AiService aiService;

    public FixBlogHtmlCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(FixBlogHtmlCommand command) {
        return aiService.fixHtml(AiServiceRequestMapper.toFixHtmlRequest(command));
    }
}
