import { test, expect } from '../../../globalConfig.api.js';
import {
  PHARMACIST_UPDATE_BRANCH_QUERY,
  PHARMACIST_GET_PAGED_BRANCH_QUERY,
  PHARMACIST_GET_BRANCH_BY_ID_QUERY,
} from '../branchManagement/pharmacist.branchManagementQueries.js';
import { safeGraphQL, bearer, pharmacistLoginAndGetTokens } from '../../../helpers/testUtilsAPI.js';
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';

test.describe('GraphQL: Branch Management Actions', () => {
  test(
    'PHARMA-212 | Should be able to Update Branch details as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-212'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_ADMIN_USERNAME,
        password: process.env.PHARMACIST_ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const updateBranchRes = await safeGraphQL(api, {
        query: PHARMACIST_UPDATE_BRANCH_QUERY,
        variables: {
          branchId: 32,
          branch: {
            name: `DEVS Branch 02 INT`,
          },
        },
        headers: bearer(accessToken),
      });

      expect(updateBranchRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-213 | Should be able to Get Paged Branches details as Pharmacy Admin',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-213'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_ADMIN_USERNAME,
        password: process.env.PHARMACIST_ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const getPagedBranchesRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_PAGED_BRANCH_QUERY,
        variables: {
          filter: {
            pageSize: 50,
            page: 1,
            sortField: `name`,
            ascending: true,
          },
        },
        headers: bearer(accessToken),
      });

      expect(getPagedBranchesRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-214 | Should be able to Get Branch details as Pharmacy Admin',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-214'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_ADMIN_USERNAME,
        password: process.env.PHARMACIST_ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const getBranchByIdRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_BRANCH_BY_ID_QUERY,
        variables: {
          branchId: 1,
        },
        headers: bearer(accessToken),
      });
    }
  );
});
