import { loginAsRiderAndGetTokens, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { getReusableNegativeFixtures } from '../../testData/reusableTestIds.js';
import { GET_ORDER_QUERY } from './rider.orderQuestions.js';

const { unassignedOrderId: orderId } = getReusableNegativeFixtures();

test.describe('GraphQL: Get Order', () => {
  test(
    'PHARMA-125 | Should NOT be able to get UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-125'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getOrderRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: {
          orderId: orderId,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getOrderRes.ok, getOrderRes.error || 'Get Order request is expected to fail').toBe(
        false
      );

      const { classification, code } = getGQLError(getOrderRes);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-560 | Get unassigned order should satisfy error response contract',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-560'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getOrderRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId },
        headers: bearer(accessToken),
      });

      expect(getOrderRes.ok, getOrderRes.error || 'Get Order is expected to fail').toBe(false);
      if (getOrderRes.httpOk) {
        const { message } = getGQLError(getOrderRes);
        expect(typeof message).toBe('string');
        expect.soft(message.length > 0).toBe(true);
      } else {
        expect(getOrderRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );

  test(
    'PHARMA-586 | Should NOT get order when required orderId variable is missing',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-586'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getOrderMissingVariableRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: {},
        headers: bearer(accessToken),
      });

      expect(getOrderMissingVariableRes.ok, 'Expected GraphQL variable validation failure').toBe(false);
      if (getOrderMissingVariableRes.httpOk) {
        const { message, code, classification } = getGQLError(getOrderMissingVariableRes);
        expect(message, 'Expected GraphQL validation message for missing orderId').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL error code/classification').toBeTruthy();
      } else {
        expect.soft(getOrderMissingVariableRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );
});
