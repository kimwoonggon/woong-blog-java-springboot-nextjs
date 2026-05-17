#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${ROOT_DIR}/scripts/setup-local-https.sh"

cd "${ROOT_DIR}"
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build

echo
echo "Local HTTPS stack is starting."
echo "Open: https://localhost/login"
echo "Google OAuth redirect URI to register: https://localhost/api/auth/callback"
