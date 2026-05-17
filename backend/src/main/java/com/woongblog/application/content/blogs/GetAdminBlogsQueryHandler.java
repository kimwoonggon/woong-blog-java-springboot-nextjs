package com.woongblog.application.content.blogs;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetAdminBlogsQueryHandler {
    private final BlogQueryStore blogQueryStore;

    public GetAdminBlogsQueryHandler(BlogQueryStore blogQueryStore) {
        this.blogQueryStore = blogQueryStore;
    }

    public List<Map<String, Object>> handle() {
        return blogQueryStore.getAdminBlogs();
    }
}
