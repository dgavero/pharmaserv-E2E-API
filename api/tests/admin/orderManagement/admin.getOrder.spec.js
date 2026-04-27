import { loginAsAdminAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { GET_ORDER_QUERY } from './admin.orderManagementQueries.js';
import { getReusableTestIds } from '../../testData/reusableTestIds.js';

const { orderId } = getReusableTestIds({ slot: 'slotOne' });

test.describe('GraphQL: Admin Get Order', () => {
  test(
    'PHARMA-258 | Should get order with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-258', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getOrderRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId },
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
        variables: { orderId },
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
        variables: { orderId },
        headers: invalidAuth,
      });

      expect(getOrderInvalidAuthRes.ok).toBe(false);
      expect(getOrderInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getOrderInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-577 | Should NOT get order when required orderId variable is missing',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-577'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getOrderMissingOrderIdRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: {},
        headers: bearer(accessToken),
      });

      expect(getOrderMissingOrderIdRes.ok, 'Expected GraphQL variable validation failure').toBe(false);
      if (getOrderMissingOrderIdRes.httpOk) {
        const { message, code, classification } = getGQLError(getOrderMissingOrderIdRes);
        expect(message, 'Expected GraphQL validation message for missing orderId').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL error code/classification').toBeTruthy();
      } else {
        expect.soft(getOrderMissingOrderIdRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );

  test(
    'PHARMA-457 | Get order should satisfy response contract shape',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-457'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getOrderRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId },
        headers: bearer(accessToken),
      });

      expect(getOrderRes.httpStatus).toBe(200);
      expect(getOrderRes.httpOk).toBe(true);
      expect(getOrderRes.ok, getOrderRes.error || 'Get order endpoint failed').toBe(true);

      const node = getOrderRes.body?.data?.administrator?.order?.detail;
      expect(node, 'Missing data.administrator.order.detail').toBeTruthy();
      expect.soft(typeof node.id === 'string' || typeof node.id === 'number').toBe(true);
      expect.soft(typeof node.status).toBe('string');
      expect.soft(typeof node.deliveryType).toBe('string');
      expect.soft(Array.isArray(node.legs)).toBe(true);
      expect.soft(typeof node.patient).toBe('object');
      expect.soft(typeof node.patient?.firstName).toBe('string');
      expect.soft(typeof node.patient?.lastName).toBe('string');
    }
  );
});
