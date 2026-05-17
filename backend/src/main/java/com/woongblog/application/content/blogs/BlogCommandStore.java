package com.woongblog.application.content.blogs;

import java.util.Map;
import java.util.UUID;

public interface BlogCommandStore {
    Map<String, Object> createBlog(BlogMutation mutation);

    Map<String, Object> updateBlog(UUID id, BlogMutation mutation);

    void deleteBlog(UUID id);
}
