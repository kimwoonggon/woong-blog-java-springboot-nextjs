package com.woongblog.application.content.works;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CreateWorkCommandHandler {
    private final WorkCommandStore workCommandStore;

    public CreateWorkCommandHandler(WorkCommandStore workCommandStore) {
        this.workCommandStore = workCommandStore;
    }

    public Map<String, Object> handle(CreateWorkCommand command) {
        return workCommandStore.createWork(command.mutation());
    }
}
