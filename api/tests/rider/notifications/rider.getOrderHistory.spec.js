import { test, expect } from '../../../globalConfig.api.js';
import { GET_ORDER_HISTORY_QUERY } from './rider.notificationQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  riderLoginAndGetTokens,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Rider Get Order History', () => {
  test(
    'PHARMA-138 | Should be able to get order history as a rider',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-138'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getOrderHistoryRes = await safeGraphQL(api, {
        query: GET_ORDER_HISTORY_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        getOrderHistoryRes.ok,
        getOrderHistoryRes.error || 'Get Order History request failed'
      ).toBe(true);

      const node = getOrderHistoryRes.body.data.rider.orderHistory;
      expect(Array.isArray(node)).toBe(true);
    }
  );

  test(
    'PHARMA-139 | Should be able to get order history without authentication',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-139'],
    },
    async ({ api, noAuth }) => {
      const getOrderHistoryResNoAuth = await safeGraphQL(api, {
        query: GET_ORDER_HISTORY_QUERY,
        headers: noAuth,
      });

      // Main Assertion
      expect(
        getOrderHistoryResNoAuth.ok,
        getOrderHistoryResNoAuth.error || 'Get Order History is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(getOrderHistoryResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-140 | Should NOT be able to get order history with invalid authentication',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-140'],
    },
    async ({ api, invalidAuth }) => {
      const getOrderHistoryResInvalidAuth = await safeGraphQL(api, {
        query: GET_ORDER_HISTORY_QUERY,
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        getOrderHistoryResInvalidAuth.ok,
        getOrderHistoryResInvalidAuth.error || 'Get Order History is expected to fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(getOrderHistoryResInvalidAuth.ok).toBe(false);
      expect(getOrderHistoryResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getOrderHistoryResInvalidAuth.httpStatus);
    }
  );
});
