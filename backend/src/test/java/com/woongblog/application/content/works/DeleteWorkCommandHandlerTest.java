package com.woongblog.application.content.works;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
class DeleteWorkCommandHandlerTest {
    @Mock
    private WorkCommandStore workCommandStore;

    @Test
    void commandExposesWorkIdAndHandlerDelegatesDeletion() {
        UUID workId = UUID.randomUUID();
        DeleteWorkCommand command = new DeleteWorkCommand(workId);

        new DeleteWorkCommandHandler(workCommandStore).handle(command);

        assertThat(command.id()).isEqualTo(workId);
        verify(workCommandStore).deleteWork(workId);
    }
}
