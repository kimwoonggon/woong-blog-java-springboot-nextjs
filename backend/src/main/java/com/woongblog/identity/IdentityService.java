package com.woongblog.identity;

import com.woongblog.config.AppProperties;
import com.woongblog.common.JdbcData;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityService {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;
    private final AppProperties properties;

    public IdentityService(JdbcTemplate jdbcTemplate, AppProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    public Optional<AppPrincipal> findBySessionKey(String sessionKey) {
        if (sessionKey == null || sessionKey.isBlank()) {
            return Optional.empty();
        }

        String sql = """
                SELECT p."Id", p."Email", p."DisplayName", p."Role"
                FROM "AuthSessions" s
                INNER JOIN "Profiles" p ON p."Id" = s."ProfileId"
                WHERE s."SessionKey" = ? AND s."ExpiresAt" > now()
                """;
        List<AppPrincipal> principals = jdbcTemplate.query(sql, (rs, rowNum) -> new AppPrincipal(
                rs.getObject("Id", UUID.class),
                rs.getString("Email"),
                rs.getString("DisplayName"),
                rs.getString("Role")), sessionKey);
        if (!principals.isEmpty()) {
            jdbcTemplate.update("UPDATE \"AuthSessions\" SET \"LastSeenAt\" = now() WHERE \"SessionKey\" = ?", sessionKey);
        }
        return principals.stream().findFirst();
    }

    @Transactional
    public SessionLoginResult loginForEmail(String email) {
        String normalizedEmail = email == null || email.isBlank() ? "admin@example.com" : email.trim().toLowerCase();
        UUID profileId = findProfileIdByEmail(normalizedEmail)
                .orElseGet(() -> createProfile(normalizedEmail));
        jdbcTemplate.update("""
                UPDATE "Profiles" SET "LastLoginAt" = now(), "UpdatedAt" = now()
                WHERE "Id" = ?
                """, profileId);
        return createSession(profileId);
    }

    @Transactional
    public SessionLoginResult loginForOAuthUser(String provider, String providerSubject, String email, String displayName) {
        String normalizedProvider = provider == null || provider.isBlank() ? "google" : provider.trim().toLowerCase();
        String normalizedSubject = providerSubject == null ? "" : providerSubject.trim();
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        if (normalizedSubject.isBlank() || normalizedEmail.isBlank()) {
            throw new IllegalArgumentException("OAuth profile must include both subject and email.");
        }

        UUID profileId = findProfileIdByProviderSubject(normalizedProvider, normalizedSubject)
                .or(() -> findProfileIdByEmail(normalizedEmail))
                .orElseGet(() -> createProfile(
                        normalizedProvider,
                        normalizedSubject,
                        normalizedEmail,
                        displayNameOrEmail(displayName, normalizedEmail)));

        jdbcTemplate.update("""
                UPDATE "Profiles"
                SET "Provider" = ?, "ProviderSubject" = ?, "Email" = ?, "DisplayName" = ?, "Role" = ?,
                    "LastLoginAt" = now(), "UpdatedAt" = now()
                WHERE "Id" = ?
                """,
                normalizedProvider,
                normalizedSubject,
                normalizedEmail,
                displayNameOrEmail(displayName, normalizedEmail),
                roleForEmail(normalizedEmail),
                profileId);
        return createSession(profileId);
    }

    private SessionLoginResult createSession(UUID profileId) {
        String sessionKey = generateSessionKey();
        Instant expiresAt = Instant.now().plus(properties.getAuth().getSessionTtl());
        jdbcTemplate.update("""
                INSERT INTO "AuthSessions" ("Id", "ProfileId", "SessionKey", "CreatedAt", "LastSeenAt", "ExpiresAt")
                VALUES (?, ?, ?, now(), now(), ?)
                """, UUID.randomUUID(), profileId, sessionKey, Timestamp.from(expiresAt));
        return new SessionLoginResult(sessionKey, expiresAt);
    }

    public void logout(String sessionKey) {
        if (sessionKey != null && !sessionKey.isBlank()) {
            jdbcTemplate.update("DELETE FROM \"AuthSessions\" WHERE \"SessionKey\" = ?", sessionKey);
        }
    }

    public List<AdminMemberItem> listMembers() {
        return jdbcTemplate.query("""
                SELECT p."Id", p."DisplayName", p."Email", p."Role", p."Provider", p."CreatedAt", p."LastLoginAt",
                       COUNT(s."Id") FILTER (WHERE s."ExpiresAt" > now()) AS "ActiveSessionCount"
                FROM "Profiles" p
                LEFT JOIN "AuthSessions" s ON s."ProfileId" = p."Id"
                GROUP BY p."Id", p."DisplayName", p."Email", p."Role", p."Provider", p."CreatedAt", p."LastLoginAt"
                ORDER BY p."CreatedAt" DESC
                """, (rs, rowNum) -> new AdminMemberItem(
                rs.getObject("Id", UUID.class),
                rs.getString("DisplayName"),
                rs.getString("Email"),
                rs.getString("Role"),
                rs.getString("Provider"),
                JdbcData.nullableInstant(rs, "CreatedAt"),
                JdbcData.nullableInstant(rs, "LastLoginAt"),
                rs.getInt("ActiveSessionCount")));
    }

    private Optional<UUID> findProfileIdByEmail(String email) {
        List<UUID> ids = jdbcTemplate.query(
                "SELECT \"Id\" FROM \"Profiles\" WHERE lower(\"Email\") = lower(?) LIMIT 1",
                (rs, rowNum) -> rs.getObject("Id", UUID.class),
                email);
        return ids.stream().findFirst();
    }

    private Optional<UUID> findProfileIdByProviderSubject(String provider, String providerSubject) {
        List<UUID> ids = jdbcTemplate.query(
                "SELECT \"Id\" FROM \"Profiles\" WHERE lower(\"Provider\") = lower(?) AND \"ProviderSubject\" = ? LIMIT 1",
                (rs, rowNum) -> rs.getObject("Id", UUID.class),
                provider,
                providerSubject);
        return ids.stream().findFirst();
    }

    private UUID createProfile(String email) {
        return createProfile("test", "test:" + email, email, email);
    }

    private UUID createProfile(String provider, String providerSubject, String email, String displayName) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO "Profiles" ("Id", "Provider", "ProviderSubject", "Email", "DisplayName", "Role", "CreatedAt", "UpdatedAt")
                VALUES (?, ?, ?, ?, ?, ?, now(), now())
                """, id, provider, providerSubject, email, displayNameOrEmail(displayName, email), roleForEmail(email));
        return id;
    }

    private String roleForEmail(String email) {
        return properties.getAuth().adminEmailList().contains(email.toLowerCase()) ? "admin" : "user";
    }

    private static String displayNameOrEmail(String displayName, String email) {
        return displayName == null || displayName.isBlank() ? email : displayName.trim();
    }

    private static String generateSessionKey() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public record SessionLoginResult(String sessionKey, Instant expiresAt) {
    }

    public record AdminMemberItem(
            UUID id,
            String displayName,
            String email,
            String role,
            String provider,
            Instant createdAt,
            Instant lastLoginAt,
            int activeSessionCount) {
    }
}
