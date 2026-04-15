#!/bin/bash

echo "🚀 Running tests with:"
echo "TEST_ENV=${TEST_ENV:-DEV}"
echo "HEADLESS=${HEADLESS:-true}"
echo "THREADS=${THREADS:-4}"
echo "TAGS=${TAGS:-@smoke}"
echo "-----------------------------------"

docker run --rm \
-v "$(pwd):/app" \
-w /app \
-e TEST_ENV="${TEST_ENV:-DEV}" \
-e HEADLESS="${HEADLESS:-true}" \
-e THREADS="${THREADS:-4}" \
-e TAGS="${TAGS:-@smoke}" \
pharmaserv-tests \
npx playwright test