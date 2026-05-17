package com.woongblog.application.content.works;

import java.util.UUID;

public record UpdateWorkCommand(UUID id, WorkMutation mutation) {
}
