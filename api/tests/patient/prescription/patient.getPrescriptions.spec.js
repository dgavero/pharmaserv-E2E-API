import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount, getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { GET_PRESCRIPTION_QUERY } from './patient.prescriptionQueries.js';

const defaultPatientAccount = getPatientAccount('default');

test.describe('GraphQL: Get Prescription', () => {
  test(
    'PHARMA-512 | Should get prescriptions and satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-512'],
    },
    async ({ api }) => {
      test.skip(true, 'To activate once feature is implemented in UI');

      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_QUERY,
        variables: {
          patientId: defaultPatientAccount.patientId,
        },
        headers: bearer(accessToken),
      });

      console.log('Get Prescription Response:', getPrescriptionRes);

      expect(getPrescriptionRes.httpStatus).toBe(200);
      expect(getPrescriptionRes.httpOk).toBe(true);
      expect(getPrescriptionRes.ok, getPrescriptionRes.error || 'Get prescription failed').toBe(true);

      const node = getPrescriptionRes.body?.data?.patient?.prescriptions;
      expect(Array.isArray(node), 'Expected patient.prescriptions to be an array').toBe(true);
      if (node.length > 0) {
        expect.soft(typeof node[0]?.id).toBe('string');
        expect.soft(typeof node[0]?.photo).toBe('string');
        expect.soft(Array.isArray(node[0]?.prescriptionItems)).toBe(true);
      }
    }
  );
});
