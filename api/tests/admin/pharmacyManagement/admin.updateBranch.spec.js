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
import { UPDATE_BRANCH_MUTATION } from './admin.pharmacyManagementQueries.js';
import { buildUpdatedBranchName, resolveQaBranchFromPagedAllBranches, getBranchAsAdmin } from './admin.pharmacyManagementUtils.js';

test.describe('GraphQL: Admin Update Branch', () => {
  test(
    'PHARMA-389 | Should update branch with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@update', '@pharma-389'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const qaBranch = await resolveQaBranchFromPagedAllBranches(api, { adminAccessToken: accessToken });
      const { branchNode } = await getBranchAsAdmin(api, {
        adminAccessToken: accessToken,
        branchId: qaBranch.id,
      });

      const updatedBranchName = buildUpdatedBranchName(branchNode.pharmacyName);

      const updateBranchRes = await safeGraphQL(api, {
        query: UPDATE_BRANCH_MUTATION,
        variables: {
          branchId: qaBranch.id,
          branch: {
            name: updatedBranchName,
          },
        },
        headers: bearer(accessToken),
      });

      expect(updateBranchRes.ok, updateBranchRes.error || 'Update branch endpoint failed').toBe(true);

      const updateNode = updateBranchRes.body?.data?.administrator?.pharmacy?.branch?.update;
      expect(updateNode, 'Update branch endpoint returned no data').toBeTruthy();
      expect(updateNode.id).toBe(String(qaBranch.id));
      expect(updateNode.name).toBe(updatedBranchName);
    }
  );

  test(
    'PHARMA-390 | Should NOT update branch with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-390'],
    },
    async ({ api, noAuth }) => {
      const updateBranchNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_BRANCH_MUTATION,
        variables: {
          branchId: 1,
          branch: {
            name: 'QA-UpdatedPharmacy-placeholder',
          },
        },
        headers: noAuth,
      });

      expect(updateBranchNoAuthRes.ok, updateBranchNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!updateBranchNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(updateBranchNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(updateBranchNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-391 | Should NOT update branch with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-391'],
    },
    async ({ api, invalidAuth }) => {
      const updateBranchInvalidAuthRes = await safeGraphQL(api, {
        query: UPDATE_BRANCH_MUTATION,
        variables: {
          branchId: 1,
          branch: {
            name: 'QA-UpdatedPharmacy-placeholder',
          },
        },
        headers: invalidAuth,
      });

      expect(updateBranchInvalidAuthRes.ok).toBe(false);
      expect(updateBranchInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updateBranchInvalidAuthRes.httpStatus);
    }
  );
});
