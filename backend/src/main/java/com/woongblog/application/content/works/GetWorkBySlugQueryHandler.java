package com.woongblog.application.content.works;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetWorkBySlugQueryHandler {
    private final WorkQueryStore workQueryStore;

    public GetWorkBySlugQueryHandler(WorkQueryStore workQueryStore) {
        this.workQueryStore = workQueryStore;
    }

    public Map<String, Object> handle(GetWorkBySlugQuery query) {
        return workQueryStore.getPublishedWorkBySlug(query.slug());
    }
}
