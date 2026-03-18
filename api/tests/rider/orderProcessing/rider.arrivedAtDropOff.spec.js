import { loginAsRiderAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { ARRIVE_AT_DROPOFF_QUERY } from './rider.orderQuestions.js';

const orderId = 1; // ID not assigned to rider

test.describe('GraphQL: Arrive at Drop-off', () => {
  test(
    'PHARMA-132 | Should NOT be able to arrive at dropoff for an UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-132'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
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
