package com.woongblog.application.content.works;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetAdminWorksQueryHandler {
    private final WorkQueryStore workQueryStore;

    public GetAdminWorksQueryHandler(WorkQueryStore workQueryStore) {
        this.workQueryStore = workQueryStore;
    }

    public List<Map<String, Object>> handle() {
        return workQueryStore.getAdminWorks();
    }
}
