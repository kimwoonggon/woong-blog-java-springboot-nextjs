package com.woongblog.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@Tag("unit")
class PagedResponseTest {
    @Test
    void ofCalculatesTotalPagesUsingCeilingDivision() {
        PagedResponse<String> response = PagedResponse.of(List.of("a", "b"), 2, 10, 21);

        assertThat(response.items()).containsExactly("a", "b");
        assertThat(response.page()).isEqualTo(2);
        assertThat(response.pageSize()).isEqualTo(10);
        assertThat(response.totalItems()).isEqualTo(21);
        assertThat(response.totalPages()).isEqualTo(3);
    }

    @Test
    void ofReturnsZeroTotalPagesWhenThereAreNoItems() {
        PagedResponse<String> response = PagedResponse.of(List.of(), 1, 10, 0);

        assertThat(response.totalPages()).isZero();
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void ofReturnsZeroTotalPagesWhenPageSizeIsNotPositive(int pageSize) {
        PagedResponse<String> response = PagedResponse.of(List.of("a"), 1, pageSize, 25);

        assertThat(response.pageSize()).isEqualTo(pageSize);
        assertThat(response.totalPages()).isZero();
    }
}
