// globalConfig.ui.js
import { test as base, expect } from '@playwright/test';
import {
  setCurrentTestTitle,
  setCurrentPage,
  clearCurrentPage,
  handleFailureAfterEach,
  flushReports,
} from '../e2e/helpers/testUtilsUI.js';

export const test = base.extend({});

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
  await flushReports();
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
