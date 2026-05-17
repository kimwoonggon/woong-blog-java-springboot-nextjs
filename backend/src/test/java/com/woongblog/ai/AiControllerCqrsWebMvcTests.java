package com.woongblog.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.woongblog.application.ai.ApplyBlogFixBatchJobCommand;
import com.woongblog.application.ai.ApplyBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.CancelBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.CancelQueuedBlogFixBatchJobsCommandHandler;
import com.woongblog.application.ai.ClearCompletedBlogFixBatchJobsCommandHandler;
import com.woongblog.application.ai.CreateBlogFixBatchCommandHandler;
import com.woongblog.application.ai.CreateBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.DeleteBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.EnrichWorkHtmlCommandHandler;
import com.woongblog.application.ai.FixBlogHtmlCommand;
import com.woongblog.application.ai.FixBlogHtmlCommandHandler;
import com.woongblog.application.ai.GetAiRuntimeConfigQuery;
import com.woongblog.application.ai.GetAiRuntimeConfigQueryHandler;
import com.woongblog.application.ai.GetBlogFixBatchJobQueryHandler;
import com.woongblog.application.ai.ListBlogFixBatchJobsQueryHandler;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@Tag("web")
class AiControllerCqrsWebMvcTests {
    private MockMvc mockMvc;

    @Mock
    private GetAiRuntimeConfigQueryHandler getAiRuntimeConfigQueryHandler;

    @Mock
    private FixBlogHtmlCommandHandler fixBlogHtmlCommandHandler;

    @Mock
    private EnrichWorkHtmlCommandHandler enrichWorkHtmlCommandHandler;

    @Mock
    private CreateBlogFixBatchCommandHandler createBlogFixBatchCommandHandler;

    @Mock
    private CreateBlogFixBatchJobCommandHandler createBlogFixBatchJobCommandHandler;

    @Mock
    private ListBlogFixBatchJobsQueryHandler listBlogFixBatchJobsQueryHandler;

    @Mock
    private GetBlogFixBatchJobQueryHandler getBlogFixBatchJobQueryHandler;

    @Mock
    private ApplyBlogFixBatchJobCommandHandler applyBlogFixBatchJobCommandHandler;

    @Mock
    private CancelBlogFixBatchJobCommandHandler cancelBlogFixBatchJobCommandHandler;

    @Mock
    private CancelQueuedBlogFixBatchJobsCommandHandler cancelQueuedBlogFixBatchJobsCommandHandler;

    @Mock
    private ClearCompletedBlogFixBatchJobsCommandHandler clearCompletedBlogFixBatchJobsCommandHandler;

    @Mock
    private DeleteBlogFixBatchJobCommandHandler deleteBlogFixBatchJobCommandHandler;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AiController(
                getAiRuntimeConfigQueryHandler,
                fixBlogHtmlCommandHandler,
                enrichWorkHtmlCommandHandler,
                createBlogFixBatchCommandHandler,
                createBlogFixBatchJobCommandHandler,
                listBlogFixBatchJobsQueryHandler,
                getBlogFixBatchJobQueryHandler,
                applyBlogFixBatchJobCommandHandler,
                cancelBlogFixBatchJobCommandHandler,
                cancelQueuedBlogFixBatchJobsCommandHandler,
                clearCompletedBlogFixBatchJobsCommandHandler,
                deleteBlogFixBatchJobCommandHandler)).build();
    }

    @Test
    void runtimeConfigUsesQueryHandler() throws Exception {
        when(getAiRuntimeConfigQueryHandler.handle(new GetAiRuntimeConfigQuery()))
                .thenReturn(Map.of("provider", "fake"));

        mockMvc.perform(get("/api/admin/ai/runtime-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("fake"));

        verify(getAiRuntimeConfigQueryHandler).handle(new GetAiRuntimeConfigQuery());
    }

    @Test
    void blogFixBindsRequestBodyToCommand() throws Exception {
        when(fixBlogHtmlCommandHandler.handle(any(FixBlogHtmlCommand.class)))
                .thenReturn(Map.of(
                        "fixedHtml", "<p>Fixed</p>",
                        "provider", "codex",
                        "model", "gpt-5.4-mini",
                        "reasoningEffort", "medium"));

        mockMvc.perform(post("/api/admin/ai/blog-fix")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "html": "<p>Draft</p>",
                                  "title": "Blog",
                                  "provider": "codex",
                                  "codexModel": "gpt-5.4-mini",
                                  "codexReasoningEffort": "medium",
                                  "customPrompt": "Fix it"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fixedHtml").value("<p>Fixed</p>"))
                .andExpect(jsonPath("$.provider").value("codex"));

        ArgumentCaptor<FixBlogHtmlCommand> captor = ArgumentCaptor.forClass(FixBlogHtmlCommand.class);
        verify(fixBlogHtmlCommandHandler).handle(captor.capture());
        FixBlogHtmlCommand command = captor.getValue();
        assertThat(command.html()).isEqualTo("<p>Draft</p>");
        assertThat(command.customPrompt()).isEqualTo("Fix it");
    }

    @Test
    void applyJobAllowsMissingRequestBody() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(applyBlogFixBatchJobCommandHandler.handle(any(ApplyBlogFixBatchJobCommand.class)))
                .thenReturn(Map.of("applied", 0));

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs/{jobId}/apply", jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied").value(0));

        ArgumentCaptor<ApplyBlogFixBatchJobCommand> captor = ArgumentCaptor.forClass(ApplyBlogFixBatchJobCommand.class);
        verify(applyBlogFixBatchJobCommandHandler).handle(captor.capture());
        ApplyBlogFixBatchJobCommand command = captor.getValue();
        assertThat(command.jobId()).isEqualTo(jobId);
        assertThat(command.jobItemIds()).isNull();
    }
}
