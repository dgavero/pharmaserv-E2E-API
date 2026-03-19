import { loginAsPharmacistAndGetTokens, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { getReusableNegativeFixtures } from '../../testData/reusableTestIds.js';
import { DECLINE_ORDER_QUERY } from './pharmacist.orderManagementQueries.js';

const { inactiveOrderId } = getReusableNegativeFixtures();

test.describe('GraphQL: Pharmacy Decline Order', () => {
  test(
    'PHARMA-168 | Should NOT be able to decline an inactive order',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-168'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const declineOrderRes = await safeGraphQL(api, {
        query: DECLINE_ORDER_QUERY,
        variables: {
          orderId: inactiveOrderId,
          reason: 'Order is declined via API',
        },
        headers: bearer(accessToken),
      });

      expect(declineOrderRes.ok, declineOrderRes.error || 'Expected decline order to fail for inactive orderId').toBe(
        false
      );

      const { message, classification, code } = getGQLError(declineOrderRes);
      expect(message).toMatch(/no longer/i);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );
});
