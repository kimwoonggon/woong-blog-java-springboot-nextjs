package com.woongblog.application.site;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetAdminSiteSettingsQueryHandler {
    private final SiteQueryStore siteQueryStore;

    public GetAdminSiteSettingsQueryHandler(SiteQueryStore siteQueryStore) {
        this.siteQueryStore = siteQueryStore;
    }

    public Map<String, Object> handle() {
        return siteQueryStore.getAdminSiteSettings();
    }
}
