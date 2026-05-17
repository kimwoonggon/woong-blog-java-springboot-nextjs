#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
COVERAGE_ROOT="$ROOT_DIR/coverage/backend"
RUNSETTINGS="$BACKEND_DIR/coverage.runsettings"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/run-backend-coverage.sh <unit|component|integration|full> [maven args...]

Examples:
  ./scripts/run-backend-coverage.sh unit
  ./scripts/run-backend-coverage.sh component -DtrimStackTrace=false
  ./scripts/run-backend-coverage.sh integration
  ./scripts/run-backend-coverage.sh full
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

SUITE="${1:-full}"
if [[ $# -gt 0 ]]; then
  shift
fi

GOAL="test"
GROUPS=""
case "$SUITE" in
  unit)
    LABEL="UnitTests"
    GROUPS="unit"
    ;;
  component)
    LABEL="ComponentTests"
    GROUPS="component"
    ;;
  integration)
    LABEL="IntegrationTests"
    GOAL="verify"
    GROUPS="integration"
    ;;
  full)
    LABEL="FullBackend"
    GOAL="verify"
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

RAW_DIR="$COVERAGE_ROOT/$SUITE/raw"
REPORT_DIR="$COVERAGE_ROOT/$SUITE/report"
HISTORY_DIR="$COVERAGE_ROOT/history/$SUITE"

rm -rf "$RAW_DIR" "$REPORT_DIR"
mkdir -p "$RAW_DIR" "$REPORT_DIR" "$HISTORY_DIR"

test_args=(
  -f
  "$BACKEND_DIR/pom.xml"
  "$GOAL"
)

if [[ -n "$GROUPS" ]]; then
  test_args+=("-Dgroups=$GROUPS")
fi

test_args+=(
  "-Djacoco.destFile=$RAW_DIR/jacoco.exec"
  "-Djacoco.outputDirectory=$REPORT_DIR"
  "$@"
)

"$BACKEND_DIR/mvnw" "${test_args[@]}"

if [[ -f "$REPORT_DIR/jacoco/index.html" ]]; then
  printf 'Coverage report: %s\n' "$REPORT_DIR/jacoco/index.html"
elif [[ -f "$BACKEND_DIR/target/site/jacoco/index.html" ]]; then
  printf 'Coverage report: %s\n' "$BACKEND_DIR/target/site/jacoco/index.html"
else
  printf 'Coverage output requested under: %s\n' "$REPORT_DIR"
  printf 'No JaCoCo HTML report was found. Ensure jacoco-maven-plugin is configured in backend/pom.xml.\n' >&2
fi
