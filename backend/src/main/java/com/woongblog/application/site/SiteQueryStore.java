package com.woongblog.application.site;

import java.util.Map;

public interface SiteQueryStore {
    Map<String, Object> getPublicSiteSettings();

    Map<String, Object> getPublicResume();

    Map<String, Object> getAdminSiteSettings();
}
