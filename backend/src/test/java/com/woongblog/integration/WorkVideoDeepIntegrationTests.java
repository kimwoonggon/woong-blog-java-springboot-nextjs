package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class WorkVideoDeepIntegrationTests extends IntegrationTestSupport {
    @Test
    void addYouTubeVideoPersistsAndProjectsToAdminAndPublic() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Video Work " + UUID.randomUUID(), "<p>Video body</p>");
        String workId = work.get("id").asText();
        String slug = work.get("slug").asText();

        mockMvc.perform(post("/api/admin/works/{workId}/videos/youtube", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "youtubeUrlOrId", "https://youtu.be/abc123xyz99",
                                "expectedVideosVersion", 0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videosVersion").value(1))
                .andExpect(jsonPath("$.videos[0].sourceType").value("youtube"))
                .andExpect(jsonPath("$.videos[0].sourceKey").value("abc123xyz99"));

        mockMvc.perform(get("/api/admin/works/{id}", workId).cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[0].sourceKey").value("abc123xyz99"))
                .andExpect(jsonPath("$.videos[0].originalFileName").value("YouTube video"));

        mockMvc.perform(get("/api/public/works/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[0].sourceType").value("youtube"))
                .andExpect(jsonPath("$.videos[0].sourceKey").value("abc123xyz99"))
                .andExpect(jsonPath("$.videos[0].originalFileName").doesNotExist());
    }

    @Test
    void addYouTubeVideoRejectsDuplicateVideoId() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Duplicate Video " + UUID.randomUUID(), "<p>Video body</p>");
        String workId = work.get("id").asText();

        addYouTubeVideo(authCookie, csrf, workId, "abc123xyz99", 0);

        mockMvc.perform(post("/api/admin/works/{workId}/videos/youtube", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "youtubeUrlOrId", "https://www.youtube.com/watch?v=abc123xyz99",
                                "expectedVideosVersion", 1))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("This YouTube video is already attached."));
    }

    @Test
    void uploadUrlReturnsNotFoundWhenWorkIsMissing() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(post("/api/admin/works/{workId}/videos/upload-url", UUID.randomUUID())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fileName", "clip.mp4",
                                "contentType", "video/mp4",
                                "size", 1024,
                                "expectedVideosVersion", 0))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Work not found."));
    }

    @Test
    void uploadUrlReturnsBadRequestWhenFileMetadataIsInvalid() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Invalid Upload Metadata " + UUID.randomUUID(), "<p>Video body</p>");

        mockMvc.perform(post("/api/admin/works/{workId}/videos/upload-url", work.get("id").asText())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fileName", "clip.txt",
                                "contentType", "text/plain",
                                "size", 0,
                                "expectedVideosVersion", 0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Valid video file metadata is required."));
    }

    @Test
    void uploadLocalReturnsBadRequestWhenFileIsMissing() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Missing Local File " + UUID.randomUUID(), "<p>Video body</p>");
        JsonNode uploadUrl = issueUploadUrl(authCookie, csrf, work.get("id").asText(), 0);

        mockMvc.perform(multipart("/api/admin/works/{workId}/videos/upload", work.get("id").asText())
                        .param("uploadSessionId", uploadUrl.get("uploadSessionId").asText())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void localUploadConfirmPersistsMetadataStoresFileAndProjectsPublicVideo() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Local Video " + UUID.randomUUID(), "<p>Video body</p>");
        String workId = work.get("id").asText();
        String slug = work.get("slug").asText();
        JsonNode uploadUrl = issueUploadUrl(authCookie, csrf, workId, 0);
        UUID uploadSessionId = UUID.fromString(uploadUrl.get("uploadSessionId").asText());
        String storageKey = uploadUrl.get("storageKey").asText();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "video bytes".getBytes());

        mockMvc.perform(multipart("/api/admin/works/{workId}/videos/upload", workId)
                        .file(file)
                        .param("uploadSessionId", uploadSessionId.toString())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/admin/works/{workId}/videos/confirm", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "uploadSessionId", uploadSessionId,
                                "expectedVideosVersion", 0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videosVersion").value(1))
                .andExpect(jsonPath("$.videos[0].sourceType").value("local"))
                .andExpect(jsonPath("$.videos[0].sourceKey").value(storageKey))
                .andExpect(jsonPath("$.videos[0].originalFileName").value("clip.mp4"));

        assertThat(java.nio.file.Files.exists(java.nio.file.Path.of(System.getProperty("java.io.tmpdir"))
                .resolve("woong-blog-test-media")
                .resolve(storageKey))).isTrue();

        mockMvc.perform(get("/api/public/works/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[0].sourceType").value("local"))
                .andExpect(jsonPath("$.videos[0].playbackUrl").value("/media/" + storageKey))
                .andExpect(jsonPath("$.videos[0].originalFileName").doesNotExist());
    }

    @Test
    void deleteWorkVideoRemovesRecordAndCompactsRemainingSortOrder() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Delete Video " + UUID.randomUUID(), "<p>Video body</p>");
        String workId = work.get("id").asText();
        addYouTubeVideo(authCookie, csrf, workId, "abc123xyz99", 0);
        JsonNode secondAdd = addYouTubeVideo(authCookie, csrf, workId, "def456uvw88", 1);
        String firstVideoId = secondAdd.get("videos").get(0).get("id").asText();

        mockMvc.perform(delete("/api/admin/works/{workId}/videos/{videoId}", workId, firstVideoId)
                        .param("expectedVideosVersion", "2")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videosVersion").value(3))
                .andExpect(jsonPath("$.videos").isArray())
                .andExpect(jsonPath("$.videos[0].sourceKey").value("def456uvw88"))
                .andExpect(jsonPath("$.videos[0].sortOrder").value(0));
    }

    @Test
    void deleteWorkVideoReturnsNotFoundWhenVideoIsMissing() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Missing Delete Video " + UUID.randomUUID(), "<p>Video body</p>");

        mockMvc.perform(delete("/api/admin/works/{workId}/videos/{videoId}", work.get("id").asText(), UUID.randomUUID())
                        .param("expectedVideosVersion", "0")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Video not found."));
    }

    @Test
    void reorderWorkVideosReturnsConflictWhenVideosVersionIsStale() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Stale Reorder " + UUID.randomUUID(), "<p>Video body</p>");
        String workId = work.get("id").asText();
        JsonNode firstAdd = addYouTubeVideo(authCookie, csrf, workId, "abc123xyz99", 0);
        addYouTubeVideo(authCookie, csrf, workId, "def456uvw88", 1);
        List<String> orderedIds = List.of(
                firstAdd.get("videos").get(0).get("id").asText());

        mockMvc.perform(put("/api/admin/works/{workId}/videos/order", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "orderedVideoIds", orderedIds,
                                "expectedVideosVersion", 1))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Videos changed. Refresh and retry."));
    }

    @Test
    void reorderWorkVideosPersistsUpdatedPublicAndAdminOrder() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode work = createWork(authCookie, csrf, "Reorder Videos " + UUID.randomUUID(), "<p>Video body</p>");
        String workId = work.get("id").asText();
        String slug = work.get("slug").asText();
        addYouTubeVideo(authCookie, csrf, workId, "abc123xyz99", 0);
        JsonNode secondAdd = addYouTubeVideo(authCookie, csrf, workId, "def456uvw88", 1);
        String firstVideoId = secondAdd.get("videos").get(0).get("id").asText();
        String secondVideoId = secondAdd.get("videos").get(1).get("id").asText();

        mockMvc.perform(put("/api/admin/works/{workId}/videos/order", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "orderedVideoIds", List.of(secondVideoId, firstVideoId),
                                "expectedVideosVersion", 2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videosVersion").value(3))
                .andExpect(jsonPath("$.videos[0].sourceKey").value("def456uvw88"))
                .andExpect(jsonPath("$.videos[1].sourceKey").value("abc123xyz99"));

        mockMvc.perform(get("/api/public/works/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[0].sourceKey").value("def456uvw88"))
                .andExpect(jsonPath("$.videos[1].sourceKey").value("abc123xyz99"));
    }

    @Test
    void publicWorkVideoQueryReturnsPublishedVideoDataAndHidesDraftWorkVideos() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        JsonNode published = createWork(authCookie, csrf, "Published Video " + UUID.randomUUID(), "<p>Video body</p>");
        JsonNode draft = createWork(authCookie, csrf, "Draft Video " + UUID.randomUUID(), "<p>Video body</p>", "platform", false);

        addYouTubeVideo(authCookie, csrf, published.get("id").asText(), "abc123xyz99", 0);
        addYouTubeVideo(authCookie, csrf, draft.get("id").asText(), "def456uvw88", 0);

        mockMvc.perform(get("/api/public/works/{slug}", published.get("slug").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[0].sourceKey").value("abc123xyz99"));

        mockMvc.perform(get("/api/public/works/{slug}", draft.get("slug").asText()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Work not found."));
    }

    private JsonNode issueUploadUrl(Cookie authCookie, CsrfContext csrf, String workId, int expectedVideosVersion)
            throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/works/{workId}/videos/upload-url", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fileName", "clip.mp4",
                                "contentType", "video/mp4",
                                "size", 1024,
                                "expectedVideosVersion", expectedVideosVersion))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadMethod").value("local"))
                .andExpect(jsonPath("$.uploadUrl").exists())
                .andExpect(jsonPath("$.storageKey").exists())
                .andReturn();
        return body(result);
    }

    private JsonNode addYouTubeVideo(
            Cookie authCookie,
            CsrfContext csrf,
            String workId,
            String youtubeUrlOrId,
            int expectedVideosVersion) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/works/{workId}/videos/youtube", workId)
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "youtubeUrlOrId", youtubeUrlOrId,
                                "expectedVideosVersion", expectedVideosVersion))))
                .andExpect(status().isOk())
                .andReturn();
        return body(result);
    }
}
