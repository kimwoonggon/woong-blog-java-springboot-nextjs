package com.woongblog.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.woongblog.ai.AiController;
import com.woongblog.api.admin.AdminContentController;
import com.woongblog.api.publicapi.PublicContentController;
import com.woongblog.config.AppProperties;
import com.woongblog.diagnostics.DiagnosticsController;
import com.woongblog.identity.IdentityController;
import com.woongblog.media.MediaController;
import com.woongblog.media.WorkVideoController;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

@Tag("integration")
class StartupCompositionDeepIntegrationTests extends IntegrationTestSupport {
    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private AppProperties appProperties;

    @Test
    void serviceProviderResolvesImportantApiControllers() {
        assertThat(applicationContext.getBean(AdminContentController.class)).isNotNull();
        assertThat(applicationContext.getBean(PublicContentController.class)).isNotNull();
        assertThat(applicationContext.getBean(IdentityController.class)).isNotNull();
        assertThat(applicationContext.getBean(MediaController.class)).isNotNull();
        assertThat(applicationContext.getBean(WorkVideoController.class)).isNotNull();
        assertThat(applicationContext.getBean(AiController.class)).isNotNull();
        assertThat(applicationContext.getBean(DiagnosticsController.class)).isNotNull();
    }

    @Test
    void optionsAreBoundForTestingStartup() {
        assertThat(appProperties.getAuth().getAdminEmails()).contains("admin@example.com");
        assertThat(appProperties.getAuth().isEnableTestLoginEndpoint()).isTrue();
        assertThat(appProperties.getAuth().getMediaRoot().toString()).contains("woong-blog-test-media");
        assertThat(appProperties.getAi().getBatchConcurrency()).isPositive();
        assertThat(appProperties.getLoadTesting().getReportRoot().toString()).contains("woong-blog-integration-loadtest");
    }

    @Test
    void healthEndpointStartsWithoutExternalServicesInTesting() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    void sessionResponseContainsSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/auth/session"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().exists("Referrer-Policy"));
    }
}
