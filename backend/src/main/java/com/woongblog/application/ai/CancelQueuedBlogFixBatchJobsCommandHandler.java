package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CancelQueuedBlogFixBatchJobsCommandHandler {
    private final AiService aiService;

    public CancelQueuedBlogFixBatchJobsCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(CancelQueuedBlogFixBatchJobsCommand command) {
        return aiService.cancelQueuedJobs();
    }
}
