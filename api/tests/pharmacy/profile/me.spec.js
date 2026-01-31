import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
  pharmacistLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';
import { PHARMACIST_ME_QUERY } from './pharmacy.profileQueries.js';

test.describe('GraphQL: Pharmacist Profile', () => {
  test(
    'PHARMA-143 | Should be able to get my profile as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-143'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const meRes = await safeGraphQL(api, {
        query: PHARMACIST_ME_QUERY,
        headers: bearer(accessToken),
      });
      expect(meRes.ok, meRes.error || 'Failed to get pharmacist profile').toBe(true);
    }
  );

  test(
    'PHARMA-144 | Should be able to get my profile as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-144'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const meRes = await safeGraphQL(api, {
        query: PHARMACIST_ME_QUERY,
        headers: bearer(accessToken),
      });
      expect(meRes.ok, meRes.error || 'Failed to get pharmacist profile').toBe(true);
    }
  );

  test(
    'PHARMA-145 | Should NOT be able to get pharmacist profile with No Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-145'],
    },
    async ({ api, noAuth }) => {
      const meResNoAuth = await safeGraphQL(api, {
        query: PHARMACIST_ME_QUERY,
        headers: noAuth,
      });

      // Main Assertion
      expect(meResNoAuth.ok, meResNoAuth.error || 'Get Pharmacist Profile request is expected to fail').toBe(false);

      const { message, classification, code } = getGQLError(meResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-146 | Should NOT be able to get pharmacist profile with Invalid Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-146'],
    },
    async ({ api, invalidAuth }) => {
      const meResInvalidAuth = await safeGraphQL(api, {
        query: PHARMACIST_ME_QUERY,
        headers: invalidAuth,
      });
      // Main Assertion
      expect(meResInvalidAuth.ok, meResInvalidAuth.error || 'Get Pharmacist Profile request is expected to fail').toBe(
        false
      );

      // Transport-level 401 (no GraphQL errors[])
      expect(meResInvalidAuth.ok).toBe(false);
      expect(meResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(meResInvalidAuth.httpStatus);
    }
  );
});
