#!/usr/bin/env bash
set -euo pipefail
trap 'echo "run-real-r2-hls-smoke failed at line ${LINENO}" >&2' ERR

BASE_URL="${PLAYWRIGHT_BASE_URL:-https://localhost:3001}"
WORK_DIR="${WORK_DIR:-$(pwd)}"
VIDEO_PATH="${VIDEO_PATH:-/tmp/real-r2-hls-smoke.mp4}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/real-r2-hls-cookies.txt}"
TEMP_SPEC_PATH=""
cleanup() {
  if [ -n "${TEMP_SPEC_PATH}" ] && [ -f "${TEMP_SPEC_PATH}" ]; then
    rm -f "${TEMP_SPEC_PATH}"
  fi
}
trap cleanup EXIT

if [ -f .env ]; then
  while IFS= read -r line || [ -n "${line}" ]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    case "${line}" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%$'\r'}"
    if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi
    case "${key}" in
      BASE_URL|WORK_DIR|VIDEO_PATH|COOKIE_JAR) continue ;;
    esac
    if [[ "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      export "${key}=${value}"
    fi
  done < .env
fi

required_env=(
  CloudflareR2__AccountId
  CloudflareR2__AccessKeyId
  CloudflareR2__SecretAccessKey
  CloudflareR2__BucketName
  CloudflareR2__Endpoint
  CloudflareR2__PublicUrl
)

for key in "${required_env[@]}"; do
  if [ -z "${!key:-}" ]; then
    echo "Missing required env: ${key}" >&2
    exit 2
  fi
done

case "${BASE_URL}" in
  http://*|https://*) ;;
  *)
    echo "Invalid URL env: PLAYWRIGHT_BASE_URL" >&2
    exit 2
    ;;
esac

for key in CloudflareR2__Endpoint CloudflareR2__PublicUrl; do
  case "${!key}" in
    http://*|https://*) ;;
    *)
      echo "Invalid URL env: ${key}" >&2
      exit 2
      ;;
  esac
done

json_prop() {
  node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync(0,'utf8')); const value=process.argv.slice(1).reduce((acc,key)=>acc?.[key], obj); if (value !== undefined && value !== null) process.stdout.write(String(value));" "$@"
}

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate the 60s smoke video." >&2
  exit 2
fi

curl -kfsS "${BASE_URL}/api/health" >/dev/null

ffmpeg -y \
  -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=880:sample_rate=48000 \
  -t 60 \
  -c:v libx264 -profile:v main -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "${VIDEO_PATH}" >/dev/null 2>&1

rm -f "${COOKIE_JAR}"
curl -kfsS -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" \
  "${BASE_URL}/api/auth/test-login?email=admin@example.com&returnUrl=/admin" >/dev/null

csrf_json=$(curl -kfsS -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" "${BASE_URL}/api/auth/csrf")
token=$(printf '%s' "${csrf_json}" | sed -n 's/.*"requestToken":"\([^"]*\)".*/\1/p')
header=$(printf '%s' "${csrf_json}" | sed -n 's/.*"headerName":"\([^"]*\)".*/\1/p')
if [ -z "${token}" ] || [ -z "${header}" ]; then
  echo "Failed to resolve CSRF token." >&2
  exit 1
fi

title="Real R2 HLS Smoke $(date +%s)"
create_payload=$(cat <<JSON
{"title":"${title}","category":"video","period":"2026.04","tags":["video","r2","hls"],"published":true,"contentJson":"{\"html\":\"<p>real r2 hls smoke body</p>\"}","allPropertiesJson":"{}"}
JSON
)

work_json=$(curl -kfsS -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -H "${header}: ${token}" \
  -d "${create_payload}" \
  "${BASE_URL}/api/admin/works")

work_id=$(printf '%s' "${work_json}" | json_prop id)
work_slug=$(printf '%s' "${work_json}" | json_prop slug)
if [ -z "${work_id}" ] || [ -z "${work_slug}" ]; then
  echo "Failed to create work: ${work_json}" >&2
  exit 1
fi

hls_json=$(curl -kfsS -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" \
  -H "${header}: ${token}" \
  -F "file=@${VIDEO_PATH};type=video/mp4" \
  -F "expectedVideosVersion=0" \
  "${BASE_URL}/api/admin/works/${work_id}/videos/hls-job")

playback_url=$(printf '%s' "${hls_json}" | json_prop videos 0 playbackUrl)
source_key=$(printf '%s' "${hls_json}" | json_prop videos 0 sourceKey)
if [ -z "${playback_url}" ] || [ -z "${source_key}" ]; then
  echo "HLS upload did not return playback metadata: ${hls_json}" >&2
  exit 1
fi

if [[ "${playback_url}" == /* ]]; then
  playback_url="${BASE_URL%/}${playback_url}"
fi

expected_public_prefix="${CloudflareR2__PublicUrl%/}/"
if [[ "${playback_url}" != "${expected_public_prefix}"* ]]; then
  echo "Expected R2 playback URL from CloudflareR2__PublicUrl, but backend returned a non-R2/local playback URL." >&2
  echo "Restart the stack after loading CloudflareR2__* env values and CloudflareR2__ForceEnabledInDevelopment=true." >&2
  exit 1
fi

if printf '%s' "${source_key}" | grep -qi '\.mp4$'; then
  echo "HLS source key must not point to an MP4: ${source_key}" >&2
  exit 1
fi

manifest=$(curl -kfsS "${playback_url}")
printf '%s' "${manifest}" | grep -q '#EXTM3U'
segment_path=$(printf '%s' "${manifest}" | awk '/^[^#].*\.ts($|[?])/{print; exit}')
if [ -z "${segment_path}" ]; then
  echo "Manifest does not reference a TS segment." >&2
  exit 1
fi

segment_url="$(dirname "${playback_url}")/${segment_path}"
curl -kfsSI "${segment_url}" | head -n 1 | grep -Eq ' 200 | 206 '

legacy_mp4_url="${BASE_URL}/media/videos/${work_id//-/}/real-r2-hls-smoke.mp4"
legacy_status=$(curl -k -s -o /dev/null -w '%{http_code}' "${legacy_mp4_url}")
if [ "${legacy_status}" != "404" ]; then
  echo "Expected direct MP4 URL to be blocked, got ${legacy_status}: ${legacy_mp4_url}" >&2
  exit 1
fi

spec_path="${WORK_DIR}/tests/.real-r2-hls-smoke.spec.ts"
TEMP_SPEC_PATH="${spec_path}"
cat > "${spec_path}" <<'SPEC'
import { expect, test } from '@playwright/test'

test('real R2 HLS smoke renders a public video element', async ({ page }) => {
  const slug = process.env.REAL_R2_HLS_WORK_SLUG
  if (!slug) throw new Error('REAL_R2_HLS_WORK_SLUG is required')
  await page.goto(`/works/${slug}`)
  const video = page.locator('video').first()
  await expect(video).toBeVisible({ timeout: 20_000 })
  await expect(video).toHaveAttribute('controlsList', /nodownload/)
})
SPEC

(
  cd "${WORK_DIR}"
  REAL_R2_HLS_WORK_SLUG="${work_slug}" \
    PLAYWRIGHT_EXTERNAL_SERVER=1 \
    PLAYWRIGHT_BASE_URL="${BASE_URL}" \
    npx playwright test "${spec_path}" --workers=1
)

printf 'WORK_ID=%s\nWORK_SLUG=%s\nPLAYBACK_URL=%s\nSEGMENT_URL=%s\n' \
  "${work_id}" "${work_slug}" "${playback_url}" "${segment_url}"
