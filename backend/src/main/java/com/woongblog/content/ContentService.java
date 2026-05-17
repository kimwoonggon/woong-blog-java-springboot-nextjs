package com.woongblog.content;

import com.fasterxml.jackson.databind.JsonNode;
import com.woongblog.application.composition.DashboardQueryStore;
import com.woongblog.application.composition.HomeQueryStore;
import com.woongblog.application.content.blogs.BlogCommandStore;
import com.woongblog.application.content.blogs.BlogMutation;
import com.woongblog.application.content.blogs.BlogQueryStore;
import com.woongblog.application.content.common.ContentSearchMode;
import com.woongblog.application.content.pages.PageCommandStore;
import com.woongblog.application.content.pages.PageQueryStore;
import com.woongblog.application.content.works.WorkCommandStore;
import com.woongblog.application.content.works.WorkMutation;
import com.woongblog.application.content.works.WorkQueryStore;
import com.woongblog.application.site.SiteCommandStore;
import com.woongblog.application.site.SiteQueryStore;
import com.woongblog.common.BadRequestException;
import com.woongblog.common.ConflictException;
import com.woongblog.common.JdbcData;
import com.woongblog.common.JsonSupport;
import com.woongblog.common.NotFoundException;
import com.woongblog.common.PagedResponse;
import com.woongblog.common.SlugSupport;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentService implements BlogQueryStore, BlogCommandStore, WorkQueryStore, WorkCommandStore,
        PageQueryStore, PageCommandStore, SiteQueryStore, SiteCommandStore, HomeQueryStore, DashboardQueryStore {
    private static final Pattern FIRST_IMAGE_SRC_PATTERN = Pattern.compile(
            "<img\\b[^>]*\\bsrc\\s*=\\s*(['\"])(.*?)\\1",
            Pattern.CASE_INSENSITIVE);

    private final JdbcTemplate jdbcTemplate;
    private final JsonSupport jsonSupport;

    public ContentService(JdbcTemplate jdbcTemplate, JsonSupport jsonSupport) {
        this.jdbcTemplate = jdbcTemplate;
        this.jsonSupport = jsonSupport;
    }

    @Override
    public PagedResponse<Map<String, Object>> getPublishedBlogsPage(
            int page,
            int pageSize,
            String normalizedQuery,
            ContentSearchMode searchMode) {
        return publicBlogs(page, pageSize, normalizedQuery, searchMode.queryValue());
    }

    @Override
    public Map<String, Object> getPublishedBlogBySlug(String slug) {
        return publicBlog(slug);
    }

    @Override
    public Map<String, Object> getPublishedBlogContext(String slug, int limit) {
        return publicBlogContext(slug, limit);
    }

    @Override
    public List<Map<String, Object>> getAdminBlogs() {
        return adminBlogs();
    }

    @Override
    public Map<String, Object> getAdminBlog(UUID id) {
        return adminBlog(id);
    }

    @Override
    public Map<String, Object> createBlog(BlogMutation mutation) {
        return createBlog(new BlogMutationRequest(
                mutation.title(),
                mutation.excerpt(),
                mutation.tags(),
                mutation.published(),
                mutation.contentJson(),
                mutation.coverAssetId()));
    }

    @Override
    public Map<String, Object> updateBlog(UUID id, BlogMutation mutation) {
        return updateBlog(id, new BlogMutationRequest(
                mutation.title(),
                mutation.excerpt(),
                mutation.tags(),
                mutation.published(),
                mutation.contentJson(),
                mutation.coverAssetId()));
    }

    @Override
    public PagedResponse<Map<String, Object>> getPublishedWorksPage(
            int page,
            int pageSize,
            String normalizedQuery,
            ContentSearchMode searchMode) {
        return publicWorks(page, pageSize, normalizedQuery, searchMode.queryValue());
    }

    @Override
    public Map<String, Object> getPublishedWorkBySlug(String slug) {
        return publicWork(slug);
    }

    @Override
    public Map<String, Object> getPublishedWorkContext(String slug, int limit) {
        return publicWorkContext(slug, limit);
    }

    @Override
    public List<Map<String, Object>> getAdminWorks() {
        return adminWorks();
    }

    @Override
    public Map<String, Object> getAdminWork(UUID id) {
        return adminWork(id);
    }

    @Override
    public Map<String, Object> createWork(WorkMutation mutation) {
        return createWork(new WorkMutationRequest(
                mutation.title(),
                mutation.excerpt(),
                mutation.category(),
                mutation.period(),
                mutation.tags(),
                mutation.published(),
                mutation.contentJson(),
                mutation.allPropertiesJson(),
                mutation.thumbnailAssetId(),
                mutation.iconAssetId()));
    }

    @Override
    public Map<String, Object> updateWork(UUID id, WorkMutation mutation) {
        return updateWork(id, new WorkMutationRequest(
                mutation.title(),
                mutation.excerpt(),
                mutation.category(),
                mutation.period(),
                mutation.tags(),
                mutation.published(),
                mutation.contentJson(),
                mutation.allPropertiesJson(),
                mutation.thumbnailAssetId(),
                mutation.iconAssetId()));
    }

    @Override
    public Map<String, Object> getPublishedPageBySlug(String slug) {
        return publicPage(slug);
    }

    @Override
    public List<Map<String, Object>> getAdminPages(List<String> slugs) {
        return adminPages(slugs);
    }

    @Override
    public Map<String, Object> updatePage(UUID id, String title, String contentJson) {
        return updatePage(new UpdatePageRequest(id, title, contentJson));
    }

    @Override
    public Map<String, Object> getPublicSiteSettings() {
        return publicSiteSettings();
    }

    @Override
    public Map<String, Object> getPublicResume() {
        return publicResume();
    }

    @Override
    public Map<String, Object> getAdminSiteSettings() {
        return adminSiteSettings();
    }

    @Override
    public Map<String, Object> updateSiteSettings(
            String ownerName,
            String tagline,
            String facebookUrl,
            String instagramUrl,
            String twitterUrl,
            String linkedInUrl,
            String gitHubUrl,
            boolean hasResumeAssetId,
            UUID resumeAssetId) {
        return updateSiteSettings(new UpdateSiteSettingsRequest(
                ownerName,
                tagline,
                facebookUrl,
                instagramUrl,
                twitterUrl,
                linkedInUrl,
                gitHubUrl,
                hasResumeAssetId,
                resumeAssetId));
    }

    @Override
    public Map<String, Object> getPublicHome() {
        return publicHome();
    }

    @Override
    public Map<String, Object> getAdminDashboard() {
        return adminDashboard();
    }

    public PagedResponse<Map<String, Object>> publicBlogs(int page, int pageSize, String query, String searchMode) {
        PageArgs args = pageArgs(page, pageSize);
        QueryParts parts = publicSearch("Blogs", query, searchMode);
        long total = count(parts.countSql(), parts.params());
        List<Object> params = new ArrayList<>(parts.params());
        params.add(args.limit());
        params.add(args.offset());
        List<Map<String, Object>> items = jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "Tags", "PublicCoverUrl", "PublishedAt"
                FROM "Blogs"
                WHERE "Published" = true %s
                ORDER BY "PublishedAt" DESC NULLS LAST, "CreatedAt" DESC
                LIMIT ? OFFSET ?
                """.formatted(parts.whereSuffix()), this::blogCard, params.toArray());
        return PagedResponse.of(items, args.page(), args.pageSize(), total);
    }

    public Map<String, Object> publicBlog(String slug) {
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "PublicContentMarkdown",
                       "Tags", "PublicCoverUrl", "PublishedAt"
                FROM "Blogs"
                WHERE "Published" = true AND "Slug" = ?
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Blog not found.");
            }
            Map<String, Object> item = blogCard(rs, 0);
            item.put("content", jsonSupport.contentBody(
                    rs.getString("ContentJson"),
                    rs.getString("PublicContentHtml"),
                    rs.getString("PublicContentMarkdown")));
            item.put("contentJson", rs.getString("ContentJson"));
            return item;
        }, slug);
    }

    public Map<String, Object> publicBlogContext(String slug, int limit) {
        ensureExists("Blogs", slug);
        return context("Blogs", slug, Math.max(1, Math.min(limit, 24)), this::blogCard);
    }

    public PagedResponse<Map<String, Object>> publicWorks(int page, int pageSize, String query, String searchMode) {
        PageArgs args = pageArgs(page, pageSize);
        QueryParts parts = publicSearch("Works", query, searchMode);
        long total = count(parts.countSql(), parts.params());
        List<Object> params = new ArrayList<>(parts.params());
        params.add(args.limit());
        params.add(args.offset());
        List<Map<String, Object>> items = jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "Category", "Tags", "PublicThumbnailUrl", "PublishedAt"
                FROM "Works"
                WHERE "Published" = true %s
                ORDER BY "PublishedAt" DESC NULLS LAST, "CreatedAt" DESC
                LIMIT ? OFFSET ?
                """.formatted(parts.whereSuffix()), this::workCard, params.toArray());
        return PagedResponse.of(items, args.page(), args.pageSize(), total);
    }

    public Map<String, Object> publicWork(String slug) {
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "PublicContentMarkdown",
                       "Category", "Period", "Tags", "PublicThumbnailUrl", "PublicSocialShareMessage",
                       "VideosVersion", "PublishedAt"
                FROM "Works"
                WHERE "Published" = true AND "Slug" = ?
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Work not found.");
            }
            UUID workId = JdbcData.uuid(rs, "Id");
            Map<String, Object> item = workCard(rs, 0);
            item.put("period", rs.getString("Period"));
            item.put("content", jsonSupport.contentBody(
                    rs.getString("ContentJson"),
                    rs.getString("PublicContentHtml"),
                    rs.getString("PublicContentMarkdown")));
            item.put("contentJson", rs.getString("ContentJson"));
            item.put("socialShareMessage", rs.getString("PublicSocialShareMessage"));
            item.put("videosVersion", rs.getInt("VideosVersion"));
            item.put("videos_version", rs.getInt("VideosVersion"));
            item.put("videos", videos(workId, false));
            return item;
        }, slug);
    }

    public Map<String, Object> publicWorkContext(String slug, int limit) {
        ensureExists("Works", slug);
        return context("Works", slug, Math.max(1, Math.min(limit, 24)), this::workCard);
    }

    public Map<String, Object> publicPage(String slug) {
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "ContentJson"
                FROM "Pages"
                WHERE "Slug" = ?
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Page not found.");
            }
            Map<String, Object> page = new LinkedHashMap<>();
            page.put("id", JdbcData.uuid(rs, "Id"));
            page.put("slug", rs.getString("Slug"));
            page.put("title", rs.getString("Title"));
            page.put("contentJson", rs.getString("ContentJson"));
            return page;
        }, slug);
    }

    public Map<String, Object> publicSiteSettings() {
        return jdbcTemplate.query("""
                SELECT "OwnerName", "Tagline", "FacebookUrl", "InstagramUrl", "TwitterUrl", "LinkedInUrl", "GitHubUrl"
                FROM "SiteSettings" WHERE "Singleton" = true
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Site settings not found.");
            }
            Map<String, Object> settings = new LinkedHashMap<>();
            settings.put("ownerName", rs.getString("OwnerName"));
            settings.put("tagline", rs.getString("Tagline"));
            settings.put("facebookUrl", rs.getString("FacebookUrl"));
            settings.put("instagramUrl", rs.getString("InstagramUrl"));
            settings.put("twitterUrl", rs.getString("TwitterUrl"));
            settings.put("linkedInUrl", rs.getString("LinkedInUrl"));
            settings.put("gitHubUrl", rs.getString("GitHubUrl"));
            return settings;
        });
    }

    public Map<String, Object> publicResume() {
        return jdbcTemplate.query("""
                SELECT a."Id", a."PublicUrl", a."Path"
                FROM "SiteSettings" s
                INNER JOIN "Assets" a ON a."Id" = s."ResumeAssetId"
                WHERE s."Singleton" = true
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Resume not found.");
            }
            String path = rs.getString("Path");
            Map<String, Object> resume = new LinkedHashMap<>();
            resume.put("id", JdbcData.uuid(rs, "Id"));
            resume.put("publicUrl", rs.getString("PublicUrl"));
            resume.put("fileName", path.substring(path.lastIndexOf('/') + 1));
            resume.put("path", path);
            return resume;
        });
    }

    public Map<String, Object> publicHome() {
        Map<String, Object> home = new LinkedHashMap<>();
        Map<String, Object> page = publicPage("home");
        Map<String, Object> homePage = new LinkedHashMap<>();
        homePage.put("title", page.get("title"));
        homePage.put("contentJson", page.get("contentJson"));
        home.put("homePage", homePage);

        Map<String, Object> site = publicSiteSettings();
        Map<String, Object> siteHome = new LinkedHashMap<>();
        siteHome.put("ownerName", site.get("ownerName"));
        siteHome.put("tagline", site.get("tagline"));
        siteHome.put("gitHubUrl", site.get("gitHubUrl"));
        siteHome.put("linkedInUrl", site.get("linkedInUrl"));
        try {
            siteHome.put("resumePublicUrl", publicResume().get("publicUrl"));
        } catch (NotFoundException ignored) {
            siteHome.put("resumePublicUrl", "");
        }
        home.put("siteSettings", siteHome);
        home.put("featuredWorks", publicWorks(1, 6, null, null).items());
        home.put("recentPosts", publicBlogs(1, 6, null, null).items());
        return home;
    }

    public Map<String, Object> adminDashboard() {
        Long works = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"Works\"", Long.class);
        Long blogs = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"Blogs\"", Long.class);
        Long views = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"PageViews\"", Long.class);
        return Map.of("worksCount", works == null ? 0 : works, "blogsCount", blogs == null ? 0 : blogs, "viewsCount", views == null ? 0 : views);
    }

    public List<Map<String, Object>> adminPages(List<String> slugs) {
        if (slugs == null || slugs.isEmpty()) {
            return jdbcTemplate.query("""
                    SELECT "Id", "Slug", "Title", "ContentJson", "UpdatedAt" FROM "Pages" ORDER BY "Slug"
                    """, this::adminPage);
        }
        String placeholders = String.join(",", slugs.stream().map(ignored -> "?").toList());
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "ContentJson", "UpdatedAt"
                FROM "Pages" WHERE "Slug" IN (%s) ORDER BY "Slug"
                """.formatted(placeholders), this::adminPage, slugs.toArray());
    }

    @Transactional
    public Map<String, Object> updatePage(UpdatePageRequest request) {
        String contentJson = jsonSupport.normalizeJson(request.contentJson());
        int updated = jdbcTemplate.update("""
                UPDATE "Pages" SET "Title" = ?, "ContentJson" = ?::jsonb, "UpdatedAt" = now()
                WHERE "Id" = ?
                """, request.title(), contentJson, request.id());
        if (updated == 0) {
            throw new NotFoundException("Page not found.");
        }
        return Map.of("success", true);
    }

    public Map<String, Object> adminSiteSettings() {
        return jdbcTemplate.query("""
                SELECT "OwnerName", "Tagline", "FacebookUrl", "InstagramUrl", "TwitterUrl", "LinkedInUrl", "GitHubUrl", "ResumeAssetId"
                FROM "SiteSettings" WHERE "Singleton" = true
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Site settings not found.");
            }
            Map<String, Object> settings = new LinkedHashMap<>();
            settings.put("owner_name", rs.getString("OwnerName"));
            settings.put("tagline", rs.getString("Tagline"));
            settings.put("facebook_url", rs.getString("FacebookUrl"));
            settings.put("instagram_url", rs.getString("InstagramUrl"));
            settings.put("twitter_url", rs.getString("TwitterUrl"));
            settings.put("linkedin_url", rs.getString("LinkedInUrl"));
            settings.put("github_url", rs.getString("GitHubUrl"));
            settings.put("resume_asset_id", rs.getObject("ResumeAssetId", UUID.class));
            return settings;
        });
    }

    @Transactional
    public Map<String, Object> updateSiteSettings(UpdateSiteSettingsRequest request) {
        int updated = jdbcTemplate.update("""
                UPDATE "SiteSettings"
                SET "OwnerName" = COALESCE(?, "OwnerName"),
                    "Tagline" = COALESCE(?, "Tagline"),
                    "FacebookUrl" = COALESCE(?, "FacebookUrl"),
                    "InstagramUrl" = COALESCE(?, "InstagramUrl"),
                    "TwitterUrl" = COALESCE(?, "TwitterUrl"),
                    "LinkedInUrl" = COALESCE(?, "LinkedInUrl"),
                    "GitHubUrl" = COALESCE(?, "GitHubUrl"),
                    "ResumeAssetId" = CASE WHEN ? THEN ? ELSE "ResumeAssetId" END,
                    "UpdatedAt" = now()
                WHERE "Singleton" = true
                """, request.ownerName(), request.tagline(), request.facebookUrl(), request.instagramUrl(),
                request.twitterUrl(), request.linkedInUrl(), request.gitHubUrl(), request.hasResumeAssetId(), request.resumeAssetId());
        if (updated == 0) {
            throw new NotFoundException("Site settings not found.");
        }
        return Map.of("success", true);
    }

    public List<Map<String, Object>> adminBlogs() {
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "Tags", "PublicCoverUrl", "Published", "PublishedAt", "CreatedAt", "UpdatedAt"
                FROM "Blogs" ORDER BY "CreatedAt" DESC, "UpdatedAt" DESC
                """, this::adminBlogCard);
    }

    public Map<String, Object> adminBlog(UUID id) {
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "ContentJson", "Tags", "PublicCoverUrl", "Published", "PublishedAt", "CreatedAt", "UpdatedAt"
                FROM "Blogs" WHERE "Id" = ?
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Blog not found.");
            }
            Map<String, Object> item = adminBlogCard(rs, 0);
            item.put("content", Map.of("html", jsonSupport.contentHtml(rs.getString("ContentJson"))));
            return item;
        }, id);
    }

    @Transactional
    public Map<String, Object> createBlog(BlogMutationRequest request) {
        UUID id = UUID.randomUUID();
        String slug = uniqueSlug("Blogs", SlugSupport.fromTitle(request.title()), null);
        String contentJson = jsonSupport.normalizeJson(request.contentJson());
        String html = jsonSupport.contentHtml(contentJson);
        updateWithArray("""
                INSERT INTO "Blogs" ("Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "SearchTitle", "SearchText", "CoverAssetId", "PublicCoverUrl", "Tags", "Published", "PublishedAt", "CreatedAt", "UpdatedAt")
                VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, COALESCE((SELECT "PublicUrl" FROM "Assets" WHERE "Id" = ?), ''), ?, ?, CASE WHEN ? THEN now() ELSE NULL END, now(), now())
                """, id, slug, request.title(), clean(request.excerpt()), contentJson, html,
                search(request.title()), search(clean(request.excerpt()) + " " + html), request.coverAssetId(), request.coverAssetId(),
                textArray(request.tags()),
                request.published(), request.published());
        return Map.of("id", id, "slug", slug);
    }

    @Transactional
    public Map<String, Object> updateBlog(UUID id, BlogMutationRequest request) {
        String slug = uniqueSlug("Blogs", SlugSupport.fromTitle(request.title()), id);
        String contentJson = jsonSupport.normalizeJson(request.contentJson());
        String html = jsonSupport.contentHtml(contentJson);
        int updated = updateWithArray("""
                UPDATE "Blogs"
                SET "Slug" = ?, "Title" = ?, "Excerpt" = ?, "ContentJson" = ?::jsonb, "PublicContentHtml" = ?,
                    "SearchTitle" = ?, "SearchText" = ?, "CoverAssetId" = ?, "PublicCoverUrl" = COALESCE((SELECT "PublicUrl" FROM "Assets" WHERE "Id" = ?), ''),
                    "Tags" = ?, "Published" = ?, "PublishedAt" = CASE WHEN ? THEN COALESCE("PublishedAt", now()) ELSE NULL END, "UpdatedAt" = now()
                WHERE "Id" = ?
                """, slug, request.title(), clean(request.excerpt()), contentJson, html,
                search(request.title()), search(clean(request.excerpt()) + " " + html), request.coverAssetId(), request.coverAssetId(),
                textArray(request.tags()),
                request.published(), request.published(), id);
        if (updated == 0) {
            throw new NotFoundException("Blog not found.");
        }
        return Map.of("id", id, "slug", slug);
    }

    @Transactional
    public void deleteBlog(UUID id) {
        if (jdbcTemplate.update("DELETE FROM \"Blogs\" WHERE \"Id\" = ?", id) == 0) {
            throw new NotFoundException("Blog not found.");
        }
    }

    public List<Map<String, Object>> adminWorks() {
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "Category", "Period", "Tags", "PublicThumbnailUrl", "Published", "PublishedAt", "CreatedAt", "UpdatedAt"
                FROM "Works" ORDER BY "CreatedAt" DESC, "UpdatedAt" DESC
                """, this::adminWorkCard);
    }

    public Map<String, Object> adminWork(UUID id) {
        return jdbcTemplate.query("""
                SELECT "Id", "Slug", "Title", "Excerpt", "ContentJson", "Category", "Period", "AllPropertiesJson", "Tags",
                       "ThumbnailAssetId", "IconAssetId", "PublicThumbnailUrl", "PublicIconUrl", "VideosVersion",
                       "Published", "PublishedAt", "CreatedAt", "UpdatedAt"
                FROM "Works" WHERE "Id" = ?
                """, rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Work not found.");
            }
            Map<String, Object> item = adminWorkCard(rs, 0);
            item.put("content", Map.of("html", jsonSupport.contentHtml(rs.getString("ContentJson"))));
            item.put("all_properties", jsonSupport.readTree(rs.getString("AllPropertiesJson")));
            item.put("thumbnail_asset_id", rs.getObject("ThumbnailAssetId", UUID.class));
            item.put("icon_asset_id", rs.getObject("IconAssetId", UUID.class));
            item.put("thumbnail_url", rs.getString("PublicThumbnailUrl"));
            item.put("icon_url", rs.getString("PublicIconUrl"));
            item.put("videos_version", rs.getInt("VideosVersion"));
            item.put("videos", videos(JdbcData.uuid(rs, "Id"), true));
            return item;
        }, id);
    }

    @Transactional
    public Map<String, Object> createWork(WorkMutationRequest request) {
        UUID id = UUID.randomUUID();
        String slug = uniqueSlug("Works", SlugSupport.fromTitle(request.title()), null);
        String contentJson = jsonSupport.normalizeJson(request.contentJson());
        String html = jsonSupport.contentHtml(contentJson);
        String allProperties = jsonSupport.normalizeJson(request.allPropertiesJson() == null ? "{}" : request.allPropertiesJson());
        String fallbackThumbnailUrl = firstContentImageUrl(html);
        updateWithArray("""
                INSERT INTO "Works" ("Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "SearchTitle", "SearchText", "ThumbnailAssetId", "PublicThumbnailUrl", "IconAssetId", "PublicIconUrl", "Category", "Period", "AllPropertiesJson", "PublicSocialShareMessage", "Tags", "Published", "PublishedAt", "CreatedAt", "UpdatedAt")
                VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, COALESCE((SELECT "PublicUrl" FROM "Assets" WHERE "Id" = ?), ?), ?, COALESCE((SELECT "PublicUrl" FROM "Assets" WHERE "Id" = ?), ''), ?, ?, ?::jsonb, ?, ?, ?, CASE WHEN ? THEN now() ELSE NULL END, now(), now())
                """, id, slug, request.title(), clean(request.excerpt()), contentJson, html,
                search(request.title()), search(clean(request.excerpt()) + " " + html), request.thumbnailAssetId(), request.thumbnailAssetId(),
                fallbackThumbnailUrl, request.iconAssetId(), request.iconAssetId(), clean(request.category()), request.period(), allProperties,
                socialShareMessage(allProperties), textArray(request.tags()), request.published(), request.published());
        return Map.of("id", id, "slug", slug);
    }

    @Transactional
    public Map<String, Object> updateWork(UUID id, WorkMutationRequest request) {
        String slug = uniqueSlug("Works", SlugSupport.fromTitle(request.title()), id);
        String contentJson = jsonSupport.normalizeJson(request.contentJson());
        String html = jsonSupport.contentHtml(contentJson);
        String allProperties = jsonSupport.normalizeJson(request.allPropertiesJson() == null ? "{}" : request.allPropertiesJson());
        String fallbackThumbnailUrl = firstContentImageUrl(html);
        int updated = updateWithArray("""
                UPDATE "Works"
                SET "Slug" = ?, "Title" = ?, "Excerpt" = ?, "ContentJson" = ?::jsonb, "PublicContentHtml" = ?,
                    "SearchTitle" = ?, "SearchText" = ?, "ThumbnailAssetId" = ?, "PublicThumbnailUrl" = COALESCE((SELECT "PublicUrl" FROM "Assets" WHERE "Id" = ?), ?),
                    "IconAssetId" = ?, "PublicIconUrl" = COALESCE((SELECT "PublicUrl" FROM "Assets" WHERE "Id" = ?), ''),
                    "Category" = ?, "Period" = ?, "AllPropertiesJson" = ?::jsonb, "PublicSocialShareMessage" = ?,
                    "Tags" = ?, "Published" = ?, "PublishedAt" = CASE WHEN ? THEN COALESCE("PublishedAt", now()) ELSE NULL END, "UpdatedAt" = now()
                WHERE "Id" = ?
                """, slug, request.title(), clean(request.excerpt()), contentJson, html,
                search(request.title()), search(clean(request.excerpt()) + " " + html), request.thumbnailAssetId(), request.thumbnailAssetId(),
                fallbackThumbnailUrl, request.iconAssetId(), request.iconAssetId(), clean(request.category()), request.period(), allProperties,
                socialShareMessage(allProperties), textArray(request.tags()), request.published(), request.published(), id);
        if (updated == 0) {
            throw new NotFoundException("Work not found.");
        }
        return Map.of("id", id, "slug", slug);
    }

    @Transactional
    public void deleteWork(UUID id) {
        if (jdbcTemplate.update("DELETE FROM \"Works\" WHERE \"Id\" = ?", id) == 0) {
            throw new NotFoundException("Work not found.");
        }
    }

    public List<Map<String, Object>> videos(UUID workId, boolean admin) {
        return jdbcTemplate.query("""
                SELECT "Id", "SourceType", "SourceKey", "OriginalFileName", "MimeType", "FileSize", "Width", "Height",
                       "DurationSeconds", "TimelinePreviewVttStorageKey", "TimelinePreviewSpriteStorageKey", "SortOrder", "CreatedAt"
                FROM "WorkVideos" WHERE "WorkId" = ? ORDER BY "SortOrder", "CreatedAt"
                """, (rs, rowNum) -> videoDto(rs, admin), workId);
    }

    public void requireVideoVersion(UUID workId, int expectedVideosVersion) {
        ensureVideoVersion(workId, expectedVideosVersion);
    }

    @Transactional
    public Map<String, Object> addYouTubeVideo(UUID workId, AddYouTubeVideoRequest request) {
        ensureVideoVersion(workId, request.expectedVideosVersion());
        String videoId = youtubeId(request.youtubeUrlOrId());
        Integer duplicates = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM "WorkVideos" WHERE "WorkId" = ? AND lower("SourceType") = 'youtube' AND "SourceKey" = ?
                """, Integer.class, workId, videoId);
        if (duplicates != null && duplicates > 0) {
            throw new ConflictException("This YouTube video is already attached.");
        }
        int sortOrder = nextVideoSortOrder(workId);
        jdbcTemplate.update("""
                INSERT INTO "WorkVideos" ("Id", "WorkId", "SourceType", "SourceKey", "OriginalFileName", "SortOrder", "CreatedAt")
                VALUES (?, ?, 'youtube', ?, 'YouTube video', ?, now())
                """, UUID.randomUUID(), workId, videoId, sortOrder);
        return incrementVideoVersion(workId);
    }

    @Transactional
    public Map<String, Object> reorderVideos(UUID workId, ReorderVideosRequest request) {
        ensureVideoVersion(workId, request.expectedVideosVersion());
        int temporaryOffset = nextVideoSortOrder(workId) + request.orderedVideoIds().size() + 1;
        for (int i = 0; i < request.orderedVideoIds().size(); i += 1) {
            jdbcTemplate.update("UPDATE \"WorkVideos\" SET \"SortOrder\" = ? WHERE \"WorkId\" = ? AND \"Id\" = ?",
                    temporaryOffset + i, workId, request.orderedVideoIds().get(i));
        }
        for (int i = 0; i < request.orderedVideoIds().size(); i += 1) {
            jdbcTemplate.update("UPDATE \"WorkVideos\" SET \"SortOrder\" = ? WHERE \"WorkId\" = ? AND \"Id\" = ?",
                    i, workId, request.orderedVideoIds().get(i));
        }
        return incrementVideoVersion(workId);
    }

    @Transactional
    public Map<String, Object> deleteVideo(UUID workId, UUID videoId, int expectedVideosVersion) {
        ensureVideoVersion(workId, expectedVideosVersion);
        if (jdbcTemplate.update("DELETE FROM \"WorkVideos\" WHERE \"WorkId\" = ? AND \"Id\" = ?", workId, videoId) == 0) {
            throw new NotFoundException("Video not found.");
        }
        resequenceVideos(workId);
        return incrementVideoVersion(workId);
    }

    @Transactional
    public Map<String, Object> attachLocalVideo(UUID workId, String sourceType, String sourceKey, String fileName, String contentType, long size, int expectedVideosVersion) {
        ensureVideoVersion(workId, expectedVideosVersion);
        jdbcTemplate.update("""
                INSERT INTO "WorkVideos" ("Id", "WorkId", "SourceType", "SourceKey", "OriginalFileName", "MimeType", "FileSize", "SortOrder", "CreatedAt")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, now())
                """, UUID.randomUUID(), workId, sourceType, sourceKey, fileName, contentType, size, nextVideoSortOrder(workId));
        return incrementVideoVersion(workId);
    }

    @Transactional
    public Map<String, Object> attachHlsVideo(
            UUID workId,
            String sourceKey,
            String fileName,
            String contentType,
            long size,
            String timelinePreviewVttStorageKey,
            String timelinePreviewSpriteStorageKey,
            int expectedVideosVersion) {
        ensureVideoVersion(workId, expectedVideosVersion);
        jdbcTemplate.update("""
                INSERT INTO "WorkVideos" ("Id", "WorkId", "SourceType", "SourceKey", "OriginalFileName", "MimeType", "FileSize", "TimelinePreviewVttStorageKey", "TimelinePreviewSpriteStorageKey", "SortOrder", "CreatedAt")
                VALUES (?, ?, 'hls', ?, ?, ?, ?, ?, ?, ?, now())
                """, UUID.randomUUID(), workId, sourceKey, fileName, contentType, size,
                timelinePreviewVttStorageKey, timelinePreviewSpriteStorageKey, nextVideoSortOrder(workId));
        return incrementVideoVersion(workId);
    }

    private Map<String, Object> incrementVideoVersion(UUID workId) {
        jdbcTemplate.update("UPDATE \"Works\" SET \"VideosVersion\" = \"VideosVersion\" + 1, \"UpdatedAt\" = now() WHERE \"Id\" = ?", workId);
        Integer version = jdbcTemplate.queryForObject("SELECT \"VideosVersion\" FROM \"Works\" WHERE \"Id\" = ?", Integer.class, workId);
        return Map.of("videos_version", version == null ? 0 : version, "videosVersion", version == null ? 0 : version, "videos", videos(workId, true));
    }

    private void ensureVideoVersion(UUID workId, int expectedVideosVersion) {
        Integer actual;
        try {
            actual = jdbcTemplate.queryForObject("SELECT \"VideosVersion\" FROM \"Works\" WHERE \"Id\" = ?", Integer.class, workId);
        } catch (EmptyResultDataAccessException exception) {
            throw new NotFoundException("Work not found.");
        }
        if (actual == null) {
            throw new NotFoundException("Work not found.");
        }
        if (actual != expectedVideosVersion) {
            throw new ConflictException("Videos changed. Refresh and retry.");
        }
    }

    private int nextVideoSortOrder(UUID workId) {
        Integer max = jdbcTemplate.queryForObject("SELECT COALESCE(MAX(\"SortOrder\"), -1) FROM \"WorkVideos\" WHERE \"WorkId\" = ?", Integer.class, workId);
        return (max == null ? -1 : max) + 1;
    }

    private void resequenceVideos(UUID workId) {
        List<UUID> ids = jdbcTemplate.query("SELECT \"Id\" FROM \"WorkVideos\" WHERE \"WorkId\" = ? ORDER BY \"SortOrder\", \"CreatedAt\"",
                (rs, rowNum) -> JdbcData.uuid(rs, "Id"), workId);
        for (int i = 0; i < ids.size(); i += 1) {
            jdbcTemplate.update("UPDATE \"WorkVideos\" SET \"SortOrder\" = ? WHERE \"Id\" = ?", i, ids.get(i));
        }
    }

    private static String firstContentImageUrl(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        var matcher = FIRST_IMAGE_SRC_PATTERN.matcher(html);
        if (!matcher.find()) {
            return "";
        }
        return matcher.group(2).trim();
    }

    private Map<String, Object> blogCard(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", JdbcData.uuid(rs, "Id"));
        item.put("slug", rs.getString("Slug"));
        item.put("title", rs.getString("Title"));
        item.put("excerpt", rs.getString("Excerpt"));
        item.put("tags", JdbcData.textList(rs, "Tags"));
        String cover = rs.getString("PublicCoverUrl");
        if (cover != null && !cover.isBlank()) {
            item.put("coverUrl", cover);
        }
        item.put("publishedAt", JdbcData.nullableInstant(rs, "PublishedAt"));
        return item;
    }

    private Map<String, Object> workCard(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", JdbcData.uuid(rs, "Id"));
        item.put("slug", rs.getString("Slug"));
        item.put("title", rs.getString("Title"));
        item.put("excerpt", rs.getString("Excerpt"));
        item.put("category", rs.getString("Category"));
        item.put("tags", JdbcData.textList(rs, "Tags"));
        String thumbnail = rs.getString("PublicThumbnailUrl");
        if (thumbnail != null && !thumbnail.isBlank()) {
            item.put("thumbnailUrl", thumbnail);
        }
        item.put("publishedAt", JdbcData.nullableInstant(rs, "PublishedAt"));
        return item;
    }

    private Map<String, Object> adminPage(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", JdbcData.uuid(rs, "Id"));
        item.put("slug", rs.getString("Slug"));
        item.put("title", rs.getString("Title"));
        item.put("content", jsonSupport.readTree(rs.getString("ContentJson")));
        item.put("updatedAt", JdbcData.nullableInstant(rs, "UpdatedAt"));
        return item;
    }

    private Map<String, Object> adminBlogCard(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Map<String, Object> item = blogCard(rs, rowNum);
        item.put("published", rs.getBoolean("Published"));
        item.put("createdAt", JdbcData.nullableInstant(rs, "CreatedAt"));
        item.put("updatedAt", JdbcData.nullableInstant(rs, "UpdatedAt"));
        return item;
    }

    private Map<String, Object> adminWorkCard(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        Map<String, Object> item = workCard(rs, rowNum);
        item.put("period", rs.getString("Period"));
        item.put("published", rs.getBoolean("Published"));
        item.put("createdAt", JdbcData.nullableInstant(rs, "CreatedAt"));
        item.put("updatedAt", JdbcData.nullableInstant(rs, "UpdatedAt"));
        return item;
    }

    private Map<String, Object> videoDto(java.sql.ResultSet rs, boolean admin) throws java.sql.SQLException {
        Map<String, Object> video = new LinkedHashMap<>();
        String sourceType = rs.getString("SourceType");
        String sourceKey = rs.getString("SourceKey");
        video.put("id", JdbcData.uuid(rs, "Id"));
        video.put("sourceType", sourceType);
        video.put("sourceKey", sourceKey);
        video.put("playbackUrl", playbackUrl(sourceType, sourceKey));
        if (admin) {
            video.put("originalFileName", rs.getString("OriginalFileName"));
            video.put("fileSize", nullableLong(rs, "FileSize"));
            video.put("createdAt", JdbcData.nullableInstant(rs, "CreatedAt"));
        }
        video.put("mimeType", rs.getString("MimeType"));
        video.put("width", nullableInt(rs, "Width"));
        video.put("height", nullableInt(rs, "Height"));
        video.put("durationSeconds", nullableDouble(rs, "DurationSeconds"));
        video.put("duration_seconds", nullableDouble(rs, "DurationSeconds"));
        video.put("timelinePreviewVttUrl", mediaUrl(rs.getString("TimelinePreviewVttStorageKey")));
        video.put("timeline_preview_vtt_url", mediaUrl(rs.getString("TimelinePreviewVttStorageKey")));
        video.put("timelinePreviewSpriteUrl", mediaUrl(rs.getString("TimelinePreviewSpriteStorageKey")));
        video.put("timeline_preview_sprite_url", mediaUrl(rs.getString("TimelinePreviewSpriteStorageKey")));
        video.put("sortOrder", rs.getInt("SortOrder"));
        return video;
    }

    private <T> Map<String, Object> context(String table, String slug, int limit, SqlCardMapper mapper) {
        Map<String, Object> current = jdbcTemplate.query("""
                SELECT "PublishedAt" FROM "%s" WHERE "Published" = true AND "Slug" = ?
                """.formatted(table), rs -> {
            if (!rs.next()) {
                throw new NotFoundException("Content not found.");
            }
            Map<String, Object> published = new LinkedHashMap<>();
            published.put("publishedAt", JdbcData.nullableInstant(rs, "PublishedAt"));
            return published;
        }, slug);
        Instant publishedAt = (Instant) current.get("publishedAt");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("newer", adjacent(table, slug, publishedAt, true, mapper));
        result.put("older", adjacent(table, slug, publishedAt, false, mapper));
        result.put("related", related(table, slug, limit, mapper));
        return result;
    }

    private Map<String, Object> adjacent(String table, String slug, Instant publishedAt, boolean newer, SqlCardMapper mapper) {
        String operator = newer ? ">" : "<";
        String direction = newer ? "ASC" : "DESC";
        String columns = table.equals("Blogs")
                ? "\"Id\", \"Slug\", \"Title\", \"Excerpt\", \"Tags\", \"PublicCoverUrl\", \"PublishedAt\""
                : "\"Id\", \"Slug\", \"Title\", \"Excerpt\", \"Category\", \"Tags\", \"PublicThumbnailUrl\", \"PublishedAt\"";
        if (publishedAt == null) {
            return null;
        }
        List<Map<String, Object>> rows = jdbcTemplate.query("""
                SELECT %s FROM "%s"
                WHERE "Published" = true AND "Slug" <> ? AND "PublishedAt" %s ?
                ORDER BY "PublishedAt" %s NULLS LAST LIMIT 1
                """.formatted(columns, table, operator, direction), mapper::map, slug, Timestamp.from(publishedAt));
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private List<Map<String, Object>> related(String table, String slug, int limit, SqlCardMapper mapper) {
        String columns = table.equals("Blogs")
                ? "\"Id\", \"Slug\", \"Title\", \"Excerpt\", \"Tags\", \"PublicCoverUrl\", \"PublishedAt\""
                : "\"Id\", \"Slug\", \"Title\", \"Excerpt\", \"Category\", \"Tags\", \"PublicThumbnailUrl\", \"PublishedAt\"";
        return jdbcTemplate.query("""
                SELECT %s FROM "%s"
                WHERE "Published" = true AND "Slug" <> ?
                ORDER BY "PublishedAt" DESC NULLS LAST LIMIT ?
                """.formatted(columns, table), mapper::map, slug, limit);
    }

    private QueryParts publicSearch(String table, String query, String searchMode) {
        String base = "SELECT COUNT(*) FROM \"" + table + "\" WHERE \"Published\" = true ";
        if (query == null || query.isBlank()) {
            return new QueryParts("", base, List.of());
        }
        String pattern = "%" + query.trim().toLowerCase() + "%";
        if ("title".equalsIgnoreCase(searchMode)) {
            return new QueryParts(" AND lower(\"Title\") LIKE ? ", base + " AND lower(\"Title\") LIKE ? ", List.of(pattern));
        }
        return new QueryParts(" AND (lower(\"Title\") LIKE ? OR lower(\"Excerpt\") LIKE ? OR lower(\"ContentJson\"::text) LIKE ?) ",
                base + " AND (lower(\"Title\") LIKE ? OR lower(\"Excerpt\") LIKE ? OR lower(\"ContentJson\"::text) LIKE ?) ",
                List.of(pattern, pattern, pattern));
    }

    private long count(String sql, List<Object> params) {
        Long total = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return total == null ? 0 : total;
    }

    private PageArgs pageArgs(int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, Math.min(pageSize, 100));
        return new PageArgs(safePage, safePageSize, safePageSize, (safePage - 1) * safePageSize);
    }

    private void ensureExists(String table, String slug) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"" + table + "\" WHERE \"Published\" = true AND \"Slug\" = ?", Integer.class, slug);
        if (count == null || count == 0) {
            throw new NotFoundException("Content not found.");
        }
    }

    private String uniqueSlug(String table, String baseSlug, UUID currentId) {
        String slug = baseSlug;
        int suffix = 2;
        while (slugExists(table, slug, currentId)) {
            slug = baseSlug + "-" + suffix;
            suffix += 1;
        }
        return slug;
    }

    private boolean slugExists(String table, String slug, UUID currentId) {
        if (currentId == null) {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"" + table + "\" WHERE \"Slug\" = ?", Integer.class, slug);
            return count != null && count > 0;
        }
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"" + table + "\" WHERE \"Slug\" = ? AND \"Id\" <> ?", Integer.class, slug, currentId);
        return count != null && count > 0;
    }

    private int updateWithArray(String sql, Object... values) {
        return jdbcTemplate.execute((Connection connection) -> {
            PreparedStatement statement = connection.prepareStatement(sql);
            int index = 1;
            for (Object value : values) {
                if (value instanceof TextArray textArray) {
                    statement.setArray(index, connection.createArrayOf("text", textArray.values().toArray(String[]::new)));
                } else {
                    statement.setObject(index, value);
                }
                index += 1;
            }
            boolean hasResultSet = statement.execute();
            if (hasResultSet) {
                return 0;
            }
            return statement.getUpdateCount();
        });
    }

    private static TextArray textArray(List<String> values) {
        return new TextArray(values == null ? List.of() : values);
    }

    private String socialShareMessage(String allPropertiesJson) {
        JsonNode node = jsonSupport.readTree(allPropertiesJson);
        return node.hasNonNull("socialShareMessage") ? node.get("socialShareMessage").asText() : "";
    }

    private static String search(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("[\\p{Punct}\\s]+", "");
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private static String youtubeId(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Invalid YouTube URL.");
        }
        String trimmed = value.trim();
        int shortIndex = trimmed.indexOf("youtu.be/");
        if (shortIndex >= 0) {
            return trimmed.substring(shortIndex + 9).split("[?&#/]")[0];
        }
        int vIndex = trimmed.indexOf("v=");
        if (vIndex >= 0) {
            return trimmed.substring(vIndex + 2).split("[?&#]")[0];
        }
        if (trimmed.matches("[A-Za-z0-9_-]{6,}")) {
            return trimmed;
        }
        throw new BadRequestException("Invalid YouTube URL.");
    }

    private static String playbackUrl(String sourceType, String sourceKey) {
        if (sourceKey == null) {
            return null;
        }
        if (sourceKey.startsWith("http://") || sourceKey.startsWith("https://")) {
            return sourceKey;
        }
        if (sourceKey.startsWith("local:")) {
            return "/media/" + sourceKey.substring("local:".length());
        }
        if (sourceKey.startsWith("r2:")) {
            return "/media/" + sourceKey.substring("r2:".length());
        }
        if ("local".equalsIgnoreCase(sourceType) || "hls".equalsIgnoreCase(sourceType)) {
            return "/media/" + sourceKey;
        }
        return null;
    }

    private static String mediaUrl(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return null;
        }
        if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
            return storageKey;
        }
        return "/media/" + storageKey.replaceFirst("^(local:|r2:)", "");
    }

    private static Integer nullableInt(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private static Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static Double nullableDouble(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        double value = rs.getDouble(column);
        return rs.wasNull() ? null : value;
    }

    private record QueryParts(String whereSuffix, String countSql, List<Object> params) {
    }

    private record PageArgs(int page, int pageSize, int limit, int offset) {
    }

    private record TextArray(List<String> values) {
    }

    @FunctionalInterface
    private interface SqlCardMapper {
        Map<String, Object> map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException;
    }

    public record UpdatePageRequest(UUID id, String title, String contentJson) {
    }

    public record UpdateSiteSettingsRequest(
            String ownerName,
            String tagline,
            String facebookUrl,
            String instagramUrl,
            String twitterUrl,
            String linkedInUrl,
            String gitHubUrl,
            boolean hasResumeAssetId,
            UUID resumeAssetId) {
    }

    public record BlogMutationRequest(
            String title,
            String excerpt,
            List<String> tags,
            boolean published,
            String contentJson,
            UUID coverAssetId) {
    }

    public record WorkMutationRequest(
            String title,
            String excerpt,
            String category,
            String period,
            List<String> tags,
            boolean published,
            String contentJson,
            String allPropertiesJson,
            UUID thumbnailAssetId,
            UUID iconAssetId) {
    }

    public record AddYouTubeVideoRequest(String youtubeUrlOrId, int expectedVideosVersion) {
    }

    public record ReorderVideosRequest(List<UUID> orderedVideoIds, int expectedVideosVersion) {
    }
}
