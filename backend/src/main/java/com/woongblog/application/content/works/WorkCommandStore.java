package com.woongblog.application.content.works;

import java.util.Map;
import java.util.UUID;

public interface WorkCommandStore {
    Map<String, Object> createWork(WorkMutation mutation);

    Map<String, Object> updateWork(UUID id, WorkMutation mutation);

    void deleteWork(UUID id);
}
