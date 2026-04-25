import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { GET_PRESCRIPTION_BY_ID_QUERY } from './pharmacist.orderManagementQueries.js';

test.describe('GraphQL: Pharmacy Get Prescription by ID', () => {
  test(
    'PHARMA-174 | Should be able to get Prescription by ID',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-174'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_BY_ID_QUERY,
        variables: {
          prescriptionId: 1,
        },
        headers: bearer(accessToken),
      });

      expect(getPrescriptionRes.ok, getPrescriptionRes.error || 'Get Prescription by ID failed').toBe(true);
    }
  );

  test(
    'PHARMA-544 | Get prescription should satisfy response contract shape',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-544'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_BY_ID_QUERY,
        variables: {
          prescriptionId: 1,
        },
        headers: bearer(accessToken),
      });

      expect(getPrescriptionRes.httpStatus).toBe(200);
      expect(getPrescriptionRes.httpOk).toBe(true);
      expect(getPrescriptionRes.ok, getPrescriptionRes.error || 'Get Prescription by ID failed').toBe(true);

      const node = getPrescriptionRes.body?.data?.pharmacy?.prescription?.detail;
      expect(node, 'Missing data.pharmacy.prescription.detail').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.photo).toBe('string');
      expect.soft(Array.isArray(node?.prescriptionItems)).toBe(true);
    }
  );
});
