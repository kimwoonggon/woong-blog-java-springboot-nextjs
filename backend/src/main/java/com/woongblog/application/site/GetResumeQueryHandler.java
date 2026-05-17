package com.woongblog.application.site;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetResumeQueryHandler {
    private final SiteQueryStore siteQueryStore;

    public GetResumeQueryHandler(SiteQueryStore siteQueryStore) {
        this.siteQueryStore = siteQueryStore;
    }

    public Map<String, Object> handle() {
        return siteQueryStore.getPublicResume();
    }
}
