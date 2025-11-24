import { test, expect } from '../../../globalConfig.api.js';
import { loginAndGetTokens } from '../../../helpers/testUtilsAPI';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
} from '../../../helpers/testUtilsAPI.js';

const DISABLE_PATIENT_QUERY = /* GraphQL */ `
  mutation ($patientId: ID!) {
    patient {
      disable(patientId: $patientId)
    }
  }
`;

const patientId = 297; // Existing patient ID related to user
const unrelatedPatientId = 1; // Patient ID NOT related to user

test.describe('GraphQL: Disable a related patient', () => {
  test(
    'PHARMA-82 | Should be able disable a related patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-82'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.LOGIN_USERNAME,
        password: process.env.LOGIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const disablePatientRes = await safeGraphQL(api, {
        query: DISABLE_PATIENT_QUERY,
        variables: { patientId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        disablePatientRes.ok,
        disablePatientRes.error || 'Disable Patient request failed'
      ).toBe(true);

      const disablePatientResNode = disablePatientRes.body.data.patient.disable;
      expect(disablePatientResNode).toContain('disabled');
    }
  );

  test(
    'PHARMA-83 | Should NOT be able to disable unrelated Patient',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-83'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.LOGIN_USERNAME,
        password: process.env.LOGIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const disablePatientRes = await safeGraphQL(api, {
        query: DISABLE_PATIENT_QUERY,
        variables: { unrelatedPatientId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        disablePatientRes.ok,
        disablePatientRes.error || 'Disable Patient request is expected to fail'
      ).toBe(false);

      const { message, classification } = getGQLError(disablePatientRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
