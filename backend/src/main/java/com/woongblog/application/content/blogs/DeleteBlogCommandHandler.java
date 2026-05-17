package com.woongblog.application.content.blogs;

import org.springframework.stereotype.Service;

@Service
public class DeleteBlogCommandHandler {
    private final BlogCommandStore blogCommandStore;

    public DeleteBlogCommandHandler(BlogCommandStore blogCommandStore) {
        this.blogCommandStore = blogCommandStore;
    }

    public void handle(DeleteBlogCommand command) {
        blogCommandStore.deleteBlog(command.id());
    }
}
