package com.woongblog.content;

import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DbSeeder implements ApplicationRunner {
    private final JdbcTemplate jdbcTemplate;

    public DbSeeder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        Integer settingsCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM \"SiteSettings\"", Integer.class);
        if (settingsCount != null && settingsCount > 0) {
            ensureSupplementalContent();
            return;
        }
        seedInitialContent();
    }

    private void seedInitialContent() {
        seedAssets();
        jdbcTemplate.update("""
                INSERT INTO "SiteSettings" ("Singleton", "OwnerName", "Tagline", "GitHubUrl", "LinkedInUrl", "ResumeAssetId")
                VALUES (true, 'Woonggon Kim', 'Creative Technologist', 'https://github.com/woong', 'https://linkedin.com/in/woong', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
                ON CONFLICT ("Singleton") DO NOTHING
                """);
        jdbcTemplate.update("""
                INSERT INTO "Profiles" ("Id", "Email", "DisplayName", "Provider", "ProviderSubject", "Role")
                VALUES
                  ('11111111-1111-1111-1111-111111111111', 'admin@example.com', 'Admin User', 'google', 'seed-admin-subject', 'admin'),
                  ('22222222-2222-2222-2222-222222222222', 'user@example.com', 'Seed User', 'google', 'seed-user-subject', 'user')
                ON CONFLICT ("Id") DO NOTHING
                """);
        jdbcTemplate.update("""
                INSERT INTO "Pages" ("Id", "Slug", "Title", "ContentJson")
                VALUES
                  ('90000000-0000-0000-0000-000000000001', 'home', 'Home', '{"headline":"Hi, I am Woonggon","introText":"I build products across frontend, backend, AI tooling, and developer workflow systems with a bias for pragmatic delivery."}'::jsonb),
                  ('90000000-0000-0000-0000-000000000002', 'introduction', 'Introduction', '{"html":"<p>I work across product engineering, architecture, and delivery systems. My focus is to turn vague product ideas into stable and maintainable software.</p><p>This seeded introduction exists so the frontend can immediately render against PostgreSQL-backed content.</p>"}'::jsonb),
                  ('90000000-0000-0000-0000-000000000003', 'contact', 'Contact', '{"html":"<p>Use the contact links below or connect through GitHub and LinkedIn.</p>"}'::jsonb)
                ON CONFLICT ("Slug") DO NOTHING
                """);
        seedPrimaryWorksAndBlogs();
        ensureSupplementalContent();
    }

    private void seedAssets() {
        jdbcTemplate.update("""
                INSERT INTO "Assets" ("Id", "Bucket", "Path", "PublicUrl", "MimeType", "Kind", "Size", "CreatedBy")
                VALUES
                  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'media', 'resume/woonggon-kim-resume.pdf', '/media/resume/woonggon-kim-resume.pdf', 'application/pdf', 'pdf', 182432, '11111111-1111-1111-1111-111111111111'),
                  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'media', 'works/seeded-work-thumb.png', '/media/works/seeded-work-thumb.png', 'image/png', 'image', 48000, '11111111-1111-1111-1111-111111111111'),
                  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'media', 'works/platform-rebuild-thumb.png', '/media/works/platform-rebuild-thumb.png', 'image/png', 'image', 52000, '11111111-1111-1111-1111-111111111111'),
                  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'media', 'works/seeded-work-icon.png', '/media/works/seeded-work-icon.png', 'image/png', 'image', 8000, '11111111-1111-1111-1111-111111111111'),
                  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'media', 'blogs/seeded-blog-cover.png', '/media/blogs/seeded-blog-cover.png', 'image/png', 'image', 31000, '11111111-1111-1111-1111-111111111111'),
                  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'media', 'blogs/engineering-notes-cover.png', '/media/blogs/engineering-notes-cover.png', 'image/png', 'image', 29000, '11111111-1111-1111-1111-111111111111')
                ON CONFLICT ("Id") DO NOTHING
                """);
    }

    private void seedPrimaryWorksAndBlogs() {
        jdbcTemplate.update("""
                INSERT INTO "Works" ("Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "SearchTitle", "SearchText", "ThumbnailAssetId", "PublicThumbnailUrl", "IconAssetId", "PublicIconUrl", "Category", "Period", "AllPropertiesJson", "Tags", "VideosVersion", "Published", "PublishedAt")
                VALUES
                  ('80000000-0000-0000-0000-000000000001', 'seeded-work', 'Portfolio Platform Rebuild', 'Rebuilt the portfolio stack around clearer domain boundaries, richer content modeling, and operational simplicity.', '{"html":"<h2>Overview</h2><p>This seeded case study represents a platform rebuild that spans frontend UX, backend APIs, and deployment ergonomics.</p><h2>Highlights</h2><ul><li>React + TypeScript frontend</li><li>Spring Boot backend</li><li>PostgreSQL domain model</li></ul>"}'::jsonb, '<h2>Overview</h2><p>This seeded case study represents a platform rebuild that spans frontend UX, backend APIs, and deployment ergonomics.</p><h2>Highlights</h2><ul><li>React + TypeScript frontend</li><li>Spring Boot backend</li><li>PostgreSQL domain model</li></ul>', 'portfolio platform rebuild', 'platform frontend backend postgresql', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '/media/works/seeded-work-thumb.png', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '/media/works/seeded-work-icon.png', 'platform', '2025.12 - 2026.03', '{"teamSize":1,"role":"full-stack","status":"seeded"}'::jsonb, ARRAY['react','nextjs','spring','postgres']::text[], 1, true, now() - interval '7 days'),
                  ('80000000-0000-0000-0000-000000000002', 'internal-admin-workbench', 'Internal Admin Workbench', 'Designed a cleaner admin workflow with shared editor chrome, preview-first ergonomics, and better information architecture.', '{"html":"<h2>Problem</h2><p>The admin experience felt like a separate product with weak draft preview.</p><h2>Result</h2><p>The workbench concept unified list, edit, preview, and publishing workflows.</p>"}'::jsonb, '<h2>Problem</h2><p>The admin experience felt like a separate product with weak draft preview.</p><h2>Result</h2><p>The workbench concept unified list, edit, preview, and publishing workflows.</p>', 'internal admin workbench', 'admin workflow preview', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '/media/works/platform-rebuild-thumb.png', NULL, '', 'admin', '2026.01 - 2026.03', '{"teamSize":1,"role":"ux-engineering","status":"seeded"}'::jsonb, ARRAY['admin','ux','workflow']::text[], 0, true, now() - interval '3 days')
                ON CONFLICT ("Slug") DO NOTHING
                """);
        jdbcTemplate.update("""
                INSERT INTO "WorkVideos" ("Id", "WorkId", "SourceType", "SourceKey", "OriginalFileName", "SortOrder")
                VALUES
                  ('12121212-1212-1212-1212-121212121212', '80000000-0000-0000-0000-000000000001', 'youtube', 'dQw4w9WgXcQ', 'Seed Overview', 0),
                  ('34343434-3434-3434-3434-343434343434', '80000000-0000-0000-0000-000000000001', 'youtube', 'M7lc1UVf-VE', 'Seed Demo', 1)
                ON CONFLICT ("Id") DO NOTHING
                """);
        jdbcTemplate.update("""
                INSERT INTO "Blogs" ("Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "SearchTitle", "SearchText", "CoverAssetId", "PublicCoverUrl", "Tags", "Published", "PublishedAt")
                VALUES
                  ('70000000-0000-0000-0000-000000000001', 'seeded-blog', 'Designing a Seed-First Migration Strategy', 'Why seed data is often the fastest way to stabilize a new architecture before historical migration work is complete.', '{"html":"<h2>Why Start With Seed Data</h2><p>Seed data gives frontend and backend teams something concrete to build against from day one.</p><h3>Reduce Coordination Cost</h3><p>That reduces ambiguity and improves testability.</p><h2>What To Stabilize First</h2><p>Lock the happy path before historical backfill.</p>"}'::jsonb, '<h2>Why Start With Seed Data</h2><p>Seed data gives frontend and backend teams something concrete to build against from day one.</p><h3>Reduce Coordination Cost</h3><p>That reduces ambiguity and improves testability.</p><h2>What To Stabilize First</h2><p>Lock the happy path before historical backfill.</p>', 'designing a seed first migration strategy', 'seed data architecture migration', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '/media/blogs/seeded-blog-cover.png', ARRAY['seed','migration','architecture']::text[], true, now() - interval '5 days'),
                  ('70000000-0000-0000-0000-000000000002', 'engineering-notes-on-bff-auth', 'Engineering Notes on BFF-Style Auth', 'Keeping authentication in the backend simplifies session handling and reduces token sprawl in the browser.', '{"html":"<h2>Why BFF Works</h2><p>BFF auth centralizes session ownership in the backend and keeps the browser thinner.</p>"}'::jsonb, '<h2>Why BFF Works</h2><p>BFF auth centralizes session ownership in the backend and keeps the browser thinner.</p>', 'engineering notes on bff style auth', 'bff auth session browser', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '/media/blogs/engineering-notes-cover.png', ARRAY['auth','bff','security']::text[], true, now() - interval '1 day')
                ON CONFLICT ("Slug") DO NOTHING
                """);
    }

    private void ensureSupplementalContent() {
        for (int index = 1; index <= 18; index += 1) {
            jdbcTemplate.update("""
                    INSERT INTO "Works" ("Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "SearchTitle", "SearchText", "Category", "Period", "AllPropertiesJson", "Tags", "VideosVersion", "Published", "PublishedAt", "CreatedAt", "UpdatedAt")
                    VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, '2026.01 - 2026.04', '{"status":"supplemental-seed"}'::jsonb, ARRAY['seed','pagination','work']::text[], ?, true, now() - (? * interval '1 day'), now(), now())
                    ON CONFLICT ("Slug") DO NOTHING
                    """,
                    UUID.randomUUID(),
                    "seeded-work-extra-%02d".formatted(index),
                    "Seeded Work Extra %02d".formatted(index),
                    "Supplemental seeded work item %02d for pagination and related-content verification.".formatted(index),
                    "{\"html\":\"<h2>Supplemental Work %02d</h2><p>This extra seeded work keeps archive pagination deterministic.</p>\"}".formatted(index),
                    "<h2>Supplemental Work %02d</h2><p>This extra seeded work keeps archive pagination deterministic.</p>".formatted(index),
                    "seeded work extra %02d".formatted(index),
                    "supplemental seeded work pagination",
                    index % 2 == 0 ? "platform" : "workflow",
                    0,
                    10 + index);
            jdbcTemplate.update("""
                    INSERT INTO "Blogs" ("Id", "Slug", "Title", "Excerpt", "ContentJson", "PublicContentHtml", "SearchTitle", "SearchText", "Tags", "Published", "PublishedAt", "CreatedAt", "UpdatedAt")
                    VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, ARRAY['seed','pagination','study']::text[], true, now() - (? * interval '1 day'), now(), now())
                    ON CONFLICT ("Slug") DO NOTHING
                    """,
                    UUID.randomUUID(),
                    "seeded-blog-extra-%02d".formatted(index),
                    "Seeded Study Extra %02d".formatted(index),
                    "Supplemental seeded study note %02d for pagination and typography verification.".formatted(index),
                    "{\"html\":\"<h2>Supplemental Study %02d</h2><p>This extra seeded study gives public pagination enough content.</p>\"}".formatted(index),
                    "<h2>Supplemental Study %02d</h2><p>This extra seeded study gives public pagination enough content.</p>".formatted(index),
                    "seeded study extra %02d".formatted(index),
                    "supplemental seeded study pagination",
                    10 + index);
        }
    }
}
