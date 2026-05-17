package com.woongblog.application.content.blogs;

import com.woongblog.application.content.common.ContentSearchMode;
import com.woongblog.common.PagedResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface BlogQueryStore {
    PagedResponse<Map<String, Object>> getPublishedBlogsPage(
            int page,
            int pageSize,
            String normalizedQuery,
            ContentSearchMode searchMode);

    Map<String, Object> getPublishedBlogBySlug(String slug);

    Map<String, Object> getPublishedBlogContext(String slug, int limit);

    List<Map<String, Object>> getAdminBlogs();

    Map<String, Object> getAdminBlog(UUID id);
}
