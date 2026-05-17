package com.woongblog.application.ai;

public record EnrichWorkHtmlCommand(
        String html,
        String title,
        String provider,
        String codexModel,
        String codexReasoningEffort,
        String customPrompt) {
}
