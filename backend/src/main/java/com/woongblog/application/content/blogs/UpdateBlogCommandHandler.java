package com.woongblog.application.content.blogs;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class UpdateBlogCommandHandler {
    private final BlogCommandStore blogCommandStore;

    public UpdateBlogCommandHandler(BlogCommandStore blogCommandStore) {
        this.blogCommandStore = blogCommandStore;
    }

    public Map<String, Object> handle(UpdateBlogCommand command) {
        return blogCommandStore.updateBlog(command.id(), command.mutation());
    }
}
