package com.woongblog.application.content.blogs;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetBlogDetailContextQueryHandler {
    private final BlogQueryStore blogQueryStore;

    public GetBlogDetailContextQueryHandler(BlogQueryStore blogQueryStore) {
        this.blogQueryStore = blogQueryStore;
    }

    public Map<String, Object> handle(GetBlogDetailContextQuery query) {
        int limit = Math.max(1, Math.min(query.limit(), 24));
        return blogQueryStore.getPublishedBlogContext(query.slug(), limit);
    }
}
