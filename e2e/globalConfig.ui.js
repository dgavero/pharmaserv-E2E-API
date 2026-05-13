// globalConfig.ui.js
import { test as base, expect, request } from '@playwright/test';
import { setCurrentTestTitle, setCurrentPage, clearCurrentPage, handleFailureAfterEach } from '../e2e/helpers/testFailure.js';
import { flushPendingReports } from '../e2e/helpers/reporting/discordReporterClient.js';

const TEST_ENV = String(process.env.TEST_ENV || 'DEV').toUpperCase();
const API_BASE_ENV_KEY = `API_BASE_URL_${TEST_ENV}`;
const API_BASE_URL = String(
  process.env.API_BASE_URL ||
    process.env[API_BASE_ENV_KEY] ||
    process.env.API_BASE_URL_DEV ||
    ''
).trim();

export const test = base.extend({
  // Provides isolated API context per UI test for hybrid UI+API workflows.
  api: async ({}, use) => {
    // Fail early here so hybrid/UI runs surface missing API env setup immediately
    // instead of failing later in role actions or workflow helpers.
    if (!API_BASE_URL) {
      throw new Error(
        `Missing API_BASE_URL (or ${API_BASE_ENV_KEY} for TEST_ENV=${TEST_ENV}) in .env or shell`
      );
    }

    const api = await request.newContext({
      baseURL: API_BASE_URL,
    });
    await use(api);
    await api.dispose();
  },
});

function resolveBaseUrlForLog() {
  const envName = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  if (envName === 'PROD') return process.env.BASE_URL_PROD || 'N/A';
  if (envName === 'QA') return process.env.BASE_URL_QA || 'N/A';
  if (envName === 'DEV') return process.env.BASE_URL_DEV || 'N/A';
  return 'N/A';
}

test.beforeEach(async ({ page }, testInfo) => {
  setCurrentTestTitle(testInfo.title);
  setCurrentPage(page);
  console.log(`🌐 Testing against: ${process.env.TEST_ENV || 'DEV'} (${resolveBaseUrlForLog()})`);
});

// ✅ Flush Discord posts at worker end
test.afterAll(async () => {
  await flushPendingReports();
});

// Clear the page pointer after each test (defensive hygiene)
test.afterEach(async ({ page }, testInfo) => {
  // Post failure to Discord for both assertion failures and timeouts
  if (testInfo.status !== 'passed') {
    await handleFailureAfterEach(page, testInfo);
  }
  clearCurrentPage();
});

export { expect };
