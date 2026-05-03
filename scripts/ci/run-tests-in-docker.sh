#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-basic}"
EVENT_NAME="${EVENT_NAME:-workflow_dispatch}"
TEST_ENV="${TEST_ENV:-DEV}"
THREADS="${THREADS:-4}"
RUN_TAGS="${RUN_TAGS:-}"
PROJECT="${PROJECT:-}"
DOCKER_IMAGE="${DOCKER_IMAGE:-pharmaserv-tests-ci}"
ENV_FILE="${ENV_FILE:-}"
HEADLESS="${HEADLESS:-true}"

echo "Resolved selector: mode=${MODE} test_env=${TEST_ENV} threads=${THREADS} run_tags=${RUN_TAGS} project=${PROJECT}"

rm -rf .playwright-report test-results screenshots .blob-report
mkdir -p .playwright-report test-results screenshots .blob-report

BASE_ARGS=(
  docker run --rm
  -v "$PWD/.playwright-report:/app/.playwright-report"
  -v "$PWD/test-results:/app/test-results"
  -v "$PWD/screenshots:/app/screenshots"
  -v "$PWD/.blob-report:/app/.blob-report"
)

if [[ -n "${ENV_FILE}" ]]; then
  BASE_ARGS+=(--env-file "${ENV_FILE}")
fi

BASE_ARGS+=(
  -e CI=true
  -e HEADLESS="${HEADLESS}"
  -e GITHUB_TOKEN
  -e GIT_AUTHOR_NAME
  -e GIT_AUTHOR_EMAIL
  -e GIT_COMMITTER_NAME
  -e GIT_COMMITTER_EMAIL
  -e REPORT_PUBLISH
  -e TEST_ENV="${TEST_ENV}"
  -e THREADS="${THREADS}"
)

run_container() {
  local tags="$1"
  local project="$2"
  local discord_label="$3"
  shift 3
  local -a cmd=("$@")

  local -a args=("${BASE_ARGS[@]}")
  args+=(
    -e TAGS="${tags}"
    -e PROJECT="${project}"
    -e DISCORD_GREP_LABEL="${discord_label}"
    "${DOCKER_IMAGE}"
  )
  args+=("${cmd[@]}")

  "${args[@]}"
}

if [[ "${MODE}" == "stress" ]]; then
  echo "Running full suite in STRESS mode"
  echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} npm run test:all:stress"
  run_container "${RUN_TAGS}" "${PROJECT:-}" "${DISCORD_GREP_LABEL:-}" npm run test:all:stress
elif [[ "${MODE}" == "regression" ]]; then
  echo "Running REGRESSION mode in a single invocation"
  echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${RUN_TAGS} PROJECT=${PROJECT} npx playwright test"
  run_container "${RUN_TAGS}" "${PROJECT}" "${DISCORD_GREP_LABEL:-}" npx playwright test
else
  if [[ -n "${RUN_TAGS}" ]]; then
    echo "Running BASIC mode with specific TAGS"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${RUN_TAGS} PROJECT=e2e,api npx playwright test"
    run_container "${RUN_TAGS}" "e2e,api" "${DISCORD_GREP_LABEL:-}" npx playwright test
  else
    echo "Running smoke suite in BASIC mode"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=smoke DISCORD_GREP_LABEL=smoke PROJECT= npx playwright test"
    run_container "smoke" "" "smoke" npx playwright test
  fi
fi
