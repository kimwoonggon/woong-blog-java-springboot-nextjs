package com.woongblog.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.woongblog.config.AppProperties;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@Tag("unit")
class IdentityServiceTest {
    private RecordingJdbcTemplate jdbcTemplate;
    private AppProperties properties;
    private IdentityService identityService;

    @BeforeEach
    void setUp() {
        jdbcTemplate = new RecordingJdbcTemplate();
        properties = new AppProperties();
        properties.getAuth().setAdminEmails("admin@example.com");
        properties.getAuth().setSessionTtl(Duration.ofMinutes(30));
        identityService = new IdentityService(jdbcTemplate, properties);
    }

    @Test
    void findBySessionKeyRejectsNullAndBlankValuesWithoutJdbcAccess() {
        assertThat(identityService.findBySessionKey(null)).isEmpty();
        assertThat(identityService.findBySessionKey("  ")).isEmpty();

        assertThat(jdbcTemplate.queries).isEmpty();
        assertThat(jdbcTemplate.updates).isEmpty();
    }

    @Test
    void findBySessionKeyMapsPrincipalAndTouchesLastSeenOnlyWhenSessionExists() {
        AppPrincipal principal = new AppPrincipal(
                UUID.randomUUID(),
                "admin@example.com",
                "Admin User",
                "admin");
        jdbcTemplate.principalBySessionKey.put("session-key", principal);

        assertThat(identityService.findBySessionKey("session-key")).contains(principal);

        assertThat(jdbcTemplate.updatesContaining("LastSeenAt"))
                .singleElement()
                .satisfies(call -> assertThat(call.args()).containsExactly("session-key"));

        jdbcTemplate.updates.clear();

        assertThat(identityService.findBySessionKey("missing")).isEmpty();

        assertThat(jdbcTemplate.updatesContaining("LastSeenAt")).isEmpty();
    }

    @Test
    void loginForEmailNormalizesExistingProfileAndCreatesSessionWithoutCreatingProfile() {
        UUID profileId = UUID.randomUUID();
        jdbcTemplate.profileIdsByEmail.put("owner@example.com", profileId);
        Instant before = Instant.now();

        IdentityService.SessionLoginResult result = identityService.loginForEmail(" Owner@Example.COM ");

        assertThat(result.sessionKey()).hasSize(43);
        assertThat(result.expiresAt())
                .isBetween(before.plus(properties.getAuth().getSessionTtl()).minusSeconds(1),
                        Instant.now().plus(properties.getAuth().getSessionTtl()).plusSeconds(1));
        assertThat(jdbcTemplate.queriesContaining("lower(\"Email\")"))
                .singleElement()
                .satisfies(call -> assertThat(call.args()).containsExactly("owner@example.com"));
        assertThat(jdbcTemplate.updatesContaining("INSERT INTO \"Profiles\"")).isEmpty();
        assertThat(jdbcTemplate.updatesContaining("LastLoginAt"))
                .singleElement()
                .satisfies(call -> assertThat(call.args()).containsExactly(profileId));

        SqlCall sessionInsert = jdbcTemplate.onlyUpdateContaining("INSERT INTO \"AuthSessions\"");
        assertThat(sessionInsert.args().get(1)).isEqualTo(profileId);
        assertThat(sessionInsert.args().get(2)).isEqualTo(result.sessionKey());
        assertThat(((Timestamp) sessionInsert.args().get(3)).toInstant()).isEqualTo(result.expiresAt());
    }

    @Test
    void loginForEmailCreatesDefaultAdminProfileWhenEmailIsBlank() {
        IdentityService.SessionLoginResult result = identityService.loginForEmail(" ");

        SqlCall profileInsert = jdbcTemplate.onlyUpdateContaining("INSERT INTO \"Profiles\"");
        UUID profileId = (UUID) profileInsert.args().get(0);
        assertThat(profileInsert.args())
                .containsExactly(
                        profileId,
                        "test",
                        "test:admin@example.com",
                        "admin@example.com",
                        "admin@example.com",
                        "admin");
        assertThat(jdbcTemplate.updatesContaining("LastLoginAt"))
                .singleElement()
                .satisfies(call -> assertThat(call.args()).containsExactly(profileId));

        SqlCall sessionInsert = jdbcTemplate.onlyUpdateContaining("INSERT INTO \"AuthSessions\"");
        assertThat(sessionInsert.args().get(1)).isEqualTo(profileId);
        assertThat(sessionInsert.args().get(2)).isEqualTo(result.sessionKey());
    }

