import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { FIND_MEDICINES_QUERY } from './pharmacist.orderManagementQueries.js';

test.describe('GraphQL: Pharmacy Find Medicines by search', () => {
  test(
    'PHARMA-176 | Should be able to find medicines by searching a keyword',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-176'],
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

  test(
    'PHARMA-539 | Find medicines should satisfy response contract shape',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-539'],
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

      expect(findMedicineRes.httpStatus).toBe(200);
      expect(findMedicineRes.httpOk).toBe(true);
      expect(findMedicineRes.ok, findMedicineRes.error || 'Find medicines failed').toBe(true);

      const node = findMedicineRes.body?.data?.pharmacy?.medicines;
      expect(Array.isArray(node), 'Expected pharmacy.medicines to be an array').toBe(true);
      if (node.length > 0) {
        expect.soft(typeof node[0]?.id).toBe('string');
        expect.soft(typeof node[0]?.brand).toBe('string');
        expect.soft(typeof node[0]?.genericName).toBe('string');
      }
    }
  );
});
