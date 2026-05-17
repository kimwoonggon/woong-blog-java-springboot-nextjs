package com.woongblog.application.site;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@Tag("component")
class GetResumeQueryHandlerTest {
    @Mock
    private SiteQueryStore siteQueryStore;

    @Test
    void handleReturnsPublicResumeFromStore() {
        Map<String, Object> resume = Map.of("resumeAssetId", "resume.pdf");
        when(siteQueryStore.getPublicResume()).thenReturn(resume);

        Map<String, Object> result = new GetResumeQueryHandler(siteQueryStore).handle();

        assertThat(result).isSameAs(resume);
        verify(siteQueryStore).getPublicResume();
    }
}