    @Test
    void loginForOAuthUserPrefersExistingProviderSubjectWithoutEmailLookup() {
        properties.getAuth().setAdminEmails("owner@example.com");
        UUID profileId = UUID.randomUUID();
        jdbcTemplate.profileIdsByProviderSubject.put(providerKey("google", "subject-1"), profileId);

        IdentityService.SessionLoginResult result = identityService.loginForOAuthUser(
                " Google ",
                " subject-1 ",
                " Owner@Example.COM ",
                " Owner ");

        assertThat(result.sessionKey()).hasSize(43);
        assertThat(jdbcTemplate.queriesContaining("lower(\"Provider\")"))
                .singleElement()
                .satisfies(call -> assertThat(call.args()).containsExactly("google", "subject-1"));
        assertThat(jdbcTemplate.queriesContaining("lower(\"Email\")")).isEmpty();
        assertThat(jdbcTemplate.updatesContaining("INSERT INTO \"Profiles\"")).isEmpty();
        assertThat(jdbcTemplate.onlyUpdateContaining("SET \"Provider\"").args())
                .containsExactly(
                        "google",
                        "subject-1",
                        "owner@example.com",
                        "Owner",
                        "admin",
                        profileId);
    }

    @Test
    void loginForOAuthUserCreatesProfileWithDefaultProviderAndEmailDisplayFallback() {
        IdentityService.SessionLoginResult result = identityService.loginForOAuthUser(
                null,
                " subject-2 ",
                " User@Example.COM ",
                " ");

        SqlCall profileInsert = jdbcTemplate.onlyUpdateContaining("INSERT INTO \"Profiles\"");
        UUID profileId = (UUID) profileInsert.args().get(0);
        assertThat(profileInsert.args())
                .containsExactly(
                        profileId,
                        "google",
                        "subject-2",
                        "user@example.com",
                        "user@example.com",
                        "user");
        assertThat(jdbcTemplate.onlyUpdateContaining("SET \"Provider\"").args())
                .containsExactly(
                        "google",
                        "subject-2",
                        "user@example.com",
                        "user@example.com",
                        "user",
                        profileId);

        SqlCall sessionInsert = jdbcTemplate.onlyUpdateContaining("INSERT INTO \"AuthSessions\"");
        assertThat(sessionInsert.args().get(1)).isEqualTo(profileId);
        assertThat(sessionInsert.args().get(2)).isEqualTo(result.sessionKey());
    }

