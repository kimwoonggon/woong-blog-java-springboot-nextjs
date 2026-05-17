#!/usr/bin/env bash
set -euo pipefail

EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:-}"
EXPECTED_FRONTEND_IMAGE_DIGEST="${EXPECTED_FRONTEND_IMAGE_DIGEST:-}"
EXPECTED_BACKEND_IMAGE_DIGEST="${EXPECTED_BACKEND_IMAGE_DIGEST:-}"

fail() {
  echo "server current-main evidence handoff failed: $*" >&2
  exit 1
}

git fetch origin main
target_main_sha="$(git rev-parse origin/main)"

if [[ -n "${EXPECTED_MAIN_SHA}" ]]; then
  if [[ "${target_main_sha}" != "${EXPECTED_MAIN_SHA}" ]]; then
    fail "main SHA mismatch: expected ${EXPECTED_MAIN_SHA}, resolved ${target_main_sha}"
  fi
fi

SHA_SHORT="${target_main_sha:0:12}"
FRONTEND_DIGEST="${FRONTEND_DIGEST:-}"
BACKEND_DIGEST="${BACKEND_DIGEST:-}"

if [[ -n "${EXPECTED_FRONTEND_IMAGE_DIGEST}" && "${FRONTEND_DIGEST}" != "${EXPECTED_FRONTEND_IMAGE_DIGEST}" ]]; then
  fail "frontend image digest mismatch: expected ${EXPECTED_FRONTEND_IMAGE_DIGEST}, resolved ${FRONTEND_DIGEST}"
fi

if [[ -n "${EXPECTED_BACKEND_IMAGE_DIGEST}" && "${BACKEND_DIGEST}" != "${EXPECTED_BACKEND_IMAGE_DIGEST}" ]]; then
  fail "backend image digest mismatch: expected ${EXPECTED_BACKEND_IMAGE_DIGEST}, resolved ${BACKEND_DIGEST}"
fi

echo "Resolved origin/main ${target_main_sha} (${SHA_SHORT})"
