#!/usr/bin/env node

/**
 * Builds encrypted env bundles per TEST_ENV using sops+age.
 *
 * Usage:
 * - SOPS_AGE_RECIPIENTS="age1..." node scripts/secrets/build-encrypted-files.js --all
 * - SOPS_AGE_RECIPIENTS="age1..." node scripts/secrets/build-encrypted-files.js --env DEV
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const { execFileSync } = require('child_process');

const VALID_ENVS = new Set(['DEV', 'QA', 'PROD']);

function parseArgs(argv) {
  const args = {
    envs: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') {
      args.envs = ['DEV', 'QA', 'PROD'];
    } else if (arg === '--env' && argv[i + 1]) {
      args.envs.push(String(argv[i + 1]).toUpperCase());
      i += 1;
    }
  }

  if (args.envs.length === 0) {
    args.envs = ['DEV'];
  }

  return args;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateEnv(envName) {
  if (!VALID_ENVS.has(envName)) {
    throw new Error(`Unsupported env "${envName}". Valid values: DEV, QA, PROD`);
  }
}

function normalizedKeyValueEntries(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    if (value === undefined || value === null) continue;
    out[key] = String(value);
  }
  return out;
}

function buildEnvObject(envName) {
  const envLower = envName.toLowerCase();
  const shared = parseEnvFile(path.resolve('.env'));
  const profile = parseEnvFile(path.resolve(`.env.${envLower}`));
  return normalizedKeyValueEntries({
    ...shared,
    ...profile,
    TEST_ENV: envName,
  });
}

function encryptJsonToFile(inputObject, outputPath, recipients) {
  const tempFile = path.join(
    os.tmpdir(),
    `secrets-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  fs.writeFileSync(tempFile, JSON.stringify(inputObject, null, 2));

  try {
    const args = [
      '--encrypt',
      '--input-type',
      'json',
      '--output-type',
      'json',
      '--output',
      outputPath,
      '--filename-override',
      outputPath,
    ];
    if (recipients) {
      args.push('--age', recipients);
    }
    args.push(tempFile);
    execFileSync('sops', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const stderr = String(error.stderr || '').trim();
    throw new Error(stderr || error.message || `Failed to encrypt ${outputPath}`);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

function main() {
  const args = parseArgs(process.argv);
  const recipients = String(process.env.SOPS_AGE_RECIPIENTS || '').trim();

  fs.mkdirSync(path.resolve('secrets'), { recursive: true });
  let processed = 0;

  for (const envName of args.envs) {
    validateEnv(envName);
    const envLower = envName.toLowerCase();
    const outFile = path.resolve(`secrets/secrets.${envLower}.enc.json`);
    const payload = buildEnvObject(envName);
    encryptJsonToFile(payload, outFile, recipients);
    process.stdout.write(`Encrypted ${outFile} with ${Object.keys(payload).length} keys\n`);
    processed += 1;
  }

  process.stdout.write(
    `Completed secrets encryption for ${processed} environment(s): ${args.envs.join(', ')}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`[secrets-build] ${error.message}\n`);
  process.exit(1);
}
