package com.woongblog.application.site;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetSiteSettingsQueryHandler {
    private final SiteQueryStore siteQueryStore;

    public GetSiteSettingsQueryHandler(SiteQueryStore siteQueryStore) {
        this.siteQueryStore = siteQueryStore;
    }

    public Map<String, Object> handle() {
        return siteQueryStore.getPublicSiteSettings();
    }
}
