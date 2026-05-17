package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class PublicContentDeepIntegrationTests extends IntegrationTestSupport {
    @Test
    void blogSearchClampsPageAndPageSizeAgainstPostgres() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/blogs")
                        .param("page", "0")
                        .param("pageSize", "500")
                        .param("query", "seeded")
                        .param("searchMode", "title"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(100))
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("totalItems").asInt()).isGreaterThan(0);
        assertThat(json.get("items").size()).isGreaterThan(0);
    }

    @Test
    void workSearchByContentUsesSeededSearchTextAndPaginationMetadata() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/works")
                        .param("page", "1")
                        .param("pageSize", "5")
                        .param("query", "supplemental seeded")
                        .param("searchMode", "content"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(5))
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("totalItems").asInt()).isGreaterThan(0);
        assertThat(json.get("totalPages").asInt()).isGreaterThan(0);
        assertThat(json.get("items").get(0).get("title").asText()).contains("Seeded Work Extra");
    }

    @Test
    void missingPublicContentReturnsNotFoundPayloads() throws Exception {
        mockMvc.perform(get("/api/public/pages/not-a-real-page"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Page not found."));

        mockMvc.perform(get("/api/public/blogs/not-a-real-blog"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Blog not found."));

        mockMvc.perform(get("/api/public/works/not-a-real-work"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Work not found."));
    }

    @Test
    void resumeEndpointReturnsSeededPdfAssetContract() throws Exception {
        mockMvc.perform(get("/api/public/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicUrl").value("/media/resume/woonggon-kim-resume.pdf"))
                .andExpect(jsonPath("$.fileName").value("woonggon-kim-resume.pdf"))
                .andExpect(jsonPath("$.path").value("resume/woonggon-kim-resume.pdf"));
    }

    @Test
    void publicBlogDetailIncludesRenderableContentWithoutAdminFlags() throws Exception {
        mockMvc.perform(get("/api/public/blogs/seeded-blog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(SEEDED_BLOG_ID.toString()))
                .andExpect(jsonPath("$.content.html").exists())
                .andExpect(jsonPath("$.contentJson").exists())
                .andExpect(jsonPath("$.published").doesNotExist())
                .andExpect(jsonPath("$.createdAt").doesNotExist())
                .andExpect(jsonPath("$.updatedAt").doesNotExist());
    }

    @Test
    void publicWorkDetailIncludesPlayableVideosWithoutAdminOnlyVideoFields() throws Exception {
        mockMvc.perform(get("/api/public/works/seeded-work"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(SEEDED_WORK_ID.toString()))
                .andExpect(jsonPath("$.videosVersion").isNumber())
                .andExpect(jsonPath("$.videos[0].sourceType").value("youtube"))
                .andExpect(jsonPath("$.videos[0].sourceKey").exists())
                .andExpect(jsonPath("$.videos[0].originalFileName").doesNotExist())
                .andExpect(jsonPath("$.videos[0].createdAt").doesNotExist());
    }

    @Test
    void publicContextEndpointsClampOversizedRelatedLimits() throws Exception {
        MvcResult blogResult = mockMvc.perform(get("/api/public/blogs/seeded-blog/context")
                        .param("limit", "500"))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult workResult = mockMvc.perform(get("/api/public/works/seeded-work/context")
                        .param("limit", "500"))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(body(blogResult).get("related").size()).isLessThanOrEqualTo(24);
        assertThat(body(workResult).get("related").size()).isLessThanOrEqualTo(24);
    }

    @Test
    void unpublishedContentCreatedThroughAdminStaysOutOfPublicApi() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Hidden Draft " + UUID.randomUUID();
        JsonNode created = createBlog(authCookie, csrf, title, false);

        mockMvc.perform(get("/api/public/blogs/{slug}", created.get("slug").asText()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Blog not found."));

        mockMvc.perform(get("/api/admin/blogs/{id}", created.get("id").asText()).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(false));
    }
}
