package com.woongblog.application.content.works;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetAdminWorkByIdQueryHandler {
    private final WorkQueryStore workQueryStore;

    public GetAdminWorkByIdQueryHandler(WorkQueryStore workQueryStore) {
        this.workQueryStore = workQueryStore;
    }

    public Map<String, Object> handle(GetAdminWorkByIdQuery query) {
        return workQueryStore.getAdminWork(query.id());
    }
}
