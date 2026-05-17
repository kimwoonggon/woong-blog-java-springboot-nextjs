package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class ApiParityIntegrationTests {
    private static final UUID SEEDED_WORK_ID = UUID.fromString("80000000-0000-0000-0000-000000000001");
    private static final UUID SEEDED_BLOG_ID = UUID.fromString("70000000-0000-0000-0000-000000000001");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void healthAndPublicReadEndpointsMatchFrontendContract() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("portfolio-api"));

        mockMvc.perform(get("/"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/api/health"));

        mockMvc.perform(get("/api/public/site-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerName").value("Woonggon Kim"))
                .andExpect(jsonPath("$.linkedInUrl").exists())
                .andExpect(jsonPath("$.gitHubUrl").exists());

        mockMvc.perform(get("/api/public/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.homePage.contentJson").exists())
                .andExpect(jsonPath("$.featuredWorks").isArray())
                .andExpect(jsonPath("$.recentPosts").isArray());

        mockMvc.perform(get("/api/public/pages/introduction"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("introduction"))
                .andExpect(jsonPath("$.contentJson").exists());

        mockMvc.perform(get("/api/public/blogs?page=1&pageSize=3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalItems").isNumber());

        mockMvc.perform(get("/api/public/works/seeded-work"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("seeded-work"))
                .andExpect(jsonPath("$.videosVersion").isNumber())
                .andExpect(jsonPath("$.videos").isArray());
    }

    @Test
    void publicDetailContextEndpointsReturnAdjacentAndRelatedContent() throws Exception {
        mockMvc.perform(get("/api/public/blogs/seeded-blog/context").param("limit", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newer.slug").exists())
                .andExpect(jsonPath("$.older.slug").exists())
                .andExpect(jsonPath("$.related").isArray())
                .andExpect(jsonPath("$.related[0].slug").exists());

        mockMvc.perform(get("/api/public/works/seeded-work/context").param("limit", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newer.slug").exists())
                .andExpect(jsonPath("$.older.slug").exists())
                .andExpect(jsonPath("$.related").isArray())
                .andExpect(jsonPath("$.related[0].slug").exists());
    }

    @Test
    void adminMutationRequiresCookieAndCsrfThenSucceeds() throws Exception {
        mockMvc.perform(put("/api/admin/site-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tagline":"blocked"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid or missing CSRF token."));

        Cookie authCookie = testLoginCookie();

        mockMvc.perform(get("/api/admin/members").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].email").exists())
                .andExpect(jsonPath("$[0].activeSessionCount").isNumber());

        mockMvc.perform(put("/api/admin/site-settings")
                        .cookie(authCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tagline":"missing csrf"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid or missing CSRF token."));

        CsrfContext csrf = csrfContext(authCookie);
        mockMvc.perform(put("/api/admin/site-settings")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tagline":"Spring Boot parity"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/admin/site-settings").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tagline").value("Spring Boot parity"));
    }

    @Test
    void adminMutationAllowsDockerDevFrontendOriginOnLoopbackIp() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(put("/api/admin/site-settings")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header("Origin", "http://127.0.0.1:13000")
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"tagline":"Loopback dev origin parity"}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void siteSettingsUpdateAcceptsFrontendGithubKeyAndClearsBlankSocialUrls() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(put("/api/admin/site-settings")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instagramUrl":"https://instagram.com/footer-qa","linkedInUrl":"https://linkedin.com/in/footer-qa","twitterUrl":"","githubUrl":""}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/public/site-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.instagramUrl").value("https://instagram.com/footer-qa"))
                .andExpect(jsonPath("$.linkedInUrl").value("https://linkedin.com/in/footer-qa"))
                .andExpect(jsonPath("$.twitterUrl").value(""))
                .andExpect(jsonPath("$.gitHubUrl").value(""));
    }

    @Test
    void testLoginRejectsNonAdminEmailWithoutSessionCookie() throws Exception {
        mockMvc.perform(get("/api/auth/test-login")
                        .param("email", "user@example.com")
                        .param("returnUrl", "/admin/dashboard"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/login?error=admin_only"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void adminBlogDetailIncludesCoverUrlAndContentWithoutRuntimeMapperFailure() throws Exception {
        Cookie authCookie = testLoginCookie();

        mockMvc.perform(get("/api/admin/blogs/{id}", SEEDED_BLOG_ID).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(SEEDED_BLOG_ID.toString()))
                .andExpect(jsonPath("$.slug").value("seeded-blog"))
                .andExpect(jsonPath("$.coverUrl").value("/media/blogs/seeded-blog-cover.png"))
                .andExpect(jsonPath("$.content.html").exists());
    }

    @Test
    void adminWorkDetailIncludesCreatedAtAssetsAndContentWithoutRuntimeMapperFailure() throws Exception {
        Cookie authCookie = testLoginCookie();

        mockMvc.perform(get("/api/admin/works/{id}", SEEDED_WORK_ID).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(SEEDED_WORK_ID.toString()))
                .andExpect(jsonPath("$.slug").value("seeded-work"))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.thumbnailUrl").value("/media/works/seeded-work-thumb.png"))
                .andExpect(jsonPath("$.thumbnail_url").value("/media/works/seeded-work-thumb.png"))
                .andExpect(jsonPath("$.icon_url").value("/media/works/seeded-work-icon.png"))
                .andExpect(jsonPath("$.content.html").exists())
                .andExpect(jsonPath("$.videos_version").isNumber())
                .andExpect(jsonPath("$.videos").isArray());
    }

    @Test
    void adminPagesReturnRawHomeContentAndRejectOverlongTitles() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        MvcResult pagesResult = mockMvc.perform(get("/api/admin/pages")
                        .param("slugs", "home", "introduction")
                        .cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").exists())
                .andReturn();
        JsonNode pages = objectMapper.readTree(pagesResult.getResponse().getContentAsString());
        JsonNode homePage = adminPageBySlug(pages, "home");
        JsonNode introductionPage = adminPageBySlug(pages, "introduction");

        mockMvc.perform(put("/api/admin/pages")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "id", introductionPage.get("id").asText(),
                                "title", "T".repeat(201),
                                "contentJson", "{\"html\":\"<p>too long title</p>\"}"))))
                .andExpect(status().isBadRequest());

        String headline = "Raw home content " + UUID.randomUUID();
        String intro = "Home intro " + UUID.randomUUID();
        mockMvc.perform(put("/api/admin/pages")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "id", homePage.get("id").asText(),
                                "title", "Home",
                                "contentJson", objectMapper.writeValueAsString(Map.of(
                                        "headline", headline,
                                        "introText", intro))))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/pages")
                        .param("slugs", "home")
                        .cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content.headline").value(headline))
                .andExpect(jsonPath("$[0].content.introText").value(intro));
    }

    @Test
    void adminListsKeepEditedRowsOnCurrentFilteredPageByStableCreationOrder() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String blogPrefix = "Stable Blog Page " + UUID.randomUUID();
        String workPrefix = "Stable Work Page " + UUID.randomUUID();

        for (int index = 0; index < 14; index += 1) {
            String suffix = String.format("%02d", index + 1);
            createBlog(authCookie, csrf, blogPrefix + " " + suffix);
            createWork(authCookie, csrf, workPrefix + " " + suffix, "<p>" + workPrefix + " " + suffix + "</p>");
        }

        List<String> blogTitlesBefore = adminTitles("/api/admin/blogs", "title", blogPrefix, authCookie);
        assertThat(blogTitlesBefore).hasSize(14);
        String blogTarget = blogTitlesBefore.get(12);
        String blogUpdated = blogTarget + " updated";
        updateBlog(authCookie, csrf, blogTarget, blogUpdated);
        List<String> blogTitlesAfter = adminTitles("/api/admin/blogs", "title", blogPrefix, authCookie);
        assertThat(blogTitlesAfter).hasSize(14);
        assertThat(blogTitlesAfter.get(12)).isEqualTo(blogUpdated);

        List<String> workTitlesBefore = adminTitles("/api/admin/works", "title", workPrefix, authCookie);
        assertThat(workTitlesBefore).hasSize(14);
        String workTarget = workTitlesBefore.get(12);
        String workUpdated = workTarget + " updated";
        updateWork(authCookie, csrf, workTarget, workUpdated);
        List<String> workTitlesAfter = adminTitles("/api/admin/works", "title", workPrefix, authCookie);
        assertThat(workTitlesAfter).hasSize(14);
        assertThat(workTitlesAfter.get(12)).isEqualTo(workUpdated);
    }

    @Test
    void workVideoOptimisticVersionAndYoutubeFlowMatchContract() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/works/{id}/videos/youtube", SEEDED_WORK_ID)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"youtubeUrlOrId":"https://youtu.be/abc123xyz99","expectedVideosVersion":0}
                                """))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/admin/works/{id}/videos/youtube", SEEDED_WORK_ID)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"youtubeUrlOrId":"https://youtu.be/abc123xyz99","expectedVideosVersion":1}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos_version").value(2))
                .andExpect(jsonPath("$.videos").isArray());
    }

    @Test
    void workCreatePersistsFirstContentImageAsPublicThumbnailFallback() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Content Image Thumbnail " + UUID.randomUUID();
        String imageUrl = "/media/uploads/content-fallback.png";

        createWork(authCookie, csrf, title, "<p>Photo fallback body.</p><img src=\"" + imageUrl + "\" alt=\"fallback\" />");

        mockMvc.perform(get("/api/public/works")
                        .param("page", "1")
                        .param("pageSize", "10")
                        .param("query", title)
                        .param("searchMode", "title"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title").value(title))
                .andExpect(jsonPath("$.items[0].thumbnailUrl").value(imageUrl));
    }

    @Test
    void workVideoReorderSwapsRowsWithoutSortOrderUniqueConflict() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Reorder Videos " + UUID.randomUUID();
        JsonNode created = createWork(authCookie, csrf, title, "<p>Video reorder body.</p>");
        String workId = created.get("id").asText();

        mockMvc.perform(post("/api/admin/works/{id}/videos/youtube", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "youtubeUrlOrId", "https://youtu.be/dQw4w9WgXcQ",
                                "expectedVideosVersion", 0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos_version").value(1));

        MvcResult secondAdd = mockMvc.perform(post("/api/admin/works/{id}/videos/youtube", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "youtubeUrlOrId", "https://youtu.be/9bZkp7q19f0",
                                "expectedVideosVersion", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos_version").value(2))
                .andReturn();
        JsonNode videos = objectMapper.readTree(secondAdd.getResponse().getContentAsString()).get("videos");

        mockMvc.perform(put("/api/admin/works/{id}/videos/order", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "orderedVideoIds", List.of(videos.get(1).get("id").asText(), videos.get(0).get("id").asText()),
                                "expectedVideosVersion", 2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos_version").value(3))
                .andExpect(jsonPath("$.videos[0].sourceKey").value("9bZkp7q19f0"))
                .andExpect(jsonPath("$.videos[1].sourceKey").value("dQw4w9WgXcQ"));
    }

    @Test
    void aiFixAndBatchValidationMatchLegacyContract() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/ai/blog-fix")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"html":"   "}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("HTML content is required."));

        mockMvc.perform(post("/api/admin/ai/work-enrich")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"html":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("HTML content is required."));

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"blogIds":[],"all":false,"apply":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Either blogIds or all=true is required."));

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"blogIds":[],"all":true,"apply":false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results[0].blogId").exists())
                .andExpect(jsonPath("$.results[0].title").exists())
                .andExpect(jsonPath("$.results[0].status").value("fixed"))
                .andExpect(jsonPath("$.results[0].fixedHtml").exists())
                .andExpect(jsonPath("$.applied").value(false));

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"blogIds":[],"all":false,"autoApply":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Either blogIds or all=true is required."));
    }

    @Test
    void aiBatchJobLifecycleCoversSelectedApplyAndManagementContract() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode blog = createBlog(authCookie, csrf, "AI lifecycle " + UUID.randomUUID());
        String blogId = blog.get("id").asText();
        Map<String, Object> jobPayload = new LinkedHashMap<>();
        jobPayload.put("blogIds", List.of(blogId));
        jobPayload.put("all", false);
        jobPayload.put("autoApply", false);
        jobPayload.put("selectionMode", "selected");
        jobPayload.put("selectionLabel", "One selected blog");
        jobPayload.put("selectionKey", "manual");
        jobPayload.put("workerCount", 2);
        jobPayload.put("provider", "openai");
        jobPayload.put("codexModel", "gpt-5.5");
        jobPayload.put("codexReasoningEffort", "xhigh");
        jobPayload.put("customPrompt", "Improve one blog");

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "blogIds", List.of(blogId),
                                "all", false,
                                "apply", true,
                                "provider", "codex",
                                "codexModel", "gpt-5.4",
                                "codexReasoningEffort", "high"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied").value(true))
                .andExpect(jsonPath("$.results[0].blogId").value(blogId))
                .andExpect(jsonPath("$.results[0].provider").value("codex"))
                .andExpect(jsonPath("$.results[0].model").value("gpt-5.4"))
                .andExpect(jsonPath("$.results[0].reasoningEffort").value("high"));

        MvcResult createJobResult = mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jobPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.selectionLabel").value("One selected blog"))
                .andExpect(jsonPath("$.workerCount").value(2))
                .andExpect(jsonPath("$.provider").value("openai"))
                .andExpect(jsonPath("$.model").value("gpt-5.5"))
                .andExpect(jsonPath("$.reasoningEffort").value("xhigh"))
                .andReturn();
        String jobId = objectMapper.readTree(createJobResult.getResponse().getContentAsString())
                .get("jobId").asText();

        mockMvc.perform(get("/api/admin/ai/blog-fix-batch-jobs")
                        .cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobs").isArray())
                .andExpect(jsonPath("$.completedCount").isNumber())
                .andExpect(jsonPath("$.queuedCount").isNumber());

        MvcResult getResult = mockMvc.perform(get("/api/admin/ai/blog-fix-batch-jobs/{jobId}", jobId)
                        .cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(jobId))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].jobItemId").exists())
                .andExpect(jsonPath("$.items[0].blogId").value(blogId))
                .andReturn();
        String jobItemId = objectMapper.readTree(getResult.getResponse().getContentAsString())
                .get("items").get(0).get("jobItemId").asText();

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs/{jobId}/apply", jobId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("jobItemIds", List.of(jobItemId)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied").value(1));

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs/{jobId}/cancel", jobId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"))
                .andExpect(jsonPath("$.cancelRequested").value(true));

        UUID queuedJobId = insertQueuedAiBatchJob();
        MvcResult cancelQueuedResult = mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs/cancel-queued")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelled").isNumber())
                .andReturn();
        assertThat(objectMapper.readTree(cancelQueuedResult.getResponse().getContentAsString())
                .get("cancelled").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT \"Status\" FROM \"AiBatchJobs\" WHERE \"Id\" = ?",
                String.class,
                queuedJobId))
                .isEqualTo("cancelled");

        mockMvc.perform(delete("/api/admin/ai/blog-fix-batch-jobs/{jobId}", queuedJobId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.removed").value(true))
                .andExpect(jsonPath("$.jobId").value(queuedJobId.toString()));

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs/clear-completed")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cleared").isNumber());

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs/{jobId}/cancel", UUID.randomUUID())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("AI batch job not found."));

        mockMvc.perform(post("/api/admin/ai/blog-fix-batch-jobs")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "blogIds", List.of(UUID.randomUUID().toString()),
                                "all", false,
                                "autoApply", false))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("No matching blogs were found."));
    }

    private Cookie testLoginCookie() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/test-login")
                        .param("email", "admin@example.com")
                        .param("returnUrl", "/admin"))
                .andExpect(status().isFound())
                .andReturn();
        String setCookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).contains("portfolio_auth=");
        String value = setCookie.substring("portfolio_auth=".length(), setCookie.indexOf(';'));
        return new Cookie("portfolio_auth", value);
    }

    private CsrfContext csrfContext(Cookie authCookie) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf").cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        return new CsrfContext(json.get("headerName").asText(), json.get("requestToken").asText(), session);
    }

    private JsonNode createWork(Cookie authCookie, CsrfContext csrf, String title, String html) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "");
        payload.put("category", "video");
        payload.put("period", "");
        payload.put("tags", List.of());
        payload.put("published", true);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", html)));
        payload.put("allPropertiesJson", "{}");
        payload.put("thumbnailAssetId", null);
        payload.put("iconAssetId", null);

        MvcResult result = mockMvc.perform(post("/api/admin/works")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode createBlog(Cookie authCookie, CsrfContext csrf, String title) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "excerpt");
        payload.put("tags", List.of());
        payload.put("published", true);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + title + "</p>")));
        payload.put("coverAssetId", null);

        MvcResult result = mockMvc.perform(post("/api/admin/blogs")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private UUID insertQueuedAiBatchJob() {
        UUID jobId = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO "AiBatchJobs" ("Id", "TargetType", "Status", "SelectionMode", "SelectionLabel", "SelectionKey", "All", "AutoApply", "WorkerCount",
                                           "CancelRequested", "TotalCount", "ProcessedCount", "SucceededCount", "FailedCount", "Provider", "Model",
                                           "ReasoningEffort", "PromptMode", "CustomPrompt", "CreatedAt", "UpdatedAt")
                VALUES (?, 'blog', 'queued', 'selected', 'Queued test', 'queued', false, false, 1,
                        false, 1, 0, 0, 0, 'fake', 'gpt-5.4-mini', 'medium', 'custom-or-default', null, now(), now())
                """, jobId);
        return jobId;
    }

    private void updateBlog(Cookie authCookie, CsrfContext csrf, String currentTitle, String updatedTitle) throws Exception {
        String id = adminIdByTitle("/api/admin/blogs", currentTitle, authCookie);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", updatedTitle);
        payload.put("excerpt", "excerpt");
        payload.put("tags", List.of());
        payload.put("published", true);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + updatedTitle + "</p>")));
        payload.put("coverAssetId", null);

        mockMvc.perform(put("/api/admin/blogs/{id}", id)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());
    }

    private void updateWork(Cookie authCookie, CsrfContext csrf, String currentTitle, String updatedTitle) throws Exception {
        String id = adminIdByTitle("/api/admin/works", currentTitle, authCookie);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", updatedTitle);
        payload.put("excerpt", "");
        payload.put("category", "pagination");
        payload.put("period", "");
        payload.put("tags", List.of());
        payload.put("published", true);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + updatedTitle + "</p>")));
        payload.put("allPropertiesJson", "{}");
        payload.put("thumbnailAssetId", null);
        payload.put("iconAssetId", null);

        mockMvc.perform(put("/api/admin/works/{id}", id)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());
    }

    private String adminIdByTitle(String path, String title, Cookie authCookie) throws Exception {
        JsonNode items = adminItems(path, authCookie);
        for (JsonNode item : items) {
            if (title.equals(item.get("title").asText())) {
                return item.get("id").asText();
            }
        }
        throw new AssertionError("Could not find admin item titled " + title);
    }

    private List<String> adminTitles(String path, String titleField, String prefix, Cookie authCookie) throws Exception {
        JsonNode items = adminItems(path, authCookie);
        List<String> titles = new ArrayList<>();
        for (JsonNode item : items) {
            String title = item.get(titleField).asText();
            if (title.startsWith(prefix)) {
                titles.add(title);
            }
        }
        return titles;
    }

    private JsonNode adminItems(String path, Cookie authCookie) throws Exception {
        MvcResult result = mockMvc.perform(get(path).cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode adminPageBySlug(JsonNode pages, String slug) {
        for (JsonNode page : pages) {
            if (slug.equals(page.get("slug").asText())) {
                return page;
            }
        }
        throw new AssertionError("Could not find admin page with slug " + slug);
    }

    private record CsrfContext(String headerName, String token, MockHttpSession session) {
    }
}
