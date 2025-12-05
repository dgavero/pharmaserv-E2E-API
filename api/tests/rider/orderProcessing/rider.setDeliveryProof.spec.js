import { test, expect } from '../../../globalConfig.api.js';
import { SET_DELIVERY_PROOF_QUERY } from './rider.orderQuestions.js';
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
const photo = 'dd-123456-8888-5643.png';

test.describe('GraphQL: Set Delivery Proof', () => {
  test(
    'PHARMA-133 | Should NOT be able to set delivery proof for an UNASSIGNED order',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-133'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const setDeliveryProofRes = await safeGraphQL(api, {
        query: SET_DELIVERY_PROOF_QUERY,
        variables: {
          orderId: orderId,
          proof: {
            photo: photo,
          },
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setDeliveryProofRes.ok,
        setDeliveryProofRes.error || 'Set Delivery Proof request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(setDeliveryProofRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
