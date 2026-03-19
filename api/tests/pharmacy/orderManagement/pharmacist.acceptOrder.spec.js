import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { getReusableTestIds } from '../../testData/reusableTestIds.js';
import { ACCEPT_ORDER_QUERY } from './pharmacist.orderManagementQueries.js';

test.describe('GraphQL: Pharmacy Accept Order', () => {
  test(
    'PHARMA-175 | Should NOT be able Accept already accepted Order',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-175'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const acceptOrderRes = await safeGraphQL(api, {
        query: ACCEPT_ORDER_QUERY,
        variables: {
          orderId: getReusableTestIds({ slot: 'slotOne' }).orderId, // Already accepted regular orderId
        },
        headers: bearer(accessToken),
      });

      expect(acceptOrderRes.ok, acceptOrderRes.error || 'Expected Accept Order to Fail').toBe(false);
    }
  );
});
