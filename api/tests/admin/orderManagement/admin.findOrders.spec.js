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
import { GET_ORDER_QUERY, FIND_ORDERS_QUERY } from './admin.orderManagementQueries.js';

const { orderId } = getReusableTestIds({ slot: 'slotOne' });

async function resolveReusableOrderSearchQuery(api, accessToken) {
  const getOrderRes = await safeGraphQL(api, {
    query: GET_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(accessToken),
  });
  expect(getOrderRes.ok, getOrderRes.error || 'Get order setup for find orders failed').toBe(true);

  const detailNode = getOrderRes.body?.data?.administrator?.order?.detail;
  const trackingCode = detailNode?.trackingCode;
  const patientFirstName = detailNode?.patient?.firstName;
  expect(trackingCode || patientFirstName, 'Missing reusable order search data').toBeTruthy();
  return trackingCode || patientFirstName;
}

test.describe('GraphQL: Admin Find Orders', () => {
  test(
    'PHARMA-371 | Should find orders with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-371'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const orderSearchQuery = await resolveReusableOrderSearchQuery(api, accessToken);

      const findOrdersRes = await safeGraphQL(api, {
        query: FIND_ORDERS_QUERY,
        variables: { query: orderSearchQuery },
        headers: bearer(accessToken),
      });

      expect(findOrdersRes.ok, findOrdersRes.error || 'Find orders endpoint failed').toBe(true);

      const node = findOrdersRes.body?.data?.administrator?.order?.searchedOrders;
      expect(Array.isArray(node), 'Find orders should return an array').toBe(true);
      expect(node.some((orderNode) => String(orderNode?.id) === String(orderId)), 'Expected reusable order was not found in searched orders').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-372 | Should NOT find orders with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-372'],
    },
    async ({ api, noAuth }) => {
      const findOrdersNoAuthRes = await safeGraphQL(api, {
        query: FIND_ORDERS_QUERY,
        variables: { query: 'Dave' },
        headers: noAuth,
      });

      expect(findOrdersNoAuthRes.ok, findOrdersNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(false);

      if (!findOrdersNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(findOrdersNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(findOrdersNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-373 | Should NOT find orders with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-373'],
    },
    async ({ api, invalidAuth }) => {
      const findOrdersInvalidAuthRes = await safeGraphQL(api, {
        query: FIND_ORDERS_QUERY,
        variables: { query: 'Dave' },
        headers: invalidAuth,
      });

      expect(findOrdersInvalidAuthRes.ok).toBe(false);
      expect(findOrdersInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(findOrdersInvalidAuthRes.httpStatus);
    }
  );
});
