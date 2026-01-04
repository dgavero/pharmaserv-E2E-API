import { test, expect } from '../../../globalConfig.api.js';
import { SCAN_PRESCRIPTION_QUERY } from './patient.prescriptionQueries.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Scan Prescription', () => {
  test(
    'PHARMA-180 | Should be able to Scan Prescription as patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-180'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const photo = `addfff-1344-1356.png`;
      const scanPresriptionRes = await safeGraphQL(api, {
        query: SCAN_PRESCRIPTION_QUERY,
        variables: {
          prescription: {
            patientId: process.env.USER_USERNAME_PATIENT_ID,
            photoToScan: photo,
          },
        },
        headers: bearer(accessToken),
      });

      expect(scanPresriptionRes.ok).toBe(true);
    }
  );
});
