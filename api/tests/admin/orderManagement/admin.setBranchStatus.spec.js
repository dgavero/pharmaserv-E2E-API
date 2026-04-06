import {
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getPharmacistAccount } from '../../../helpers/roleCredentials.js';
import { getReusableTestIds } from '../../testData/reusableTestIds.js';
import { GET_ORDER_QUERY, SET_BRANCH_STATUS_MUTATION } from './admin.orderManagementQueries.js';

const reusableOrder = getReusableTestIds({ slot: 'slotOne' });
const pharmacistAccount = getPharmacistAccount(reusableOrder.pharmacistAccountKey);
const orderId = reusableOrder.orderId;
const branchId = pharmacistAccount.branchId;

async function resolveReusableOrderLegStatus(api, accessToken) {
  const getOrderRes = await safeGraphQL(api, {
    query: GET_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(accessToken),
  });
  expect(getOrderRes.ok, getOrderRes.error || 'Get order setup for branch status failed').toBe(true);

  const firstLegStatus = getOrderRes.body?.data?.administrator?.order?.detail?.legs?.[0]?.status;
  expect(firstLegStatus, 'Missing reusable order first leg status').toBeTruthy();
  return firstLegStatus;
}

test.describe('GraphQL: Admin Set Branch Status', () => {
  test(
    'PHARMA-362 | Should set branch status with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@update', '@pharma-362'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Reuse the slot-bound pharmacist branch and re-apply the current leg status to avoid drifting reusable order state.
      const currentLegStatus = await resolveReusableOrderLegStatus(api, accessToken);

      const setBranchStatusRes = await safeGraphQL(api, {
        query: SET_BRANCH_STATUS_MUTATION,
        variables: { orderId, branchId: Number(branchId), status: currentLegStatus },
        headers: bearer(accessToken),
      });

      expect(setBranchStatusRes.ok, setBranchStatusRes.error || 'Set branch status endpoint failed').toBe(true);

      const node = setBranchStatusRes.body?.data?.administrator?.order?.setBranchStatus;
      expect(node, 'Set branch status endpoint returned no data').toBeTruthy();
      expect(Array.isArray(node.legs), 'Set branch status legs should be an array').toBe(true);
      expect(node.legs.some((legNode) => legNode?.status === currentLegStatus), 'Updated branch status was not returned in order legs').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-363 | Should NOT set branch status with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-363'],
    },
    async ({ api, noAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const currentLegStatus = await resolveReusableOrderLegStatus(api, accessToken);

      const setBranchStatusNoAuthRes = await safeGraphQL(api, {
        query: SET_BRANCH_STATUS_MUTATION,
        variables: { orderId, branchId: Number(branchId), status: currentLegStatus },
        headers: noAuth,
      });

      expect(setBranchStatusNoAuthRes.ok, setBranchStatusNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!setBranchStatusNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(setBranchStatusNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(setBranchStatusNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-364 | Should NOT set branch status with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-364'],
    },
    async ({ api, invalidAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const currentLegStatus = await resolveReusableOrderLegStatus(api, accessToken);

      const setBranchStatusInvalidAuthRes = await safeGraphQL(api, {
        query: SET_BRANCH_STATUS_MUTATION,
        variables: { orderId, branchId: Number(branchId), status: currentLegStatus },
        headers: invalidAuth,
      });

      expect(setBranchStatusInvalidAuthRes.ok).toBe(false);
      expect(setBranchStatusInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(setBranchStatusInvalidAuthRes.httpStatus);
    }
  );
});
