package com.woongblog.application.site;

import java.util.Map;
import java.util.UUID;

public interface SiteCommandStore {
    Map<String, Object> updateSiteSettings(
            String ownerName,
            String tagline,
            String facebookUrl,
            String instagramUrl,
            String twitterUrl,
            String linkedInUrl,
            String gitHubUrl,
            boolean hasResumeAssetId,
            UUID resumeAssetId);
}
