import { test, expect } from '../../../globalConfig.api.js';
import { DECLINE_ORDER_QUERY } from '../orderManagement/pharmacist.orderManagementQueries.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
  pharmacistLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';

const orderId = 38; //Order id that is tied to the user but is already inactive
test.describe('GraphQL: Pharmacy Decline Order', () => {
  test(
    'PHARMA-168 | Should NOT be able to decline an inactive order',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-168'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const declineOrderRes = await safeGraphQL(api, {
        query: DECLINE_ORDER_QUERY,
        variables: {
          orderId: orderId,
          reason: 'Order is declined via API',
        },
        headers: bearer(accessToken),
      });

      expect(
        declineOrderRes.ok,
        declineOrderRes.error || 'Expected decline order to fail for inactive orderId'
      ).toBe(false);

      const { message, classification, code } = getGQLError(declineOrderRes);
      expect(message).toMatch(/no longer new/i);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );
});
