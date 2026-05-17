#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "$ROOT_DIR/backend/target/surefire-reports"
"$ROOT_DIR/backend/mvnw" -f "$ROOT_DIR/backend/pom.xml" test -Dgroups=architecture "$@"

test_count=0
shopt -s nullglob
for report in "$ROOT_DIR"/backend/target/surefire-reports/TEST-*.xml; do
  tests_attr="$(sed -n 's/.* tests="\([0-9][0-9]*\)".*/\1/p' "$report" | head -n 1)"
  if [[ -n "$tests_attr" ]]; then
    test_count=$((test_count + tests_attr))
  fi
done
shopt -u nullglob

if [[ "$test_count" -eq 0 ]]; then
  echo 'Architecture test suite executed zero backend tests.' >&2
  exit 1
fi
