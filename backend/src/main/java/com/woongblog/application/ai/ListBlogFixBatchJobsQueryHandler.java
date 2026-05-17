package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ListBlogFixBatchJobsQueryHandler {
    private final AiService aiService;

    public ListBlogFixBatchJobsQueryHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(ListBlogFixBatchJobsQuery query) {
        return aiService.listJobs();
    }
}
