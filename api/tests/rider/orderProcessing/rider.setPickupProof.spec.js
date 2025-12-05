import { test, expect } from '../../../globalConfig.api.js';
import { SET_PICKUP_PROOF_QUERY } from './rider.orderQuestions.js';
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
const proof = 'pp-123456-8888-5643.png';

test.describe('GraphQL: Set Pickup Proof', () => {
  test(
    'PHARMA-130 | Should NOT be able to set pickup proof for UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-130'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const setPickupProofRes = await safeGraphQL(api, {
        query: SET_PICKUP_PROOF_QUERY,
        variables: {
          orderId: orderId,
          branchId: branchId,
          proof: { photo: proof },
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setPickupProofRes.ok,
        setPickupProofRes.error || 'Set Pickup Proof request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(setPickupProofRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
