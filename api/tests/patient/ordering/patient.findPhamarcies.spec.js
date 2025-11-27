import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { FIND_PHAMARCIES_QUERY } from './patient.orderingQueries.js';
import {
  safeGraphQL,
  bearer,
  loginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

const queryInput = 'mEr'; // Intentionally mixed case to test case insensitivity

test.describe('GraphQL: Find Pharmacies', () => {
  test(
    'PHARMA-110 | Should be able to find pharmacies with valid query [Mer]',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-110'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);
      const findPharmaciesRes = await safeGraphQL(api, {
        query: FIND_PHAMARCIES_QUERY,
        variables: { query: queryInput },
        headers: bearer(accessToken),
      });

      // Main Assertions
      expect(
        findPharmaciesRes.ok,
        findPharmaciesRes.error || 'Find Pharmacies request failed'
      ).toBe(true);

      const node = findPharmaciesRes.body.data.patient.pharmacies;
      expect(Array.isArray(node), 'Pharmacies should be an array').toBe(true);
      expect(node.length > 0, 'Pharmacies array should not be empty').toBe(true);

      // Get first node and validate it matches the query
      const firstNode = node[0];
      expect(
        firstNode.name.toLowerCase().includes(queryInput.toLowerCase()),
        `First pharmacy name should include the query "${queryInput}"`
      ).toBe(true);
    }
  );

  test(
    'PHARMA-111 | Should NOT be able to find pharmacies with No Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-111'],
    },
    async ({ api, noAuth }) => {
      const findPharmaciesResNoAuth = await safeGraphQL(api, {
        query: FIND_PHAMARCIES_QUERY,
        variables: { query: queryInput },
        headers: noAuth,
      });

      // Main Assertions
      expect(
        findPharmaciesResNoAuth.ok,
        findPharmaciesResNoAuth.error || 'Find Pharmacies request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(findPharmaciesResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-112 | Should NOT be able to find pharmacies with Invalid Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-112'],
    },
    async ({ api, invalidAuth }) => {
      const findPharmaciesResInvalidAuth = await safeGraphQL(api, {
        query: FIND_PHAMARCIES_QUERY,
        variables: { query: queryInput },
        headers: invalidAuth,
      });

      // Main Assertions
      expect(
        findPharmaciesResInvalidAuth.ok,
        findPharmaciesResInvalidAuth.error || 'Find Pharmacies request is expected to fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(findPharmaciesResInvalidAuth.ok).toBe(false);
      expect(findPharmaciesResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(findPharmaciesResInvalidAuth.httpStatus);
    }
  );
});
