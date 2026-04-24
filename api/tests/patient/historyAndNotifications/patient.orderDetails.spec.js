import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { GET_ACTIVE_ORDER_QUERY, GET_ORDER_HISTORY_QUERY } from './patient.getHistoryNotificationQueries.js';

test.describe('GraphQL: Order Details Patient', () => {
  test(
    'PHARMA-186 | Should be able to get All Active Orders as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-186'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getActiveOrderRes = await safeGraphQL(api, {
        query: GET_ACTIVE_ORDER_QUERY,
        headers: bearer(accessToken),
      });

      expect(getActiveOrderRes.ok, getActiveOrderRes.error || 'Get active orders failed').toBe(true);
      const activeOrdersNode = getActiveOrderRes.body?.data?.patient?.activeOrders;
      expect(Array.isArray(activeOrdersNode), 'Active orders should return an array').toBe(true);
    }
  );

  test(
    'PHARMA-187 | Should be able get Order History as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-187'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getOrderHistoryRes = await safeGraphQL(api, {
        query: GET_ORDER_HISTORY_QUERY,
        headers: bearer(accessToken),
      });

      expect(getOrderHistoryRes.ok, getOrderHistoryRes.error || 'Get order history failed').toBe(true);
    }
  );

  test(
    'PHARMA-493 | Active orders and order history should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-493'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getActiveOrderRes = await safeGraphQL(api, {
        query: GET_ACTIVE_ORDER_QUERY,
        headers: bearer(accessToken),
      });
      expect(getActiveOrderRes.httpStatus).toBe(200);
      expect(getActiveOrderRes.httpOk).toBe(true);
      expect(getActiveOrderRes.ok, getActiveOrderRes.error || 'Get active orders failed').toBe(true);

      const activeOrdersNode = getActiveOrderRes.body?.data?.patient?.activeOrders;
      expect(Array.isArray(activeOrdersNode), 'Active orders should return an array').toBe(true);
      if (activeOrdersNode.length > 0) {
        expect.soft(typeof activeOrdersNode[0]?.id).toBe('string');
        expect.soft(typeof activeOrdersNode[0]?.status).toBe('string');
        expect.soft(typeof activeOrdersNode[0]?.active).toBe('boolean');
        expect.soft(typeof activeOrdersNode[0]?.createdAt).toBe('string');
      }

      const getOrderHistoryRes = await safeGraphQL(api, {
        query: GET_ORDER_HISTORY_QUERY,
        headers: bearer(accessToken),
      });
      expect(getOrderHistoryRes.httpStatus).toBe(200);
      expect(getOrderHistoryRes.httpOk).toBe(true);
      expect(getOrderHistoryRes.ok, getOrderHistoryRes.error || 'Get order history failed').toBe(true);

      const historyNode = getOrderHistoryRes.body?.data?.patient?.orderHistory;
      expect(Array.isArray(historyNode), 'Order history should return an array').toBe(true);
      if (historyNode.length > 0) {
        expect.soft(typeof historyNode[0]?.id).toBe('string');
        expect.soft(typeof historyNode[0]?.status).toBe('string');
      }
    }
  );
});
