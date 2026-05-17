#!/usr/bin/env bash
set -euo pipefail

ROOT="test-results/playwright"
SUMMARY_DIR="$ROOT/summary"
SUMMARY_FILE="$SUMMARY_DIR/latest-upload-artifacts.md"

mkdir -p "$SUMMARY_DIR"

{
  echo "# Playwright Upload Artifact Index"
  echo
  echo "Generated at: $(date -Iseconds)"
  echo

  echo "## Video Recordings"
  recordings=$(find "$ROOT" -type f -name 'video.webm' | sort || true)
  if [ -n "$recordings" ]; then
    while IFS= read -r file; do
      [ -n "$file" ] && echo "- \`$file\`"
    done <<< "$recordings"
  else
    echo "- none"
  fi
  echo

  echo "## Failure Screenshots"
  screenshots=$(find "$ROOT" -type f -name 'test-failed-*.png' | sort || true)
  if [ -n "$screenshots" ]; then
    while IFS= read -r file; do
      [ -n "$file" ] && echo "- \`$file\`"
    done <<< "$screenshots"
  else
    echo "- none"
  fi
  echo

  echo "## Traces"
  traces=$(find "$ROOT" -type f -name 'trace.zip' | sort || true)
  if [ -n "$traces" ]; then
    while IFS= read -r file; do
      [ -n "$file" ] && echo "- \`$file\`"
    done <<< "$traces"
  else
    echo "- none"
  fi
} > "$SUMMARY_FILE"

echo "Wrote $SUMMARY_FILE"
