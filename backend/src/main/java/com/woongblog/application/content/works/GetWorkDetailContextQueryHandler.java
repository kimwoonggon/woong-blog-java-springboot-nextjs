package com.woongblog.application.content.works;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetWorkDetailContextQueryHandler {
    private final WorkQueryStore workQueryStore;

    public GetWorkDetailContextQueryHandler(WorkQueryStore workQueryStore) {
        this.workQueryStore = workQueryStore;
    }

    public Map<String, Object> handle(GetWorkDetailContextQuery query) {
        int limit = Math.max(1, Math.min(query.limit(), 24));
        return workQueryStore.getPublishedWorkContext(query.slug(), limit);
    }
}
