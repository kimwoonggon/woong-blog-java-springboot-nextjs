package com.woongblog.application.composition;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetDashboardSummaryQueryHandler {
    private final DashboardQueryStore dashboardQueryStore;

    public GetDashboardSummaryQueryHandler(DashboardQueryStore dashboardQueryStore) {
        this.dashboardQueryStore = dashboardQueryStore;
    }

    public Map<String, Object> handle() {
        return dashboardQueryStore.getAdminDashboard();
    }
}
