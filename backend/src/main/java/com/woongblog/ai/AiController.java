package com.woongblog.ai;

import com.woongblog.application.ai.ApplyBlogFixBatchJobCommand;
import com.woongblog.application.ai.ApplyBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.ApplyBlogFixBatchJobRequest;
import com.woongblog.application.ai.CancelBlogFixBatchJobCommand;
import com.woongblog.application.ai.CancelBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.CancelQueuedBlogFixBatchJobsCommand;
import com.woongblog.application.ai.CancelQueuedBlogFixBatchJobsCommandHandler;
import com.woongblog.application.ai.ClearCompletedBlogFixBatchJobsCommand;
import com.woongblog.application.ai.ClearCompletedBlogFixBatchJobsCommandHandler;
import com.woongblog.application.ai.CreateBlogFixBatchCommand;
import com.woongblog.application.ai.CreateBlogFixBatchCommandHandler;
import com.woongblog.application.ai.CreateBlogFixBatchJobCommand;
import com.woongblog.application.ai.CreateBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.DeleteBlogFixBatchJobCommand;
import com.woongblog.application.ai.DeleteBlogFixBatchJobCommandHandler;
import com.woongblog.application.ai.EnrichWorkHtmlCommand;
import com.woongblog.application.ai.EnrichWorkHtmlCommandHandler;
import com.woongblog.application.ai.FixBlogHtmlCommand;
import com.woongblog.application.ai.FixBlogHtmlCommandHandler;
import com.woongblog.application.ai.GetAiRuntimeConfigQuery;
import com.woongblog.application.ai.GetAiRuntimeConfigQueryHandler;
import com.woongblog.application.ai.GetBlogFixBatchJobQuery;
import com.woongblog.application.ai.GetBlogFixBatchJobQueryHandler;
import com.woongblog.application.ai.ListBlogFixBatchJobsQuery;
import com.woongblog.application.ai.ListBlogFixBatchJobsQueryHandler;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai")
public class AiController {
    private final GetAiRuntimeConfigQueryHandler getAiRuntimeConfigQueryHandler;
    private final FixBlogHtmlCommandHandler fixBlogHtmlCommandHandler;
    private final EnrichWorkHtmlCommandHandler enrichWorkHtmlCommandHandler;
    private final CreateBlogFixBatchCommandHandler createBlogFixBatchCommandHandler;
    private final CreateBlogFixBatchJobCommandHandler createBlogFixBatchJobCommandHandler;
    private final ListBlogFixBatchJobsQueryHandler listBlogFixBatchJobsQueryHandler;
    private final GetBlogFixBatchJobQueryHandler getBlogFixBatchJobQueryHandler;
    private final ApplyBlogFixBatchJobCommandHandler applyBlogFixBatchJobCommandHandler;
    private final CancelBlogFixBatchJobCommandHandler cancelBlogFixBatchJobCommandHandler;
    private final CancelQueuedBlogFixBatchJobsCommandHandler cancelQueuedBlogFixBatchJobsCommandHandler;
    private final ClearCompletedBlogFixBatchJobsCommandHandler clearCompletedBlogFixBatchJobsCommandHandler;
    private final DeleteBlogFixBatchJobCommandHandler deleteBlogFixBatchJobCommandHandler;

