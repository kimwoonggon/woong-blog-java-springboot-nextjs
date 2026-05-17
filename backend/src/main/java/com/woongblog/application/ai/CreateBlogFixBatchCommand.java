package com.woongblog.application.ai;

import java.util.List;
import java.util.UUID;

public record CreateBlogFixBatchCommand(
        List<UUID> blogIds,
        boolean all,
        boolean apply,
        boolean autoApply,
        String selectionMode,
        String selectionLabel,
        String selectionKey,
        Integer workerCount,
        String provider,
        String codexModel,
        String codexReasoningEffort,
        String customPrompt) {
}
