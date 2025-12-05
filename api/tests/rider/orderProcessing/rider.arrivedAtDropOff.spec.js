import { test, expect } from '../../../globalConfig.api.js';
import { ARRIVE_AT_DROPOFF_QUERY } from './rider.orderQuestions.js';
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

test.describe('GraphQL: Arrive at Drop-off', () => {
  test(
    'PHARMA-132 | Should NOT be able to arrive at dropoff for an UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-132'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const arriveAtDropOffRes = await safeGraphQL(api, {
        query: ARRIVE_AT_DROPOFF_QUERY,
        variables: {
          orderId: orderId,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        arriveAtDropOffRes.ok,
        arriveAtDropOffRes.error || 'Arrive at Drop-off request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(arriveAtDropOffRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
