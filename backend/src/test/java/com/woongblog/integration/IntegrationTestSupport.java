package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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

@SpringBootTest(properties = "app.load-testing.report-root=${java.io.tmpdir}/woong-blog-integration-loadtest")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
abstract class IntegrationTestSupport {
    protected static final UUID SEEDED_BLOG_ID = UUID.fromString("70000000-0000-0000-0000-000000000001");
    protected static final UUID SEEDED_WORK_ID = UUID.fromString("80000000-0000-0000-0000-000000000001");

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    protected Cookie testLoginCookie() throws Exception {
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

    protected CsrfContext csrfContext(Cookie authCookie) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf").cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = body(result);
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        return new CsrfContext(json.get("headerName").asText(), json.get("requestToken").asText(), session);
    }

    protected JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    protected JsonNode createBlog(Cookie authCookie, CsrfContext csrf, String title) throws Exception {
        return createBlog(authCookie, csrf, title, true);
    }

    protected JsonNode createBlog(Cookie authCookie, CsrfContext csrf, String title, boolean published) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "Integration excerpt");
        payload.put("tags", List.of("integration", "spring"));
        payload.put("published", published);
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
        return body(result);
    }

    protected void updateBlog(Cookie authCookie, CsrfContext csrf, String id, String title, boolean published)
            throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "Updated integration excerpt");
        payload.put("tags", List.of("integration", "updated"));
        payload.put("published", published);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + title + " updated</p>")));
        payload.put("coverAssetId", null);

        mockMvc.perform(put("/api/admin/blogs/{id}", id)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());
    }

    protected JsonNode createWork(Cookie authCookie, CsrfContext csrf, String title, String html) throws Exception {
        return createWork(authCookie, csrf, title, html, "platform", true);
    }

    protected JsonNode createWork(
            Cookie authCookie,
            CsrfContext csrf,
            String title,
            String html,
            String category,
            boolean published) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "Integration work excerpt");
        payload.put("category", category);
        payload.put("period", "2026.05");
        payload.put("tags", List.of("integration", "spring"));
        payload.put("published", published);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", html)));
        payload.put("allPropertiesJson", objectMapper.writeValueAsString(Map.of(
                "status", "integration",
                "socialShareMessage", "Integration share " + title)));
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
        return body(result);
    }

    protected void updateWork(
            Cookie authCookie,
            CsrfContext csrf,
            String id,
            String title,
            String category,
            boolean published) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("excerpt", "Updated integration work excerpt");
        payload.put("category", category);
        payload.put("period", "2026.06");
        payload.put("tags", List.of("integration", "updated"));
        payload.put("published", published);
        payload.put("contentJson", objectMapper.writeValueAsString(Map.of("html", "<p>" + title + " updated</p>")));
        payload.put("allPropertiesJson", objectMapper.writeValueAsString(Map.of(
                "status", "updated",
                "socialShareMessage", "Updated share " + title)));
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
}

record CsrfContext(String headerName, String token, MockHttpSession session) {
}
