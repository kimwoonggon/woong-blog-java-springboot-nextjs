#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec "$ROOT_DIR/backend/mvnw" -f "$ROOT_DIR/backend/pom.xml" verify -Dgroups=integration "$@"
