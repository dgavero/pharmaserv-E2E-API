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
const { resolveToolCommand } = require('./tooling.cjs');

const VALID_ENVS = new Set(['DEV', 'QA', 'PROD']);

function parseArgs(argv) {
  const args = {
    env: String(process.env.TEST_ENV || 'DEV').toUpperCase(),
    mode: 'shell',
    envFile: null,
    required: false,
    allowStdoutSecrets: false,
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
    } else if (arg === '--powershell') {
      args.mode = 'powershell';
    } else if (arg === '--env-file' && argv[i + 1]) {
      args.envFile = String(argv[i + 1]);
      i += 1;
    } else if (arg === '--required') {
      args.required = true;
    } else if (arg === '--allow-stdout-secrets') {
      args.allowStdoutSecrets = true;
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
    const out = execFileSync(resolveToolCommand('sops'), ['--decrypt', filePath], {
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
  for (const [key, value] of Object.entries(vars)) {
    process.stdout.write(`::add-mask::${value}\n`);
  }

  let chunk = '';
  for (const [key, value] of Object.entries(vars)) {
    const marker = `__SECRETS_${key}__`;
    chunk += `${key}<<${marker}\n${value}\n${marker}\n`;
  }
  fs.appendFileSync(filePath, chunk);
}

function emitGithubMasks(vars) {
  if (!process.env.GITHUB_ACTIONS) return;
  for (const value of Object.values(vars)) {
    process.stdout.write(`::add-mask::${value}\n`);
  }
}

function assertSafeStdoutMode(args) {
  const emitsSecretsToStdout = args.mode === 'shell' || args.mode === 'powershell';
  if (!emitsSecretsToStdout) return;
  if (args.allowStdoutSecrets) return;
  if (!process.stdout.isTTY) return;

  throw new Error(
    'Refusing to print decrypted secrets to an interactive terminal. Use command substitution / Invoke-Expression, or pass --allow-stdout-secrets if you really need raw output.'
  );
}

function printShellExports(vars) {
  for (const [key, value] of Object.entries(vars)) {
    // Single-quote escape for shell-safe export output.
    const escaped = value.replace(/'/g, "'\"'\"'");
    process.stdout.write(`export ${key}='${escaped}'\n`);
  }
}

function printPowershellExports(vars) {
  for (const [key, value] of Object.entries(vars)) {
    const escaped = value.replace(/'/g, "''");
    process.stdout.write(`$env:${key}='${escaped}'\n`);
  }
}

function writeEnvFile(filePath, vars) {
  let chunk = '';
  for (const [key, value] of Object.entries(vars)) {
    if (value.includes('\n')) {
      throw new Error(`Cannot write multiline value for ${key} to Docker env file`);
    }
    chunk += `${key}=${value}\n`;
  }
  fs.writeFileSync(filePath, chunk, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function main() {
  const args = parseArgs(process.argv);
  validateEnv(args.env);
  assertSafeStdoutMode(args);

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

  if (args.envFile) {
    emitGithubMasks(vars);
    const envFilePath = path.resolve(args.envFile);
    writeEnvFile(envFilePath, vars);
    process.stdout.write(`Wrote ${Object.keys(vars).length} vars to env file ${envFilePath}\n`);
  }

  if (args.mode === 'github') {
    const githubEnvPath = process.env.GITHUB_ENV;
    if (!githubEnvPath) {
      throw new Error('GITHUB_ENV is not set. Use --shell outside GitHub Actions');
    }
    appendGithubEnv(githubEnvPath, vars);
    process.stdout.write(`Loaded ${Object.keys(vars).length} vars to GITHUB_ENV from ${filePath}\n`);
    return;
  }

  if (args.mode === 'powershell') {
    printPowershellExports(vars);
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
