import { test, expect } from '../../../globalConfig.api.js';
import {
  GET_PRESCRIPTION_QUERY,
  SCAN_PRESCRIGET_PRESCRIPTION_QUERYPTION_QUERY,
} from './patient.prescriptionQueries.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Get Prescription', () => {
  test(
    'PHARMA-181 | Should be able to Get Prescription as patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-181'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_QUERY,
        variables: {
          patientId: process.env.USER_USERNAME_PATIENT_ID,
        },
        headers: bearer(accessToken),
      });

      expect(getPrescriptionRes.ok).toBe(true);
    }
  );
});
