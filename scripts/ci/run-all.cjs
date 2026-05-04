#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const mode = process.argv[2] || 'regression';
const THREADS = process.env.THREADS || '4';
const TEST_ENV = process.env.TEST_ENV || 'DEV';
const DRY_RUN = process.env.DRY_RUN || '0';
const DISCORD_REUSE_RUN = process.env.DISCORD_REUSE_RUN || '0';

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function log(message) {
  process.stdout.write(`[${nowStamp()}] ${message}\n`);
}

function clearPath(targetPath) {
  const abs = path.resolve(process.cwd(), targetPath);
  fs.rmSync(abs, { recursive: true, force: true });
}

function runPlaywright(tags) {
  const env = {
    ...process.env,
    TEST_ENV,
    THREADS,
    TAGS: tags,
    PROJECT: '',
    DISCORD_REUSE_RUN,
  };

  const cmdPreview = `TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${tags} PROJECT= DISCORD_REUSE_RUN=${DISCORD_REUSE_RUN} npx playwright test`;

  if (DRY_RUN === '1') {
    log(`[DRY_RUN] ${cmdPreview}`);
    return;
  }

  const shell = process.platform === 'win32';
  const cmd = shell ? 'npx.cmd' : 'npx';
  const result = spawnSync(cmd, ['playwright', 'test'], {
    stdio: 'inherit',
    env,
    shell,
  });

  if (result.error) throw result.error;
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

function runRegression() {
  const tags = process.env.TAGS || '';
  log('Running mode: REGRESSION MODE (single full-suite invocation)');
  log(`Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${tags}`);
  clearPath('.discord-run.json');
  clearPath('.discord-cumulative.json');
  clearPath('.blob-report');
  runPlaywright(tags);
  log('✓ REGRESSION MODE completed');
}

function runStress() {
  const tags = '';
  log('Running mode: STRESS MODE (single full-suite invocation)');
  log(`Config: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${tags}`);
  clearPath('.discord-run.json');
  clearPath('.discord-cumulative.json');
  clearPath('.blob-report');
  runPlaywright(tags);
  log('✓ STRESS MODE completed');
}

if (mode === 'regression') {
  runRegression();
} else if (mode === 'stress') {
  runStress();
} else {
  log(`Unknown mode: ${mode}`);
  log('Usage: node scripts/ci/run-all.cjs [regression|stress]');
  process.exit(1);
}
