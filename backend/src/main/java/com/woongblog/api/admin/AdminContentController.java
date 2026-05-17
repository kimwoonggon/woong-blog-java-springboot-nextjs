package com.woongblog.api.admin;

import com.woongblog.application.composition.GetDashboardSummaryQueryHandler;
import com.woongblog.application.content.blogs.BlogMutation;
import com.woongblog.application.content.blogs.CreateBlogCommand;
import com.woongblog.application.content.blogs.CreateBlogCommandHandler;
import com.woongblog.application.content.blogs.DeleteBlogCommand;
import com.woongblog.application.content.blogs.DeleteBlogCommandHandler;
import com.woongblog.application.content.blogs.GetAdminBlogByIdQuery;
import com.woongblog.application.content.blogs.GetAdminBlogByIdQueryHandler;
import com.woongblog.application.content.blogs.GetAdminBlogsQueryHandler;
import com.woongblog.application.content.blogs.UpdateBlogCommand;
import com.woongblog.application.content.blogs.UpdateBlogCommandHandler;
import com.woongblog.application.content.pages.GetAdminPagesQuery;
import com.woongblog.application.content.pages.GetAdminPagesQueryHandler;
import com.woongblog.application.content.pages.UpdatePageCommand;
import com.woongblog.application.content.pages.UpdatePageCommandHandler;
import com.woongblog.application.content.works.CreateWorkCommand;
import com.woongblog.application.content.works.CreateWorkCommandHandler;
import com.woongblog.application.content.works.DeleteWorkCommand;
import com.woongblog.application.content.works.DeleteWorkCommandHandler;
import com.woongblog.application.content.works.GetAdminWorkByIdQuery;
import com.woongblog.application.content.works.GetAdminWorkByIdQueryHandler;
import com.woongblog.application.content.works.GetAdminWorksQueryHandler;
import com.woongblog.application.content.works.UpdateWorkCommand;
import com.woongblog.application.content.works.UpdateWorkCommandHandler;
import com.woongblog.application.content.works.WorkMutation;
import com.woongblog.application.site.GetAdminSiteSettingsQueryHandler;
import com.woongblog.application.site.UpdateSiteSettingsCommand;
import com.woongblog.application.site.UpdateSiteSettingsCommandHandler;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminContentController {
    private final GetDashboardSummaryQueryHandler getDashboardSummaryQueryHandler;
    private final GetAdminSiteSettingsQueryHandler getAdminSiteSettingsQueryHandler;
    private final UpdateSiteSettingsCommandHandler updateSiteSettingsCommandHandler;
    private final GetAdminPagesQueryHandler getAdminPagesQueryHandler;
    private final UpdatePageCommandHandler updatePageCommandHandler;
    private final GetAdminBlogsQueryHandler getAdminBlogsQueryHandler;
    private final GetAdminBlogByIdQueryHandler getAdminBlogByIdQueryHandler;
    private final CreateBlogCommandHandler createBlogCommandHandler;
    private final UpdateBlogCommandHandler updateBlogCommandHandler;
    private final DeleteBlogCommandHandler deleteBlogCommandHandler;
    private final GetAdminWorksQueryHandler getAdminWorksQueryHandler;
    private final GetAdminWorkByIdQueryHandler getAdminWorkByIdQueryHandler;
    private final CreateWorkCommandHandler createWorkCommandHandler;
    private final UpdateWorkCommandHandler updateWorkCommandHandler;
    private final DeleteWorkCommandHandler deleteWorkCommandHandler;

    public AdminContentController(
            GetDashboardSummaryQueryHandler getDashboardSummaryQueryHandler,
            GetAdminSiteSettingsQueryHandler getAdminSiteSettingsQueryHandler,
            UpdateSiteSettingsCommandHandler updateSiteSettingsCommandHandler,
            GetAdminPagesQueryHandler getAdminPagesQueryHandler,
            UpdatePageCommandHandler updatePageCommandHandler,
            GetAdminBlogsQueryHandler getAdminBlogsQueryHandler,
            GetAdminBlogByIdQueryHandler getAdminBlogByIdQueryHandler,
            CreateBlogCommandHandler createBlogCommandHandler,
            UpdateBlogCommandHandler updateBlogCommandHandler,
            DeleteBlogCommandHandler deleteBlogCommandHandler,
            GetAdminWorksQueryHandler getAdminWorksQueryHandler,
            GetAdminWorkByIdQueryHandler getAdminWorkByIdQueryHandler,
            CreateWorkCommandHandler createWorkCommandHandler,
            UpdateWorkCommandHandler updateWorkCommandHandler,
            DeleteWorkCommandHandler deleteWorkCommandHandler) {
        this.getDashboardSummaryQueryHandler = getDashboardSummaryQueryHandler;
        this.getAdminSiteSettingsQueryHandler = getAdminSiteSettingsQueryHandler;
        this.updateSiteSettingsCommandHandler = updateSiteSettingsCommandHandler;
        this.getAdminPagesQueryHandler = getAdminPagesQueryHandler;
        this.updatePageCommandHandler = updatePageCommandHandler;
        this.getAdminBlogsQueryHandler = getAdminBlogsQueryHandler;
        this.getAdminBlogByIdQueryHandler = getAdminBlogByIdQueryHandler;
        this.createBlogCommandHandler = createBlogCommandHandler;
        this.updateBlogCommandHandler = updateBlogCommandHandler;
        this.deleteBlogCommandHandler = deleteBlogCommandHandler;
        this.getAdminWorksQueryHandler = getAdminWorksQueryHandler;
        this.getAdminWorkByIdQueryHandler = getAdminWorkByIdQueryHandler;
        this.createWorkCommandHandler = createWorkCommandHandler;
        this.updateWorkCommandHandler = updateWorkCommandHandler;
        this.deleteWorkCommandHandler = deleteWorkCommandHandler;
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
        return getDashboardSummaryQueryHandler.handle();
    }

    @GetMapping("/site-settings")
    Map<String, Object> siteSettings() {
        return getAdminSiteSettingsQueryHandler.handle();
    }

    @PutMapping("/site-settings")
    Map<String, Object> updateSiteSettings(@RequestBody Map<String, Object> request) {
        return updateSiteSettingsCommandHandler.handle(new UpdateSiteSettingsCommand(
                stringValue(request, "ownerName"),
                stringValue(request, "tagline"),
                stringValue(request, "facebookUrl"),
                stringValue(request, "instagramUrl"),
                stringValue(request, "twitterUrl"),
                stringValue(request, "linkedInUrl"),
                firstStringValue(request, "gitHubUrl", "githubUrl"),
                request.containsKey("resumeAssetId"),
                uuidValue(request.get("resumeAssetId"))));
    }

    @GetMapping("/pages")
    List<Map<String, Object>> pages(@RequestParam(required = false) List<String> slugs) {
        return getAdminPagesQueryHandler.handle(new GetAdminPagesQuery(slugs));
    }

    @PutMapping("/pages")
    Map<String, Object> updatePage(@Valid @RequestBody UpdatePagePayload request) {
        return updatePageCommandHandler.handle(new UpdatePageCommand(
                request.id(),
                request.title(),
                request.contentJson()));
    }

    @GetMapping("/blogs")
    List<Map<String, Object>> blogs() {
        return getAdminBlogsQueryHandler.handle();
    }

    @GetMapping("/blogs/{id}")
    Map<String, Object> blog(@PathVariable UUID id) {
        return getAdminBlogByIdQueryHandler.handle(new GetAdminBlogByIdQuery(id));
    }

    @PostMapping("/blogs")
    Map<String, Object> createBlog(@Valid @RequestBody BlogPayload request) {
        return createBlogCommandHandler.handle(new CreateBlogCommand(request.toMutation()));
    }

    @PutMapping("/blogs/{id}")
    Map<String, Object> updateBlog(@PathVariable UUID id, @Valid @RequestBody BlogPayload request) {
        return updateBlogCommandHandler.handle(new UpdateBlogCommand(id, request.toMutation()));
    }

    @DeleteMapping("/blogs/{id}")
    ResponseEntity<Void> deleteBlog(@PathVariable UUID id) {
        deleteBlogCommandHandler.handle(new DeleteBlogCommand(id));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/works")
    List<Map<String, Object>> works() {
        return getAdminWorksQueryHandler.handle();
    }

    @GetMapping("/works/{id}")
    Map<String, Object> work(@PathVariable UUID id) {
        return getAdminWorkByIdQueryHandler.handle(new GetAdminWorkByIdQuery(id));
    }

    @PostMapping("/works")
    Map<String, Object> createWork(@Valid @RequestBody WorkPayload request) {
        return createWorkCommandHandler.handle(new CreateWorkCommand(request.toMutation()));
    }

    @PutMapping("/works/{id}")
    Map<String, Object> updateWork(@PathVariable UUID id, @Valid @RequestBody WorkPayload request) {
        return updateWorkCommandHandler.handle(new UpdateWorkCommand(id, request.toMutation()));
    }

    @DeleteMapping("/works/{id}")
    ResponseEntity<Void> deleteWork(@PathVariable UUID id) {
        deleteWorkCommandHandler.handle(new DeleteWorkCommand(id));
        return ResponseEntity.noContent().build();
    }

    private static String stringValue(Map<String, Object> request, String key) {
        Object value = request.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private static String firstStringValue(Map<String, Object> request, String... keys) {
        for (String key : keys) {
            if (request.containsKey(key)) {
                return stringValue(request, key);
            }
        }
        return null;
    }

    private static UUID uuidValue(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return null;
        }
        return UUID.fromString(String.valueOf(value));
    }

    public record UpdatePagePayload(UUID id, @NotBlank @Size(max = 200) String title, @NotBlank String contentJson) {
    }

    public record BlogPayload(
            @NotBlank String title,
            String excerpt,
            List<String> tags,
            boolean published,
            @NotBlank String contentJson,
            UUID coverAssetId) {
        BlogMutation toMutation() {
            return new BlogMutation(title, excerpt, tags, published, contentJson, coverAssetId);
        }
    }

    public record WorkPayload(
            @NotBlank String title,
            String excerpt,
            @NotBlank String category,
            String period,
            List<String> tags,
            boolean published,
            @NotBlank String contentJson,
            String allPropertiesJson,
            UUID thumbnailAssetId,
            UUID iconAssetId) {
        WorkMutation toMutation() {
            return new WorkMutation(
                    title,
                    excerpt,
                    category,
                    period,
                    tags,
                    published,
                    contentJson,
                    allPropertiesJson,
                    thumbnailAssetId,
                    iconAssetId);
        }
    }
}
