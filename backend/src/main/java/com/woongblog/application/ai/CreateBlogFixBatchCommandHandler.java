package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CreateBlogFixBatchCommandHandler {
    private final AiService aiService;

    public CreateBlogFixBatchCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(CreateBlogFixBatchCommand command) {
        return aiService.fixBatch(AiServiceRequestMapper.toBatchJobRequest(command));
    }
}
