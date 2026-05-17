package com.woongblog.application.site;

import java.util.UUID;

public record UpdateSiteSettingsCommand(
        String ownerName,
        String tagline,
        String facebookUrl,
        String instagramUrl,
        String twitterUrl,
        String linkedInUrl,
        String gitHubUrl,
        boolean hasResumeAssetId,
        UUID resumeAssetId) {
}
