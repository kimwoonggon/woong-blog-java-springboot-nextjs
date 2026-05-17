package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class AuthSecurityDeepIntegrationTests extends IntegrationTestSupport {
    @Test
    void loginReturnsServiceUnavailableWhenExternalAuthenticationIsDisabled() throws Exception {
        mockMvc.perform(get("/api/auth/login").param("returnUrl", "/admin/blogs"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("External authentication is not configured."));
    }

    @Test
    void testLoginSetsHttpOnlyLaxCookieAndRedirectsToSafeReturnUrl() throws Exception {
        mockMvc.perform(get("/api/auth/test-login")
                        .param("email", "admin@example.com")
                        .param("returnUrl", "/admin/blogs"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/admin/blogs"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("SameSite=Lax")))
                .andExpect(cookie().exists("portfolio_auth"));
    }

    @Test
    void testLoginNormalizesUnsafeReturnUrlsToAdmin() throws Exception {
        mockMvc.perform(get("/api/auth/test-login")
                        .param("email", "admin@example.com")
                        .param("returnUrl", "https://evil.example/admin"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/admin"));

        mockMvc.perform(get("/api/auth/test-login")
                        .param("email", "admin@example.com")
                        .param("returnUrl", "//evil.example/admin"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/admin"));
    }

    @Test
    void nonAdminTestLoginRedirectsWithoutSessionCookie() throws Exception {
        mockMvc.perform(get("/api/auth/test-login")
                        .param("email", "user@example.com")
                        .param("returnUrl", "/admin"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/login?error=admin_only"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void sessionEndpointDistinguishesAnonymousAndCookieAuthenticatedAdmin() throws Exception {
        mockMvc.perform(get("/api/auth/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false));

        Cookie authCookie = testLoginCookie();
        mockMvc.perform(get("/api/auth/session").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.email").value("admin@example.com"))
                .andExpect(jsonPath("$.role").value("admin"));
    }

    @Test
    void csrfEndpointIssuesSessionTokenForMutatingRequests() throws Exception {
        Cookie authCookie = testLoginCookie();
        MvcResult first = mockMvc.perform(get("/api/auth/csrf").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
                .andExpect(jsonPath("$.requestToken").isString())
                .andReturn();
        MvcResult second = mockMvc.perform(get("/api/auth/csrf").cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode firstJson = body(first);
        JsonNode secondJson = body(second);
        assertThat(firstJson.get("requestToken").asText()).isNotEqualTo(secondJson.get("requestToken").asText());
    }

    @Test
    void logoutRequiresPostAndClearsAuthenticationCookies() throws Exception {
        mockMvc.perform(get("/api/auth/logout"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.error").value("Use POST to sign out."));

        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .param("returnUrl", "/signed-out"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.redirectUrl").value("/signed-out"))
                .andExpect(cookie().maxAge("portfolio_auth", 0))
                .andExpect(cookie().maxAge("JSESSIONID", 0));
    }

    @Test
    void protectedAdminMutationRejectsMissingCsrfBeforeChangingData() throws Exception {
        Cookie authCookie = testLoginCookie();

        mockMvc.perform(post("/api/admin/blogs")
                        .cookie(authCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Missing CSRF","contentJson":"{\\"html\\":\\"<p>x</p>\\"}","published":true}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid or missing CSRF token."));
    }
}
