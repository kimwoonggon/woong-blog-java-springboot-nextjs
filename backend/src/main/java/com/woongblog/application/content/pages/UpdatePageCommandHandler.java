package com.woongblog.application.content.pages;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class UpdatePageCommandHandler {
    private final PageCommandStore pageCommandStore;

    public UpdatePageCommandHandler(PageCommandStore pageCommandStore) {
        this.pageCommandStore = pageCommandStore;
    }

    public Map<String, Object> handle(UpdatePageCommand command) {
        return pageCommandStore.updatePage(command.id(), command.title(), command.contentJson());
    }
}
