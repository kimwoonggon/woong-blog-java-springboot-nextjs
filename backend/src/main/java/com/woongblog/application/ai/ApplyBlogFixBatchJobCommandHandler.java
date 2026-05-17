package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ApplyBlogFixBatchJobCommandHandler {
    private final AiService aiService;

    public ApplyBlogFixBatchJobCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(ApplyBlogFixBatchJobCommand command) {
        return aiService.applyJob(command.jobId(), AiServiceRequestMapper.toApplyJobRequest(command));
    }
}
