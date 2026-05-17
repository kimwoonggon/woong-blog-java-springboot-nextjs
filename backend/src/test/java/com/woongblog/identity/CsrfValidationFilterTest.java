package com.woongblog.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@Tag("unit")
class CsrfValidationFilterTest {
    private final CsrfValidationFilter filter = new CsrfValidationFilter(new ObjectMapper());

    @Test
    void skipsValidationForSafeMethods() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/logout");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
    }

    @Test
    void skipsValidationForUnprotectedMutationPaths() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/public");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/logout", "/api/admin/posts", "/api/uploads/video"})
    void rejectsProtectedMutationsWithoutMatchingSessionToken(String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.getSession().setAttribute(CsrfValidationFilter.SESSION_ATTRIBUTE, "expected-token");
        request.addHeader(CsrfValidationFilter.HEADER_NAME, "wrong-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_BAD_REQUEST);
        assertThat(response.getContentType()).isEqualTo("application/json");
        assertThat(response.getContentAsString()).contains("Invalid or missing CSRF token.");
    }

    @Test
    void acceptsProtectedMutationWhenHeaderMatchesSessionToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/logout");
        request.getSession().setAttribute(CsrfValidationFilter.SESSION_ATTRIBUTE, "expected-token");
        request.addHeader(CsrfValidationFilter.HEADER_NAME, "expected-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
    }
}
