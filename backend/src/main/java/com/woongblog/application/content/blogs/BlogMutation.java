package com.woongblog.application.content.blogs;

import java.util.List;
import java.util.UUID;

public record BlogMutation(
        String title,
        String excerpt,
        List<String> tags,
        boolean published,
        String contentJson,
        UUID coverAssetId) {
}
