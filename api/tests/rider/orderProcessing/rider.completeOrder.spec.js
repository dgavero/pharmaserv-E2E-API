import { test, expect } from '../../../globalConfig.api.js';
import { COMPLETE_ORDER_QUERY } from './rider.orderQuestions.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  riderLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';

const orderId = 1; // ID not assigned to rider

test.describe('GraphQL: Complete Order', () => {
  test(
    'PHARMA-134 | Should NOT be able to complete an UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-134'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const completeOrderRes = await safeGraphQL(api, {
        query: COMPLETE_ORDER_QUERY,
        variables: {
          orderId: orderId,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        completeOrderRes.ok,
        completeOrderRes.error || 'Complete Order request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(completeOrderRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
