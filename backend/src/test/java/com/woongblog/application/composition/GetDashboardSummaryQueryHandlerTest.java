package com.woongblog.application.composition;

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
@Tag("unit")
class GetDashboardSummaryQueryHandlerTest {
    @Mock
    private DashboardQueryStore dashboardQueryStore;

    @Test
    void handleReturnsAdminDashboardFromStore() {
        Map<String, Object> dashboard = Map.of("blogCount", 3, "workCount", 2);
        when(dashboardQueryStore.getAdminDashboard()).thenReturn(dashboard);

        Map<String, Object> result = new GetDashboardSummaryQueryHandler(dashboardQueryStore).handle();

        assertThat(result).isSameAs(dashboard);
        verify(dashboardQueryStore).getAdminDashboard();
    }
}
