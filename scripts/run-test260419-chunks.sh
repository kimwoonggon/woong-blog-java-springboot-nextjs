#!/usr/bin/env bash
set +euo pipefail

export PLAYWRIGHT_EXTERNAL_SERVER="${PLAYWRIGHT_EXTERNAL_SERVER:-1}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:13000}"
export PLAYWRIGHT_EXPECT_LOCAL_ADMIN_SHORTCUT="${PLAYWRIGHT_EXPECT_LOCAL_ADMIN_SHORTCUT:-visible}"

RESULT_ROOT="tests/playwright/test260419"
CONFIG="playwright.test260419.config.ts"
RESULTS_FILE="${RESULT_ROOT}/chunk-results.tsv"

mkdir -p "${RESULT_ROOT}"
printf 'chunk\tstatus\n' > "${RESULTS_FILE}"

run_chunk() {
  local name="$1"
  shift
  local output="${RESULT_ROOT}/${name}"

  echo "== test260419 chunk: ${name} =="
  npx playwright test -c "${CONFIG}" "$@" --workers=1 --reporter=dot --output="${output}"
  local status=$?
  printf '%s\t%s\n' "${name}" "${status}" >> "${RESULTS_FILE}"
  echo "== test260419 chunk: ${name} exit ${status} =="
  return 0
}

run_chunk runtime-auth \
  --project=test260419-runtime-auth-desktop \
  --project=test260419-runtime-auth-tablet \
  --project=test260419-runtime-auth-mobile

run_chunk public-desktop \
  --project=test260419-public-desktop

run_chunk public-tablet \
  --project=test260419-public-tablet

run_chunk public-mobile \
  --project=test260419-public-mobile

run_chunk admin-desktop \
  --project=test260419-admin-desktop \
  --grep-invert 'expired admin sessions|non-admin local login'

run_chunk admin-tablet \
  --project=test260419-admin-tablet \
  --grep-invert 'expired admin sessions|non-admin local login'

run_chunk admin-mobile \
  --project=test260419-admin-mobile \
  --grep-invert 'expired admin sessions|non-admin local login'

run_chunk auth-destructive \
  --project=test260419-admin-desktop \
  --project=test260419-admin-tablet \
  --project=test260419-admin-mobile \
  --grep 'expired admin sessions|non-admin local login'

echo "== test260419 chunks complete =="
cat "${RESULTS_FILE}"
