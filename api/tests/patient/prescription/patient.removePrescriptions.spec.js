import { test, expect } from '../../../globalConfig.api.js';
import { REMOVE_PRESCRIPTION_QUERY, SCAN_PRESCRIPTION_QUERY } from './patient.prescriptionQueries.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Remove Prescription', () => {
  test(
    'PHARMA-182 | Should be able to remove Prescription as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-182'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      // Scan/Add Prescription
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

      // Get prescriptionId to use on remove
      const node = scanPresriptionRes.body?.data?.patient?.prescription?.scan;
      expect(node, 'Missing data.patient.prescription.scan').toBeTruthy();

      const { id: prescriptionId } = node;
      expect(prescriptionId).toBeTruthy();
      console.log('Prescription ID to remove: ' + prescriptionId);

      // Remove prescription
      const removePrescriptionRes = await safeGraphQL(api, {
        query: REMOVE_PRESCRIPTION_QUERY,
        variables: {
          prescriptionId: prescriptionId,
        },
        headers: bearer(accessToken),
      });

      expect(removePrescriptionRes.ok).toBe(true);
    }
  );
});
