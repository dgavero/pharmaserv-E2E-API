import { loginAsRiderAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { START_PICKUP_ORDER_QUERY } from './rider.orderQuestions.js';

const orderId = 1; // ID not assigned to rider

test.describe('GraphQL: Start Pickup Order', () => {
  test(
    'PHARMA-127 | Should NOT be able to start pickup for UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-127'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const startPickupOrderRes = await safeGraphQL(api, {
        query: START_PICKUP_ORDER_QUERY,
        variables: {
          orderId: orderId,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        startPickupOrderRes.ok,
        startPickupOrderRes.error || 'Start Pickup Order request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(startPickupOrderRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
