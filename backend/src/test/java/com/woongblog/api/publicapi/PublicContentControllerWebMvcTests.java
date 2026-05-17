package com.woongblog.api.publicapi;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.woongblog.application.composition.GetHomeQueryHandler;
import com.woongblog.application.content.blogs.GetBlogBySlugQueryHandler;
import com.woongblog.application.content.blogs.GetBlogDetailContextQueryHandler;
import com.woongblog.application.content.blogs.GetBlogsQueryHandler;
import com.woongblog.application.content.pages.GetPageBySlugQueryHandler;
import com.woongblog.application.content.works.GetWorkBySlugQueryHandler;
import com.woongblog.application.content.works.GetWorkDetailContextQueryHandler;
import com.woongblog.application.content.works.GetWorksQueryHandler;
import com.woongblog.application.site.GetResumeQueryHandler;
import com.woongblog.application.site.GetSiteSettingsQueryHandler;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@Tag("web")
@Tag("component")
class PublicContentControllerWebMvcTests {
    private MockMvc mockMvc;

    @Mock
    private GetHomeQueryHandler getHomeQueryHandler;

    @Mock
    private GetSiteSettingsQueryHandler getSiteSettingsQueryHandler;

    @Mock
    private GetResumeQueryHandler getResumeQueryHandler;

    @Mock
    private GetPageBySlugQueryHandler getPageBySlugQueryHandler;

    @Mock
    private GetBlogsQueryHandler getBlogsQueryHandler;

    @Mock
    private GetBlogBySlugQueryHandler getBlogBySlugQueryHandler;

    @Mock
    private GetBlogDetailContextQueryHandler getBlogDetailContextQueryHandler;

    @Mock
    private GetWorksQueryHandler getWorksQueryHandler;

    @Mock
    private GetWorkBySlugQueryHandler getWorkBySlugQueryHandler;

    @Mock
    private GetWorkDetailContextQueryHandler getWorkDetailContextQueryHandler;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new PublicContentController(
                getHomeQueryHandler,
                getSiteSettingsQueryHandler,
                getResumeQueryHandler,
                getPageBySlugQueryHandler,
                getBlogsQueryHandler,
                getBlogBySlugQueryHandler,
                getBlogDetailContextQueryHandler,
                getWorksQueryHandler,
                getWorkBySlugQueryHandler,
                getWorkDetailContextQueryHandler)).build();
    }

    @Test
    void resumeUsesResumeQueryHandler() throws Exception {
        when(getResumeQueryHandler.handle())
                .thenReturn(Map.of("title", "Resume", "assetUrl", "/uploads/resume.pdf"));

        mockMvc.perform(get("/api/public/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Resume"))
                .andExpect(jsonPath("$.assetUrl").value("/uploads/resume.pdf"));

        verify(getResumeQueryHandler).handle();
    }
}
