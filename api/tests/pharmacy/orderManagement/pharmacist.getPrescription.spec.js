import { test, expect } from '../../../globalConfig.api.js';
import { GET_PRESCRIPTION_BY_ID_QUERY } from '../orderManagement/pharmacist.orderManagementQueries.js';
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

test.describe('GraphQL: Pharmacy Get Prescription by ID', () => {
  test(
    'PHARMA-174 | Should be able to get Prescription by ID',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-174'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_BY_ID_QUERY,
        variables: {
          prescriptionId: 1,
        },
        headers: bearer(accessToken),
      });

      expect(
        getPrescriptionRes.ok,
        getPrescriptionRes.error || 'Get Prescription by ID failed'
      ).toBe(true);
    }
  );
});
