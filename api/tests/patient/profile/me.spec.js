import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  loginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
} from '../../../helpers/testUtilsAPI.js';

const ME_QUERY = `
  query {
    patient { me { id uuid firstName lastName username email phoneNumber } }
  }
`;

test.describe('GraphQL: Me', () => {
  test(
    'PHARMA-3 | Authenticated call to patient.me returns the current user details',
    {
      tag: ['@api', '@patient', '@positive', '@login', '@pharma-3'],
    },
    async ({ api }) => {
      const username = process.env.LOGIN_USERNAME;
      const password = process.env.LOGIN_PASSWORD;

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
      expect.soft(typeof me?.uuid).toBe('string');
      expect.soft(typeof me?.firstName).toBe('string');
      expect.soft(typeof me?.lastName).toBe('string');
      expect.soft(typeof me?.username).toBe('string');
      expect.soft(typeof me?.email).toBe('string');
      expect.soft(me?.phoneNumber === null || typeof me?.phoneNumber === 'string').toBe(true);
    }
  );

  test(
    'PHARMA-4 | Unauthorized call to patient.me should NOT RETURN any user details',
    {
      tag: ['@api', '@patient', '@negative', '@login', '@pharma-4'],
    },
    async ({ api, noAuth }) => {
      const meAttempt = await safeGraphQL(api, { query: ME_QUERY, headers: noAuth });

      await test.step('Me should fail without token', async () => {
        expect(meAttempt.ok, 'Expected unauthorized when missing token').toBe(false);
      });

      await test.step('Assert unauthorized details', async () => {
        const { message, code, classification } = getGQLError(meAttempt);

        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      });
    }
  );

  test(
    'PHARMA-5 | Call to patient.me with invalid token should NOT RETURN any user details',
    {
      tag: ['@api', '@patient', '@negative', '@login', '@pharma-5'],
    },
    async ({ api, invalidAuth }) => {
      const meAttempt = await safeGraphQL(api, {
        query: ME_QUERY,
        headers: invalidAuth,
      });

      await test.step('Me should fail with invalid token', async () => {
        expect(meAttempt.ok).toBe(false);
        expect(meAttempt.httpStatus).toBe(401);
      });
    }
  );
});
