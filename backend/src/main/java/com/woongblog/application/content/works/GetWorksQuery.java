package com.woongblog.application.content.works;

public record GetWorksQuery(int page, int pageSize, String query, String searchMode) {
}
