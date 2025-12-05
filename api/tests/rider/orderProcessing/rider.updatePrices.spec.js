import { test, expect } from '../../../globalConfig.api.js';
import { UPDATE_PRICES_QUERY } from './rider.orderQuestions.js';
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

function buildPrices() {
  const medicineId = 1;
  const quantity = 2;
  const unitPrice = 10.0;

  return {
    medicineId,
    quantity,
    unitPrice,
  };
}

test.describe('GraphQL: Update Prices', () => {
  test(
    'PHARMA-129 | Should NOT be able to update prices for UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-129'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const updatePricesRes = await safeGraphQL(api, {
        query: UPDATE_PRICES_QUERY,
        variables: {
          orderId: orderId,
          branchId: branchId,
          prices: [buildPrices()],
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        updatePricesRes.ok,
        updatePricesRes.error || 'Update Prices request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(updatePricesRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
