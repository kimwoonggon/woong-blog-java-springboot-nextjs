package com.woongblog.application.composition;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GetHomeQueryHandler {
    private final HomeQueryStore homeQueryStore;

    public GetHomeQueryHandler(HomeQueryStore homeQueryStore) {
        this.homeQueryStore = homeQueryStore;
    }

    public Map<String, Object> handle() {
        return homeQueryStore.getPublicHome();
    }
}
