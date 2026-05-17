package com.woongblog.application.content.pages;

import java.util.Map;
import java.util.UUID;

public interface PageCommandStore {
    Map<String, Object> updatePage(UUID id, String title, String contentJson);
}
