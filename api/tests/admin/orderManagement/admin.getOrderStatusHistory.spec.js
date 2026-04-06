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
import { getReusableTestIds } from '../../testData/reusableTestIds.js';
import { GET_ORDER_STATUS_HISTORY_QUERY } from './admin.orderManagementQueries.js';

const { orderId } = getReusableTestIds({ slot: 'slotOne' });

test.describe('GraphQL: Admin Get Order Status History', () => {
  test(
    'PHARMA-374 | Should get order status history with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-374'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getOrderStatusHistoryRes = await safeGraphQL(api, {
        query: GET_ORDER_STATUS_HISTORY_QUERY,
        variables: { orderId },
        headers: bearer(accessToken),
      });

      expect(getOrderStatusHistoryRes.ok, getOrderStatusHistoryRes.error || 'Get order status history endpoint failed').toBe(
        true
      );

      const node = getOrderStatusHistoryRes.body?.data?.administrator?.order?.statusHistory;
      expect(Array.isArray(node), 'Order status history should return an array').toBe(true);
      expect(node.length, 'Order status history should contain at least one item').toBeGreaterThan(0);

      for (const historyNode of node) {
        expect.soft(typeof historyNode?.status).toBe('string');
        expect.soft(typeof historyNode?.userType).toBe('string');
        expect.soft(typeof historyNode?.updatedAt).toBe('string');
      }
    }
  );

  test(
    'PHARMA-375 | Should NOT get order status history with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-375'],
    },
    async ({ api, noAuth }) => {
      const getOrderStatusHistoryNoAuthRes = await safeGraphQL(api, {
        query: GET_ORDER_STATUS_HISTORY_QUERY,
        variables: { orderId },
        headers: noAuth,
      });

      expect(
        getOrderStatusHistoryNoAuthRes.ok,
        getOrderStatusHistoryNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getOrderStatusHistoryNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getOrderStatusHistoryNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getOrderStatusHistoryNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-376 | Should NOT get order status history with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-376'],
    },
    async ({ api, invalidAuth }) => {
      const getOrderStatusHistoryInvalidAuthRes = await safeGraphQL(api, {
        query: GET_ORDER_STATUS_HISTORY_QUERY,
        variables: { orderId },
        headers: invalidAuth,
      });

      expect(getOrderStatusHistoryInvalidAuthRes.ok).toBe(false);
      expect(getOrderStatusHistoryInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getOrderStatusHistoryInvalidAuthRes.httpStatus);
    }
  );
});
