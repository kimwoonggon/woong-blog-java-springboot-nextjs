#!/usr/bin/env bash
set -euo pipefail

MINIO_CONTAINER=woongblog-minio
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=woongblog-videos
MINIO_CORS_FILE=/tmp/minio-video-cors.json

cleanup() {
  docker compose down >/dev/null 2>&1 || true
  docker rm -f "${MINIO_CONTAINER}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

docker rm -f "${MINIO_CONTAINER}" >/dev/null 2>&1 || true
docker run -d \
  --name "${MINIO_CONTAINER}" \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER="${MINIO_ROOT_USER}" \
  -e MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}" \
  minio/minio server /data --console-address ":9001" >/dev/null

for _ in $(seq 1 30); do
  if curl -fsS http://localhost:9000/minio/health/live >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cat > "${MINIO_CORS_FILE}" <<'EOF'
[
  {
    "AllowedOrigins": ["http://localhost"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

for _ in $(seq 1 20); do
  if docker run --rm --network host minio/mc alias set local http://localhost:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

for _ in $(seq 1 20); do
  if docker run --rm --network host minio/mc mb --ignore-existing "local/${MINIO_BUCKET}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

for _ in $(seq 1 20); do
  if docker run --rm --network host minio/mc anonymous set download "local/${MINIO_BUCKET}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

for _ in $(seq 1 20); do
  if docker run --rm --network host -v "${MINIO_CORS_FILE}:/tmp/cors.json:ro" minio/mc cors set local/${MINIO_BUCKET} /tmp/cors.json >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export CloudflareR2__AccountId=minio
export CloudflareR2__AccessKeyId="${MINIO_ROOT_USER}"
export CloudflareR2__SecretAccessKey="${MINIO_ROOT_PASSWORD}"
export CloudflareR2__BucketName="${MINIO_BUCKET}"
export CloudflareR2__Endpoint=http://host.docker.internal:9000
export CloudflareR2__BrowserEndpoint=http://localhost:9000
export CloudflareR2__PublicUrl=http://localhost:9000/${MINIO_BUCKET}
export CloudflareR2__ForceEnabledInDevelopment=true

docker compose up -d --build

for _ in $(seq 1 30); do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost playwright test tests/admin-work-video-s3-compatible.spec.ts --workers=1
