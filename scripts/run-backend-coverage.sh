#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
COVERAGE_ROOT="$ROOT_DIR/coverage/backend"
COVERAGE_MINIMUM="${COVERAGE_MINIMUM:-0.99}"

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

GOAL="verify"
TEST_GROUPS=""
ENFORCE_COVERAGE=0
case "$SUITE" in
  unit)
    LABEL="UnitTests"
    TEST_GROUPS="unit"
    ;;
  component)
    LABEL="ComponentTests"
    TEST_GROUPS="component"
    ;;
  integration)
    LABEL="IntegrationTests"
    TEST_GROUPS="integration"
    ;;
  full)
    LABEL="FullBackend"
    GOAL="verify"
    ENFORCE_COVERAGE=1
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
  clean
  "$GOAL"
)

if [[ "${COVERAGE_ENFORCE:-$ENFORCE_COVERAGE}" == "1" ]]; then
  test_args+=(
    "-Pcoverage-check"
    "-Djacoco.minimum.instruction.coverage=$COVERAGE_MINIMUM"
    "-Djacoco.minimum.line.coverage=$COVERAGE_MINIMUM"
  )
fi

if [[ -n "$TEST_GROUPS" ]]; then
  test_args+=("-Dgroups=$TEST_GROUPS")
fi

test_args+=(
  "-Djacoco.destFile=$RAW_DIR/jacoco.exec"
  "-Djacoco.dataFile=$RAW_DIR/jacoco.exec"
  "-Djacoco.outputDirectory=$REPORT_DIR"
  "$@"
)

maven_status=0
(
  cd "$BACKEND_DIR"
  ./mvnw "${test_args[@]}"
) || maven_status=$?

test_count=0
shopt -s nullglob
for report in "$BACKEND_DIR"/target/surefire-reports/TEST-*.xml; do
  tests_attr="$(sed -n 's/.* tests="\([0-9][0-9]*\)".*/\1/p' "$report" | head -n 1)"
  if [[ -n "$tests_attr" ]]; then
    test_count=$((test_count + tests_attr))
  fi
done
shopt -u nullglob

if [[ "$test_count" -eq 0 ]]; then
  printf 'Coverage suite "%s" executed zero backend tests; refusing to report misleading coverage.\n' "$SUITE" >&2
  exit 1
fi
printf 'Backend tests executed for %s coverage: %s\n' "$LABEL" "$test_count"

if [[ -f "$REPORT_DIR/index.html" ]]; then
  printf 'Coverage report: %s\n' "$REPORT_DIR/index.html"
elif [[ -f "$REPORT_DIR/jacoco/index.html" ]]; then
  printf 'Coverage report: %s\n' "$REPORT_DIR/jacoco/index.html"
elif [[ -f "$BACKEND_DIR/target/site/jacoco/index.html" ]]; then
  printf 'Coverage report: %s\n' "$BACKEND_DIR/target/site/jacoco/index.html"
else
  printf 'Coverage output requested under: %s\n' "$REPORT_DIR"
  printf 'No JaCoCo HTML report was found. Ensure jacoco-maven-plugin is configured in backend/pom.xml.\n' >&2
fi

coverage_csv=""
if [[ -f "$REPORT_DIR/jacoco.csv" ]]; then
  coverage_csv="$REPORT_DIR/jacoco.csv"
elif [[ -f "$REPORT_DIR/jacoco/jacoco.csv" ]]; then
  coverage_csv="$REPORT_DIR/jacoco/jacoco.csv"
elif [[ -f "$BACKEND_DIR/target/site/jacoco/jacoco.csv" ]]; then
  coverage_csv="$BACKEND_DIR/target/site/jacoco/jacoco.csv"
fi

if [[ -n "$coverage_csv" ]]; then
  read -r instruction_coverage line_coverage <<<"$(awk -F, '
    NR > 1 {
      instructionMissed += $4
      instructionCovered += $5
      lineMissed += $8
      lineCovered += $9
    }
    END {
      printf "%.6f %.6f", instructionCovered / (instructionMissed + instructionCovered), lineCovered / (lineMissed + lineCovered)
    }
  ' "$coverage_csv")"
  printf 'JaCoCo instruction coverage: %.2f%%\n' "$(awk -v value="$instruction_coverage" 'BEGIN { printf value * 100 }')"
  printf 'JaCoCo line coverage: %.2f%%\n' "$(awk -v value="$line_coverage" 'BEGIN { printf value * 100 }')"

  if [[ "${COVERAGE_ENFORCE:-$ENFORCE_COVERAGE}" == "1" ]]; then
    if ! awk -v actual="$instruction_coverage" -v minimum="$COVERAGE_MINIMUM" 'BEGIN { exit actual + 0 >= minimum + 0 ? 0 : 1 }'; then
      printf 'Instruction coverage %.2f%% is below required %.2f%%.\n' \
        "$(awk -v value="$instruction_coverage" 'BEGIN { printf value * 100 }')" \
        "$(awk -v value="$COVERAGE_MINIMUM" 'BEGIN { printf value * 100 }')" >&2
      exit 1
    fi
    if ! awk -v actual="$line_coverage" -v minimum="$COVERAGE_MINIMUM" 'BEGIN { exit actual + 0 >= minimum + 0 ? 0 : 1 }'; then
      printf 'Line coverage %.2f%% is below required %.2f%%.\n' \
        "$(awk -v value="$line_coverage" 'BEGIN { printf value * 100 }')" \
        "$(awk -v value="$COVERAGE_MINIMUM" 'BEGIN { printf value * 100 }')" >&2
      exit 1
    fi
  fi
else
  printf 'No JaCoCo CSV report was found for threshold verification.\n' >&2
  exit 1
fi

if [[ "$maven_status" -ne 0 ]]; then
  exit "$maven_status"
fi
