package com.woongblog.application.content.works;

import com.woongblog.application.content.common.ContentSearchMode;
import com.woongblog.application.content.common.ContentSearchText;
import com.woongblog.common.PagedResponse;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetWorksQueryHandler {
    private final WorkQueryStore workQueryStore;

    public GetWorksQueryHandler(WorkQueryStore workQueryStore) {
        this.workQueryStore = workQueryStore;
    }

    public PagedResponse<Map<String, Object>> handle(GetWorksQuery query) {
        int page = Math.max(1, query.page());
        int pageSize = Math.max(1, Math.min(query.pageSize(), 100));
        String normalizedQuery = ContentSearchText.normalize(query.query());
        ContentSearchMode searchMode = ContentSearchMode.from(query.searchMode());
        return workQueryStore.getPublishedWorksPage(page, pageSize, normalizedQuery, searchMode);
    }
}
