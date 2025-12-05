import { test, expect } from '../../../globalConfig.api.js';
import { ARRIVE_AT_PHARMACY_QUERY } from './rider.orderQuestions.js';
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
const branchId = 1; // Branch ID for the order

test.describe('GraphQL: Arrive at Pharmacy', () => {
  test(
    'PHARMA-128 | Should NOT be able to arrive at pharmacy for UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-128'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const arriveAtPharmacyRes = await safeGraphQL(api, {
        query: ARRIVE_AT_PHARMACY_QUERY,
        variables: {
          orderId: orderId,
          branchId: branchId,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        arriveAtPharmacyRes.ok,
        arriveAtPharmacyRes.error || 'Arrive at Pharmacy request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(arriveAtPharmacyRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
