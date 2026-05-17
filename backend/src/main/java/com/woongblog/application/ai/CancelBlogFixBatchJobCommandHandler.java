package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CancelBlogFixBatchJobCommandHandler {
    private final AiService aiService;

    public CancelBlogFixBatchJobCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(CancelBlogFixBatchJobCommand command) {
        return aiService.cancelJob(command.jobId());
    }
}
