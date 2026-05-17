package com.woongblog.application.ai;

import java.util.List;
import java.util.UUID;

public record ApplyBlogFixBatchJobRequest(List<UUID> jobItemIds) {
}
