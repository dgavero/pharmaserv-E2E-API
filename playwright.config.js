/**
 * Playwright config with environment-driven setup + Discord integration.
 * - Selects baseURL dynamically based on TEST_ENV (.env values).
 * - Posts run header + summary to Discord (via globalSetup + reporter).
 * - Supports optional TAGS filtering and configurable THREADS concurrency.
 */

import dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

dotenv.config(); // Load .env file into process.env

// Normalize TEST_ENV (default to DEV)
const testEnv = (process.env.TEST_ENV || 'DEV').toUpperCase();

// Select URL based on TEST_ENV
let baseURL;
if (testEnv === 'PROD') {
  baseURL = process.env.BASE_URL_PROD;
} else if (testEnv === 'DEV') {
  baseURL = process.env.BASE_URL_DEV;
} else {
  throw new Error(`❌ Unsupported TEST_ENV=${testEnv}. Valid values: DEV, PROD`);
}

// 🔹 Fail fast if the URL is missing
if (!baseURL) {
  throw new Error(
    `❌ Missing baseURL for TEST_ENV=${testEnv}. Please set ${
      testEnv === 'PROD' ? 'BASE_URL_PROD' : 'BASE_URL_DEV'
    } in your .env`
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

  // Default timeout for each test (in ms) → 60s instead of default 30s
  timeout: 60000,

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
