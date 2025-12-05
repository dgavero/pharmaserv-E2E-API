import { test, expect } from '../../../globalConfig.api.js';
import { GET_CURRENT_ORDER_QUERY } from './rider.orderQuestions.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  riderLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Get Current Order', () => {
  test(
    'PHARMA-126 | Should NOT be able to get Current Order when no order is assigned',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-126'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getCurrentOrderRes = await safeGraphQL(api, {
        query: GET_CURRENT_ORDER_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        getCurrentOrderRes.ok,
        getCurrentOrderRes.error || 'Get Current Order request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(getCurrentOrderRes);
      expect(message).toMatch(/no order/i);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
