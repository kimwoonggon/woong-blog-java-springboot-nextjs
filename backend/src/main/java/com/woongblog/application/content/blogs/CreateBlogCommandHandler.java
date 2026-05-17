package com.woongblog.application.content.blogs;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CreateBlogCommandHandler {
    private final BlogCommandStore blogCommandStore;

    public CreateBlogCommandHandler(BlogCommandStore blogCommandStore) {
        this.blogCommandStore = blogCommandStore;
    }

    public Map<String, Object> handle(CreateBlogCommand command) {
        return blogCommandStore.createBlog(command.mutation());
    }
}
