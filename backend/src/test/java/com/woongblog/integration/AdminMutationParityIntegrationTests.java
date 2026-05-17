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
class AdminMutationParityIntegrationTests extends IntegrationTestSupport {
    @Test
    void getAdminPagesWithSlugFilterReturnsRequestedPageOnly() throws Exception {
        Cookie authCookie = testLoginCookie();

        MvcResult result = mockMvc.perform(get("/api/admin/pages")
                        .param("slugs", "home")
                        .cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode pages = body(result);
        assertThat(pages).hasSize(1);
        assertThat(pages.get(0).get("slug").asText()).isEqualTo("home");
    }

    @Test
    void updatePageWhenInvalidReturnsBadRequestAndDoesNotPersist() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode page = firstPage(authCookie, "contact");
        String originalTitle = page.get("title").asText();

        mockMvc.perform(put("/api/admin/pages")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "id", page.get("id").asText(),
                                "title", " ",
                                "contentJson", "{\"html\":\"<p>invalid</p>\"}"))))
                .andExpect(status().isBadRequest());

        JsonNode unchanged = firstPage(authCookie, "contact");
        assertThat(unchanged.get("title").asText()).isEqualTo(originalTitle);
    }

    @Test
    void updatePageWhenMissingReturnsNotFound() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(put("/api/admin/pages")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "id", UUID.randomUUID(),
                                "title", "Missing page",
                                "contentJson", "{\"html\":\"<p>missing</p>\"}"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Page not found."));
    }

    @Test
    void createBlogWithDuplicateTitleGeneratesUniqueSlug() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Duplicate Blog " + UUID.randomUUID();

        JsonNode first = createBlog(authCookie, csrf, title);
        JsonNode second = createBlog(authCookie, csrf, title);

        assertThat(second.get("slug").asText()).startsWith(first.get("slug").asText());
        assertThat(second.get("slug").asText()).isNotEqualTo(first.get("slug").asText());
    }

    @Test
    void updateBlogWhenMissingReturnsNotFound() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(put("/api/admin/blogs/{id}", UUID.randomUUID())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(blogPayload("Missing blog", true))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Blog not found."));
    }

    @Test
    void deleteBlogWhenMissingReturnsNotFound() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(delete("/api/admin/blogs/{id}", UUID.randomUUID())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Blog not found."));
    }

    @Test
    void updateBlogCanUnpublishAndHidePublicReadModel() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Unpublish Blog " + UUID.randomUUID();
        JsonNode created = createBlog(authCookie, csrf, title, true);
        String id = created.get("id").asText();
        String slug = created.get("slug").asText();

        updateBlog(authCookie, csrf, id, title + " Draft", false);

        mockMvc.perform(get("/api/public/blogs/{slug}", slug + "-draft"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Blog not found."));
        mockMvc.perform(get("/api/admin/blogs/{id}", id).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(false));
    }

    @Test
    void createWorkWithDuplicateTitleGeneratesUniqueSlug() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Duplicate Work " + UUID.randomUUID();

        JsonNode first = createWork(authCookie, csrf, title, "<p>first</p>");
        JsonNode second = createWork(authCookie, csrf, title, "<p>second</p>");

        assertThat(second.get("slug").asText()).startsWith(first.get("slug").asText());
        assertThat(second.get("slug").asText()).isNotEqualTo(first.get("slug").asText());
    }

    @Test
    void updateWorkWhenMissingReturnsNotFound() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(put("/api/admin/works/{id}", UUID.randomUUID())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workPayload("Missing work", true))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Work not found."));
    }

    @Test
    void deleteWorkWhenMissingReturnsNotFound() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(delete("/api/admin/works/{id}", UUID.randomUUID())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Work not found."));
    }

    @Test
    void updateWorkCanUnpublishAndHidePublicReadModel() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        String title = "Unpublish Work " + UUID.randomUUID();
        JsonNode created = createWork(authCookie, csrf, title, "<p>draftable</p>");
        String id = created.get("id").asText();
        String slug = created.get("slug").asText();

        updateWork(authCookie, csrf, id, title + " Draft", "platform", false);

        mockMvc.perform(get("/api/public/works/{slug}", slug + "-draft"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Work not found."));
        mockMvc.perform(get("/api/admin/works/{id}", id).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(false));
    }

    @Test
    void adminListEndpointsIncludeCreatedRows() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode blog = createBlog(authCookie, csrf, "List Blog " + UUID.randomUUID(), true);
        JsonNode work = createWork(authCookie, csrf, "List Work " + UUID.randomUUID(), "<p>list</p>");

        JsonNode blogs = body(mockMvc.perform(get("/api/admin/blogs").cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn());
        JsonNode works = body(mockMvc.perform(get("/api/admin/works").cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn());

        assertThat(blogs.findValuesAsText("id")).contains(blog.get("id").asText());
        assertThat(works.findValuesAsText("id")).contains(work.get("id").asText());
    }

    private JsonNode firstPage(Cookie authCookie, String slug) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/admin/pages")
                        .param("slugs", slug)
                        .cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();
        return body(result).get(0);
    }

    private Map<String, Object> blogPayload(String title, boolean published) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "Admin parity excerpt");
        payload.put("tags", List.of("admin", "parity"));
        payload.put("published", published);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + title + "</p>")));
        payload.put("coverAssetId", null);
        return payload;
    }

    private Map<String, Object> workPayload(String title, boolean published) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "Admin parity work excerpt");
        payload.put("category", "platform");
        payload.put("period", "2026.05");
        payload.put("tags", List.of("admin", "parity"));
        payload.put("published", published);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + title + "</p>")));
        payload.put("allPropertiesJson", "{}");
        payload.put("thumbnailAssetId", null);
        payload.put("iconAssetId", null);
        return payload;
    }
}
