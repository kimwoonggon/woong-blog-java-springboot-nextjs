package com.woongblog.application.content.pages;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetAdminPagesQueryHandler {
    private final PageQueryStore pageQueryStore;

    public GetAdminPagesQueryHandler(PageQueryStore pageQueryStore) {
        this.pageQueryStore = pageQueryStore;
    }

    public List<Map<String, Object>> handle(GetAdminPagesQuery query) {
        return pageQueryStore.getAdminPages(query.slugs());
    }
}
