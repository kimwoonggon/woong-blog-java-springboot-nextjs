package com.woongblog.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woongblog.common.BadRequestException;
import com.woongblog.common.ConflictException;
import com.woongblog.common.JsonSupport;
import com.woongblog.common.NotFoundException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
class ContentServiceBehaviorTests {
    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void missingPublicAndAdminContentQueriesRaiseNotFound() {
        when(jdbcTemplate.query(
                anyString(),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any(),
                any()))
                .thenAnswer(invocation -> extractMissingRow(invocation.getArgument(1)));
        when(jdbcTemplate.query(
                anyString(),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any()))
                .thenAnswer(invocation -> extractMissingRow(invocation.getArgument(1)));

        ContentService service = contentService();

        assertThatThrownBy(() -> service.publicBlog("missing-blog"))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Blog not found.");
        assertThatThrownBy(() -> service.publicWork("missing-work"))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Work not found.");
        assertThatThrownBy(() -> service.publicPage("missing-page"))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Page not found.");
        assertThatThrownBy(service::publicSiteSettings)
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Site settings not found.");
        assertThatThrownBy(service::publicResume)
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Resume not found.");
        assertThatThrownBy(() -> service.adminBlog(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Blog not found.");
        assertThatThrownBy(() -> service.adminWork(UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Work not found.");
        assertThatThrownBy(service::adminSiteSettings)
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Site settings not found.");
    }

    @Test
    void adminDashboardDefaultsMissingCountsToZero() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(null, 2L, null);

        Map<String, Object> dashboard = contentService().adminDashboard();

        assertThat(dashboard)
                .containsEntry("worksCount", 0L)
                .containsEntry("blogsCount", 2L)
                .containsEntry("viewsCount", 0L);
    }

    @Test
    void publicHomeBuildsSummaryAndFallsBackWhenResumeIsMissing() {
        when(jdbcTemplate.query(
                anyString(),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any(),
                any()))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0);
                    ResultSetExtractor<Map<String, Object>> extractor = invocation.getArgument(1);
                    if (sql.contains("FROM \"Pages\"")) {
                        return extractor.extractData(pageRow());
                    }
                    return extractMissingRow(extractor);
                });
        when(jdbcTemplate.query(
                anyString(),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any()))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0);
                    ResultSetExtractor<Map<String, Object>> extractor = invocation.getArgument(1);
                    if (sql.contains("FROM \"SiteSettings\"") && !sql.contains("INNER JOIN")) {
                        return extractor.extractData(siteSettingsRow());
                    }
                    return extractMissingRow(extractor);
                });
        when(jdbcTemplate.query(
                contains("FROM \"Works\""),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                eq(6),
                eq(0)))
                .thenReturn(List.of());
        when(jdbcTemplate.query(
                contains("FROM \"Blogs\""),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                eq(6),
                eq(0)))
                .thenReturn(List.of());

        Map<String, Object> home = contentService().publicHome();

        assertThat(home.get("homePage"))
                .isEqualTo(Map.of("title", "Home", "contentJson", "{\"html\":\"<h1>Hello</h1>\"}"));
        assertThat(home.get("siteSettings"))
                .isEqualTo(Map.of(
                        "ownerName", "Woong",
                        "tagline", "Build notes",
                        "gitHubUrl", "https://github.com/kimwoonggon",
                        "linkedInUrl", "https://linkedin.example/woong",
                        "resumePublicUrl", ""));
        assertThat(home.get("featuredWorks")).isEqualTo(List.of());
        assertThat(home.get("recentPosts")).isEqualTo(List.of());
    }

    @Test
    void blogContextReturnsNullAdjacentItemsWhenCurrentPublishDateIsMissingAndClampsLimit() throws Exception {
        when(jdbcTemplate.queryForObject(contains("COUNT(*) FROM \"Blogs\""), eq(Integer.class), eq("current")))
                .thenReturn(1);
        when(jdbcTemplate.query(
                contains("SELECT \"PublishedAt\""),
                ArgumentMatchers.<ResultSetExtractor<Map<String, Object>>>any(),
                eq("current")))
                .thenAnswer(invocation -> {
                    ResultSetExtractor<Map<String, Object>> extractor = invocation.getArgument(1);
                    ResultSet resultSet = mock(ResultSet.class);
                    when(resultSet.next()).thenReturn(true);
                    when(resultSet.getObject("PublishedAt")).thenReturn(null);
                    return extractor.extractData(resultSet);
                });
        when(jdbcTemplate.query(
                contains("ORDER BY \"PublishedAt\" DESC NULLS LAST LIMIT ?"),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                eq("current"),
                eq(24)))
                .thenReturn(List.of());

        Map<String, Object> context = contentService().publicBlogContext("current", 100);

        assertThat(context)
                .containsEntry("newer", null)
                .containsEntry("older", null)
                .containsEntry("related", List.of());
    }

    @Test
    void publicWorkContextThrowsWhenCurrentSlugIsMissing() {
        when(jdbcTemplate.queryForObject(contains("COUNT(*) FROM \"Works\""), eq(Integer.class), eq("missing")))
                .thenReturn(0);

        assertThatThrownBy(() -> contentService().publicWorkContext("missing", 5))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Content not found.");
    }

    @Test
    void adminPagesUsesAllPagesQueryWhenSlugFilterIsEmpty() {
        when(jdbcTemplate.query(
                contains("FROM \"Pages\" ORDER BY \"Slug\""),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any()))
                .thenReturn(List.of());

        assertThat(contentService().adminPages(List.of())).isEmpty();
    }

    @Test
    void updateAndDeleteOperationsRaiseNotFoundWhenNoRowsChange() {
        UUID id = UUID.randomUUID();
        when(jdbcTemplate.update(contains("UPDATE \"Pages\""), eq("Title"), eq("{\"html\":\"<p>x</p>\"}"), eq(id)))
                .thenReturn(0);
        when(jdbcTemplate.update(contains("UPDATE \"SiteSettings\""), any(), any(), any(), any(), any(), any(), any(), eq(false), any()))
                .thenReturn(0);
        when(jdbcTemplate.update(contains("DELETE FROM \"Blogs\""), eq(id))).thenReturn(0);
        when(jdbcTemplate.update(contains("DELETE FROM \"Works\""), eq(id))).thenReturn(0);

        ContentService service = contentService();

        assertThatThrownBy(() -> service.updatePage(new ContentService.UpdatePageRequest(
                id,
                "Title",
                "{\"html\":\"<p>x</p>\"}")))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Page not found.");
        assertThatThrownBy(() -> service.updateSiteSettings(new ContentService.UpdateSiteSettingsRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                null)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Site settings not found.");
        assertThatThrownBy(() -> service.deleteBlog(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Blog not found.");
        assertThatThrownBy(() -> service.deleteWork(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Work not found.");
    }

    @Test
    void createWorkUsesUniqueSlugFallbackThumbnailAndSocialShareMessage() throws Exception {
        UUID thumbnailAssetId = UUID.randomUUID();
        UUID iconAssetId = UUID.randomUUID();
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        java.sql.Array tagArray = mock(java.sql.Array.class);
        when(jdbcTemplate.queryForObject(contains("FROM \"Works\" WHERE \"Slug\" = ?"), eq(Integer.class), eq("portfolio-work")))
                .thenReturn(1);
        when(jdbcTemplate.queryForObject(contains("FROM \"Works\" WHERE \"Slug\" = ?"), eq(Integer.class), eq("portfolio-work-2")))
                .thenReturn(0);
        when(jdbcTemplate.execute(ArgumentMatchers.<ConnectionCallback<Integer>>any()))
                .thenAnswer(invocation -> {
                    ConnectionCallback<Integer> callback = invocation.getArgument(0);
                    when(connection.prepareStatement(anyString())).thenReturn(statement);
                    when(connection.createArrayOf(eq("text"), any(Object[].class))).thenReturn(tagArray);
                    when(statement.execute()).thenReturn(false);
                    when(statement.getUpdateCount()).thenReturn(1);
                    return callback.doInConnection(connection);
                });

        Map<String, Object> created = contentService().createWork(new ContentService.WorkMutationRequest(
                "Portfolio Work",
                "  Work excerpt  ",
                "  Case Study  ",
                "2024",
                List.of("spring", "testing"),
                true,
                "{\"html\":\"<p><img src=\\\"/images/work.png\\\"></p>\"}",
                "{\"socialShareMessage\":\"Share this work\"}",
                thumbnailAssetId,
                iconAssetId));

        assertThat(created)
                .containsEntry("slug", "portfolio-work-2")
                .containsKey("id");
        verify(statement).setObject(eq(11), eq("/images/work.png"));
        verify(statement).setObject(eq(17), eq("Share this work"));
        verify(statement).setArray(eq(18), eq(tagArray));
        verify(statement).execute();
    }

    @Test
    void addYouTubeVideoRejectsBlankInputAndDuplicateVideoIds() {
        UUID workId = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(contains("SELECT \"VideosVersion\""), eq(Integer.class), eq(workId)))
                .thenReturn(1);

        assertThatThrownBy(() -> contentService().addYouTubeVideo(
                workId,
                new ContentService.AddYouTubeVideoRequest("   ", 1)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid YouTube URL.");

        when(jdbcTemplate.queryForObject(contains("COUNT(*) FROM \"WorkVideos\""), eq(Integer.class), eq(workId), eq("abc123xyz")))
                .thenReturn(1);

        assertThatThrownBy(() -> contentService().addYouTubeVideo(
                workId,
                new ContentService.AddYouTubeVideoRequest("https://www.youtube.com/watch?v=abc123xyz&t=5", 1)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("This YouTube video is already attached.");
    }

    @Test
    void addYouTubeVideoAcceptsRawIdAndDefaultsMissingVersionAfterIncrement() {
        UUID workId = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(contains("SELECT \"VideosVersion\""), eq(Integer.class), eq(workId)))
                .thenReturn(3, (Integer) null);
        when(jdbcTemplate.queryForObject(contains("COUNT(*) FROM \"WorkVideos\""), eq(Integer.class), eq(workId), eq("abc123raw")))
                .thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("COALESCE(MAX"), eq(Integer.class), eq(workId))).thenReturn(null);
        when(jdbcTemplate.update(contains("INSERT INTO \"WorkVideos\""), any(UUID.class), eq(workId), eq("abc123raw"), eq(0)))
                .thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE \"Works\""), eq(workId))).thenReturn(1);
        when(jdbcTemplate.query(
                contains("\"SourceType\""),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                eq(workId)))
                .thenReturn(List.of());

        Map<String, Object> result = contentService().addYouTubeVideo(
                workId,
                new ContentService.AddYouTubeVideoRequest("abc123raw", 3));

        assertThat(result)
                .containsEntry("videosVersion", 0)
                .containsEntry("videos_version", 0)
                .containsEntry("videos", List.of());
    }

    @Test
    void videosExposePlaybackPreviewMetadataAndAdminFields() throws Exception {
        UUID workId = UUID.randomUUID();
        when(jdbcTemplate.query(
                contains("FROM \"WorkVideos\""),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                eq(workId)))
                .thenAnswer(invocation -> {
                    RowMapper<Map<String, Object>> mapper = invocation.getArgument(1);
                    return List.of(
                            mapper.mapRow(videoRow("youtube", "https://cdn.example/video.mp4", null, "", 0), 0),
                            mapper.mapRow(videoRow("local", "local:uploads/work.mp4", "https://cdn.example/timeline.vtt", "local:sprite.jpg", 1), 1),
                            mapper.mapRow(videoRow("hls", "r2:videos/master.m3u8", "r2:timeline.vtt", "sprite.png", 2), 2),
                            mapper.mapRow(videoRow("hls", "videos/raw-master.m3u8", "local:timeline.vtt", "r2:sprite.png", 3), 3),
                            mapper.mapRow(videoRow("youtube", "abc123raw", null, null, 4), 4),
                            mapper.mapRow(videoRow("youtube", null, null, null, 5), 5));
                });

        List<Map<String, Object>> videos = contentService().videos(workId, true);

        assertThat(videos).hasSize(6);
        assertThat(videos.get(0))
                .containsEntry("playbackUrl", "https://cdn.example/video.mp4")
                .containsEntry("timelinePreviewVttUrl", null)
                .containsEntry("timelinePreviewSpriteUrl", null)
                .containsKey("originalFileName")
                .containsKey("fileSize")
                .containsKey("createdAt");
        assertThat(videos.get(1))
                .containsEntry("playbackUrl", "/media/uploads/work.mp4")
                .containsEntry("timelinePreviewVttUrl", "https://cdn.example/timeline.vtt")
                .containsEntry("timelinePreviewSpriteUrl", "/media/sprite.jpg");
        assertThat(videos.get(2))
                .containsEntry("playbackUrl", "/media/videos/master.m3u8")
                .containsEntry("timelinePreviewVttUrl", "/media/timeline.vtt")
                .containsEntry("timelinePreviewSpriteUrl", "/media/sprite.png");
        assertThat(videos.get(3))
                .containsEntry("playbackUrl", "/media/videos/raw-master.m3u8")
                .containsEntry("timelinePreviewVttUrl", "/media/timeline.vtt")
                .containsEntry("timelinePreviewSpriteUrl", "/media/sprite.png");
        assertThat(videos.get(4)).containsEntry("playbackUrl", null);
        assertThat(videos.get(5)).containsEntry("playbackUrl", null);
    }

    @Test
    void deleteVideoResequencesRemainingVideosAndReturnsUpdatedVersion() throws Exception {
        UUID workId = UUID.randomUUID();
        UUID deletedVideoId = UUID.randomUUID();
        UUID firstRemaining = UUID.randomUUID();
        UUID secondRemaining = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(contains("SELECT \"VideosVersion\""), eq(Integer.class), eq(workId)))
                .thenReturn(2, 3);
        when(jdbcTemplate.update(contains("DELETE FROM \"WorkVideos\""), eq(workId), eq(deletedVideoId))).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE \"WorkVideos\" SET \"SortOrder\""), eq(0), eq(firstRemaining))).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE \"WorkVideos\" SET \"SortOrder\""), eq(1), eq(secondRemaining))).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE \"Works\""), eq(workId))).thenReturn(1);
        when(jdbcTemplate.query(
                contains("\"SourceType\""),
                ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                eq(workId)))
                .thenReturn(List.of());
        when(jdbcTemplate.query(
                contains("SELECT \"Id\" FROM \"WorkVideos\""),
                ArgumentMatchers.<RowMapper<UUID>>any(),
                eq(workId)))
                .thenAnswer(invocation -> {
                    RowMapper<UUID> mapper = invocation.getArgument(1);
                    return List.of(
                            mapper.mapRow(idRow(firstRemaining), 0),
                            mapper.mapRow(idRow(secondRemaining), 1));
                });

        Map<String, Object> result = contentService().deleteVideo(workId, deletedVideoId, 2);

        assertThat(result)
                .containsEntry("videosVersion", 3)
                .containsEntry("videos_version", 3)
                .containsEntry("videos", List.of());
        verify(jdbcTemplate).update(contains("UPDATE \"WorkVideos\" SET \"SortOrder\""), eq(0), eq(firstRemaining));
        verify(jdbcTemplate).update(contains("UPDATE \"WorkVideos\" SET \"SortOrder\""), eq(1), eq(secondRemaining));
    }

    @Test
    void deleteVideoThrowsWhenTheVideoIsMissing() {
        UUID workId = UUID.randomUUID();
        UUID videoId = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(contains("SELECT \"VideosVersion\""), eq(Integer.class), eq(workId)))
                .thenReturn(1);
        when(jdbcTemplate.update(contains("DELETE FROM \"WorkVideos\""), eq(workId), eq(videoId))).thenReturn(0);

        assertThatThrownBy(() -> contentService().deleteVideo(workId, videoId, 1))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Video not found.");
    }

    private ContentService contentService() {
        return new ContentService(jdbcTemplate, new JsonSupport(new ObjectMapper()));
    }

    private static Object extractMissingRow(ResultSetExtractor<Map<String, Object>> extractor) throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.next()).thenReturn(false);
        return extractor.extractData(resultSet);
    }

    private static ResultSet pageRow() throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.next()).thenReturn(true);
        when(resultSet.getObject("Id", UUID.class)).thenReturn(UUID.randomUUID());
        when(resultSet.getString("Slug")).thenReturn("home");
        when(resultSet.getString("Title")).thenReturn("Home");
        when(resultSet.getString("ContentJson")).thenReturn("{\"html\":\"<h1>Hello</h1>\"}");
        return resultSet;
    }

    private static ResultSet siteSettingsRow() throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.next()).thenReturn(true);
        when(resultSet.getString("OwnerName")).thenReturn("Woong");
        when(resultSet.getString("Tagline")).thenReturn("Build notes");
        when(resultSet.getString("FacebookUrl")).thenReturn("");
        when(resultSet.getString("InstagramUrl")).thenReturn("");
        when(resultSet.getString("TwitterUrl")).thenReturn("");
        when(resultSet.getString("LinkedInUrl")).thenReturn("https://linkedin.example/woong");
        when(resultSet.getString("GitHubUrl")).thenReturn("https://github.com/kimwoonggon");
        return resultSet;
    }

    private static ResultSet videoRow(
            String sourceType,
            String sourceKey,
            String timelinePreviewVttStorageKey,
            String timelinePreviewSpriteStorageKey,
            int sortOrder) throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getObject("Id", UUID.class)).thenReturn(UUID.randomUUID());
        when(resultSet.getString("SourceType")).thenReturn(sourceType);
        when(resultSet.getString("SourceKey")).thenReturn(sourceKey);
        when(resultSet.getString("OriginalFileName")).thenReturn("clip-" + sortOrder + ".mp4");
        when(resultSet.getString("MimeType")).thenReturn("video/mp4");
        when(resultSet.getLong("FileSize")).thenReturn(1024L + sortOrder);
        when(resultSet.getInt("Width")).thenReturn(1920);
        when(resultSet.getInt("Height")).thenReturn(1080);
        when(resultSet.getDouble("DurationSeconds")).thenReturn(12.5D);
        when(resultSet.getString("TimelinePreviewVttStorageKey")).thenReturn(timelinePreviewVttStorageKey);
        when(resultSet.getString("TimelinePreviewSpriteStorageKey")).thenReturn(timelinePreviewSpriteStorageKey);
        when(resultSet.getInt("SortOrder")).thenReturn(sortOrder);
        when(resultSet.getObject("CreatedAt")).thenReturn(Instant.parse("2026-05-17T00:00:00Z"));
        when(resultSet.wasNull()).thenReturn(false);
        return resultSet;
    }

    private static ResultSet idRow(UUID id) throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getObject("Id", UUID.class)).thenReturn(id);
        return resultSet;
    }
}
