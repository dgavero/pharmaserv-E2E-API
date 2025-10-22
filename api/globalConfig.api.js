/**
 * API global config (fixtures)
 * - Think of this like your UI's globalConfig.ui.js, but for API tests.
 * - It defines a Playwright *fixture* named `api` (an APIRequestContext).
 * - Playwright will:
 *     1) create the `api` client before each test,
 *     2) inject it into the test via the function parameter `({ api })`,
 *     3) and dispose it after the test automatically.
 */

import { test as base, request as pwRequest } from '@playwright/test';
import { flushApiReports, INVALID_JWT } from './helpers/testUtilsAPI.js';

// Avoid the macOS IPv6 localhost (::1) gotcha by normalizing to 127.0.0.1.
const BASE_URL = (process.env.API_BASE_URL || '').replace('localhost', '127.0.0.1');

// After all API tests finish, flush any queued Discord reports (failures etc).
base.afterAll(async () => {
  await flushApiReports();
});

export const test = base.extend({
  /**
   * Fixture: `api`
   * - Scope: per test (fresh client every test → isolation, no leaks).
   * - Provides: Playwright APIRequestContext preconfigured with baseURL + JSON headers.
   */
  api: async ({}, use) => {
    if (!BASE_URL) {
      throw new Error('Missing API_BASE_URL (set it in .env or your shell)');
    }

    // Create the API client for this test.
    const api = await pwRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });

    // Hand the client to the test body: test('...', async ({ api }) => { ... })
    await use(api);

    // Cleanup after the test finishes (best practice).
    await api.dispose();
  },

  //  Missing bearer: pass `headers: noAuth`
  //  Invalid token:  pass `headers: invalidAuth` (syntactically valid JWT → transport 401)
  invalidAuth: async ({}, use) => {
    await use({ Authorization: `Bearer ${INVALID_JWT}` });
  },
  noAuth: async ({}, use) => {
    await use({}); // empty headers
  },
});

// Re-export expect so tests can `import { test, expect } from '../globalConfig.api.js'`
export const expect = base.expect;
