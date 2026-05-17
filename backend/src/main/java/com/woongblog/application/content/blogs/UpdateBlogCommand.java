package com.woongblog.application.content.blogs;

import java.util.UUID;

public record UpdateBlogCommand(UUID id, BlogMutation mutation) {
}
