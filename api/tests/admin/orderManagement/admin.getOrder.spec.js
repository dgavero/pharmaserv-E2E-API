import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';
import { GET_ORDER_QUERY } from './admin.orderManagementQueries.js';

test.describe('GraphQL: Admin Get Order', () => {
  test(
    'PHARMA-258 | Should get order with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-258', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getOrderRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId: 448 },
        headers: bearer(accessToken),
      });

      expect(getOrderRes.ok, getOrderRes.error || 'Get order endpoint failed').toBe(true);
    }
  );

  test(
    'PHARMA-259 | Should NOT get order with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-259'],
    },
    async ({ api, noAuth }) => {
      const getOrderNoAuthRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId: 448 },
        headers: noAuth,
      });

      expect(
        getOrderNoAuthRes.ok,
        getOrderNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getOrderNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getOrderNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getOrderNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-260 | Should NOT get order with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-260'],
    },
    async ({ api, invalidAuth }) => {
      const getOrderInvalidAuthRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId: 448 },
        headers: invalidAuth,
      });

      expect(getOrderInvalidAuthRes.ok).toBe(false);
      expect(getOrderInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getOrderInvalidAuthRes.httpStatus);
    }
  );
});
