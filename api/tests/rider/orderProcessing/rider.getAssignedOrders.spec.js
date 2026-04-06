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
      tag: ['@api', '@rider', '@positive', '@pharma-422'],
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
});
