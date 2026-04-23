import {
  loginAsAdminAndGetTokens,
  loginAsPatientAndGetTokens,
  loginAsRiderAndGetTokens,
  loginAsPharmacistAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getPatientAccount, getRiderAccount, getPharmacistAccount } from '../../../helpers/roleCredentials.js';
import { GET_PAGED_ALL_BRANCHES_QUERY } from './admin.pharmacyManagementQueries.js';
import { buildPagedAllBranchesFilter } from './admin.pharmacyManagementUtils.js';

test.describe('GraphQL: Admin Get Paged All Branches', () => {
  test(
    'PHARMA-383 | Should get paged all branches with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-383'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getPagedAllBranchesRes = await safeGraphQL(api, {
        query: GET_PAGED_ALL_BRANCHES_QUERY,
        variables: { filter: buildPagedAllBranchesFilter() },
        headers: bearer(accessToken),
      });

      expect(getPagedAllBranchesRes.ok, getPagedAllBranchesRes.error || 'Get paged all branches endpoint failed').toBe(
        true
      );

      const pagedBranchesNode = getPagedAllBranchesRes.body?.data?.administrator?.branch?.pagedBranches;
      expect(pagedBranchesNode, 'Missing data.administrator.branch.pagedBranches').toBeTruthy();

      const items = pagedBranchesNode?.items ?? [];
      expect(Array.isArray(items), 'Paged all branches items should be an array').toBe(true);
      expect(items.length, 'Paged all branches should return at least one branch').toBeGreaterThan(0);
      expect(items.some((branchNode) => String(branchNode?.pharmacyName || '').startsWith('QA-Pharmacy-')), 'Expected a QA-Pharmacy branch in paged all branches').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-384 | Should NOT get paged all branches with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-384'],
    },
    async ({ api, noAuth }) => {
      const getPagedAllBranchesNoAuthRes = await safeGraphQL(api, {
        query: GET_PAGED_ALL_BRANCHES_QUERY,
        variables: { filter: buildPagedAllBranchesFilter() },
        headers: noAuth,
      });

      expect(getPagedAllBranchesNoAuthRes.ok, getPagedAllBranchesNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!getPagedAllBranchesNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getPagedAllBranchesNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getPagedAllBranchesNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-385 | Should NOT get paged all branches with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-385'],
    },
    async ({ api, invalidAuth }) => {
      const getPagedAllBranchesInvalidAuthRes = await safeGraphQL(api, {
        query: GET_PAGED_ALL_BRANCHES_QUERY,
        variables: { filter: buildPagedAllBranchesFilter() },
        headers: invalidAuth,
      });

      expect(getPagedAllBranchesInvalidAuthRes.ok).toBe(false);
      expect(getPagedAllBranchesInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getPagedAllBranchesInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-472 | Should reject paged all branches for non-admin roles',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-472'],
    },
    async ({ api }) => {
      const roleCases = [
        {
          role: 'patient',
          login: () => loginAsPatientAndGetTokens(api, getPatientAccount('default')),
        },
        {
          role: 'rider',
          login: () => loginAsRiderAndGetTokens(api, getRiderAccount('default')),
        },
        {
          role: 'pharmacist',
          login: () => loginAsPharmacistAndGetTokens(api, getPharmacistAccount('reg01')),
        },
      ];

      for (const roleCase of roleCases) {
        const { accessToken, raw: loginRes } = await roleCase.login();
        expect(loginRes.ok, `${roleCase.role} login failed`).toBe(true);

        const getPagedAllBranchesRes = await safeGraphQL(api, {
          query: GET_PAGED_ALL_BRANCHES_QUERY,
          variables: { filter: buildPagedAllBranchesFilter() },
          headers: bearer(accessToken),
        });

        expect(getPagedAllBranchesRes.ok, `${roleCase.role} should not be authorized to get paged all branches`).toBe(
          false
        );
        if (!getPagedAllBranchesRes.httpOk) {
          expect(
            NOAUTH_HTTP_STATUSES,
            `${roleCase.role} expected unauthorized transport status`
          ).toContain(getPagedAllBranchesRes.httpStatus);
        } else {
          const { message, code, classification } = getGQLError(getPagedAllBranchesRes);
          expect(message, `${roleCase.role} expected GraphQL auth/permission message`).toMatch(NOAUTH_MESSAGE_PATTERN);
          expect.soft(NOAUTH_CODES, `${roleCase.role} expected auth/permission code`).toContain(code);
          expect.soft(NOAUTH_CLASSIFICATIONS, `${roleCase.role} expected auth classification`).toContain(classification);
        }
      }
    }
  );
});
