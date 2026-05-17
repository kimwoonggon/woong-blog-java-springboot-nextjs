package com.woongblog.application.content.blogs;

import static org.assertj.core.api.Assertions.assertThat;

import com.woongblog.application.content.common.ContentSearchMode;
import com.woongblog.common.PagedResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("unit")
class GetBlogsQueryHandlerTest {
    @Test
    void normalizesPagingSearchTextAndSearchModeBeforeCallingStore() {
        FakeBlogQueryStore store = new FakeBlogQueryStore();
        GetBlogsQueryHandler handler = new GetBlogsQueryHandler(store);

        handler.handle(new GetBlogsQuery(0, 200, "  Spring Boot  ", "title"));

        assertThat(store.page).isEqualTo(1);
        assertThat(store.pageSize).isEqualTo(100);
        assertThat(store.normalizedQuery).isEqualTo("Spring Boot");
        assertThat(store.searchMode).isEqualTo(ContentSearchMode.TITLE);
    }

    private static final class FakeBlogQueryStore implements BlogQueryStore {
        private int page;
        private int pageSize;
        private String normalizedQuery;
        private ContentSearchMode searchMode;

        @Override
        public PagedResponse<Map<String, Object>> getPublishedBlogsPage(
                int page,
                int pageSize,
                String normalizedQuery,
                ContentSearchMode searchMode) {
            this.page = page;
            this.pageSize = pageSize;
            this.normalizedQuery = normalizedQuery;
            this.searchMode = searchMode;
            return PagedResponse.of(List.of(), page, pageSize, 0);
        }

        @Override
        public Map<String, Object> getPublishedBlogBySlug(String slug) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Map<String, Object> getPublishedBlogContext(String slug, int limit) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<Map<String, Object>> getAdminBlogs() {
            throw new UnsupportedOperationException();
        }

        @Override
        public Map<String, Object> getAdminBlog(UUID id) {
            throw new UnsupportedOperationException();
        }
    }
}
