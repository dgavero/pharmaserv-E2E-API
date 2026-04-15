#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-basic}"
RUN_TAGS="${RUN_TAGS:-${TAGS:-}}"

echo "🚀 Running tests with shared Docker runner:"
echo "MODE=${MODE}"
echo "TEST_ENV=${TEST_ENV:-DEV}"
echo "HEADLESS=${HEADLESS:-true}"
echo "THREADS=${THREADS:-4}"
echo "RUN_TAGS=${RUN_TAGS}"
echo "-----------------------------------"

MODE="${MODE}" \
EVENT_NAME="${EVENT_NAME:-workflow_dispatch}" \
TEST_ENV="${TEST_ENV:-DEV}" \
THREADS="${THREADS:-4}" \
SAFE_PAUSE_SECONDS="${SAFE_PAUSE_SECONDS:-30}" \
RUN_TAGS="${RUN_TAGS}" \
DOCKER_IMAGE="${DOCKER_IMAGE:-pharmaserv-tests}" \
ENV_FILE="${ENV_FILE:-}" \
HEADLESS="${HEADLESS:-true}" \
./scripts/ci/run-tests-in-docker.sh
