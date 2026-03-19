import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount, getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { GET_PRESCRIPTION_QUERY } from './patient.prescriptionQueries.js';

const defaultPatientAccount = getPatientAccount('default');

test.describe('GraphQL: Get Prescription', () => {
  test(
    'PHARMA-181 | Should be able to Get Prescription as patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-181'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_QUERY,
        variables: {
          patientId: defaultPatientAccount.patientId,
        },
        headers: bearer(accessToken),
      });

      expect(getPrescriptionRes.ok, getPrescriptionRes.error || 'Get prescription failed').toBe(true);
    }
  );
});
