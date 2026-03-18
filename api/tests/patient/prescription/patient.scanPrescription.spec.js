import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { SCAN_PRESCRIPTION_QUERY } from './patient.prescriptionQueries.js';

test.describe('GraphQL: Scan Prescription', () => {
  test(
    'PHARMA-180 | Should be able to Scan Prescription as patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-180'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const photo = `addfff-1344-1356.png`;
      const scanPresriptionRes = await safeGraphQL(api, {
        query: SCAN_PRESCRIPTION_QUERY,
        variables: {
          prescription: {
            patientId: process.env.PATIENT_USER_USERNAME_ID,
            photoToScan: photo,
          },
        },
        headers: bearer(accessToken),
      });

      expect(scanPresriptionRes.ok).toBe(true);
    }
  );
});
