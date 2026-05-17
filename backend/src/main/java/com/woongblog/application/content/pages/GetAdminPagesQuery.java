package com.woongblog.application.content.pages;

import java.util.List;

public record GetAdminPagesQuery(List<String> slugs) {
}
