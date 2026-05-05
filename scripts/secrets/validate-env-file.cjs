#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadRequiredKeys(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function parseEnvFile(filePath) {
  const entries = new Map();
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    if (!rawLine || rawLine.trim().startsWith('#')) continue;
    const separatorIndex = rawLine.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = rawLine.slice(0, separatorIndex).trim();
    const value = rawLine.slice(separatorIndex + 1).replace(/\r$/, '');
    entries.set(key, value);
  }
  return entries;
}

function main() {
  const envFile = process.argv[2];
  const requiredKeys = process.argv.slice(3);
  const defaultKeysFile = path.resolve('scripts/secrets/required-credentials.txt');

  if (!envFile) {
    throw new Error('Usage: node scripts/secrets/validate-env-file.cjs <env-file> <KEY> [KEY ...]');
  }

  const envFilePath = path.resolve(envFile);
  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Missing env file: ${envFilePath}`);
  }

  const keys = requiredKeys.length > 0 ? requiredKeys : loadRequiredKeys(defaultKeysFile);
  if (keys.length === 0) {
    throw new Error(`No required keys found in ${defaultKeysFile}`);
  }

  const entries = parseEnvFile(envFilePath);
  const missing = [];

  for (const key of keys) {
    if (!entries.has(key) || entries.get(key) === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    for (const key of missing) {
      process.stderr.write(`Missing required credential variable: ${key}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`Validated ${keys.length} required keys in ${envFilePath}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`[validate-env-file] ${error.message}\n`);
  process.exit(1);
}
