package com.woongblog.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
class JdbcDataTest {
    @Mock
    private ResultSet resultSet;

    @Mock
    private Array sqlArray;

    @Test
    void textArrayReturnsEmptyArrayWhenColumnIsNull() throws Exception {
        when(resultSet.getArray("tags")).thenReturn(null);

        assertThat(JdbcData.textArray(resultSet, "tags")).isEmpty();
    }

    @Test
    void textArrayReturnsStringArrayPayload() throws Exception {
        when(resultSet.getArray("tags")).thenReturn(sqlArray);
        when(sqlArray.getArray()).thenReturn(new String[] {"alpha", "beta"});

        assertThat(JdbcData.textArray(resultSet, "tags")).containsExactly("alpha", "beta");
    }

    @Test
    void textArrayStringifiesObjectArrayPayload() throws Exception {
        when(resultSet.getArray("tags")).thenReturn(sqlArray);
        when(sqlArray.getArray()).thenReturn(new Object[] {"alpha", 42, true});

        assertThat(JdbcData.textArray(resultSet, "tags")).containsExactly("alpha", "42", "true");
    }

    @Test
    void textArrayReturnsEmptyArrayForUnsupportedPayload() throws Exception {
        when(resultSet.getArray("tags")).thenReturn(sqlArray);
        when(sqlArray.getArray()).thenReturn("not-an-array");

        assertThat(JdbcData.textArray(resultSet, "tags")).isEmpty();
    }

    @Test
    void textListConvertsSqlArrayToList() throws Exception {
        when(resultSet.getArray("tags")).thenReturn(sqlArray);
        when(sqlArray.getArray()).thenReturn(new Object[] {"java", "spring"});

        assertThat(JdbcData.textList(resultSet, "tags")).containsExactly("java", "spring");
    }

    @Test
    void uuidReadsTypedUuidColumn() throws Exception {
        UUID id = UUID.randomUUID();
        when(resultSet.getObject("id", UUID.class)).thenReturn(id);

        assertThat(JdbcData.uuid(resultSet, "id")).isEqualTo(id);
    }

    @ParameterizedTest
    @MethodSource("instantValues")
    void nullableInstantConvertsSupportedTimestampRepresentations(Object rawValue, Instant expected) throws Exception {
        when(resultSet.getObject("created_at")).thenReturn(rawValue);

        assertThat(JdbcData.nullableInstant(resultSet, "created_at")).isEqualTo(expected);
    }

    @Test
    void nullableInstantReturnsNullForNullColumn() throws Exception {
        when(resultSet.getObject("created_at")).thenReturn(null);

        assertThat(JdbcData.nullableInstant(resultSet, "created_at")).isNull();
    }

    @Test
    void instantRejectsNullColumn() throws Exception {
        when(resultSet.getObject("created_at")).thenReturn(null);

        assertThatThrownBy(() -> JdbcData.instant(resultSet, "created_at"))
                .isInstanceOf(SQLException.class)
                .hasMessage("Column created_at was null.");
    }

    @Test
    void instantReturnsNonNullColumnValue() throws Exception {
        Instant expected = Instant.parse("2026-05-17T12:34:56Z");
        when(resultSet.getObject("created_at")).thenReturn(expected);

        assertThat(JdbcData.instant(resultSet, "created_at")).isEqualTo(expected);
    }

    private static Stream<Arguments> instantValues() {
        Instant expected = Instant.parse("2026-05-17T12:34:56Z");
        return Stream.of(
                Arguments.arguments(expected, expected),
                Arguments.arguments(OffsetDateTime.parse("2026-05-17T21:34:56+09:00"), expected),
                Arguments.arguments(Timestamp.from(expected), expected),
                Arguments.arguments("2026-05-17T12:34:56Z", expected));
    }
}
