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

test.beforeEach(async ({ page }, testInfo) => {
  setCurrentTestTitle(testInfo.title);
  setCurrentPage(page);
  console.log(
    `🌐 Testing against: ${process.env.TEST_ENV || 'LOCAL'} (${page.context()._options.baseURL})`
  );
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
