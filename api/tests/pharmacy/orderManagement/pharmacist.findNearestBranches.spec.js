import { test, expect } from '../../../globalConfig.api.js';
import { FIND_NEAREST_BRANCHES_QUERY } from './pharmacist.orderManagementQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  pharmacistLoginAndGetTokens,
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
    radiusInMeters: 50000,
  };
}

test.describe('GraphQL: Pharmacy Find Nearest Branches', () => {
  test(
    'PHARMA-306 | Should be able to find nearest branches by pharmacy name',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-306'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const findNearestBranchesRes = await safeGraphQL(api, {
        query: FIND_NEAREST_BRANCHES_QUERY,
        variables: { finder: finderInput() },
        headers: bearer(accessToken),
      });
      expect(
        findNearestBranchesRes.ok,
        findNearestBranchesRes.error || 'Find nearest branches request failed'
      ).toBe(true);

      const nearestBranchesNode = findNearestBranchesRes.body?.data?.pharmacy?.branch?.nearestBranches;
      expect(Array.isArray(nearestBranchesNode), 'nearestBranches should be an array').toBe(true);
      expect(nearestBranchesNode.length, 'nearestBranches should have at least one result').toBeGreaterThan(0);

      const containsMercuryDrug = nearestBranchesNode.some((branchNode) =>
        String(branchNode?.pharmacyName || '')
          .toLowerCase()
          .includes('mercury drug')
      );
      expect(containsMercuryDrug, 'No nearest branch has pharmacyName including "Mercury Drug"').toBe(true);
    }
  );

  test(
    'PHARMA-307 | Should NOT be able to find nearest branches with missing auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-307'],
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
    'PHARMA-308 | Should NOT be able to find nearest branches with invalid auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-308'],
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
