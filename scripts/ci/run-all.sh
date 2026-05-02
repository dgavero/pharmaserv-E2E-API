#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-regression}"
THREADS="${THREADS:-4}"
TEST_ENV="${TEST_ENV:-DEV}"
DRY_RUN="${DRY_RUN:-0}"
DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN:-0}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

clear_dir() {
  local dir="$1"
  if [[ ! -e "${dir}" ]]; then
    return 0
  fi

  # Works for normal dirs; may fail on mounted directories in CI.
  if rm -rf "${dir}" 2>/dev/null; then
    return 0
  fi

  # Fallback: keep mountpoint, clear contents only.
  mkdir -p "${dir}"
  find "${dir}" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
}

run_regression() {
  local tags="${TAGS:-}"
  log "Running mode: REGRESSION MODE (single full-suite invocation)"
  log "Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${tags}"
  rm -f .discord-run.json .discord-cumulative.json
  clear_dir .blob-report
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${tags} PROJECT= DISCORD_REUSE_RUN=${DISCORD_REUSE_RUN} npx playwright test"
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" TAGS="${tags}" PROJECT= DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN}" \
    npx playwright test
  log "✓ REGRESSION MODE completed"
}

run_stress() {
  local tags=""
  log "Running mode: STRESS MODE (single full-suite invocation)"
  log "Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${tags}"
  rm -f .discord-run.json .discord-cumulative.json
  clear_dir .blob-report
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "[DRY_RUN] TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${tags} PROJECT= DISCORD_REUSE_RUN=${DISCORD_REUSE_RUN} npx playwright test"
    return 0
  fi
  env TEST_ENV="${TEST_ENV}" THREADS="${THREADS}" TAGS="${tags}" PROJECT= DISCORD_REUSE_RUN="${DISCORD_REUSE_RUN}" \
    npx playwright test
  log "✓ STRESS MODE completed"
}

case "${MODE}" in
  regression)
    run_regression
    ;;
  stress)
    run_stress
    ;;
  *)
    log "Unknown mode: ${MODE}"
    log "Usage: bash scripts/ci/run-all.sh [regression|stress]"
    exit 1
    ;;
esac
