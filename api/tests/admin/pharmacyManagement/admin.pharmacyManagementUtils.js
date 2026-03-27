import { expect } from '../../../globalConfig.api.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { GET_PAGED_ALL_BRANCHES_QUERY, GET_BRANCH_QUERY } from './admin.pharmacyManagementQueries.js';

const QA_PHARMACY_PREFIX = 'QA-Pharmacy-';
const QA_UPDATED_PHARMACY_PREFIX = 'QA-UpdatedPharmacy-';

export function buildPagedAllBranchesFilter() {
  return {
    pageSize: 300,
    page: 1,
    sortField: 'name',
    ascending: true,
  };
}

export function buildUpdatedBranchName(pharmacyName) {
  if (String(pharmacyName || '').startsWith(QA_PHARMACY_PREFIX)) {
    return String(pharmacyName).replace(QA_PHARMACY_PREFIX, QA_UPDATED_PHARMACY_PREFIX);
  }
  return `${QA_UPDATED_PHARMACY_PREFIX}${String(pharmacyName || '').trim()}`;
}

export async function getPagedAllBranchesAsAdmin(api, { adminAccessToken, filter = buildPagedAllBranchesFilter() } = {}) {
  const getPagedAllBranchesRes = await safeGraphQL(api, {
    query: GET_PAGED_ALL_BRANCHES_QUERY,
    variables: { filter },
    headers: bearer(adminAccessToken),
  });
  expect(
    getPagedAllBranchesRes.ok,
    getPagedAllBranchesRes.error || 'Get paged all branches setup failed'
  ).toBe(true);

  const pagedBranchesNode = getPagedAllBranchesRes.body?.data?.administrator?.branch?.pagedBranches;
  expect(pagedBranchesNode, 'Missing data.administrator.branch.pagedBranches').toBeTruthy();
  return { getPagedAllBranchesRes, pagedBranchesNode };
}

export async function resolveQaBranchFromPagedAllBranches(api, { adminAccessToken } = {}) {
  const { pagedBranchesNode } = await getPagedAllBranchesAsAdmin(api, { adminAccessToken });
  const branchItems = pagedBranchesNode?.items ?? [];
  const qaBranch = branchItems.find((branchNode) => String(branchNode?.pharmacyName || '').startsWith(QA_PHARMACY_PREFIX));
  expect(qaBranch, `Expected at least one branch whose pharmacyName starts with "${QA_PHARMACY_PREFIX}"`).toBeTruthy();
  return qaBranch;
}

export async function getBranchAsAdmin(api, { adminAccessToken, branchId } = {}) {
  const getBranchRes = await safeGraphQL(api, {
    query: GET_BRANCH_QUERY,
    variables: { branchId },
    headers: bearer(adminAccessToken),
  });
  expect(getBranchRes.ok, getBranchRes.error || 'Get branch setup failed').toBe(true);

  const branchNode = getBranchRes.body?.data?.administrator?.branch?.detail;
  expect(branchNode?.id, 'Missing branch detail node').toBeTruthy();
  return { getBranchRes, branchNode };
}
