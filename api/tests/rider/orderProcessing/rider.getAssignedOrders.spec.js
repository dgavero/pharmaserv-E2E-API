import {
  loginAsRiderAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { GET_ASSIGNED_ORDERS_QUERY } from './rider.orderQuestions.js';

test.describe('GraphQL: Get Assigned Orders', () => {
  test(
    'PHARMA-422 | Should get assigned orders as Rider',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-422', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getAssignedOrdersRes = await safeGraphQL(api, {
        query: GET_ASSIGNED_ORDERS_QUERY,
        headers: bearer(accessToken),
      });

      expect(getAssignedOrdersRes.ok, getAssignedOrdersRes.error || 'Get Assigned Orders request failed').toBe(true);
    }
  );

  test(
    'PHARMA-423 | Should NOT get assigned orders with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-423'],
    },
    async ({ api, noAuth }) => {
      const getAssignedOrdersNoAuthRes = await safeGraphQL(api, {
        query: GET_ASSIGNED_ORDERS_QUERY,
        headers: noAuth,
      });

      expect(getAssignedOrdersNoAuthRes.ok, 'Get Assigned Orders with missing auth should fail').toBe(false);

      if (!getAssignedOrdersNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getAssignedOrdersNoAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(getAssignedOrdersNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-424 | Should NOT get assigned orders with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-424'],
    },
    async ({ api, invalidAuth }) => {
      const getAssignedOrdersInvalidAuthRes = await safeGraphQL(api, {
        query: GET_ASSIGNED_ORDERS_QUERY,
        headers: invalidAuth,
      });

      expect(getAssignedOrdersInvalidAuthRes.ok, 'Get Assigned Orders with invalid auth should fail').toBe(false);

      if (!getAssignedOrdersInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getAssignedOrdersInvalidAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(getAssignedOrdersInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-558 | Get assigned orders should satisfy response contract shape',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-558'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getAssignedOrdersRes = await safeGraphQL(api, {
        query: GET_ASSIGNED_ORDERS_QUERY,
        headers: bearer(accessToken),
      });

      expect(getAssignedOrdersRes.httpStatus).toBe(200);
      expect(getAssignedOrdersRes.httpOk).toBe(true);
      expect(getAssignedOrdersRes.ok, getAssignedOrdersRes.error || 'Get Assigned Orders request failed').toBe(true);

      const node = getAssignedOrdersRes.body?.data?.rider?.assignedOrders;
      expect(Array.isArray(node), 'Expected data.rider.assignedOrders to be an array').toBe(true);
      if (node.length > 0) {
        expect.soft(typeof node[0]?.id).toBe('string');
        expect.soft(typeof node[0]?.deliveryType).toBe('string');
        expect.soft(typeof node[0]?.status).toBe('string');
        expect.soft(Array.isArray(node[0]?.legs)).toBe(true);
      }
    }
  );
});
