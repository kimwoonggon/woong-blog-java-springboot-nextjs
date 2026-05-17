package com.woongblog.application.ai;

import java.util.List;
import java.util.UUID;

public record ApplyBlogFixBatchJobCommand(UUID jobId, List<UUID> jobItemIds) {
    public static ApplyBlogFixBatchJobCommand from(UUID jobId, ApplyBlogFixBatchJobRequest request) {
        return new ApplyBlogFixBatchJobCommand(jobId, request == null ? null : request.jobItemIds());
    }
}
