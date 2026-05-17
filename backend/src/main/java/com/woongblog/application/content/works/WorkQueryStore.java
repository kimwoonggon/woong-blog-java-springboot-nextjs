package com.woongblog.application.content.works;

import com.woongblog.application.content.common.ContentSearchMode;
import com.woongblog.common.PagedResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface WorkQueryStore {
    PagedResponse<Map<String, Object>> getPublishedWorksPage(
            int page,
            int pageSize,
            String normalizedQuery,
            ContentSearchMode searchMode);

    Map<String, Object> getPublishedWorkBySlug(String slug);

    Map<String, Object> getPublishedWorkContext(String slug, int limit);

    List<Map<String, Object>> getAdminWorks();

    Map<String, Object> getAdminWork(UUID id);
}
