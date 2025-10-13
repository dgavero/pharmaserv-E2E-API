/**
 * Playwright config with environment-driven setup + Discord integration.
 * - Selects baseURL dynamically based on TEST_ENV (.env values).
 * - Posts run header + summary to Discord (via globalSetup + reporter).
 * - Supports optional TAGS filtering and configurable THREADS concurrency.
 */

import dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

dotenv.config(); // Load .env file into process.env

// Normalize TEST_ENV (default to LOCAL)
const testEnv = (process.env.TEST_ENV || 'LOCAL').toUpperCase();

// Select URL based on TEST_ENV
let baseURL;
if (testEnv === 'PROD') {
  baseURL = process.env.BASE_URL_PROD;
} else if (testEnv === 'ORANGE') {
  baseURL = process.env.BASE_URL_ORANGE;
} else {
  baseURL = process.env.BASE_URL_LOCAL;
}

// 🔹 Fail fast if the URL is missing
if (!baseURL) {
  throw new Error(
    `❌ Missing baseURL for TEST_ENV=${testEnv}. Please set ${
      testEnv === 'PROD'
        ? 'BASE_URL_PROD'
        : testEnv === 'ORANGE'
          ? 'BASE_URL_ORANGE'
          : 'BASE_URL_LOCAL'
    } in your .env`
  );
}

// Optional filters from env
const tags = process.env.TAGS || ''; // e.g., "smoke|samples"
const threads = parseInt(process.env.THREADS || '4', 10); // Default to 4 threads

// PROJECT selector via env (e.g., PROJECT=api or PROJECT=e2e,api). Empty/unset = run both.
const allProjects = [
  { name: 'e2e', testDir: './e2e/tests' },
  { name: 'api', testDir: './api/tests' },
];
const projectEnv = (process.env.PROJECT || process.env.PROJECTS || '').trim();
let projects = allProjects;
if (projectEnv) {
  const want = new Set(
    projectEnv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  );
  projects = allProjects.filter(p => want.has(p.name.toLowerCase()));
  if (projects.length === 0) {
    throw new Error(`Unknown PROJECT="${projectEnv}". Valid: ${allProjects.map(p => p.name).join(', ')}`);
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
  // - discordReporter: live updates + final summary in Discord
  reporter: [
    ['list'],
    ['html', { outputFolder: '.playwright-report', open: 'never' }],
    ['./helpers/discord/discordReporter.js'],
  ],
  use: {
    baseURL, // ✅ Dynamic baseURL based on TEST_ENV
    headless: true, // Always run headless in CI
  },
  workers: threads, // Concurrency controlled by THREADS env

  // Tokenized, case-insensitive tag matching:
  // - tolerates @ (optional)
  // - matches whole tokens only (no "smoke1" when TAGS=smoke)
  // - supports OR patterns, e.g., TAGS='smoke|regression'
  grep: tags ? new RegExp(`(^|\\s)@?(?:${tags})(?=\\s|$)`, 'i') : undefined,

});
