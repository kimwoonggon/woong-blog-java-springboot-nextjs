#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACT_DIR="${PACT_FILE_DIRECTORY:-"$ROOT_DIR/tests/contracts/pacts"}"

if ! find "$PACT_DIR" -maxdepth 1 -name '*.json' -print -quit | grep -q .; then
  echo "No pact files found in $PACT_DIR; skipping Pact provider verification."
  exit 0
fi

PACT_PROVIDER_PORT="${PACT_PROVIDER_PORT:-5088}"
PACT_PROVIDER_BASE_URL="http://127.0.0.1:${PACT_PROVIDER_PORT}"
PACT_TEMP_ROOT="${PACT_TEMP_ROOT:-"/tmp/woong-blog-pact-${PACT_PROVIDER_PORT}"}"
mkdir -p "$PACT_TEMP_ROOT/media" "$PACT_TEMP_ROOT/dp"

cleanup() {
  if [[ -n "${PROVIDER_PID:-}" ]] && kill -0 "$PROVIDER_PID" 2>/dev/null; then
    kill "$PROVIDER_PID" 2>/dev/null || true
    wait "$PROVIDER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

(
  cd "$ROOT_DIR/backend"
  SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-test}" \
  SERVER_PORT="$PACT_PROVIDER_PORT" \
  SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:tc:postgresql:16-alpine:///pact_provider}" \
  APP_AUTH_ENABLED=true \
  APP_AUTH_AUTHORITY=https://example.test \
  APP_AUTH_CLIENT_ID=test-client \
  APP_AUTH_CLIENT_SECRET=test-secret \
  APP_AUTH_MEDIA_ROOT="$PACT_TEMP_ROOT/media" \
  APP_DATA_PROTECTION_KEYS_PATH="$PACT_TEMP_ROOT/dp" \
  APP_AUTH_SECURE_COOKIES=false \
  APP_REQUIRE_HTTPS_METADATA=false \
  SECURITY_USE_HTTPS_REDIRECTION=false \
  SECURITY_USE_HSTS=false \
  ./mvnw -q spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=${PACT_PROVIDER_PORT}"
) >"$PACT_TEMP_ROOT/provider.log" 2>&1 &
PROVIDER_PID=$!

for _ in {1..60}; do
  if curl -fsS "$PACT_PROVIDER_BASE_URL/actuator/health" >/dev/null 2>&1 \
    || curl -fsS "$PACT_PROVIDER_BASE_URL/api/health" >/dev/null 2>&1; then
    break
  fi

  if ! kill -0 "$PROVIDER_PID" 2>/dev/null; then
    cat "$PACT_TEMP_ROOT/provider.log"
    echo "Pact provider exited before becoming healthy." >&2
    exit 1
  fi

  sleep 1
done

curl -fsS "$PACT_PROVIDER_BASE_URL/actuator/health" >/dev/null \
  || curl -fsS "$PACT_PROVIDER_BASE_URL/api/health" >/dev/null

PACT_PROVIDER_BASE_URL="$PACT_PROVIDER_BASE_URL" \
PACT_FILE_DIRECTORY="$PACT_DIR" \
"$ROOT_DIR/backend/mvnw" -f "$ROOT_DIR/backend/pom.xml" test -Dgroups=contract
