package com.woongblog.application.site;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class UpdateSiteSettingsCommandHandler {
    private final SiteCommandStore siteCommandStore;

    public UpdateSiteSettingsCommandHandler(SiteCommandStore siteCommandStore) {
        this.siteCommandStore = siteCommandStore;
    }

    public Map<String, Object> handle(UpdateSiteSettingsCommand command) {
        return siteCommandStore.updateSiteSettings(
                command.ownerName(),
                command.tagline(),
                command.facebookUrl(),
                command.instagramUrl(),
                command.twitterUrl(),
                command.linkedInUrl(),
                command.gitHubUrl(),
                command.hasResumeAssetId(),
                command.resumeAssetId());
    }
}
