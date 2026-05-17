package com.woongblog.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.woongblog.config.AppProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

@Tag("component")
class OAuthLoginSuccessHandlerTest {
    @Test
    void rejectsUnsupportedAuthenticationType() throws Exception {
        OAuthLoginSuccessHandler handler = new OAuthLoginSuccessHandler(mock(IdentityService.class), new AppProperties());
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, mock(Authentication.class));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getErrorMessage()).isEqualTo("Unsupported OAuth authentication.");
    }

    @Test
    void issuesBackendSessionCookieAndRedirectsToSafeReturnUrl() throws Exception {
        IdentityService identityService = mock(IdentityService.class);
        AppProperties properties = new AppProperties();
        properties.getAuth().setCookieName("portfolio_auth");
        properties.getAuth().setSessionTtl(Duration.ofHours(8));
        properties.getAuth().setSecureCookies(false);
        OAuthLoginSuccessHandler handler = new OAuthLoginSuccessHandler(identityService, properties);

        when(identityService.loginForOAuthUser(eq("google"), eq("sub-123"), eq("admin@example.com"), eq("Admin User")))
                .thenReturn(new IdentityService.SessionLoginResult("session-key", Instant.now().plusSeconds(3600)));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.getSession().setAttribute(OAuthLoginSuccessHandler.RETURN_URL_SESSION_ATTRIBUTE, "/admin");
        MockHttpServletResponse response = new MockHttpServletResponse();
        DefaultOAuth2User user = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", "sub-123", "email", "admin@example.com", "name", "Admin User"),
                "sub");
        OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(user, user.getAuthorities(), "google");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(identityService).loginForOAuthUser("google", "sub-123", "admin@example.com", "Admin User");
        assertThat(response.getRedirectedUrl()).isEqualTo("/admin");
        assertThat(response.getHeader("Set-Cookie"))
                .contains("portfolio_auth=session-key")
                .contains("HttpOnly")
                .contains("Max-Age=28800")
                .contains("SameSite=Lax");
        assertThat(request.getSession().getAttribute(OAuthLoginSuccessHandler.RETURN_URL_SESSION_ATTRIBUTE)).isNull();
    }

    @Test
    void fallsBackToPrincipalNameAndDefaultAdminReturnUrlWhenSessionIsMissing() throws Exception {
        IdentityService identityService = mock(IdentityService.class);
        AppProperties properties = new AppProperties();
        OAuthLoginSuccessHandler handler = new OAuthLoginSuccessHandler(identityService, properties);
        when(identityService.loginForOAuthUser(
                eq("github"),
                eq("fallback-subject"),
                eq("fallback@example.com"),
                eq("Fallback User")))
                .thenReturn(new IdentityService.SessionLoginResult("session-key", Instant.now().plusSeconds(3600)));
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        DefaultOAuth2User user = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of(
                        "username", "fallback-subject",
                        "preferred_username", "fallback@example.com",
                        "given_name", "Fallback User"),
                "username");
        OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(user, user.getAuthorities(), "github");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(identityService).loginForOAuthUser(
                "github",
                "fallback-subject",
                "fallback@example.com",
                "Fallback User");
        assertThat(response.getRedirectedUrl()).isEqualTo("/admin");
    }

    @Test
    void rejectsExternalReturnUrlAfterOauthSuccess() throws Exception {
        IdentityService identityService = mock(IdentityService.class);
        AppProperties properties = new AppProperties();
        OAuthLoginSuccessHandler handler = new OAuthLoginSuccessHandler(identityService, properties);

        when(identityService.loginForOAuthUser(eq("google"), eq("sub-123"), eq("admin@example.com"), isNull()))
                .thenReturn(new IdentityService.SessionLoginResult("session-key", Instant.now().plusSeconds(3600)));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.getSession().setAttribute(OAuthLoginSuccessHandler.RETURN_URL_SESSION_ATTRIBUTE, "//evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();
        DefaultOAuth2User user = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", "sub-123", "email", "admin@example.com"),
                "sub");
        OAuth2AuthenticationToken authentication = new OAuth2AuthenticationToken(user, user.getAuthorities(), "google");

        handler.onAuthenticationSuccess(request, response, authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("/admin");
    }
}
