import { test, expect } from '../../../globalConfig.api.js';
import { GET_ORDER_QUERY } from './rider.orderQuestions.js';
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

test.describe('GraphQL: Get Order', () => {
  test(
    'PHARMA-125 | Should NOT be able to get UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-125'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
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
