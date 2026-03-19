import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { FIND_MEDICINES_QUERY } from './pharmacist.orderManagementQueries.js';

test.describe('GraphQL: Pharmacy Find Medicines by search', () => {
  test(
    'PHARMA-176 | Should be able to find medicines by searching a keyword',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-176', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const findMedicineRes = await safeGraphQL(api, {
        query: FIND_MEDICINES_QUERY,
        variables: {
          query: 'a',
        },
        headers: bearer(accessToken),
      });

      expect(findMedicineRes.ok, findMedicineRes.error || 'Find medicines failed').toBe(true);
    }
  );
});