    @Test
    void loginForOAuthUserRejectsMissingSubjectOrEmailBeforeJdbcAccess() {
        assertThatThrownBy(() -> identityService.loginForOAuthUser("google", " ", "admin@example.com", "Admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("OAuth profile must include both subject and email.");
        assertThatThrownBy(() -> identityService.loginForOAuthUser("google", "subject", " ", "Admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("OAuth profile must include both subject and email.");

        assertThat(jdbcTemplate.queries).isEmpty();
        assertThat(jdbcTemplate.updates).isEmpty();
    }

    @Test
    void logoutDeletesOnlyNonBlankSessionKeys() {
        identityService.logout(null);
        identityService.logout(" ");

        assertThat(jdbcTemplate.updates).isEmpty();

        identityService.logout("session-key");

        assertThat(jdbcTemplate.updatesContaining("DELETE FROM \"AuthSessions\""))
                .singleElement()
                .satisfies(call -> assertThat(call.args()).containsExactly("session-key"));
    }

    @Test
    void listMembersMapsAdminMemberRows() {
        UUID profileId = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-05-17T01:02:03Z");
        Instant lastLoginAt = Instant.parse("2026-05-17T02:03:04Z");
        jdbcTemplate.memberRows.add(new MemberRow(
                profileId,
                "Admin User",
                "admin@example.com",
                "admin",
                "google",
                createdAt,
                lastLoginAt,
                2));

        assertThat(identityService.listMembers())
                .containsExactly(new IdentityService.AdminMemberItem(
                        profileId,
                        "Admin User",
                        "admin@example.com",
                        "admin",
                        "google",
                        createdAt,
                        lastLoginAt,
                        2));
    }

    private static String providerKey(String provider, String subject) {
        return provider.toLowerCase(Locale.ROOT) + "\n" + subject;
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final Map<String, AppPrincipal> principalBySessionKey = new HashMap<>();
        private final Map<String, UUID> profileIdsByEmail = new HashMap<>();
        private final Map<String, UUID> profileIdsByProviderSubject = new HashMap<>();
        private final List<MemberRow> memberRows = new ArrayList<>();
        private final List<SqlCall> queries = new ArrayList<>();
        private final List<SqlCall> updates = new ArrayList<>();

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            queries.add(new SqlCall(sql, copyArgs(args)));
            try {
                if (sql.contains("FROM \"AuthSessions\"")) {
                    AppPrincipal principal = principalBySessionKey.get((String) args[0]);
                    return principal == null ? List.of() : List.of(mapPrincipal(rowMapper, principal));
                }
                if (sql.contains("WHERE lower(\"Provider\")")) {
                    UUID id = profileIdsByProviderSubject.get(providerKey((String) args[0], (String) args[1]));
                    return id == null ? List.of() : List.of(mapId(rowMapper, id));
                }
                if (sql.contains("WHERE lower(\"Email\")")) {
                    UUID id = profileIdsByEmail.get(((String) args[0]).toLowerCase(Locale.ROOT));
                    return id == null ? List.of() : List.of(mapId(rowMapper, id));
                }
                if (sql.contains("COUNT(s.\"Id\") FILTER")) {
                    List<T> mapped = new ArrayList<>();
                    for (int i = 0; i < memberRows.size(); i++) {
                        mapped.add(mapMember(rowMapper, memberRows.get(i), i));
                    }
                    return mapped;
                }
                return List.of();
            } catch (SQLException ex) {
                throw new AssertionError("Failed to map test JDBC row.", ex);
            }
        }

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper) {
            return query(sql, rowMapper, new Object[0]);
        }

        @Override
        public int update(String sql, Object... args) {
            updates.add(new SqlCall(sql, copyArgs(args)));
            return 1;
        }

        private List<SqlCall> queriesContaining(String fragment) {
            return queries.stream()
                    .filter(call -> call.sql().contains(fragment))
                    .toList();
        }

        private List<SqlCall> updatesContaining(String fragment) {
            return updates.stream()
                    .filter(call -> call.sql().contains(fragment))
                    .toList();
        }

        private SqlCall onlyUpdateContaining(String fragment) {
            List<SqlCall> matches = updatesContaining(fragment);
            assertThat(matches).hasSize(1);
            return matches.get(0);
        }

        private static <T> T mapPrincipal(RowMapper<T> rowMapper, AppPrincipal principal) throws SQLException {
            ResultSet rs = mock(ResultSet.class);
            when(rs.getObject("Id", UUID.class)).thenReturn(principal.profileId());
            when(rs.getString("Email")).thenReturn(principal.email());
            when(rs.getString("DisplayName")).thenReturn(principal.displayName());
            when(rs.getString("Role")).thenReturn(principal.role());
            return rowMapper.mapRow(rs, 0);
        }

        private static <T> T mapId(RowMapper<T> rowMapper, UUID id) throws SQLException {
            ResultSet rs = mock(ResultSet.class);
            when(rs.getObject("Id", UUID.class)).thenReturn(id);
            return rowMapper.mapRow(rs, 0);
        }

        private static <T> T mapMember(RowMapper<T> rowMapper, MemberRow member, int rowNum) throws SQLException {
            ResultSet rs = mock(ResultSet.class);
            when(rs.getObject("Id", UUID.class)).thenReturn(member.id());
            when(rs.getString("DisplayName")).thenReturn(member.displayName());
            when(rs.getString("Email")).thenReturn(member.email());
            when(rs.getString("Role")).thenReturn(member.role());
            when(rs.getString("Provider")).thenReturn(member.provider());
            when(rs.getObject("CreatedAt")).thenReturn(Timestamp.from(member.createdAt()));
            when(rs.getObject("LastLoginAt")).thenReturn(Timestamp.from(member.lastLoginAt()));
            when(rs.getInt("ActiveSessionCount")).thenReturn(member.activeSessionCount());
            return rowMapper.mapRow(rs, rowNum);
        }

        private static List<Object> copyArgs(Object[] args) {
            return new ArrayList<>(Arrays.asList(args));
        }

    }

    private record SqlCall(String sql, List<Object> args) {
    }

    private record MemberRow(
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
