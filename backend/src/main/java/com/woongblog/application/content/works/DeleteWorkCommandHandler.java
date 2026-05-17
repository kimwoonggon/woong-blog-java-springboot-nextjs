package com.woongblog.application.content.works;

import org.springframework.stereotype.Service;

@Service
public class DeleteWorkCommandHandler {
    private final WorkCommandStore workCommandStore;

    public DeleteWorkCommandHandler(WorkCommandStore workCommandStore) {
        this.workCommandStore = workCommandStore;
    }

    public void handle(DeleteWorkCommand command) {
        workCommandStore.deleteWork(command.id());
    }
}
