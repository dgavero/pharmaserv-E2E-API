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
});
