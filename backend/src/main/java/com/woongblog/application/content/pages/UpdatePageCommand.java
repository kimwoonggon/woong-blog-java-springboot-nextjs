package com.woongblog.application.content.pages;

import java.util.UUID;

public record UpdatePageCommand(UUID id, String title, String contentJson) {
}
