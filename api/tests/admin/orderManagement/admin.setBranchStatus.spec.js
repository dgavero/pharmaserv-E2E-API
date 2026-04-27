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

  test(
    'PHARMA-463 | Set branch status should satisfy contract and include target leg status',
    {
      tag: ['@api', '@admin', '@positive', '@update', '@pharma-463'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const currentLegStatus = await resolveReusableOrderLegStatus(api, accessToken);
      const setBranchStatusRes = await safeGraphQL(api, {
        query: SET_BRANCH_STATUS_MUTATION,
        variables: { orderId, branchId: Number(branchId), status: currentLegStatus },
        headers: bearer(accessToken),
      });

      expect(setBranchStatusRes.httpStatus).toBe(200);
      expect(setBranchStatusRes.httpOk).toBe(true);
      expect(setBranchStatusRes.ok, setBranchStatusRes.error || 'Set branch status endpoint failed').toBe(true);

      const node = setBranchStatusRes.body?.data?.administrator?.order?.setBranchStatus;
      expect(node, 'Missing data.administrator.order.setBranchStatus').toBeTruthy();
      expect(Array.isArray(node.legs), 'Set branch status legs should be an array').toBe(true);
      expect(node.legs.some((legNode) => legNode?.status === currentLegStatus), 'Expected leg status was not returned').toBe(
        true
      );
      expect.soft(typeof node.status).toBe('string');
      expect.soft(typeof node.deliveryType).toBe('string');
    }
  );

  test(
    'PHARMA-464 | Should reject set branch status for non-admin roles',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-464'],
    },
    async ({ api }) => {
      const { accessToken: adminAccessToken, raw: adminLoginRes } = await loginAsAdminAndGetTokens(
        api,
        getAdminCredentials('default')
      );
      expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);
      const currentLegStatus = await resolveReusableOrderLegStatus(api, adminAccessToken);

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

        const setBranchStatusRes = await safeGraphQL(api, {
          query: SET_BRANCH_STATUS_MUTATION,
          variables: { orderId, branchId: Number(branchId), status: currentLegStatus },
          headers: bearer(accessToken),
        });

        expect(setBranchStatusRes.ok, `${roleCase.role} should not be authorized to set branch status`).toBe(false);
        if (!setBranchStatusRes.httpOk) {
          expect(
            NOAUTH_HTTP_STATUSES,
            `${roleCase.role} expected unauthorized transport status`
          ).toContain(setBranchStatusRes.httpStatus);
        } else {
          const { message, code, classification } = getGQLError(setBranchStatusRes);
          expect(message, `${roleCase.role} expected GraphQL auth/permission message`).toMatch(NOAUTH_MESSAGE_PATTERN);
          expect.soft(NOAUTH_CODES, `${roleCase.role} expected auth/permission code`).toContain(code);
          expect.soft(NOAUTH_CLASSIFICATIONS, `${roleCase.role} expected auth classification`).toContain(classification);
        }
      }
    }
  );
});
