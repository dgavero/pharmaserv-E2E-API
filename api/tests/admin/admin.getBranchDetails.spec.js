import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
} from '../../helpers/testUtilsAPI.js';
import { randomAlphanumeric } from '../../../helpers/globalTestUtils.js';

const GET_PAGED_BRANCHES_QUERY = `
  query ($pharmacyId: ID!, $filter: FilterRequest!) {
    administrator {
      branch {
        pagedBranches(pharmacyId: $pharmacyId, filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            name
          }
        }
      }
    }
  }
`;

function buildPagedBranchesVariables() {
  return {
    pharmacyId: 35,
    filter: {
      pageSize: 5,
      page: 1,
      sortField: 'name',
      ascending: true,
    },
  };
}

test.describe('GraphQL: Admin Get Paged Branches', () => {
  test('Should return paged branches (hard node check; soft id string; soft name contains "QA") @api @admin @positive', async ({
    api,
  }) => {
    // 1) Admin login
    const { accessToken, raw: adminLoginRes } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);

    // 2) Variables (as specified)
    const variables = buildPagedBranchesVariables();

    // 3) Query
    const getPagedBranchesRes = await safeGraphQL(api, {
      query: GET_PAGED_BRANCHES_QUERY,
      variables,
      headers: bearer(accessToken),
    });
    expect(
      getPagedBranchesRes.ok,
      getPagedBranchesRes.error || 'administrator.branch.pagedBranches failed'
    ).toBe(true);

    // 4) Hard check on node
    const pagedBranchesNode = getPagedBranchesRes.body?.data?.administrator?.branch?.pagedBranches;
    expect(pagedBranchesNode, 'Missing data.administrator.branch.pagedBranches').toBeTruthy();

    const items = pagedBranchesNode?.items ?? [];
    expect(items.length, 'Expected at least 1 branch item').toBeGreaterThan(0);

    // 5) Soft checks on each item
    for (const item of items) {
      expect.soft(typeof item.id).toBe('string');
      expect.soft(item.name).toEqual(expect.stringContaining('QA'));
    }
  });

  test('Should NOT return paged branches with missing bearer token (401 Unauthorized) @api @admin @negative', async ({
    api,
    noAuth,
  }) => {
    const variables = buildPagedBranchesVariables();

    const getPagedBranchesMissingBearerRes = await safeGraphQL(api, {
      query: GET_PAGED_BRANCHES_QUERY,
      variables,
      headers: noAuth,
    });

    expect(getPagedBranchesMissingBearerRes.ok).toBe(false);

    if (!getPagedBranchesMissingBearerRes.httpOk) {
      // Transport-level unauthorized
      expect(getPagedBranchesMissingBearerRes.httpStatus).toBe(401);
    } else {
      // HTTP 200 + GraphQL errors[]
      const unauthorizedErr = getGQLError(getPagedBranchesMissingBearerRes);
      expect(unauthorizedErr.message.toLowerCase()).toContain('unauthorized');
      expect.soft(unauthorizedErr.code).toBe('401');
      expect.soft(unauthorizedErr.classification).toBe('UNAUTHORIZED');
    }
  });

  test('Should NOT return paged branches with invalid bearer token (401 Unauthorized) @api @admin @negative', async ({
    api,
    invalidAuth,
  }) => {
    const variables = buildPagedBranchesVariables();

    const getPagedBranchesInvalidBearerRes = await safeGraphQL(api, {
      query: GET_PAGED_BRANCHES_QUERY,
      variables,
      headers: invalidAuth,
    });

    expect(getPagedBranchesInvalidBearerRes.ok).toBe(false);
    expect(getPagedBranchesInvalidBearerRes.httpOk).toBe(false);
    expect(getPagedBranchesInvalidBearerRes.httpStatus).toBe(401);
  });
});
