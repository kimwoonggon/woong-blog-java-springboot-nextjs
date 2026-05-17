package com.woongblog.api.publicapi;

import com.woongblog.application.composition.GetHomeQueryHandler;
import com.woongblog.application.content.blogs.GetBlogBySlugQuery;
import com.woongblog.application.content.blogs.GetBlogBySlugQueryHandler;
import com.woongblog.application.content.blogs.GetBlogDetailContextQuery;
import com.woongblog.application.content.blogs.GetBlogDetailContextQueryHandler;
import com.woongblog.application.content.blogs.GetBlogsQuery;
import com.woongblog.application.content.blogs.GetBlogsQueryHandler;
import com.woongblog.application.content.pages.GetPageBySlugQuery;
import com.woongblog.application.content.pages.GetPageBySlugQueryHandler;
import com.woongblog.application.content.works.GetWorkBySlugQuery;
import com.woongblog.application.content.works.GetWorkBySlugQueryHandler;
import com.woongblog.application.content.works.GetWorkDetailContextQuery;
import com.woongblog.application.content.works.GetWorkDetailContextQueryHandler;
import com.woongblog.application.content.works.GetWorksQuery;
import com.woongblog.application.content.works.GetWorksQueryHandler;
import com.woongblog.application.site.GetResumeQueryHandler;
import com.woongblog.application.site.GetSiteSettingsQueryHandler;
import com.woongblog.common.PagedResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicContentController {
    private final GetHomeQueryHandler getHomeQueryHandler;
    private final GetSiteSettingsQueryHandler getSiteSettingsQueryHandler;
    private final GetResumeQueryHandler getResumeQueryHandler;
    private final GetPageBySlugQueryHandler getPageBySlugQueryHandler;
    private final GetBlogsQueryHandler getBlogsQueryHandler;
    private final GetBlogBySlugQueryHandler getBlogBySlugQueryHandler;
    private final GetBlogDetailContextQueryHandler getBlogDetailContextQueryHandler;
    private final GetWorksQueryHandler getWorksQueryHandler;
    private final GetWorkBySlugQueryHandler getWorkBySlugQueryHandler;
    private final GetWorkDetailContextQueryHandler getWorkDetailContextQueryHandler;

    public PublicContentController(
            GetHomeQueryHandler getHomeQueryHandler,
            GetSiteSettingsQueryHandler getSiteSettingsQueryHandler,
            GetResumeQueryHandler getResumeQueryHandler,
            GetPageBySlugQueryHandler getPageBySlugQueryHandler,
            GetBlogsQueryHandler getBlogsQueryHandler,
            GetBlogBySlugQueryHandler getBlogBySlugQueryHandler,
            GetBlogDetailContextQueryHandler getBlogDetailContextQueryHandler,
            GetWorksQueryHandler getWorksQueryHandler,
            GetWorkBySlugQueryHandler getWorkBySlugQueryHandler,
            GetWorkDetailContextQueryHandler getWorkDetailContextQueryHandler) {
        this.getHomeQueryHandler = getHomeQueryHandler;
        this.getSiteSettingsQueryHandler = getSiteSettingsQueryHandler;
        this.getResumeQueryHandler = getResumeQueryHandler;
        this.getPageBySlugQueryHandler = getPageBySlugQueryHandler;
        this.getBlogsQueryHandler = getBlogsQueryHandler;
        this.getBlogBySlugQueryHandler = getBlogBySlugQueryHandler;
        this.getBlogDetailContextQueryHandler = getBlogDetailContextQueryHandler;
        this.getWorksQueryHandler = getWorksQueryHandler;
        this.getWorkBySlugQueryHandler = getWorkBySlugQueryHandler;
        this.getWorkDetailContextQueryHandler = getWorkDetailContextQueryHandler;
    }

    @GetMapping("/home")
    Map<String, Object> home() {
        return getHomeQueryHandler.handle();
    }

    @GetMapping("/site-settings")
    Map<String, Object> siteSettings() {
        return getSiteSettingsQueryHandler.handle();
    }

    @GetMapping("/resume")
    Map<String, Object> resume() {
        return getResumeQueryHandler.handle();
    }

    @GetMapping("/pages/{slug}")
    Map<String, Object> page(@PathVariable String slug) {
        return getPageBySlugQueryHandler.handle(new GetPageBySlugQuery(slug));
    }

    @GetMapping("/blogs")
    PagedResponse<Map<String, Object>> blogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String searchMode) {
        return getBlogsQueryHandler.handle(new GetBlogsQuery(page, pageSize, query, searchMode));
    }

    @GetMapping("/blogs/{slug}")
    Map<String, Object> blog(@PathVariable String slug) {
        return getBlogBySlugQueryHandler.handle(new GetBlogBySlugQuery(slug));
    }

    @GetMapping("/blogs/{slug}/context")
    Map<String, Object> blogContext(@PathVariable String slug, @RequestParam(defaultValue = "9") int limit) {
        return getBlogDetailContextQueryHandler.handle(new GetBlogDetailContextQuery(slug, limit));
    }

    @GetMapping("/works")
    PagedResponse<Map<String, Object>> works(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "6") int pageSize,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String searchMode) {
        return getWorksQueryHandler.handle(new GetWorksQuery(page, pageSize, query, searchMode));
    }

    @GetMapping("/works/{slug}")
    Map<String, Object> work(@PathVariable String slug) {
        return getWorkBySlugQueryHandler.handle(new GetWorkBySlugQuery(slug));
    }

    @GetMapping("/works/{slug}/context")
    Map<String, Object> workContext(@PathVariable String slug, @RequestParam(defaultValue = "9") int limit) {
        return getWorkDetailContextQueryHandler.handle(new GetWorkDetailContextQuery(slug, limit));
    }
}
