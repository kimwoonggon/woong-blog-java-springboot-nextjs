package com.woongblog.application.content.blogs;

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
class DeleteBlogCommandHandlerTest {
    @Mock
    private BlogCommandStore blogCommandStore;

    @Test
    void commandExposesBlogIdAndHandlerDelegatesDeletion() {
        UUID blogId = UUID.randomUUID();
        DeleteBlogCommand command = new DeleteBlogCommand(blogId);

        new DeleteBlogCommandHandler(blogCommandStore).handle(command);

        assertThat(command.id()).isEqualTo(blogId);
        verify(blogCommandStore).deleteBlog(blogId);
    }
}
