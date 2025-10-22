/**
 * GraphQL: Me
 * - Happy path: login -> me (Bearer <accessToken>)
 * - Negative: missing token (unauthorized)
 * - Negative: invalid token (unauthorized)
 */

import { test, expect } from '../../globalConfig.api.js';
import { safeGraphQL, loginAndGetTokens, bearer, getGQLError } from '../../helpers/testUtilsAPI.js';

const ME_QUERY = `
  query {
    patient { me { id firstName lastName username } }
  }
`;

test.describe('GraphQL: Me', () => {
  test('Authenticated call to patient.me returns the current user  @api @patient @positive', async ({
    api,
  }) => {
    const username = process.env.LOGIN_USERNAME || 'daveg123.patient';
    const password = process.env.LOGIN_PASSWORD || 'Test1234!';

    const { accessToken, raw: login } = await loginAndGetTokens(api, { username, password });

    const meRes = await safeGraphQL(api, {
      query: ME_QUERY,
      headers: bearer(accessToken),
    });

    await test.step('Login', async () => {
      expect(login.ok, login.error || 'Login failed').toBe(true);
    });

    await test.step('Query me', async () => {
      expect(meRes.ok, meRes.error || 'Me query failed').toBe(true);
    });

    const me = meRes.body?.data?.patient?.me;
    expect(me, 'Missing data.patient.me').toBeTruthy();

    // Minimal field checks (keep simple per your preference)
    expect.soft(typeof me?.id).toBe('string');
    expect.soft(typeof me?.firstName).toBe('string');
    expect.soft(typeof me?.lastName).toBe('string');
    expect.soft(typeof me?.username).toBe('string');
  });

  test('patient.me without Authorization returns UNAUTHORIZED @api @patient @negative', async ({
    api,
    noAuth,
  }) => {
    const meAttempt = await safeGraphQL(api, { query: ME_QUERY, headers: noAuth });

    await test.step('Me should fail without token', async () => {
      expect(meAttempt.ok, 'Expected unauthorized when missing token').toBe(false);
    });

    await test.step('Assert unauthorized details', async () => {
      const { message, code, classification } = getGQLError(meAttempt);

      // Fuzzy message
      expect(message.toLowerCase()).toMatch(/unauthori[sz]ed|token|credential/);

      // Soft checks
      expect.soft(code).toBe('401');
      expect.soft(classification).toBe('UNAUTHORIZED');
    });
  });

  test('patient.me with invalid token returns UNAUTHORIZED @api @patient @negative', async ({
    api,
    invalidAuth,
  }) => {
    const meAttempt = await safeGraphQL(api, {
      query: ME_QUERY,
      headers: invalidAuth,
    });

    await test.step('Me should fail with invalid token', async () => {
      expect(meAttempt.ok).toBe(false);
      expect(meAttempt.httpStatus).toBe(401);
    });
  });
});
