#!/usr/bin/env node

/**
 * Decrypts env-scoped secrets JSON via sops and exports variables for shell/CI.
 *
 * Usage:
 * - node scripts/secrets/load-secrets.js --env DEV --github-env
 * - node scripts/secrets/load-secrets.js --env QA --shell
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VALID_ENVS = new Set(['DEV', 'QA', 'PROD']);

function parseArgs(argv) {
  const args = {
    env: String(process.env.TEST_ENV || 'DEV').toUpperCase(),
    mode: 'shell',
    required: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--env' && argv[i + 1]) {
      args.env = String(argv[i + 1]).toUpperCase();
      i += 1;
    } else if (arg === '--github-env') {
      args.mode = 'github';
    } else if (arg === '--shell') {
      args.mode = 'shell';
    } else if (arg === '--required') {
      args.required = true;
    }
  }

  return args;
}

function validateEnv(envName) {
  if (!VALID_ENVS.has(envName)) {
    throw new Error(`Unsupported env "${envName}". Valid values: DEV, QA, PROD`);
  }
}

function decryptJson(filePath) {
  try {
    const out = execFileSync('sops', ['--decrypt', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch (error) {
    const stderr = String(error.stderr || '').trim();
    throw new Error(stderr || error.message || `Failed to decrypt ${filePath}`);
  }
}

function normalizeFlatObject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Decrypted secrets must be a flat JSON object');
  }

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^[A-Z0-9_]+$/.test(key)) {
      throw new Error(`Invalid key "${key}". Use uppercase env-style keys only`);
    }
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') {
      throw new Error(`Invalid value for key "${key}". Nested objects/arrays are not allowed`);
    }
    out[key] = String(value);
  }
  return out;
}

function appendGithubEnv(filePath, vars) {
  let chunk = '';
  for (const [key, value] of Object.entries(vars)) {
    const marker = `__SECRETS_${key}__`;
    chunk += `${key}<<${marker}\n${value}\n${marker}\n`;
  }
  fs.appendFileSync(filePath, chunk);
}

function printShellExports(vars) {
  for (const [key, value] of Object.entries(vars)) {
    // Single-quote escape for shell-safe export output.
    const escaped = value.replace(/'/g, "'\"'\"'");
    process.stdout.write(`export ${key}='${escaped}'\n`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  validateEnv(args.env);

  const envLower = args.env.toLowerCase();
  const filePath = path.resolve(`secrets/secrets.${envLower}.enc.json`);

  if (!fs.existsSync(filePath)) {
    if (args.required) {
      throw new Error(`Missing encrypted secrets file: ${filePath}`);
    }
    process.stderr.write(`Skipping secrets load: file not found (${filePath})\n`);
    process.exit(0);
  }

  const decrypted = decryptJson(filePath);
  const vars = normalizeFlatObject(decrypted);

  if (args.mode === 'github') {
    const githubEnvPath = process.env.GITHUB_ENV;
    if (!githubEnvPath) {
      throw new Error('GITHUB_ENV is not set. Use --shell outside GitHub Actions');
    }
    appendGithubEnv(githubEnvPath, vars);
    process.stdout.write(`Loaded ${Object.keys(vars).length} vars to GITHUB_ENV from ${filePath}\n`);
    return;
  }

  printShellExports(vars);
}

try {
  main();
} catch (error) {
  process.stderr.write(`[secrets-load] ${error.message}\n`);
  process.exit(1);
}

