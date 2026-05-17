package com.woongblog.application.content.blogs;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetBlogBySlugQueryHandler {
    private final BlogQueryStore blogQueryStore;

    public GetBlogBySlugQueryHandler(BlogQueryStore blogQueryStore) {
        this.blogQueryStore = blogQueryStore;
    }

    public Map<String, Object> handle(GetBlogBySlugQuery query) {
        return blogQueryStore.getPublishedBlogBySlug(query.slug());
    }
}
