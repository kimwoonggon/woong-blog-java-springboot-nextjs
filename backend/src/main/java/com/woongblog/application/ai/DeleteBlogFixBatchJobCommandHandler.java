package com.woongblog.application.ai;

import com.woongblog.ai.AiService;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class DeleteBlogFixBatchJobCommandHandler {
    private final AiService aiService;

    public DeleteBlogFixBatchJobCommandHandler(AiService aiService) {
        this.aiService = aiService;
    }

    public Map<String, Object> handle(DeleteBlogFixBatchJobCommand command) {
        return aiService.deleteJob(command.jobId());
    }
}
