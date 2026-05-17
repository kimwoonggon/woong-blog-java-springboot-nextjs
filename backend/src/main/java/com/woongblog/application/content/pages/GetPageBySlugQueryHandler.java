package com.woongblog.application.content.pages;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetPageBySlugQueryHandler {
    private final PageQueryStore pageQueryStore;

    public GetPageBySlugQueryHandler(PageQueryStore pageQueryStore) {
        this.pageQueryStore = pageQueryStore;
    }

    public Map<String, Object> handle(GetPageBySlugQuery query) {
        return pageQueryStore.getPublishedPageBySlug(query.slug());
    }
}
