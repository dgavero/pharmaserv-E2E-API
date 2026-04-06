import {
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { GET_BRANCH_QUERY } from './admin.pharmacyManagementQueries.js';
import { resolveQaBranchFromPagedAllBranches } from './admin.pharmacyManagementUtils.js';

test.describe('GraphQL: Admin Get Branch', () => {
  test(
    'PHARMA-386 | Should get branch with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-386'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const qaBranch = await resolveQaBranchFromPagedAllBranches(api, { adminAccessToken: accessToken });

      const getBranchRes = await safeGraphQL(api, {
        query: GET_BRANCH_QUERY,
        variables: { branchId: qaBranch.id },
        headers: bearer(accessToken),
      });

      expect(getBranchRes.ok, getBranchRes.error || 'Get branch endpoint failed').toBe(true);

      const branchNode = getBranchRes.body?.data?.administrator?.branch?.detail;
      expect(branchNode, 'Get branch endpoint returned no data').toBeTruthy();
      expect(branchNode.id).toBe(String(qaBranch.id));
      expect(branchNode.pharmacyName).toBe(qaBranch.pharmacyName);
    }
  );

  test(
    'PHARMA-387 | Should NOT get branch with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-387'],
    },
    async ({ api, noAuth }) => {
      const getBranchNoAuthRes = await safeGraphQL(api, {
        query: GET_BRANCH_QUERY,
        variables: { branchId: 1 },
        headers: noAuth,
      });

      expect(getBranchNoAuthRes.ok, getBranchNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(false);

      if (!getBranchNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getBranchNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getBranchNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-388 | Should NOT get branch with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-388'],
    },
    async ({ api, invalidAuth }) => {
      const getBranchInvalidAuthRes = await safeGraphQL(api, {
        query: GET_BRANCH_QUERY,
        variables: { branchId: 1 },
        headers: invalidAuth,
      });

      expect(getBranchInvalidAuthRes.ok).toBe(false);
      expect(getBranchInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getBranchInvalidAuthRes.httpStatus);
    }
  );
});
