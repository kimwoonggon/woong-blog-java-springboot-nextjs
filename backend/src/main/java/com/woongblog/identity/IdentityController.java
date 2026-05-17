package com.woongblog.identity;

import com.woongblog.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class IdentityController {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final IdentityService identityService;
    private final CookieAuthenticationFilter cookieAuthenticationFilter;
    private final AppProperties properties;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    public IdentityController(
            IdentityService identityService,
            CookieAuthenticationFilter cookieAuthenticationFilter,
            AppProperties properties,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository) {
        this.identityService = identityService;
        this.cookieAuthenticationFilter = cookieAuthenticationFilter;
        this.properties = properties;
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    @GetMapping("/auth/login")
    ResponseEntity<?> login(@RequestParam(defaultValue = "/admin") String returnUrl, HttpSession session) {
        if (!properties.getAuth().isEnabled()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "External authentication is not configured."));
        }
        if (clientRegistrationRepository.getIfAvailable() == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "OAuth client registration is not configured."));
        }
        session.setAttribute(OAuthLoginSuccessHandler.RETURN_URL_SESSION_ATTRIBUTE, safeReturnUrl(returnUrl));
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create("/oauth2/authorization/google")).build();
    }

    @GetMapping("/auth/test-login")
    ResponseEntity<?> testLogin(
            @RequestParam(defaultValue = "admin@example.com") String email,
            @RequestParam(defaultValue = "/admin") String returnUrl,
            HttpServletResponse response) {
        if (!properties.getAuth().isEnableTestLoginEndpoint()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found."));
        }
        String normalizedEmail = email == null || email.isBlank() ? "admin@example.com" : email.trim().toLowerCase();
        if (!properties.getAuth().adminEmailList().contains(normalizedEmail)) {
            return ResponseEntity.status(HttpStatus.FOUND).location(URI.create("/login?error=admin_only")).build();
        }
        IdentityService.SessionLoginResult login = identityService.loginForEmail(normalizedEmail);
        response.addHeader("Set-Cookie", authCookie(login.sessionKey(), properties.getAuth().getSessionTtl()).toString());
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(safeReturnUrl(returnUrl))).build();
    }

    @GetMapping("/auth/session")
    Map<String, Object> session(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AppPrincipal principal)) {
            return Map.of("authenticated", false);
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("authenticated", true);
        payload.put("name", principal.displayName());
        payload.put("email", principal.email());
        payload.put("role", principal.role());
        payload.put("profileId", principal.profileId());
        return payload;
    }

    @GetMapping("/auth/csrf")
    Map<String, String> csrf(HttpSession session) {
        String token = generateToken();
        session.setAttribute(CsrfValidationFilter.SESSION_ATTRIBUTE, token);
        return Map.of("requestToken", token, "headerName", CsrfValidationFilter.HEADER_NAME);
    }

    @PostMapping("/auth/logout")
    Map<String, String> logout(
            @RequestParam(defaultValue = "/") String returnUrl,
            HttpServletRequest request,
            HttpServletResponse response) {
        identityService.logout(cookieAuthenticationFilter.readSessionCookie(request));
        Cookie jsession = new Cookie("JSESSIONID", "");
        jsession.setPath("/");
        jsession.setMaxAge(0);
        response.addCookie(jsession);
        response.addHeader("Set-Cookie", expiredAuthCookie("").toString());
        return Map.of("redirectUrl", returnUrl);
    }

    @GetMapping("/auth/logout")
    ResponseEntity<Map<String, String>> logoutGetNotAllowed() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(Map.of("error", "Use POST to sign out."));
    }

    @GetMapping("/admin/members")
    java.util.List<IdentityService.AdminMemberItem> members() {
        return identityService.listMembers();
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

    private ResponseCookie expiredAuthCookie(String value) {
        return ResponseCookie.from(properties.getAuth().getCookieName(), value)
                .httpOnly(true)
                .secure(properties.getAuth().isSecureCookies())
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
    }

    private static String safeReturnUrl(String value) {
        if (value == null || !value.startsWith("/") || value.startsWith("//") || value.contains("\r") || value.contains("\n")) {
            return "/admin";
        }
        return value;
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
