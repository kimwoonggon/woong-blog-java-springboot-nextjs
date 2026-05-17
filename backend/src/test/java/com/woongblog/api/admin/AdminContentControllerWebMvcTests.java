package com.woongblog.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.woongblog.application.composition.GetDashboardSummaryQueryHandler;
import com.woongblog.application.content.blogs.CreateBlogCommandHandler;
import com.woongblog.application.content.blogs.DeleteBlogCommand;
import com.woongblog.application.content.blogs.DeleteBlogCommandHandler;
import com.woongblog.application.content.blogs.GetAdminBlogByIdQueryHandler;
import com.woongblog.application.content.blogs.GetAdminBlogsQueryHandler;
import com.woongblog.application.content.blogs.UpdateBlogCommandHandler;
import com.woongblog.application.content.pages.GetAdminPagesQueryHandler;
import com.woongblog.application.content.pages.UpdatePageCommandHandler;
import com.woongblog.application.content.works.CreateWorkCommandHandler;
import com.woongblog.application.content.works.DeleteWorkCommand;
import com.woongblog.application.content.works.DeleteWorkCommandHandler;
import com.woongblog.application.content.works.GetAdminWorkByIdQueryHandler;
import com.woongblog.application.content.works.GetAdminWorksQueryHandler;
import com.woongblog.application.content.works.UpdateWorkCommandHandler;
import com.woongblog.application.site.GetAdminSiteSettingsQueryHandler;
import com.woongblog.application.site.UpdateSiteSettingsCommand;
import com.woongblog.application.site.UpdateSiteSettingsCommandHandler;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@Tag("web")
@Tag("component")
class AdminContentControllerWebMvcTests {
    private MockMvc mockMvc;

    @Mock
    private GetDashboardSummaryQueryHandler getDashboardSummaryQueryHandler;

    @Mock
    private GetAdminSiteSettingsQueryHandler getAdminSiteSettingsQueryHandler;

    @Mock
    private UpdateSiteSettingsCommandHandler updateSiteSettingsCommandHandler;

    @Mock
    private GetAdminPagesQueryHandler getAdminPagesQueryHandler;

    @Mock
    private UpdatePageCommandHandler updatePageCommandHandler;

    @Mock
    private GetAdminBlogsQueryHandler getAdminBlogsQueryHandler;

    @Mock
    private GetAdminBlogByIdQueryHandler getAdminBlogByIdQueryHandler;

    @Mock
    private CreateBlogCommandHandler createBlogCommandHandler;

    @Mock
    private UpdateBlogCommandHandler updateBlogCommandHandler;

    @Mock
    private DeleteBlogCommandHandler deleteBlogCommandHandler;

    @Mock
    private GetAdminWorksQueryHandler getAdminWorksQueryHandler;

    @Mock
    private GetAdminWorkByIdQueryHandler getAdminWorkByIdQueryHandler;

    @Mock
    private CreateWorkCommandHandler createWorkCommandHandler;

    @Mock
    private UpdateWorkCommandHandler updateWorkCommandHandler;

    @Mock
    private DeleteWorkCommandHandler deleteWorkCommandHandler;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminContentController(
                getDashboardSummaryQueryHandler,
                getAdminSiteSettingsQueryHandler,
                updateSiteSettingsCommandHandler,
                getAdminPagesQueryHandler,
                updatePageCommandHandler,
                getAdminBlogsQueryHandler,
                getAdminBlogByIdQueryHandler,
                createBlogCommandHandler,
                updateBlogCommandHandler,
                deleteBlogCommandHandler,
                getAdminWorksQueryHandler,
                getAdminWorkByIdQueryHandler,
                createWorkCommandHandler,
                updateWorkCommandHandler,
                deleteWorkCommandHandler)).build();
    }

    @Test
    void dashboardUsesDashboardSummaryHandler() throws Exception {
        when(getDashboardSummaryQueryHandler.handle())
                .thenReturn(Map.of("blogCount", 4, "workCount", 2));

        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blogCount").value(4))
                .andExpect(jsonPath("$.workCount").value(2));

        verify(getDashboardSummaryQueryHandler).handle();
    }

    @Test
    void updateSiteSettingsParsesResumeAssetIdAndGithubAlias() throws Exception {
        UUID resumeAssetId = UUID.randomUUID();
        when(updateSiteSettingsCommandHandler.handle(any(UpdateSiteSettingsCommand.class)))
                .thenReturn(Map.of("resumeAssetId", resumeAssetId));

        mockMvc.perform(put("/api/admin/site-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ownerName": "Woong",
                                  "tagline": "Building systems",
                                  "githubUrl": "https://github.com/woong",
                                  "resumeAssetId": "%s"
                                }
                                """.formatted(resumeAssetId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeAssetId").value(resumeAssetId.toString()));

        ArgumentCaptor<UpdateSiteSettingsCommand> captor = ArgumentCaptor.forClass(UpdateSiteSettingsCommand.class);
        verify(updateSiteSettingsCommandHandler).handle(captor.capture());
        UpdateSiteSettingsCommand command = captor.getValue();
        assertThat(command.ownerName()).isEqualTo("Woong");
        assertThat(command.tagline()).isEqualTo("Building systems");
        assertThat(command.gitHubUrl()).isEqualTo("https://github.com/woong");
        assertThat(command.hasResumeAssetId()).isTrue();
        assertThat(command.resumeAssetId()).isEqualTo(resumeAssetId);
    }

    @Test
    void deleteBlogReturnsNoContentAfterHandlerDeletesRequestedId() throws Exception {
        UUID blogId = UUID.randomUUID();

        mockMvc.perform(delete("/api/admin/blogs/{id}", blogId))
                .andExpect(status().isNoContent());

        ArgumentCaptor<DeleteBlogCommand> captor = ArgumentCaptor.forClass(DeleteBlogCommand.class);
        verify(deleteBlogCommandHandler).handle(captor.capture());
        assertThat(captor.getValue().id()).isEqualTo(blogId);
    }

    @Test
    void deleteWorkReturnsNoContentAfterHandlerDeletesRequestedId() throws Exception {
        UUID workId = UUID.randomUUID();

        mockMvc.perform(delete("/api/admin/works/{id}", workId))
                .andExpect(status().isNoContent());

        ArgumentCaptor<DeleteWorkCommand> captor = ArgumentCaptor.forClass(DeleteWorkCommand.class);
        verify(deleteWorkCommandHandler).handle(captor.capture());
        assertThat(captor.getValue().id()).isEqualTo(workId);
    }
}
