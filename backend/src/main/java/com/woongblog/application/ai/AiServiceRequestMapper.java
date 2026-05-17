package com.woongblog.application.ai;

import com.woongblog.ai.AiService;

final class AiServiceRequestMapper {
    private AiServiceRequestMapper() {
    }

    static AiService.FixHtmlRequest toFixHtmlRequest(FixBlogHtmlCommand command) {
        return new AiService.FixHtmlRequest(
                command.html(),
                command.title(),
                command.provider(),
                command.codexModel(),
                command.codexReasoningEffort(),
                command.customPrompt());
    }

    static AiService.FixHtmlRequest toFixHtmlRequest(EnrichWorkHtmlCommand command) {
        return new AiService.FixHtmlRequest(
                command.html(),
                command.title(),
                command.provider(),
                command.codexModel(),
                command.codexReasoningEffort(),
                command.customPrompt());
    }

    static AiService.BatchJobRequest toBatchJobRequest(CreateBlogFixBatchCommand command) {
        return new AiService.BatchJobRequest(
                command.blogIds(),
                command.all(),
                command.apply(),
                command.autoApply(),
                command.selectionMode(),
                command.selectionLabel(),
                command.selectionKey(),
                command.workerCount(),
                command.provider(),
                command.codexModel(),
                command.codexReasoningEffort(),
                command.customPrompt());
    }

    static AiService.BatchJobRequest toBatchJobRequest(CreateBlogFixBatchJobCommand command) {
        return new AiService.BatchJobRequest(
                command.blogIds(),
                command.all(),
                command.apply(),
                command.autoApply(),
                command.selectionMode(),
                command.selectionLabel(),
                command.selectionKey(),
                command.workerCount(),
                command.provider(),
                command.codexModel(),
                command.codexReasoningEffort(),
                command.customPrompt());
    }

    static AiService.ApplyJobRequest toApplyJobRequest(ApplyBlogFixBatchJobCommand command) {
        return new AiService.ApplyJobRequest(command.jobItemIds());
    }
}