    public AiController(
            GetAiRuntimeConfigQueryHandler getAiRuntimeConfigQueryHandler,
            FixBlogHtmlCommandHandler fixBlogHtmlCommandHandler,
            EnrichWorkHtmlCommandHandler enrichWorkHtmlCommandHandler,
            CreateBlogFixBatchCommandHandler createBlogFixBatchCommandHandler,
            CreateBlogFixBatchJobCommandHandler createBlogFixBatchJobCommandHandler,
            ListBlogFixBatchJobsQueryHandler listBlogFixBatchJobsQueryHandler,
            GetBlogFixBatchJobQueryHandler getBlogFixBatchJobQueryHandler,
            ApplyBlogFixBatchJobCommandHandler applyBlogFixBatchJobCommandHandler,
            CancelBlogFixBatchJobCommandHandler cancelBlogFixBatchJobCommandHandler,
            CancelQueuedBlogFixBatchJobsCommandHandler cancelQueuedBlogFixBatchJobsCommandHandler,
            ClearCompletedBlogFixBatchJobsCommandHandler clearCompletedBlogFixBatchJobsCommandHandler,
            DeleteBlogFixBatchJobCommandHandler deleteBlogFixBatchJobCommandHandler) {
        this.getAiRuntimeConfigQueryHandler = getAiRuntimeConfigQueryHandler;
        this.fixBlogHtmlCommandHandler = fixBlogHtmlCommandHandler;
        this.enrichWorkHtmlCommandHandler = enrichWorkHtmlCommandHandler;
        this.createBlogFixBatchCommandHandler = createBlogFixBatchCommandHandler;
        this.createBlogFixBatchJobCommandHandler = createBlogFixBatchJobCommandHandler;
        this.listBlogFixBatchJobsQueryHandler = listBlogFixBatchJobsQueryHandler;
        this.getBlogFixBatchJobQueryHandler = getBlogFixBatchJobQueryHandler;
        this.applyBlogFixBatchJobCommandHandler = applyBlogFixBatchJobCommandHandler;
        this.cancelBlogFixBatchJobCommandHandler = cancelBlogFixBatchJobCommandHandler;
        this.cancelQueuedBlogFixBatchJobsCommandHandler = cancelQueuedBlogFixBatchJobsCommandHandler;
        this.clearCompletedBlogFixBatchJobsCommandHandler = clearCompletedBlogFixBatchJobsCommandHandler;
        this.deleteBlogFixBatchJobCommandHandler = deleteBlogFixBatchJobCommandHandler;
    }

    @GetMapping("/runtime-config")
    Map<String, Object> runtimeConfig() {
        return getAiRuntimeConfigQueryHandler.handle(new GetAiRuntimeConfigQuery());
    }

    @PostMapping("/blog-fix")
    Map<String, Object> blogFix(@RequestBody FixBlogHtmlCommand command) {
        return fixBlogHtmlCommandHandler.handle(command);
    }

    @PostMapping("/work-enrich")
    Map<String, Object> workEnrich(@RequestBody EnrichWorkHtmlCommand command) {
        return enrichWorkHtmlCommandHandler.handle(command);
    }

    @PostMapping("/blog-fix-batch")
    Map<String, Object> blogFixBatch(@RequestBody CreateBlogFixBatchCommand command) {
        return createBlogFixBatchCommandHandler.handle(command);
    }

    @PostMapping("/blog-fix-batch-jobs")
    Map<String, Object> createJob(@RequestBody CreateBlogFixBatchJobCommand command) {
        return createBlogFixBatchJobCommandHandler.handle(command);
    }

    @GetMapping("/blog-fix-batch-jobs")
    Map<String, Object> listJobs() {
        return listBlogFixBatchJobsQueryHandler.handle(new ListBlogFixBatchJobsQuery());
    }

    @GetMapping("/blog-fix-batch-jobs/{jobId}")
    Map<String, Object> getJob(@PathVariable UUID jobId) {
        return getBlogFixBatchJobQueryHandler.handle(new GetBlogFixBatchJobQuery(jobId));
    }

    @PostMapping("/blog-fix-batch-jobs/{jobId}/apply")
    Map<String, Object> applyJob(
            @PathVariable UUID jobId,
            @RequestBody(required = false) ApplyBlogFixBatchJobRequest request) {
        return applyBlogFixBatchJobCommandHandler.handle(ApplyBlogFixBatchJobCommand.from(jobId, request));
    }

    @PostMapping("/blog-fix-batch-jobs/{jobId}/cancel")
    Map<String, Object> cancelJob(@PathVariable UUID jobId) {
        return cancelBlogFixBatchJobCommandHandler.handle(new CancelBlogFixBatchJobCommand(jobId));
    }

    @PostMapping("/blog-fix-batch-jobs/cancel-queued")
    Map<String, Object> cancelQueuedJobs() {
        return cancelQueuedBlogFixBatchJobsCommandHandler.handle(new CancelQueuedBlogFixBatchJobsCommand());
    }

    @PostMapping("/blog-fix-batch-jobs/clear-completed")
    Map<String, Object> clearCompletedJobs() {
        return clearCompletedBlogFixBatchJobsCommandHandler.handle(new ClearCompletedBlogFixBatchJobsCommand());
    }

    @DeleteMapping("/blog-fix-batch-jobs/{jobId}")
    Map<String, Object> deleteJob(@PathVariable UUID jobId) {
        return deleteBlogFixBatchJobCommandHandler.handle(new DeleteBlogFixBatchJobCommand(jobId));
    }
}
