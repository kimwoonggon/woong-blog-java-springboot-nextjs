package com.woongblog.application.content.blogs;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetAdminBlogByIdQueryHandler {
    private final BlogQueryStore blogQueryStore;

    public GetAdminBlogByIdQueryHandler(BlogQueryStore blogQueryStore) {
        this.blogQueryStore = blogQueryStore;
    }

    public Map<String, Object> handle(GetAdminBlogByIdQuery query) {
        return blogQueryStore.getAdminBlog(query.id());
    }
}
