package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CreateBlogFixBatchJobCommandHandler {
    private final AiService aiService;

    public CreateBlogFixBatchJobCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(CreateBlogFixBatchJobCommand command) {
        return aiService.createBatchJob(AiServiceRequestMapper.toBatchJobRequest(command));
    }
}
