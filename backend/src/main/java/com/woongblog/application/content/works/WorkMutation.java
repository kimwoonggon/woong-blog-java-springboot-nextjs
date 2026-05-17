package com.woongblog.application.content.works;

import java.util.List;
import java.util.UUID;

public record WorkMutation(
        String title,
        String excerpt,
        String category,
        String period,
        List<String> tags,
        boolean published,
        String contentJson,
        String allPropertiesJson,
        UUID thumbnailAssetId,
        UUID iconAssetId) {
}
