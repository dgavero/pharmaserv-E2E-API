import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount, getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { SCAN_PRESCRIPTION_QUERY } from './patient.prescriptionQueries.js';

const defaultPatientAccount = getPatientAccount('default');

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
            patientId: defaultPatientAccount.patientId,
            photoToScan: photo,
          },
        },
        headers: bearer(accessToken),
      });

      expect(scanPresriptionRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-511 | Scan prescription should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-511'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const scanPresriptionRes = await safeGraphQL(api, {
        query: SCAN_PRESCRIPTION_QUERY,
        variables: {
          prescription: {
            patientId: defaultPatientAccount.patientId,
            photoToScan: 'addfff-1344-1356.png',
          },
        },
        headers: bearer(accessToken),
      });

      expect(scanPresriptionRes.httpStatus).toBe(200);
      expect(scanPresriptionRes.httpOk).toBe(true);
      expect(scanPresriptionRes.ok, scanPresriptionRes.error || 'Scan prescription request failed').toBe(true);

      const node = scanPresriptionRes.body?.data?.patient?.prescription?.scan;
      expect(node, 'Missing data.patient.prescription.scan').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(Array.isArray(node?.prescriptionItems)).toBe(true);
    }
  );
});
