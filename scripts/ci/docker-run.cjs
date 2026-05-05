#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const env = {
  ...process.env,
  MODE: process.env.MODE || 'basic',
  EVENT_NAME: process.env.EVENT_NAME || 'workflow_dispatch',
  TEST_ENV: process.env.TEST_ENV || 'DEV',
  THREADS: process.env.THREADS || '4',
  RUN_TAGS: process.env.RUN_TAGS || process.env.TAGS || '',
  DOCKER_IMAGE: process.env.DOCKER_IMAGE || 'pharmaserv-tests',
  ENV_FILE: process.env.ENV_FILE || '',
  HEADLESS: process.env.HEADLESS || 'true',
};

process.stdout.write(`🚀 Running tests with shared Docker runner:\n`);
process.stdout.write(`MODE=${env.MODE}\n`);
process.stdout.write(`TEST_ENV=${env.TEST_ENV}\n`);
process.stdout.write(`HEADLESS=${env.HEADLESS}\n`);
process.stdout.write(`THREADS=${env.THREADS}\n`);
process.stdout.write(`RUN_TAGS=${env.RUN_TAGS}\n`);
process.stdout.write(`-----------------------------------\n`);

const scriptPath = path.resolve('scripts/ci/run-tests-in-docker.cjs');
const result = spawnSync(process.execPath, [scriptPath], {
  stdio: 'inherit',
  env,
});

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === 'number' ? result.status : 1);
