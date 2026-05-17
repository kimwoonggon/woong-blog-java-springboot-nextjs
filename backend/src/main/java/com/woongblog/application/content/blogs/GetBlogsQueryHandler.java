package com.woongblog.application.content.blogs;

import com.woongblog.application.content.common.ContentSearchMode;
import com.woongblog.application.content.common.ContentSearchText;
import com.woongblog.common.PagedResponse;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetBlogsQueryHandler {
    private final BlogQueryStore blogQueryStore;

    public GetBlogsQueryHandler(BlogQueryStore blogQueryStore) {
        this.blogQueryStore = blogQueryStore;
    }

    public PagedResponse<Map<String, Object>> handle(GetBlogsQuery query) {
        int page = Math.max(1, query.page());
        int pageSize = Math.max(1, Math.min(query.pageSize(), 100));
        String normalizedQuery = ContentSearchText.normalize(query.query());
        ContentSearchMode searchMode = ContentSearchMode.from(query.searchMode());
        return blogQueryStore.getPublishedBlogsPage(page, pageSize, normalizedQuery, searchMode);
    }
}
