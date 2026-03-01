/**
 * Playwright config with environment-driven setup + Discord integration.
 * - Selects baseURL dynamically based on TEST_ENV (.env values).
 * - Posts run header + summary to Discord (via globalSetup + reporter).
 * - Supports optional TAGS filtering and configurable THREADS concurrency.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';
import { Timeouts } from './e2e/Timeouts.js';

const shellEnvKeys = new Set(Object.keys(process.env));
const configDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

function loadEnvFile(relPath) {
  const absPath = path.join(configDir, relPath);
  if (!fs.existsSync(absPath)) return false;

  const parsed = dotenv.parse(fs.readFileSync(absPath));
  for (const [key, value] of Object.entries(parsed)) {
    // Keep shell/CI-provided vars as highest precedence.
    const hasShellValue = shellEnvKeys.has(key) && String(process.env[key] ?? '').trim() !== '';
    if (!hasShellValue) {
      process.env[key] = value;
    }
  }
  return true;
}

function normalizeTestEnv(raw) {
  const envName = String(raw || 'DEV').trim().toUpperCase();
  if (!['DEV', 'QA', 'PROD'].includes(envName)) {
    throw new Error(`❌ Unsupported TEST_ENV=${envName}. Valid values: DEV, QA, PROD`);
  }
  return envName;
}

// Layered env loading for zero test-code changes:
// 1) .env (shared defaults)
// 2) .env.<test_env> (env profile)
// 3) .env.local (machine-level overrides)
// 4) .env.<test_env>.local (machine + env overrides)
loadEnvFile('.env');

// Normalize TEST_ENV (default to DEV)
const testEnv = normalizeTestEnv(process.env.TEST_ENV || 'DEV');
process.env.TEST_ENV = testEnv;
const testEnvLower = testEnv.toLowerCase();

loadEnvFile(`.env.${testEnvLower}`);
loadEnvFile('.env.local');
loadEnvFile(`.env.${testEnvLower}.local`);

// Select URL based on TEST_ENV
const uiBaseUrlByEnv = {
  DEV: process.env.BASE_URL_DEV,
  QA: process.env.BASE_URL_QA,
  PROD: process.env.BASE_URL_PROD,
};
const baseURL = uiBaseUrlByEnv[testEnv] || process.env.BASE_URL || process.env.BASE_URL_DEV || '';

// Keep API fixture compatible with existing tests while allowing env-specific API URLs.
if (!process.env.API_BASE_URL) {
  const apiBaseUrlByEnv = {
    DEV: process.env.API_BASE_URL_DEV,
    QA: process.env.API_BASE_URL_QA,
    PROD: process.env.API_BASE_URL_PROD,
  };
  process.env.API_BASE_URL =
    apiBaseUrlByEnv[testEnv] || process.env.API_BASE_URL_DEV || process.env.API_BASE_URL || '';
}

// 🔹 Fail fast if the URL is missing
if (!baseURL) {
  const requiredVar = `BASE_URL_${testEnv}`;
  throw new Error(
    `❌ Missing baseURL for TEST_ENV=${testEnv}. Set ${requiredVar} (or BASE_URL fallback).`
  );
}

// Optional filters from env
const tags = process.env.TAGS || ''; // e.g., "smoke|samples"
const normalizedTags = tags
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .join('|'); // supports comma-separated input, keeps regex OR behavior
const threads = parseInt(process.env.THREADS || '4', 10); // Default to 4 threads
const isCI = String(process.env.CI || '').toLowerCase() === 'true';
const blobOutput = (process.env.PW_BLOB_OUTPUT || '').trim();

function parseHeadlessOverride(raw) {
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

// Default behavior:
// - CI: headless=true
// - local: headless=false
// You can intentionally override with HEADLESS=true/false.
const headlessOverride = parseHeadlessOverride(process.env.HEADLESS);
const headless = headlessOverride ?? isCI;

// PROJECT selector via env (e.g., PROJECT=api or PROJECT=e2e,api). Empty/unset = run both.
const allProjects = [
  {
    name: 'e2e',
    testDir: './e2e/tests',
    use: {
      trace: 'retain-on-failure',
    },
  },
  { name: 'api', testDir: './api/tests' },
];
const projectEnv = (process.env.PROJECT || process.env.PROJECTS || '').trim();
let projects = allProjects;
if (projectEnv) {
  const want = new Set(
    projectEnv
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  projects = allProjects.filter((p) => want.has(p.name.toLowerCase()));
  if (projects.length === 0) {
    throw new Error(
      `Unknown PROJECT="${projectEnv}". Valid: ${allProjects.map((p) => p.name).join(', ')}`
    );
  }
}

export default defineConfig({
  // 🧹 Run cleanup before each test run (wipes screenshots, reports, test-results)
  globalSetup: './globalSetup.js',

  // Where Playwright looks for tests (env PROJECT filter; empty runs both)
  projects,

  // Default timeout for each test (in ms).
  // Uses shared timeout constant so test budget is centralized.
  timeout: Timeouts.superExtraLong,

  // 🔹 Reporters:
  // - list: console output
  // - html: local artifact
  // - discordReporter: live progress + final summary
  reporter: [
    ['list'],
    ['html', { outputFolder: '.playwright-report', open: 'never' }],
    ['./helpers/discord/discordReporter.js'],
    ...(blobOutput ? [['blob', { outputDir: blobOutput }]] : []),
  ],
  use: {
    baseURL, // ✅ Dynamic baseURL based on TEST_ENV
    headless,
  },
  workers: threads, // Concurrency controlled by THREADS env

  // Tokenized, case-insensitive tag matching:
  // - tolerates @ (optional)
  // - matches whole tokens only (no "smoke1" when TAGS=smoke)
  // - supports OR patterns, e.g., TAGS='smoke|regression'
  grep: normalizedTags ? new RegExp(`(^|\\s)@?(?:${normalizedTags})(?=\\s|$)`, 'i') : undefined,
});
