#!/usr/bin/env bash
set -euo pipefail

export DOCKER_API_VERSION="${DOCKER_API_VERSION:-1.44}"

compose=(docker compose)

"${compose[@]}" ps db >/dev/null

run_psql() {
  "${compose[@]}" exec -T db psql -U portfolio -d portfolio -v ON_ERROR_STOP=1 "$@"
}

echo '[db-smoke] resetting temp table'
run_psql <<'SQL'
DROP TABLE IF EXISTS qa_load_events;
CREATE TABLE qa_load_events (
  id BIGSERIAL PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

echo '[db-smoke] inserting 500 generated rows'
run_psql <<'SQL'
INSERT INTO qa_load_events (payload)
SELECT 'payload-' || g::text
FROM generate_series(1, 500) AS g;
SQL

echo '[db-smoke] checking count'
count=$(run_psql -tAc "SELECT COUNT(*) FROM qa_load_events;")
[[ "$count" == "500" ]]

echo '[db-smoke] checking update path'
updated=$(run_psql -tAc "WITH updated AS (UPDATE qa_load_events SET payload = payload || '-updated' WHERE id <= 50 RETURNING 1) SELECT COUNT(*) FROM updated;")
[[ "$updated" == "50" ]]

echo '[db-smoke] verifying invalid null payload is rejected'
if run_psql -c "INSERT INTO qa_load_events (payload) VALUES (NULL);" >/tmp/db-load-error.log 2>&1; then
  echo 'expected NULL insert to fail but it succeeded' >&2
  cat /tmp/db-load-error.log >&2
  exit 1
fi

echo '[db-smoke] verifying data round-trip sample'
sample=$(run_psql -tAc "SELECT payload FROM qa_load_events WHERE id = 1;")
[[ "$sample" == "payload-1-updated" ]]

echo '[db-smoke] cleanup'
run_psql -c "DROP TABLE qa_load_events;" >/dev/null

echo '[db-smoke] PASS'
