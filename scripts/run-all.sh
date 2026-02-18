#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-safe}"
THREADS="${THREADS:-4}"
SAFE_PAUSE_SECONDS="${SAFE_PAUSE_SECONDS:-30}"
TEST_ENV="${TEST_ENV:-DEV}"
DRY_RUN="${DRY_RUN:-0}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_step() {
  local label="$1"
  shift
  log "▶ ${label}"
  "$@"
  log "✓ ${label} completed"
}

sleep_step() {
  local next_label="$1"
  log "Sleeping for ${SAFE_PAUSE_SECONDS}s before starting next batch: ${next_label}"
  sleep "${SAFE_PAUSE_SECONDS}"
}

run_api_standalone() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} PROJECT=api npx playwright test api/tests --grep-invert \"@workflow\""
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" PROJECT=api \
    npx playwright test api/tests --grep-invert "@workflow"
}

run_api_e2e() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} PROJECT=api npx playwright test api/tests/e2e"
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" PROJECT=api \
    npx playwright test api/tests/e2e
}

run_ui_e2e() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} PROJECT=e2e npx playwright test e2e/tests"
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" PROJECT=e2e \
    npx playwright test e2e/tests
}

run_stress() {
  log "Running mode: STRESS MODE (all batches in parallel)"
  log "Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS}"

  run_api_standalone &
  pid_api_standalone=$!
  run_api_e2e &
  pid_api_e2e=$!
  run_ui_e2e &
  pid_ui_e2e=$!

  failed=0
  for pid in "${pid_api_standalone}" "${pid_api_e2e}" "${pid_ui_e2e}"; do
    if ! wait "${pid}"; then
      failed=1
    fi
  done

  if [[ "${failed}" -ne 0 ]]; then
    log "✗ STRESS MODE finished with failures"
    exit 1
  fi

  log "✓ STRESS MODE completed"
}

run_safe() {
  log "Running by default - SAFE MODE"
  log "Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS} SAFE_PAUSE_SECONDS=${SAFE_PAUSE_SECONDS} DRY_RUN=${DRY_RUN}"

  run_step "Batch 1/3: API Standalone" run_api_standalone
  sleep_step "E2E-API"
  run_step "Batch 2/3: E2E-API" run_api_e2e
  sleep_step "E2E-UI"
  run_step "Batch 3/3: E2E-UI" run_ui_e2e

  log "✓ SAFE MODE completed"
}

case "${MODE}" in
  safe)
    run_safe
    ;;
  stress)
    run_stress
    ;;
  *)
    log "Unknown mode: ${MODE}"
    log "Usage: bash scripts/run-all.sh [safe|stress]"
    exit 1
    ;;
esac
