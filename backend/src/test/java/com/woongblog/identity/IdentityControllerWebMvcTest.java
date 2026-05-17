package com.woongblog.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.woongblog.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@Tag("web")
class IdentityControllerWebMvcTest {
    private MockMvc mockMvc;
    private AppProperties properties;

    @Mock
    private IdentityService identityService;

    @Mock
    private CookieAuthenticationFilter cookieAuthenticationFilter;

    @Mock
    private ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    @BeforeEach
    void setUp() {
        properties = new AppProperties();
        properties.getAuth().setEnabled(true);
        properties.getAuth().setEnableTestLoginEndpoint(true);
        properties.getAuth().setAdminEmails("admin@example.com");
        properties.getAuth().setCookieName("portfolio_auth");
        properties.getAuth().setSessionTtl(Duration.ofMinutes(30));
        properties.getAuth().setSecureCookies(false);

        mockMvc = MockMvcBuilders.standaloneSetup(new IdentityController(
                identityService,
                cookieAuthenticationFilter,
                properties,
                clientRegistrationRepository)).build();
    }

    @Test
    void loginRedirectsToGoogleAndStoresSafeReturnUrlInSession() throws Exception {
        when(clientRegistrationRepository.getIfAvailable()).thenReturn(mock(ClientRegistrationRepository.class));

        MvcResult result = mockMvc.perform(get("/api/auth/login")
                        .param("returnUrl", "/admin/posts"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/oauth2/authorization/google"))
                .andReturn();

        assertThat(result.getRequest().getSession(false)
                .getAttribute(OAuthLoginSuccessHandler.RETURN_URL_SESSION_ATTRIBUTE))
                .isEqualTo("/admin/posts");
    }

    @Test
    void loginFallsBackToAdminForUnsafeReturnUrlBeforeOauthRedirect() throws Exception {
        when(clientRegistrationRepository.getIfAvailable()).thenReturn(mock(ClientRegistrationRepository.class));

        MvcResult result = mockMvc.perform(get("/api/auth/login")
                        .param("returnUrl", "//evil.example"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/oauth2/authorization/google"))
                .andReturn();

        assertThat(result.getRequest().getSession(false)
                .getAttribute(OAuthLoginSuccessHandler.RETURN_URL_SESSION_ATTRIBUTE))
                .isEqualTo("/admin");
    }

    @Test
    void loginReportsDisabledAuthAndMissingOauthRegistration() throws Exception {
        properties.getAuth().setEnabled(false);

        mockMvc.perform(get("/api/auth/login"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("External authentication is not configured."));

        properties.getAuth().setEnabled(true);

        mockMvc.perform(get("/api/auth/login"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("OAuth client registration is not configured."));
    }

    @Test
    void testLoginRequiresEnabledEndpointAndAdminEmail() throws Exception {
        properties.getAuth().setEnableTestLoginEndpoint(false);

        mockMvc.perform(get("/api/auth/test-login"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not found."));

        properties.getAuth().setEnableTestLoginEndpoint(true);

        mockMvc.perform(get("/api/auth/test-login")
                        .param("email", "user@example.com"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/login?error=admin_only"));

        verifyNoInteractions(identityService);
    }

    @Test
    void testLoginNormalizesAdminEmailIssuesCookieAndSanitizesReturnUrl() throws Exception {
        when(identityService.loginForEmail("admin@example.com"))
                .thenReturn(new IdentityService.SessionLoginResult("session-key", Instant.now().plusSeconds(1800)));

        MvcResult result = mockMvc.perform(get("/api/auth/test-login")
                        .param("email", " Admin@Example.COM ")
                        .param("returnUrl", "https://evil.example"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/admin"))
                .andReturn();

        verify(identityService).loginForEmail("admin@example.com");
        assertThat(result.getResponse().getHeader("Set-Cookie"))
                .contains("portfolio_auth=session-key")
                .contains("HttpOnly")
                .contains("Max-Age=1800")
                .contains("SameSite=Lax")
                .doesNotContain("Secure");
    }

    @Test
    void sessionReportsAnonymousAndAuthenticatedPrincipalPayloads() throws Exception {
        mockMvc.perform(get("/api/auth/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false));

        UUID profileId = UUID.randomUUID();
        AppPrincipal principal = new AppPrincipal(profileId, "admin@example.com", "Admin User", "admin");
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        mockMvc.perform(get("/api/auth/session").principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.name").value("Admin User"))
                .andExpect(jsonPath("$.email").value("admin@example.com"))
                .andExpect(jsonPath("$.role").value("admin"))
                .andExpect(jsonPath("$.profileId").value(profileId.toString()));
    }

    @Test
    void csrfEndpointStoresGeneratedTokenInHttpSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value(CsrfValidationFilter.HEADER_NAME))
                .andExpect(jsonPath("$.requestToken").isNotEmpty())
                .andReturn();

        String token = (String) result.getRequest().getSession(false)
                .getAttribute(CsrfValidationFilter.SESSION_ATTRIBUTE);
        assertThat(token).hasSize(43);
        assertThat(result.getResponse().getContentAsString()).contains(token);
    }

    @Test
    void logoutPostReadsCookieDeletesSessionAndExpiresBrowserCookies() throws Exception {
        when(cookieAuthenticationFilter.readSessionCookie(any(HttpServletRequest.class))).thenReturn("session-key");

        MvcResult result = mockMvc.perform(post("/api/auth/logout")
                        .param("returnUrl", "/signed-out"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.redirectUrl").value("/signed-out"))
                .andReturn();

        verify(identityService).logout("session-key");
        Cookie jsession = result.getResponse().getCookie("JSESSIONID");
        assertThat(jsession).isNotNull();
        assertThat(jsession.getPath()).isEqualTo("/");
        assertThat(jsession.getMaxAge()).isZero();
        assertThat(result.getResponse().getHeaders("Set-Cookie"))
                .anySatisfy(header -> assertThat(header)
                        .contains("portfolio_auth=")
                        .contains("Max-Age=0")
                        .contains("HttpOnly")
                        .contains("SameSite=Lax"));
    }

    @Test
    void logoutGetIsRejectedAndMembersDelegateToIdentityService() throws Exception {
        UUID profileId = UUID.randomUUID();
        when(identityService.listMembers()).thenReturn(List.of(new IdentityService.AdminMemberItem(
                profileId,
                "Admin User",
                "admin@example.com",
                "admin",
                "google",
                Instant.parse("2026-05-17T01:02:03Z"),
                Instant.parse("2026-05-17T02:03:04Z"),
                1)));

        mockMvc.perform(get("/api/auth/logout"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.error").value("Use POST to sign out."));

        mockMvc.perform(get("/api/admin/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(profileId.toString()))
                .andExpect(jsonPath("$[0].email").value("admin@example.com"))
                .andExpect(jsonPath("$[0].activeSessionCount").value(1));

        verify(identityService).listMembers();
    }
}
