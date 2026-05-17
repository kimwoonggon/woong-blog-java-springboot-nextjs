package com.woongblog.identity;

import com.woongblog.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuthLoginSuccessHandler implements AuthenticationSuccessHandler {
    public static final String RETURN_URL_SESSION_ATTRIBUTE = "oauthReturnUrl";

    private final IdentityService identityService;
    private final AppProperties properties;

    public OAuthLoginSuccessHandler(IdentityService identityService, AppProperties properties) {
        this.identityService = identityService;
        this.properties = properties;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {
        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Unsupported OAuth authentication.");
            return;
        }

        OAuth2User user = oauthToken.getPrincipal();
        Map<String, Object> attributes = user.getAttributes();
        String provider = oauthToken.getAuthorizedClientRegistrationId();
        String subject = firstNonBlank(attributes, "sub", "id");
        if (subject == null || subject.isBlank()) {
            subject = user.getName();
        }
        String email = firstNonBlank(attributes, "email", "preferred_username");
        String displayName = firstNonBlank(attributes, "name", "given_name");

        IdentityService.SessionLoginResult login =
                identityService.loginForOAuthUser(provider, subject, email, displayName);
        response.addHeader("Set-Cookie", authCookie(login.sessionKey(), properties.getAuth().getSessionTtl()).toString());
        response.sendRedirect(returnUrl(request.getSession(false)));
    }

    private String returnUrl(HttpSession session) {
        if (session == null) {
            return "/admin";
        }
        Object value = session.getAttribute(RETURN_URL_SESSION_ATTRIBUTE);
        session.removeAttribute(RETURN_URL_SESSION_ATTRIBUTE);
        if (!(value instanceof String returnUrl) || !isSafeLocalReturnUrl(returnUrl)) {
            return "/admin";
        }
        return returnUrl;
    }

    private boolean isSafeLocalReturnUrl(String value) {
        return value.startsWith("/") && !value.startsWith("//") && !value.contains("\r") && !value.contains("\n");
    }

    private ResponseCookie authCookie(String value, Duration maxAge) {
        return ResponseCookie.from(properties.getAuth().getCookieName(), value)
                .httpOnly(true)
                .secure(properties.getAuth().isSecureCookies())
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private static String firstNonBlank(Map<String, Object> attributes, String... names) {
        for (String name : names) {
            Object value = attributes.get(name);
            if (value != null && !value.toString().isBlank()) {
                return value.toString();
            }
        }
        return null;
    }
}
