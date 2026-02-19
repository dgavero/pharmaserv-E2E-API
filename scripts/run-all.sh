#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-safe}"
THREADS="${THREADS:-4}"
SAFE_PAUSE_SECONDS="${SAFE_PAUSE_SECONDS:-30}"
TEST_ENV="${TEST_ENV:-DEV}"
DRY_RUN="${DRY_RUN:-0}"
DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN:-1}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_step() {
  local label="$1"
  shift
  log "▶ ${label}"
  if "$@"; then
    log "✓ ${label} completed"
    return 0
  fi
  log "✗ ${label} failed"
  return 1
}

sleep_step() {
  local next_label="$1"
  log "Sleeping for ${SAFE_PAUSE_SECONDS}s before starting next batch: ${next_label}"
  sleep "${SAFE_PAUSE_SECONDS}"
}

run_api_standalone() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} PROJECT=api DISCORD_REUSE_RUN=${DISCORD_REUSE_RUN} DISCORD_BATCH_INDEX=1 DISCORD_BATCH_COUNT=3 PW_BLOB_OUTPUT=.blob-report/safe-b1 npx playwright test api/tests --grep-invert \"@workflow\""
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" PROJECT=api \
    DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN}" DISCORD_BATCH_INDEX=1 DISCORD_BATCH_COUNT=3 PW_BLOB_OUTPUT=.blob-report/safe-b1 \
    npx playwright test api/tests --grep-invert "@workflow"
}

run_api_e2e() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} PROJECT=api DISCORD_REUSE_RUN=${DISCORD_REUSE_RUN} DISCORD_BATCH_INDEX=2 DISCORD_BATCH_COUNT=3 PW_BLOB_OUTPUT=.blob-report/safe-b2 npx playwright test api/tests/e2e"
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" PROJECT=api \
    DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN}" DISCORD_BATCH_INDEX=2 DISCORD_BATCH_COUNT=3 PW_BLOB_OUTPUT=.blob-report/safe-b2 \
    npx playwright test api/tests/e2e
}

run_ui_e2e() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} PROJECT=e2e DISCORD_REUSE_RUN=${DISCORD_REUSE_RUN} DISCORD_BATCH_INDEX=3 DISCORD_BATCH_COUNT=3 PW_BLOB_OUTPUT=.blob-report/safe-b3 npx playwright test e2e/tests"
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" PROJECT=e2e \
    DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN}" DISCORD_BATCH_INDEX=3 DISCORD_BATCH_COUNT=3 PW_BLOB_OUTPUT=.blob-report/safe-b3 \
    npx playwright test e2e/tests
}

run_stress() {
  log "Running mode: STRESS MODE (single full-suite invocation)"
  log "Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS}"
  rm -f .discord-run.json .discord-cumulative.json
  rm -rf .blob-report
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS= PROJECT= DISCORD_REUSE_RUN=${DISCORD_REUSE_RUN} npx playwright test"
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" TAGS= PROJECT= DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN}" \
    npx playwright test
  log "✓ STRESS MODE completed"
}

run_safe() {
  log "Running by default - SAFE MODE"
  log "Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS} SAFE_PAUSE_SECONDS=${SAFE_PAUSE_SECONDS} DRY_RUN=${DRY_RUN}"
  rm -f .discord-run.json .discord-cumulative.json
  rm -rf .blob-report

  failed=0
  if ! run_step "Batch 1/3: API Standalone" run_api_standalone; then
    failed=1
  fi
  sleep_step "E2E-API"

  if ! run_step "Batch 2/3: E2E-API" run_api_e2e; then
    failed=1
  fi
  sleep_step "E2E-UI"

  if ! run_step "Batch 3/3: E2E-UI" run_ui_e2e; then
    failed=1
  fi

  if [[ "${failed}" -ne 0 ]]; then
    log "✗ SAFE MODE finished with failures"
    exit 1
  fi

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
