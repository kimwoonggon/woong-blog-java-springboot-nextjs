package com.woongblog.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestTimingFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            double elapsedMs = (System.nanoTime() - start) / 1_000_000.0;
            response.setHeader("X-App-Elapsed-Ms", Double.toString(elapsedMs));
            response.setHeader("X-Db-Command-Elapsed-Ms", "0");
            response.setHeader("X-Db-Command-Count", "0");
        }
    }
}
