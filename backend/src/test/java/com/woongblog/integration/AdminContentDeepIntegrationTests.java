package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class AdminContentDeepIntegrationTests extends IntegrationTestSupport {
    @Test
    void adminDashboardCountsSeededAndCreatedRowsFromPostgres() throws Exception {
        Cookie authCookie = testLoginCookie();

        MvcResult result = mockMvc.perform(get("/api/admin/dashboard").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.worksCount").isNumber())
                .andExpect(jsonPath("$.blogsCount").isNumber())
                .andReturn();

        JsonNode json = body(result);
        assertThat(json.get("worksCount").asInt()).isGreaterThanOrEqualTo(20);
        assertThat(json.get("blogsCount").asInt()).isGreaterThanOrEqualTo(20);
    }

    @Test
    void adminReadEndpointsRejectAnonymousRequests() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/blogs"))
                .andExpect(status().isForbidden());
    }

    @Test
    void blogCreateUpdateDeleteRoundTripsAcrossAdminAndPublicEndpoints() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Integration Blog " + UUID.randomUUID();
        JsonNode created = createBlog(authCookie, csrf, title);
        String id = created.get("id").asText();
        String slug = created.get("slug").asText();

        mockMvc.perform(get("/api/admin/blogs/{id}", id).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.content.html").exists());

        String updatedTitle = title + " Updated";
        updateBlog(authCookie, csrf, id, updatedTitle, true);

        mockMvc.perform(get("/api/public/blogs/{slug}", slug + "-updated"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(updatedTitle));

        mockMvc.perform(delete("/api/admin/blogs/{id}", id)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/blogs/{id}", id).cookie(authCookie))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Blog not found."));
    }

    @Test
    void blogCreateValidationRejectsBlankTitleBeforePersistence() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", " ");
        payload.put("excerpt", "invalid");
        payload.put("tags", List.of());
        payload.put("published", true);
        payload.put("contentJson", "{\"html\":\"<p>invalid</p>\"}");
        payload.put("coverAssetId", null);

        mockMvc.perform(post("/api/admin/blogs")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void workCreateUpdateDeleteRoundTripsAcrossAdminAndPublicEndpoints() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Integration Work " + UUID.randomUUID();
        JsonNode created = createWork(authCookie, csrf, title, "<p>Work body</p><img src=\"/media/uploads/work.png\" />");
        String id = created.get("id").asText();
        String slug = created.get("slug").asText();

        mockMvc.perform(get("/api/admin/works/{id}", id).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.thumbnail_url").value("/media/uploads/work.png"))
                .andExpect(jsonPath("$.all_properties.status").value("integration"));

        String updatedTitle = title + " Updated";
        updateWork(authCookie, csrf, id, updatedTitle, "operations", true);

        mockMvc.perform(get("/api/public/works/{slug}", slug + "-updated"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(updatedTitle))
                .andExpect(jsonPath("$.category").value("operations"))
                .andExpect(jsonPath("$.socialShareMessage").value("Updated share " + updatedTitle));

        mockMvc.perform(delete("/api/admin/works/{id}", id)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/public/works/{slug}", slug + "-updated"))
                .andExpect(status().isNotFound());
    }

    @Test
    void workCreateValidationRejectsBlankCategory() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", "Invalid Work " + UUID.randomUUID());
        payload.put("excerpt", "invalid");
        payload.put("category", " ");
        payload.put("period", "");
        payload.put("tags", List.of());
        payload.put("published", true);
        payload.put("contentJson", "{\"html\":\"<p>invalid</p>\"}");
        payload.put("allPropertiesJson", "{}");
        payload.put("thumbnailAssetId", null);
        payload.put("iconAssetId", null);

        mockMvc.perform(post("/api/admin/works")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void pageUpdatePersistsJsonAndPublicReadObservesUpdatedContent() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        MvcResult pagesResult = mockMvc.perform(get("/api/admin/pages")
                        .param("slugs", "contact")
                        .cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode page = body(pagesResult).get(0);
        String marker = "Contact integration " + UUID.randomUUID();

        mockMvc.perform(put("/api/admin/pages")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "id", page.get("id").asText(),
                                "title", "Contact",
                                "contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + marker + "</p>"))))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        MvcResult publicPageResult = mockMvc.perform(get("/api/public/pages/contact"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode contentJson = objectMapper.readTree(body(publicPageResult).get("contentJson").asText());
        assertThat(contentJson.get("html").asText()).isEqualTo("<p>" + marker + "</p>");
    }

    @Test
    void siteSettingsUpdateSupportsFrontendGithubAliasWithoutClearingOtherFields() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String githubUrl = "https://github.com/integration-" + UUID.randomUUID();

        mockMvc.perform(put("/api/admin/site-settings")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("githubUrl", githubUrl))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/public/site-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gitHubUrl").value(githubUrl))
                .andExpect(jsonPath("$.ownerName").value("Woonggon Kim"));
    }
}
