package com.woongblog.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import com.woongblog.config.AppProperties;
import jakarta.servlet.http.Cookie;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
class CookieAuthenticationFilterTest {
    private AppProperties properties;
    private CookieAuthenticationFilter filter;

    @Mock
    private IdentityService identityService;

    @BeforeEach
    void setUp() {
        properties = new AppProperties();
        properties.getAuth().setCookieName("portfolio_auth");
        filter = new CookieAuthenticationFilter(identityService, properties);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void readSessionCookieHandlesMissingCookiesAndFindsConfiguredCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThat(filter.readSessionCookie(request)).isNull();

        request.setCookies(
                new Cookie("other", "ignored"),
                new Cookie("portfolio_auth", "session-key"));

        assertThat(filter.readSessionCookie(request)).isEqualTo("session-key");
    }

    @Test
    void readSessionCookieReturnsNullWhenConfiguredCookieIsAbsent() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("other", "ignored"));

        assertThat(filter.readSessionCookie(request)).isNull();
    }

    @Test
    void authenticatesPrincipalFromSessionCookieAndContinuesChain() throws Exception {
        AppPrincipal principal = new AppPrincipal(
                UUID.randomUUID(),
                "admin@example.com",
                "Admin User",
                "admin");
        when(identityService.findBySessionKey("session-key")).thenReturn(Optional.of(principal));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("portfolio_auth", "session-key"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(principal);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN");
        assertThat(chain.getRequest()).isSameAs(request);
        assertThat(chain.getResponse()).isSameAs(response);
    }

    @Test
    void leavesSecurityContextEmptyWhenNoSessionCookieIsPresent() throws Exception {
        when(identityService.findBySessionKey(isNull())).thenReturn(Optional.empty());
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(chain.getRequest()).isSameAs(request);
    }
}
