#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-basic}"
EVENT_NAME="${EVENT_NAME:-workflow_dispatch}"
TEST_ENV="${TEST_ENV:-DEV}"
THREADS="${THREADS:-4}"
SAFE_PAUSE_SECONDS="${SAFE_PAUSE_SECONDS:-30}"
RUN_TAGS="${RUN_TAGS:-}"
DOCKER_IMAGE="${DOCKER_IMAGE:-pharmaserv-tests-ci}"
ENV_FILE="${ENV_FILE:-}"
HEADLESS="${HEADLESS:-true}"

echo "Resolved selector: mode=${MODE} test_env=${TEST_ENV} threads=${THREADS} safe_pause=${SAFE_PAUSE_SECONDS} run_tags=${RUN_TAGS}"

rm -rf .playwright-report test-results screenshots .blob-report
mkdir -p .playwright-report test-results screenshots .blob-report

BASE_ARGS=(
  docker run --rm
  --user "$(id -u):$(id -g)"
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
  -e HOME=/tmp
  -e GITHUB_TOKEN
  -e REPORT_PUBLISH
  -e TEST_ENV="${TEST_ENV}"
  -e THREADS="${THREADS}"
)

run_container() {
  local safe_tags="$1"
  local tags="$2"
  local project="$3"
  local discord_label="$4"
  shift 4
  local -a cmd=("$@")

  local -a args=("${BASE_ARGS[@]}")
  args+=(
    -e SAFE_PAUSE_SECONDS="${SAFE_PAUSE_SECONDS}"
    -e SAFE_TAGS="${safe_tags}"
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
  run_container "${RUN_TAGS}" "${RUN_TAGS}" "${PROJECT:-}" "${DISCORD_GREP_LABEL:-}" npm run test:all:stress
elif [[ "${MODE}" == "safe" ]]; then
  if [[ "${EVENT_NAME}" == "push" ]]; then
    echo "Running SAFE mode smoke batches (push)"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} SAFE_PAUSE_SECONDS=${SAFE_PAUSE_SECONDS} SAFE_TAGS=${RUN_TAGS} DISCORD_GREP_LABEL=smoke npm run test:all:safe"
    run_container "${RUN_TAGS}" "${RUN_TAGS}" "${PROJECT:-}" "smoke" npm run test:all:safe
  elif [[ "${EVENT_NAME}" == "schedule" ]]; then
    echo "Running SAFE mode smoke batches (schedule DEV)"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} SAFE_PAUSE_SECONDS=${SAFE_PAUSE_SECONDS} SAFE_TAGS=${RUN_TAGS} DISCORD_GREP_LABEL=smoke npm run test:all:safe"
    run_container "${RUN_TAGS}" "${RUN_TAGS}" "${PROJECT:-}" "smoke" npm run test:all:safe
  elif [[ -n "${RUN_TAGS}" ]]; then
    echo "Running SAFE mode with specific TAGS in a single pass"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${RUN_TAGS} PROJECT=e2e,api npx playwright test"
    run_container "${SAFE_TAGS:-}" "${RUN_TAGS}" "e2e,api" "${DISCORD_GREP_LABEL:-}" npx playwright test
  else
    echo "Running full suite in SAFE mode"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} SAFE_PAUSE_SECONDS=${SAFE_PAUSE_SECONDS} SAFE_TAGS=__ALL__ npm run test:all:safe"
    run_container "__ALL__" "${TAGS:-}" "${PROJECT:-}" "${DISCORD_GREP_LABEL:-}" npm run test:all:safe
  fi
else
  if [[ -n "${RUN_TAGS}" ]]; then
    echo "Running BASIC mode with specific TAGS"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${RUN_TAGS} PROJECT=e2e,api npx playwright test"
    run_container "${SAFE_TAGS:-}" "${RUN_TAGS}" "e2e,api" "${DISCORD_GREP_LABEL:-}" npx playwright test
  else
    echo "Running smoke suite in BASIC mode"
    echo "CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=smoke DISCORD_GREP_LABEL=smoke PROJECT= npx playwright test"
    run_container "${SAFE_TAGS:-}" "smoke" "" "smoke" npx playwright test
  fi
fi
