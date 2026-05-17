package com.woongblog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.woongblog.common.ApiExceptionHandler;
import com.woongblog.common.NotFoundException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
@Tag("web")
@Tag("component")
class MediaControllerWebMvcTest {
    @Mock
    private MediaService mediaService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new MediaController(mediaService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void uploadUsesDefaultBucketWhenRequestOmitsBucket() throws Exception {
        UUID id = UUID.randomUUID();
        when(mediaService.upload(any(MultipartFile.class), eq("uploads")))
                .thenReturn(Map.of("id", id, "url", "/media/uploads/avatar.png", "path", "uploads/avatar.png"));
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "png".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/uploads").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.url").value("/media/uploads/avatar.png"))
                .andExpect(jsonPath("$.path").value("uploads/avatar.png"));

        ArgumentCaptor<MultipartFile> fileCaptor = ArgumentCaptor.forClass(MultipartFile.class);
        verify(mediaService).upload(fileCaptor.capture(), eq("uploads"));
        assertThat(fileCaptor.getValue().getOriginalFilename()).isEqualTo("avatar.png");
    }

    @Test
    void uploadPassesExplicitBucketToService() throws Exception {
        when(mediaService.upload(any(MultipartFile.class), eq("work-hero")))
                .thenReturn(Map.of("url", "/media/work-hero/hero.jpg", "path", "work-hero/hero.jpg"));
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "hero.jpg",
                "image/jpeg",
                "jpg".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/uploads").file(file).param("bucket", "work-hero"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("/media/work-hero/hero.jpg"));

        verify(mediaService).upload(any(MultipartFile.class), eq("work-hero"));
    }

    @Test
    void deletePassesAssetIdToService() throws Exception {
        UUID id = UUID.randomUUID();
        when(mediaService.delete(id)).thenReturn(Map.of("success", true));

        mockMvc.perform(delete("/api/uploads").param("id", id.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(mediaService).delete(id);
    }

    @Test
    void deleteMapsNotFoundExceptionToJsonError() throws Exception {
        UUID id = UUID.randomUUID();
        when(mediaService.delete(id)).thenThrow(new NotFoundException("Asset not found"));

        mockMvc.perform(delete("/api/uploads").param("id", id.toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Asset not found"));
    }
}
