package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ClearCompletedBlogFixBatchJobsCommandHandler {
    private final AiService aiService;

    public ClearCompletedBlogFixBatchJobsCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(ClearCompletedBlogFixBatchJobsCommand command) {
        return aiService.clearCompletedJobs();
    }
}
