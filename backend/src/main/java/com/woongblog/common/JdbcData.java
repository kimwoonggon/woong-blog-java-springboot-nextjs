package com.woongblog.common;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public final class JdbcData {
    private JdbcData() {
    }

    public static String[] textArray(ResultSet rs, String column) throws SQLException {
        Array array = rs.getArray(column);
        if (array == null) {
            return new String[0];
        }
        Object raw = array.getArray();
        if (raw instanceof String[] values) {
            return values;
        }
        if (raw instanceof Object[] values) {
            return Arrays.stream(values).map(String::valueOf).toArray(String[]::new);
        }
        return new String[0];
    }

    public static List<String> textList(ResultSet rs, String column) throws SQLException {
        return List.of(textArray(rs, column));
    }

    public static UUID uuid(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    public static Instant instant(ResultSet rs, String column) throws SQLException {
        Instant value = nullableInstant(rs, column);
        if (value == null) {
            throw new SQLException("Column " + column + " was null.");
        }
        return value;
    }

    public static Instant nullableInstant(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        if (value == null) {
            return null;
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        return Instant.parse(value.toString());
    }
}
