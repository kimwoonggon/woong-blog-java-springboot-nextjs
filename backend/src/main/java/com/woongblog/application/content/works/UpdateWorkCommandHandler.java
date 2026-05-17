package com.woongblog.application.content.works;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class UpdateWorkCommandHandler {
    private final WorkCommandStore workCommandStore;

    public UpdateWorkCommandHandler(WorkCommandStore workCommandStore) {
        this.workCommandStore = workCommandStore;
    }

    public Map<String, Object> handle(UpdateWorkCommand command) {
        return workCommandStore.updateWork(command.id(), command.mutation());
    }
}
