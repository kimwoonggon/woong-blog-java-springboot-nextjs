package com.woongblog.application.content.pages;

import java.util.List;
import java.util.Map;

public interface PageQueryStore {
    Map<String, Object> getPublishedPageBySlug(String slug);

    List<Map<String, Object>> getAdminPages(List<String> slugs);
}
