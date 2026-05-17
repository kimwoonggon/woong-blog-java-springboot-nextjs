#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_SRC="${BACKEND_TEST_SRC:-$ROOT_DIR/backend/src/test/java}"
DISPLAY_TEST_SRC="$TEST_SRC"
if [[ "$TEST_SRC" == "$ROOT_DIR/"* ]]; then
  DISPLAY_TEST_SRC="${TEST_SRC#"$ROOT_DIR"/}"
fi

if [[ ! -d "$TEST_SRC" ]]; then
  printf 'Backend test source directory not found: %s\n' "$TEST_SRC" >&2
  exit 1
fi

mapfile -t test_files < <(find "$TEST_SRC" -type f \( -name '*Test.java' -o -name '*Tests.java' \) | sort)

class_count="${#test_files[@]}"
declared_test_count=0
untagged_class_count=0
rows=()
declare -A suite_class_counts=()
declare -A suite_method_counts=()

for file in "${test_files[@]}"; do
  rel="${file#"$TEST_SRC"/}"
  class_name="${rel%.java}"
  class_name="${class_name//\//.}"

  method_count="$(awk '/^[[:space:]]*@(Test|ParameterizedTest|RepeatedTest|TestFactory)([[:space:]]|\(|$)/ { count++ } END { print count + 0 }' "$file")"
  declared_test_count=$((declared_test_count + method_count))

  mapfile -t tags < <(grep -Eo '@Tag\("[^"]+"\)' "$file" | sed -E 's/@Tag\("([^"]+)"\)/\1/' | sort -u)
  if [[ "${#tags[@]}" -eq 0 ]]; then
    tags=("untagged")
    untagged_class_count=$((untagged_class_count + 1))
  fi

  tag_display="$(IFS=,; printf '%s' "${tags[*]}")"
  rows+=("| \`$class_name\` | $tag_display | $method_count |")

  for tag in "${tags[@]}"; do
    suite_class_counts["$tag"]=$(( ${suite_class_counts["$tag"]:-0} + 1 ))
    suite_method_counts["$tag"]=$(( ${suite_method_counts["$tag"]:-0} + method_count ))
  done
done

if [[ "$class_count" -eq 0 || "$declared_test_count" -eq 0 ]]; then
  printf 'No backend tests were discovered under %s.\n' "$TEST_SRC" >&2
  exit 1
fi

cat <<EOF
# Backend Test Inventory

Generated from \`$DISPLAY_TEST_SRC\`.

Static declared test methods count each \`@Test\`, \`@ParameterizedTest\`, \`@RepeatedTest\`, and \`@TestFactory\` method once. Runtime CI suite scripts print actual Surefire execution counts separately, so parameterized invocations may be higher than this static number.

- Total backend test classes: $class_count
- Total declared backend test methods: $declared_test_count

## Suite Counts

| Suite tag | Classes | Declared test methods |
|---|---:|---:|
EOF

while IFS= read -r tag; do
  [[ -z "$tag" ]] && continue
  printf '| %s | %s | %s |\n' "$tag" "${suite_class_counts["$tag"]}" "${suite_method_counts["$tag"]}"
done < <(printf '%s\n' "${!suite_class_counts[@]}" | sort)

cat <<'EOF'

## Test Classes

| Class | Suite tag(s) | Declared test methods |
|---|---|---:|
EOF

printf '%s\n' "${rows[@]}"

if [[ "$untagged_class_count" -gt 0 ]]; then
  printf '\nUntagged backend test classes: %s\n' "$untagged_class_count" >&2
  printf 'Add @Tag("unit"), @Tag("web"), @Tag("component"), @Tag("architecture"), @Tag("integration"), or @Tag("contract") so suite CI cannot miss them.\n' >&2
  if [[ "${ALLOW_UNTAGGED_BACKEND_TESTS:-0}" != "1" ]]; then
    exit 1
  fi
fi
