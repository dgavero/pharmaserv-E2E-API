#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MODE = process.env.MODE || 'basic';
const TEST_ENV = process.env.TEST_ENV || 'DEV';
const THREADS = process.env.THREADS || '4';
const RUN_TAGS = process.env.RUN_TAGS || '';
const PROJECT = process.env.PROJECT || '';
const DOCKER_IMAGE = process.env.DOCKER_IMAGE || 'pharmaserv-tests-ci';
const ENV_FILE = process.env.ENV_FILE || '';
const HEADLESS = process.env.HEADLESS || 'true';
const DISCORD_GREP_LABEL = process.env.DISCORD_GREP_LABEL || '';
const DRY_RUN = process.env.DRY_RUN || '0';

function toDockerHostPath(targetPath) {
  return process.platform === 'win32' ? targetPath.replace(/\\/g, '/') : targetPath;
}

function resetArtifactDirs() {
  for (const dir of ['.playwright-report', 'test-results', 'screenshots', '.blob-report']) {
    const abs = path.resolve(dir);
    fs.rmSync(abs, { recursive: true, force: true });
    fs.mkdirSync(abs, { recursive: true });
  }
}

function buildBaseArgs() {
  const args = [
    'run',
    '--rm',
    '-v',
    `${toDockerHostPath(path.resolve('.playwright-report'))}:/app/.playwright-report`,
    '-v',
    `${toDockerHostPath(path.resolve('test-results'))}:/app/test-results`,
    '-v',
    `${toDockerHostPath(path.resolve('screenshots'))}:/app/screenshots`,
    '-v',
    `${toDockerHostPath(path.resolve('.blob-report'))}:/app/.blob-report`,
  ];

  if (ENV_FILE) {
    args.push('--env-file', path.resolve(ENV_FILE));
  }

  args.push(
    '-e',
    'CI=true',
    '-e',
    `HEADLESS=${HEADLESS}`,
    '-e',
    'GITHUB_TOKEN',
    '-e',
    'GITHUB_REF',
    '-e',
    'GITHUB_REPOSITORY',
    '-e',
    'RERUN_HELPER_BASE_URL',
    '-e',
    'RERUN_HELPER_SIGNING_SECRET',
    '-e',
    'GIT_AUTHOR_NAME',
    '-e',
    'GIT_AUTHOR_EMAIL',
    '-e',
    'GIT_COMMITTER_NAME',
    '-e',
    'GIT_COMMITTER_EMAIL',
    '-e',
    'REPORT_PUBLISH',
    '-e',
    `TEST_ENV=${TEST_ENV}`,
    '-e',
    `THREADS=${THREADS}`
  );

  return args;
}

function runContainer(tags, project, discordLabel, command) {
  const args = buildBaseArgs();
  args.push(
    '-e',
    `TAGS=${tags}`,
    '-e',
    `PROJECT=${project}`,
    '-e',
    `DISCORD_GREP_LABEL=${discordLabel}`,
    DOCKER_IMAGE,
    ...command
  );

  const preview = `docker ${args.join(' ')}`;
  if (DRY_RUN === '1') {
    process.stdout.write(`[DRY_RUN] ${preview}\n`);
    return 0;
  }

  const result = spawnSync(process.platform === 'win32' ? 'docker.exe' : 'docker', args, {
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return typeof result.status === 'number' ? result.status : 1;
}

function main() {
  process.stdout.write(
    `Resolved selector: mode=${MODE} test_env=${TEST_ENV} threads=${THREADS} run_tags=${RUN_TAGS} project=${PROJECT}\n`
  );

  resetArtifactDirs();

  if (MODE === 'stress') {
    process.stdout.write(`Running full suite in STRESS mode\n`);
    process.stdout.write(`CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} npm run test:all:stress\n`);
    process.exit(runContainer(RUN_TAGS, PROJECT, DISCORD_GREP_LABEL, ['npm', 'run', 'test:all:stress']));
  }

  if (MODE === 'regression') {
    process.stdout.write(`Running REGRESSION mode in a single invocation\n`);
    process.stdout.write(
      `CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${RUN_TAGS} PROJECT=${PROJECT} npx playwright test\n`
    );
    process.exit(runContainer(RUN_TAGS, PROJECT, DISCORD_GREP_LABEL, ['npx', 'playwright', 'test']));
  }

  if (RUN_TAGS) {
    const selectedProject = PROJECT || 'e2e,api';
    process.stdout.write(`Running BASIC mode with specific TAGS\n`);
    process.stdout.write(
      `CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=${RUN_TAGS} PROJECT=${selectedProject} npx playwright test\n`
    );
    process.exit(runContainer(RUN_TAGS, selectedProject, DISCORD_GREP_LABEL, ['npx', 'playwright', 'test']));
  }

  process.stdout.write(`Running smoke suite in BASIC mode\n`);
  process.stdout.write(`CMD: TEST_ENV=${TEST_ENV} THREADS=${THREADS} TAGS=smoke DISCORD_GREP_LABEL=smoke PROJECT= npx playwright test\n`);
  process.exit(runContainer('smoke', '', 'smoke', ['npx', 'playwright', 'test']));
}

try {
  main();
} catch (error) {
  process.stderr.write(`[run-tests-in-docker] ${error.message}\n`);
  process.exit(1);
}
