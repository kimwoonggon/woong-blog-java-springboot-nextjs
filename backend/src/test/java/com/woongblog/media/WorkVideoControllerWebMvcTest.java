package com.woongblog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.woongblog.application.media.AddYouTubeWorkVideoCommand;
import com.woongblog.application.media.AddYouTubeWorkVideoCommandHandler;
import com.woongblog.application.media.ConfirmWorkVideoUploadCommand;
import com.woongblog.application.media.ConfirmWorkVideoUploadCommandHandler;
import com.woongblog.application.media.CreateWorkVideoHlsJobCommand;
import com.woongblog.application.media.CreateWorkVideoHlsJobCommandHandler;
import com.woongblog.application.media.DeleteWorkVideoCommand;
import com.woongblog.application.media.DeleteWorkVideoCommandHandler;
import com.woongblog.application.media.IssueWorkVideoUploadUrlCommand;
import com.woongblog.application.media.IssueWorkVideoUploadUrlCommandHandler;
import com.woongblog.application.media.ReorderWorkVideosCommand;
import com.woongblog.application.media.ReorderWorkVideosCommandHandler;
import com.woongblog.application.media.UploadWorkVideoCommand;
import com.woongblog.application.media.UploadWorkVideoCommandHandler;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@Tag("web")
@Tag("component")
class WorkVideoControllerWebMvcTest {
    @Mock
    private IssueWorkVideoUploadUrlCommandHandler issueUploadUrlHandler;

    @Mock
    private UploadWorkVideoCommandHandler uploadHandler;

    @Mock
    private ConfirmWorkVideoUploadCommandHandler confirmUploadHandler;

    @Mock
    private CreateWorkVideoHlsJobCommandHandler hlsJobHandler;

    @Mock
    private AddYouTubeWorkVideoCommandHandler addYouTubeHandler;

    @Mock
    private ReorderWorkVideosCommandHandler reorderVideosHandler;

