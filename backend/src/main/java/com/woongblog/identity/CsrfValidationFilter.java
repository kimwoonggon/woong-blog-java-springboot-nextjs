package com.woongblog.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class CsrfValidationFilter extends OncePerRequestFilter {
    public static final String SESSION_ATTRIBUTE = "csrfToken";
    public static final String HEADER_NAME = "X-CSRF-TOKEN";

    private final ObjectMapper objectMapper;

    public CsrfValidationFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!requiresValidation(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Object expected = request.getSession(false) == null
                ? null
                : request.getSession(false).getAttribute(SESSION_ATTRIBUTE);
        String actual = request.getHeader(HEADER_NAME);
        if (expected == null || actual == null || !expected.toString().equals(actual)) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of("error", "Invalid or missing CSRF token."));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static boolean requiresValidation(HttpServletRequest request) {
        String method = request.getMethod();
        if (!method.equals("POST") && !method.equals("PUT") && !method.equals("PATCH") && !method.equals("DELETE")) {
            return false;
        }
        String path = request.getRequestURI();
        return path.startsWith("/api/admin")
                || path.startsWith("/api/uploads")
                || path.equals("/api/auth/logout");
    }
}
