#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const slot = process.argv[2];
const testEnv = process.argv[3] || process.env.TEST_ENV || 'DEV';
const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

if (!slot) {
  process.stderr.write('Usage: node scripts/heal-reusable-ids.cjs <slotOne|slotTwo|1|2> [DEV|QA|PROD] [--dry-run]\n');
  process.exit(1);
}

const command = ['playwright', 'test', 'api/tests/testData/healReusableIds.spec.js', '--project=api', '--workers=1'];
const env = {
  ...process.env,
  TEST_ENV: testEnv,
  HEAL_SLOT: slot,
};

if (dryRun) {
  process.stdout.write(`[DRY_RUN] TEST_ENV=${testEnv} HEAL_SLOT=${slot} npx ${command.join(' ')}\n`);
  process.exit(0);
}

const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', command, {
  stdio: 'inherit',
  env,
});

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === 'number' ? result.status : 1);