    @Mock
    private DeleteWorkVideoCommandHandler deleteVideoHandler;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new WorkVideoController(
                issueUploadUrlHandler,
                uploadHandler,
                confirmUploadHandler,
                hlsJobHandler,
                addYouTubeHandler,
                reorderVideosHandler,
                deleteVideoHandler)).build();
    }

    @Test
    void issueUploadUrlBindsRequestBodyToCommand() throws Exception {
        UUID workId = UUID.randomUUID();
        when(issueUploadUrlHandler.handle(any(IssueWorkVideoUploadUrlCommand.class)))
                .thenReturn(Map.of("uploadMethod", "local", "uploadUrl", "/upload", "storageKey", "videos/key.mp4"));

        mockMvc.perform(post("/api/admin/works/{workId}/videos/upload-url", workId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fileName": "clip.mp4",
                                  "contentType": "video/mp4",
                                  "size": 12345,
                                  "expectedVideosVersion": 7
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadMethod").value("local"))
                .andExpect(jsonPath("$.storageKey").value("videos/key.mp4"));

        ArgumentCaptor<IssueWorkVideoUploadUrlCommand> captor = ArgumentCaptor.forClass(IssueWorkVideoUploadUrlCommand.class);
        verify(issueUploadUrlHandler).handle(captor.capture());
        assertThat(captor.getValue()).isEqualTo(new IssueWorkVideoUploadUrlCommand(
                workId,
                "clip.mp4",
                "video/mp4",
                12345L,
                7));
    }

    @Test
    void uploadBindsMultipartFileAndUploadSession() throws Exception {
        UUID workId = UUID.randomUUID();
        UUID uploadSessionId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clip.mp4",
                "video/mp4",
                "video".getBytes(StandardCharsets.UTF_8));
        when(uploadHandler.handle(any(UploadWorkVideoCommand.class))).thenReturn(Map.of("success", true));

        mockMvc.perform(multipart("/api/admin/works/{workId}/videos/upload", workId)
                        .file(file)
                        .param("uploadSessionId", uploadSessionId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<UploadWorkVideoCommand> captor = ArgumentCaptor.forClass(UploadWorkVideoCommand.class);
        verify(uploadHandler).handle(captor.capture());
        assertThat(captor.getValue().workId()).isEqualTo(workId);
        assertThat(captor.getValue().uploadSessionId()).isEqualTo(uploadSessionId);
        assertThat(captor.getValue().file().getOriginalFilename()).isEqualTo("clip.mp4");
    }

    @Test
    void confirmBindsRequestBodyToCommand() throws Exception {
        UUID workId = UUID.randomUUID();
        UUID uploadSessionId = UUID.randomUUID();
        when(confirmUploadHandler.handle(any(ConfirmWorkVideoUploadCommand.class)))
                .thenReturn(Map.of("videoId", "confirmed-video"));

        mockMvc.perform(post("/api/admin/works/{workId}/videos/confirm", workId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "uploadSessionId": "%s",
                                  "expectedVideosVersion": 4
                                }
                                """.formatted(uploadSessionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoId").value("confirmed-video"));

        ArgumentCaptor<ConfirmWorkVideoUploadCommand> captor = ArgumentCaptor.forClass(ConfirmWorkVideoUploadCommand.class);
        verify(confirmUploadHandler).handle(captor.capture());
        assertThat(captor.getValue()).isEqualTo(new ConfirmWorkVideoUploadCommand(workId, uploadSessionId, 4));
    }

    @Test
    void hlsJobBindsMultipartFileAndExpectedVersion() throws Exception {
        UUID workId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "hls.mp4",
                "video/mp4",
                "hls".getBytes(StandardCharsets.UTF_8));
        when(hlsJobHandler.handle(any(CreateWorkVideoHlsJobCommand.class)))
                .thenReturn(Map.of("videoType", "hls"));

        mockMvc.perform(multipart("/api/admin/works/{workId}/videos/hls-job", workId)
                        .file(file)
                        .param("expectedVideosVersion", "9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoType").value("hls"));

        ArgumentCaptor<CreateWorkVideoHlsJobCommand> captor = ArgumentCaptor.forClass(CreateWorkVideoHlsJobCommand.class);
        verify(hlsJobHandler).handle(captor.capture());
        assertThat(captor.getValue().workId()).isEqualTo(workId);
        assertThat(captor.getValue().expectedVideosVersion()).isEqualTo(9);
        assertThat(captor.getValue().file().getOriginalFilename()).isEqualTo("hls.mp4");
    }

    @Test
    void youtubeBindsRequestBodyToCommand() throws Exception {
        UUID workId = UUID.randomUUID();
        when(addYouTubeHandler.handle(any(AddYouTubeWorkVideoCommand.class)))
                .thenReturn(Map.of("provider", "youtube"));

        mockMvc.perform(post("/api/admin/works/{workId}/videos/youtube", workId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "youtubeUrlOrId": "https://youtu.be/abc123xyz99",
                                  "expectedVideosVersion": 3
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("youtube"));

        ArgumentCaptor<AddYouTubeWorkVideoCommand> captor = ArgumentCaptor.forClass(AddYouTubeWorkVideoCommand.class);
        verify(addYouTubeHandler).handle(captor.capture());
        assertThat(captor.getValue()).isEqualTo(new AddYouTubeWorkVideoCommand(
                workId,
                "https://youtu.be/abc123xyz99",
                3));
    }

    @Test
    void reorderBindsOrderedVideoIdsAndExpectedVersion() throws Exception {
        UUID workId = UUID.randomUUID();
        UUID firstVideoId = UUID.randomUUID();
        UUID secondVideoId = UUID.randomUUID();
        when(reorderVideosHandler.handle(any(ReorderWorkVideosCommand.class)))
                .thenReturn(Map.of("ordered", 2));

        mockMvc.perform(put("/api/admin/works/{workId}/videos/order", workId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orderedVideoIds": ["%s", "%s"],
                                  "expectedVideosVersion": 11
                                }
                                """.formatted(firstVideoId, secondVideoId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ordered").value(2));

        ArgumentCaptor<ReorderWorkVideosCommand> captor = ArgumentCaptor.forClass(ReorderWorkVideosCommand.class);
        verify(reorderVideosHandler).handle(captor.capture());
        assertThat(captor.getValue()).isEqualTo(new ReorderWorkVideosCommand(
                workId,
                List.of(firstVideoId, secondVideoId),
                11));
    }

    @Test
    void deleteBindsPathVariablesAndExpectedVersion() throws Exception {
        UUID workId = UUID.randomUUID();
        UUID videoId = UUID.randomUUID();
        when(deleteVideoHandler.handle(any(DeleteWorkVideoCommand.class)))
                .thenReturn(Map.of("success", true));

        mockMvc.perform(delete("/api/admin/works/{workId}/videos/{videoId}", workId, videoId)
                        .param("expectedVideosVersion", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<DeleteWorkVideoCommand> captor = ArgumentCaptor.forClass(DeleteWorkVideoCommand.class);
        verify(deleteVideoHandler).handle(captor.capture());
        assertThat(captor.getValue()).isEqualTo(new DeleteWorkVideoCommand(workId, videoId, 12));
    }
}
