package com.woongblog.application.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.woongblog.ai.AiService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@Tag("component")
class AiApplicationHandlersTests {
    @Mock
    private AiService aiService;

    @Test
    void runtimeConfigQueryDelegatesToAiService() {
        Map<String, Object> payload = Map.of("provider", "fake");
        when(aiService.runtimeConfig()).thenReturn(payload);

        Map<String, Object> result = new GetAiRuntimeConfigQueryHandler(aiService)
                .handle(new GetAiRuntimeConfigQuery());

        assertThat(result).isSameAs(payload);
        verify(aiService).runtimeConfig();
    }

    @Test
    void fixBlogHtmlCommandDelegatesUsingCompatibleServiceRequest() {
        Map<String, Object> payload = Map.of("fixedHtml", "<p>Fixed</p>");
        when(aiService.fixHtml(any(AiService.FixHtmlRequest.class))).thenReturn(payload);

        FixBlogHtmlCommand command = new FixBlogHtmlCommand(
                "<p>Draft</p>",
                "Blog",
                "codex",
                "gpt-5.4-mini",
                "medium",
                "Fix it");
        Map<String, Object> result = new FixBlogHtmlCommandHandler(aiService).handle(command);

        ArgumentCaptor<AiService.FixHtmlRequest> captor = ArgumentCaptor.forClass(AiService.FixHtmlRequest.class);
        verify(aiService).fixHtml(captor.capture());
        AiService.FixHtmlRequest request = captor.getValue();
        assertThat(result).isSameAs(payload);
        assertThat(request.html()).isEqualTo(command.html());
        assertThat(request.title()).isEqualTo(command.title());
        assertThat(request.provider()).isEqualTo(command.provider());
        assertThat(request.codexModel()).isEqualTo(command.codexModel());
        assertThat(request.codexReasoningEffort()).isEqualTo(command.codexReasoningEffort());
        assertThat(request.customPrompt()).isEqualTo(command.customPrompt());
    }

    @Test
    void enrichWorkHtmlCommandDelegatesUsingCompatibleServiceRequest() {
        Map<String, Object> payload = Map.of("fixedHtml", "<section>Enriched</section>");
        when(aiService.fixHtml(any(AiService.FixHtmlRequest.class))).thenReturn(payload);

        EnrichWorkHtmlCommand command = new EnrichWorkHtmlCommand(
                "<section>Work</section>",
                "Work",
                "openai",
                "gpt-5.4",
                "high",
                "Enrich it");
        Map<String, Object> result = new EnrichWorkHtmlCommandHandler(aiService).handle(command);

        ArgumentCaptor<AiService.FixHtmlRequest> captor = ArgumentCaptor.forClass(AiService.FixHtmlRequest.class);
        verify(aiService).fixHtml(captor.capture());
        AiService.FixHtmlRequest request = captor.getValue();
        assertThat(result).isSameAs(payload);
        assertThat(request.html()).isEqualTo(command.html());
        assertThat(request.title()).isEqualTo(command.title());
        assertThat(request.provider()).isEqualTo(command.provider());
        assertThat(request.codexModel()).isEqualTo(command.codexModel());
        assertThat(request.codexReasoningEffort()).isEqualTo(command.codexReasoningEffort());
        assertThat(request.customPrompt()).isEqualTo(command.customPrompt());
    }

    @Test
    void createBlogFixBatchCommandPreservesLegacyWrapperShape() {
        UUID blogId = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "results", List.of(Map.of("blogId", blogId, "status", "fixed")),
                "applied", true);
        when(aiService.fixBatch(any(AiService.BatchJobRequest.class))).thenReturn(payload);

        CreateBlogFixBatchCommand command = new CreateBlogFixBatchCommand(
                List.of(blogId),
                false,
                true,
                false,
                "selected",
                "Selected blogs",
                "selected",
                2,
                "codex",
                "gpt-5.4-mini",
                "medium",
                "Fix batch");
        Map<String, Object> result = new CreateBlogFixBatchCommandHandler(aiService).handle(command);

