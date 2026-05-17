package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class PublicEndpointParityIntegrationTests extends IntegrationTestSupport {
    @Test
    void getApiHealthReturnsOkPayload() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("portfolio-api"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void rootRedirectsToHealthEndpoint() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/api/health"));
    }

    @Test
    void getPublicSiteSettingsReturnsAnonymousDtoShape() throws Exception {
        mockMvc.perform(get("/api/public/site-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerName").value("Woonggon Kim"))
                .andExpect(jsonPath("$.gitHubUrl").exists())
                .andExpect(jsonPath("$.adminEmail").doesNotExist());
    }

    @Test
    void getPublicHomeReturnsFeaturedCollectionsAndPublicShell() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.homePage").exists())
                .andExpect(jsonPath("$.siteSettings").exists())
                .andExpect(jsonPath("$.featuredWorks").isArray())
                .andExpect(jsonPath("$.recentPosts").isArray())
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("featuredWorks").size()).isLessThanOrEqualTo(6);
        assertThat(json.get("recentPosts").size()).isLessThanOrEqualTo(6);
    }

    @Test
    void getPageBySlugReturnsSerializedPageForAnonymousClient() throws Exception {
        mockMvc.perform(get("/api/public/pages/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").exists())
                .andExpect(jsonPath("$.contentJson").exists());
    }

    @Test
    void getPublicWorksReturnsPagedPayloadShapeAndFiltersByTitle() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/works")
                        .param("page", "1")
                        .param("pageSize", "3")
                        .param("query", "Seeded Work")
                        .param("searchMode", "title"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(3))
                .andExpect(jsonPath("$.items").isArray())
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("totalItems").asInt()).isGreaterThan(0);
        assertThat(json.get("items").get(0).get("title").asText()).contains("Seeded Work");
    }

    @Test
    void getPublicWorksQueryOnlyUsesUnifiedSearch() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/works")
                        .param("query", "supplemental seeded")
                        .param("pageSize", "5"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("totalItems").asInt()).isGreaterThan(0);
    }

    @Test
    void getPublicBlogsReturnsPagedPayloadShapeAndFiltersByTitle() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/blogs")
                        .param("page", "1")
                        .param("pageSize", "3")
                        .param("query", "seeded")
                        .param("searchMode", "title"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(3))
                .andExpect(jsonPath("$.items").isArray())
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("totalItems").asInt()).isGreaterThan(0);
        assertThat(json.get("items").get(0).get("title").asText()).containsIgnoringCase("seeded");
    }

    @Test
    void getPublicBlogsQueryOnlyUsesUnifiedSearch() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/blogs")
                        .param("query", "supplemental seeded")
                        .param("pageSize", "5"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("totalItems").asInt()).isGreaterThan(0);
    }

    @Test
    void getPublicBlogDetailOmitsAdminFields() throws Exception {
        mockMvc.perform(get("/api/public/blogs/seeded-blog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").exists())
                .andExpect(jsonPath("$.contentJson").exists())
                .andExpect(jsonPath("$.published").doesNotExist())
                .andExpect(jsonPath("$.updatedAt").doesNotExist());
    }

    @Test
    void getPublicDetailContextReturnsBoundedRelatedItemsAndMissingSlugNotFound() throws Exception {
        mockMvc.perform(get("/api/public/blogs/seeded-blog/context")
                        .param("limit", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.related").isArray());

        mockMvc.perform(get("/api/public/blogs/missing-blog/context"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Content not found."));
    }

    @Test
    void getPublicResumeReturnsSeededResumeUrl() throws Exception {
        mockMvc.perform(get("/api/public/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicUrl").value("/media/resume/woonggon-kim-resume.pdf"));
    }
}
