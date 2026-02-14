import { test, expect } from '../../../globalConfig.api.js';
import { FIND_NEAREST_BRANCHES_QUERY } from './patient.orderingQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  loginAndGetTokens,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';

function finderInput() {
  return {
    pharmacyName: 'Mercury Drug',
    lat: 14.581877217471039,
    lng: 121.00803809667623,
    radiusInMeters: 100000,
    maxResults: 200,
  };
}

test.describe('GraphQL: Find Nearest Branches', () => {
  test(
    'PHARMA-294 | Should be able to find nearest branches',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-294'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const findNearestBranchesRes = await safeGraphQL(api, {
        query: FIND_NEAREST_BRANCHES_QUERY,
        variables: { finder: finderInput() },
        headers: bearer(accessToken),
      });
      expect(
        findNearestBranchesRes.ok,
        findNearestBranchesRes.error || 'Find nearest branches request failed'
      ).toBe(true);

      const node = findNearestBranchesRes.body?.data?.patient?.nearestBranches;
      expect(Array.isArray(node), 'nearestBranches should be an array').toBe(true);
      expect(node.length, 'nearestBranches should contain at least one item').toBeGreaterThan(0);
    }
  );

  test(
    'PHARMA-295 | Should NOT be able to find nearest branches with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-295'],
    },
    async ({ api, noAuth }) => {
      const findNearestBranchesNoAuthRes = await safeGraphQL(api, {
        query: FIND_NEAREST_BRANCHES_QUERY,
        variables: { finder: finderInput() },
        headers: noAuth,
      });
      expect(findNearestBranchesNoAuthRes.ok).toBe(false);

      if (!findNearestBranchesNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(findNearestBranchesNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(findNearestBranchesNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-296 | Should NOT be able to find nearest branches with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-296'],
    },
    async ({ api, invalidAuth }) => {
      const findNearestBranchesInvalidAuthRes = await safeGraphQL(api, {
        query: FIND_NEAREST_BRANCHES_QUERY,
        variables: { finder: finderInput() },
        headers: invalidAuth,
      });
      expect(findNearestBranchesInvalidAuthRes.ok).toBe(false);

      if (!findNearestBranchesInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(findNearestBranchesInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(findNearestBranchesInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );
});
