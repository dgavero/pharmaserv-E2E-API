#!/usr/bin/env bash
set -euo pipefail

slot="${1:-}"
test_env="${2:-${TEST_ENV:-DEV}}"

if [[ -z "$slot" ]]; then
  echo "Usage: bash scripts/heal-reusable-ids.sh <slotOne|slotTwo|1|2> [DEV|QA|PROD]"
  exit 1
fi

TEST_ENV="$test_env" \
HEAL_SLOT="$slot" \
npx playwright test api/tests/testData/healReusableIds.spec.js --project=api --workers=1
