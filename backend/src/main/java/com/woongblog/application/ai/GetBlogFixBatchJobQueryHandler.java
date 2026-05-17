package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GetBlogFixBatchJobQueryHandler {
    private final AiService aiService;

    public GetBlogFixBatchJobQueryHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(GetBlogFixBatchJobQuery query) {
        return aiService.getJob(query.jobId());
    }
}
