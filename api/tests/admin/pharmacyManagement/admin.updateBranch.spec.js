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

  test(
    'PHARMA-474 | Update branch should satisfy response contract shape',
    {
      tag: ['@api', '@admin', '@positive', '@update', '@pharma-474'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const targetBranchId = getPharmacistAccount('reg01').branchId;
      const { branchNode } = await getBranchAsAdmin(api, {
        adminAccessToken: accessToken,
        branchId: targetBranchId,
      });
      const updatedBranchName = buildUpdatedBranchName(branchNode.pharmacyName);

      const updateBranchRes = await safeGraphQL(api, {
        query: UPDATE_BRANCH_MUTATION,
        variables: {
          branchId: targetBranchId,
          branch: {
            name: updatedBranchName,
          },
        },
        headers: bearer(accessToken),
      });

      expect(updateBranchRes.httpStatus).toBe(200);
      expect(updateBranchRes.httpOk).toBe(true);
      expect(updateBranchRes.ok, updateBranchRes.error || 'Update branch endpoint failed').toBe(true);

      const updateNode = updateBranchRes.body?.data?.administrator?.pharmacy?.branch?.update;
      expect(updateNode, 'Missing data.administrator.pharmacy.branch.update').toBeTruthy();
      expect.soft(typeof updateNode?.id).toBe('string');
      expect.soft(typeof updateNode?.pharmacyName).toBe('string');
      expect.soft(typeof updateNode?.name).toBe('string');
      expect.soft(typeof updateNode?.lat).toBe('number');
      expect.soft(typeof updateNode?.lng).toBe('number');
      expect.soft(updateNode.id).toBe(String(targetBranchId));
      expect.soft(updateNode.name).toBe(updatedBranchName);
    }
  );

  test(
    'PHARMA-475 | Should reject update branch for non-admin roles',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-475'],
    },
    async ({ api }) => {
      const targetBranchId = getPharmacistAccount('reg01').branchId;
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

        const updateBranchRes = await safeGraphQL(api, {
          query: UPDATE_BRANCH_MUTATION,
          variables: {
            branchId: targetBranchId,
            branch: {
              name: `QA-Unauthorized-${Date.now()}`,
            },
          },
          headers: bearer(accessToken),
        });

        expect(updateBranchRes.ok, `${roleCase.role} should not be authorized to update branch`).toBe(false);
        if (!updateBranchRes.httpOk) {
          expect(
            NOAUTH_HTTP_STATUSES,
            `${roleCase.role} expected unauthorized transport status`
          ).toContain(updateBranchRes.httpStatus);
        } else {
          const { message, code, classification } = getGQLError(updateBranchRes);
          expect(message, `${roleCase.role} expected GraphQL auth/permission message`).toMatch(NOAUTH_MESSAGE_PATTERN);
          expect.soft(NOAUTH_CODES, `${roleCase.role} expected auth/permission code`).toContain(code);
          expect.soft(NOAUTH_CLASSIFICATIONS, `${roleCase.role} expected auth classification`).toContain(classification);
        }
      }
    }
  );
});
