#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="${ROOT_DIR}/.local-certs"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is required but not installed." >&2
  echo "Install it first, then re-run this script." >&2
  echo "macOS: brew install mkcert nss" >&2
  echo "Ubuntu/Debian: sudo apt update && sudo apt install libnss3-tools && brew/apt-install mkcert" >&2
  exit 1
fi

mkdir -p "${CERT_DIR}"

echo "Installing mkcert local CA (safe to run multiple times)..."
mkcert -install

echo "Generating localhost certificates in ${CERT_DIR} ..."
mkcert \
  -cert-file "${CERT_DIR}/localhost.pem" \
  -key-file "${CERT_DIR}/localhost-key.pem" \
  localhost 127.0.0.1 ::1

echo
echo "Done. Generated:"
echo "  ${CERT_DIR}/localhost.pem"
echo "  ${CERT_DIR}/localhost-key.pem"
echo
echo "Next:"
echo "  docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build"
