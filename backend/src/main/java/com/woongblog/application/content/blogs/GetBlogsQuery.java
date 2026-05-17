package com.woongblog.application.content.blogs;

public record GetBlogsQuery(int page, int pageSize, String query, String searchMode) {
}
