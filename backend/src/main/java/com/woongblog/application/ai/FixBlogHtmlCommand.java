package com.woongblog.application.ai;

public record FixBlogHtmlCommand(
        String html,
        String title,
        String provider,
        String codexModel,
        String codexReasoningEffort,
        String customPrompt) {
}
