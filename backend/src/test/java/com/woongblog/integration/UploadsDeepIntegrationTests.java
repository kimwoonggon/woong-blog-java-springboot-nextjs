package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

@Tag("integration")
class UploadsDeepIntegrationTests extends IntegrationTestSupport {
    @Test
    void uploadWithoutFileReturnsBadRequest() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(multipart("/api/uploads")
                        .param("bucket", "public-resume")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadPdfCreatesAssetAndDeleteRemovesIt() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                "%PDF-1.7 test".getBytes());

        MvcResult uploadResult = mockMvc.perform(multipart("/api/uploads")
                        .file(file)
                        .param("bucket", "public-resume")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/media/public-resume/")))
                .andReturn();
        JsonNode uploaded = body(uploadResult);
        UUID assetId = UUID.fromString(uploaded.get("id").asText());

        Integer persisted = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM \"Assets\" WHERE \"Id\" = ? AND \"Bucket\" = ? AND \"MimeType\" = ?",
                Integer.class,
                assetId,
                "public-resume",
                "application/pdf");
        assertThat(persisted).isEqualTo(1);

        mockMvc.perform(delete("/api/uploads")
                        .param("id", assetId.toString())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Integer remaining = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM \"Assets\" WHERE \"Id\" = ?",
                Integer.class,
                assetId);
        assertThat(remaining).isZero();
    }

    @Test
    void uploadUnsupportedImageReturnsBadRequestBeforePersistingAsset() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "legacy.bmp",
                "image/bmp",
                new byte[] {0, 1, 2, 3});

        mockMvc.perform(multipart("/api/uploads")
                        .file(file)
                        .param("bucket", "images")
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Unsupported image type."));

        Integer persisted = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM \"Assets\" WHERE \"Path\" LIKE ?",
                Integer.class,
                "%legacy.bmp");
        assertThat(persisted).isZero();
    }

    @Test
    void deleteMissingAssetReturnsNotFound() throws Exception {
        Cookie authCookie = testLoginCookie();
        CsrfContext csrf = csrfContext(authCookie);

        mockMvc.perform(delete("/api/uploads")
                        .param("id", UUID.randomUUID().toString())
                        .cookie(authCookie)
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Asset not found"));
    }
}
