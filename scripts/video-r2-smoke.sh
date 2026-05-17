#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo ".env not found" >&2
  exit 1
fi

export CloudflareR2__ForceEnabledInDevelopment=true

docker compose up -d db backend frontend nginx >/dev/null

for _ in $(seq 1 30); do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

curl -fsS -c /tmp/r2-cookies.txt -b /tmp/r2-cookies.txt "http://localhost/api/auth/test-login?email=admin@example.com&returnUrl=/admin" -o /dev/null
TOKEN=$(curl -fsS -c /tmp/r2-cookies.txt -b /tmp/r2-cookies.txt http://localhost/api/auth/csrf | sed -n 's/.*"requestToken":"\([^"]*\)".*/\1/p')
TITLE="Real R2 Smoke $(date +%s)"

CREATE_PAYLOAD=$(cat <<JSON
{"title":"$TITLE","category":"video","period":"2026.04","tags":["video","r2"],"published":true,"contentJson":"{\"html\":\"<p>real r2 smoke body</p>\"}","allPropertiesJson":"{}"}
JSON
)

WORK_JSON=$(curl -fsS -c /tmp/r2-cookies.txt -b /tmp/r2-cookies.txt -H "Content-Type: application/json" -H "X-CSRF-TOKEN: $TOKEN" -d "$CREATE_PAYLOAD" http://localhost/api/admin/works)
WORK_ID=$(echo "$WORK_JSON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
WORK_SLUG=$(echo "$WORK_JSON" | sed -n 's/.*"slug":"\([^"]*\)".*/\1/p')

UPLOAD_JSON=$(curl -fsS -c /tmp/r2-cookies.txt -b /tmp/r2-cookies.txt -H "Content-Type: application/json" -H "X-CSRF-TOKEN: $TOKEN" -d '{"fileName":"real-smoke.mp4","contentType":"video/mp4","size":24,"expectedVideosVersion":0}' "http://localhost/api/admin/works/$WORK_ID/videos/upload-url")
UPLOAD_URL=$(echo "$UPLOAD_JSON" | sed -n 's/.*"uploadUrl":"\([^"]*\)".*/\1/p')
SESSION_ID=$(echo "$UPLOAD_JSON" | sed -n 's/.*"uploadSessionId":"\([^"]*\)".*/\1/p')

printf '\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom' > /tmp/real-r2-smoke.mp4

curl -fsS -X PUT -H 'Content-Type: video/mp4' --data-binary @/tmp/real-r2-smoke.mp4 "$UPLOAD_URL" >/dev/null

CONFIRM_JSON=$(curl -fsS -c /tmp/r2-cookies.txt -b /tmp/r2-cookies.txt -H "Content-Type: application/json" -H "X-CSRF-TOKEN: $TOKEN" -d "{\"uploadSessionId\":\"$SESSION_ID\",\"expectedVideosVersion\":0}" "http://localhost/api/admin/works/$WORK_ID/videos/confirm")
PUBLIC_JSON=$(curl -fsS "http://localhost/api/public/works/$WORK_SLUG")
PLAYBACK_URL=$(printf '%s' "$PUBLIC_JSON" | sed -n 's/.*"playbackUrl":"\([^"]*\)".*/\1/p')
PLAYBACK_HEAD=$(curl -I -s "$PLAYBACK_URL" | head -n 1)

printf 'WORK_ID=%s\nWORK_SLUG=%s\nUPLOAD_JSON=%s\nCONFIRM_JSON=%s\nPUBLIC_JSON=%s\nPLAYBACK_HEAD=%s\n' \
  "$WORK_ID" "$WORK_SLUG" "$UPLOAD_JSON" "$CONFIRM_JSON" "$PUBLIC_JSON" "$PLAYBACK_HEAD"
