import { loginAsRiderAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { PICKUP_ORDER_QUERY } from './rider.orderQuestions.js';

const orderId = 1; // ID not assigned to rider
const branchId = 1; // Branch ID for the order
const branchQR = 'ae3e0925-c1c5-41cb-bf69-3a952ddc52d0';

test.describe('GraphQL: Pickup Order', () => {
  test(
    'PHARMA-131 | Should NOT be able to pickup an UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-131'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const pickupOrderRes = await safeGraphQL(api, {
        query: PICKUP_ORDER_QUERY,
        variables: {
          orderId: orderId,
          branchId: branchId,
          branchQR: branchQR,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        pickupOrderRes.ok,
        pickupOrderRes.error || 'Pickup Order request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(pickupOrderRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