        ArgumentCaptor<AiService.BatchJobRequest> captor = ArgumentCaptor.forClass(AiService.BatchJobRequest.class);
        verify(aiService).fixBatch(captor.capture());
        AiService.BatchJobRequest request = captor.getValue();
        assertThat(result).isSameAs(payload);
        assertThat(request.blogIds()).containsExactly(blogId);
        assertThat(request.apply()).isTrue();
        assertThat(request.autoApply()).isFalse();
        assertThat(request.selectionMode()).isEqualTo(command.selectionMode());
        assertThat(request.workerCount()).isEqualTo(command.workerCount());
    }

    @Test
    void createBlogFixBatchJobCommandDelegatesWithoutLegacyWrapper() {
        UUID blogId = UUID.randomUUID();
        Map<String, Object> summary = Map.of("jobId", UUID.randomUUID(), "status", "completed");
        when(aiService.createBatchJob(any(AiService.BatchJobRequest.class))).thenReturn(summary);

        CreateBlogFixBatchJobCommand command = new CreateBlogFixBatchJobCommand(
                List.of(blogId),
                true,
                false,
                true,
                "all",
                "All blogs",
                "all",
                4,
                "codex",
                "gpt-5.5",
                "xhigh",
                "Fix all");
        Map<String, Object> result = new CreateBlogFixBatchJobCommandHandler(aiService).handle(command);

        ArgumentCaptor<AiService.BatchJobRequest> captor = ArgumentCaptor.forClass(AiService.BatchJobRequest.class);
        verify(aiService).createBatchJob(captor.capture());
        AiService.BatchJobRequest request = captor.getValue();
        assertThat(result).isSameAs(summary);
        assertThat(request.blogIds()).containsExactly(blogId);
        assertThat(request.all()).isTrue();
        assertThat(request.autoApply()).isTrue();
        assertThat(request.provider()).isEqualTo(command.provider());
        assertThat(request.codexModel()).isEqualTo(command.codexModel());
        assertThat(request.codexReasoningEffort()).isEqualTo(command.codexReasoningEffort());
        assertThat(request.customPrompt()).isEqualTo(command.customPrompt());
    }

    @Test
    void blogFixBatchJobQueriesDelegateToAiService() {
        UUID jobId = UUID.randomUUID();
        Map<String, Object> listPayload = Map.of("jobs", List.of());
        Map<String, Object> itemPayload = Map.of("jobId", jobId);
        when(aiService.listJobs()).thenReturn(listPayload);
        when(aiService.getJob(jobId)).thenReturn(itemPayload);

        assertThat(new ListBlogFixBatchJobsQueryHandler(aiService)
                .handle(new ListBlogFixBatchJobsQuery())).isSameAs(listPayload);
        assertThat(new GetBlogFixBatchJobQueryHandler(aiService)
                .handle(new GetBlogFixBatchJobQuery(jobId))).isSameAs(itemPayload);

        verify(aiService).listJobs();
        verify(aiService).getJob(jobId);
    }

    @Test
    void blogFixBatchJobCommandsDelegateToAiService() {
        UUID jobId = UUID.randomUUID();
        UUID jobItemId = UUID.randomUUID();
        Map<String, Object> applyPayload = Map.of("applied", 1);
        Map<String, Object> cancelPayload = Map.of("jobId", jobId, "status", "cancelled");
        Map<String, Object> cancelQueuedPayload = Map.of("cancelled", 2);
        Map<String, Object> clearPayload = Map.of("cleared", 3);
        Map<String, Object> deletePayload = Map.of("removed", true, "jobId", jobId);
        when(aiService.applyJob(any(UUID.class), any(AiService.ApplyJobRequest.class))).thenReturn(applyPayload);
        when(aiService.cancelJob(jobId)).thenReturn(cancelPayload);
        when(aiService.cancelQueuedJobs()).thenReturn(cancelQueuedPayload);
        when(aiService.clearCompletedJobs()).thenReturn(clearPayload);
        when(aiService.deleteJob(jobId)).thenReturn(deletePayload);

        assertThat(new ApplyBlogFixBatchJobCommandHandler(aiService)
                .handle(new ApplyBlogFixBatchJobCommand(jobId, List.of(jobItemId)))).isSameAs(applyPayload);
        assertThat(new CancelBlogFixBatchJobCommandHandler(aiService)
                .handle(new CancelBlogFixBatchJobCommand(jobId))).isSameAs(cancelPayload);
        assertThat(new CancelQueuedBlogFixBatchJobsCommandHandler(aiService)
                .handle(new CancelQueuedBlogFixBatchJobsCommand())).isSameAs(cancelQueuedPayload);
        assertThat(new ClearCompletedBlogFixBatchJobsCommandHandler(aiService)
                .handle(new ClearCompletedBlogFixBatchJobsCommand())).isSameAs(clearPayload);
        assertThat(new DeleteBlogFixBatchJobCommandHandler(aiService)
                .handle(new DeleteBlogFixBatchJobCommand(jobId))).isSameAs(deletePayload);

        ArgumentCaptor<AiService.ApplyJobRequest> applyCaptor = ArgumentCaptor.forClass(AiService.ApplyJobRequest.class);
        verify(aiService).applyJob(org.mockito.ArgumentMatchers.eq(jobId), applyCaptor.capture());
        assertThat(applyCaptor.getValue().jobItemIds()).containsExactly(jobItemId);
        verify(aiService).cancelJob(jobId);
        verify(aiService).cancelQueuedJobs();
        verify(aiService).clearCompletedJobs();
        verify(aiService).deleteJob(jobId);
    }
}
