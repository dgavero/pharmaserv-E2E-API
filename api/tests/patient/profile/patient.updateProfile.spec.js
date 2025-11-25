import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
  loginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';

const UPDATE_PATIENT_QUERY = /* GraphQL */ `
  mutation ($patient: PatientRequest!) {
    patient {
      update(patient: $patient) {
        id
        firstName
        lastName
        email
        gender
        height
        weight
        bloodType
      }
    }
  }
`;

function updatePatientInput() {
  const height = randomNum(3);
  const weight = randomNum(3);
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];

  return { height, weight, bloodType };
}

test.describe('GraphQL: Patient Update Profile', () => {
  test(
    'PHARMA-61 | Should be able to Update Profile as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-61'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const updateInput = updatePatientInput();
      const updatePatientRes = await safeGraphQL(api, {
        query: UPDATE_PATIENT_QUERY,
        variables: { patient: updateInput },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(updatePatientRes.ok, updatePatientRes.error || 'Update Patient Profile failed').toBe(
        true
      );

      // Get updated patient data
      const patientNode = updatePatientRes.body.data.patient.update;
      expect(patientNode, 'Updated Patient is null').toBeTruthy();

      expect.soft(patientNode.height).toBe(updateInput.height);
      expect.soft(patientNode.weight).toBe(updateInput.weight);
      expect.soft(patientNode.bloodType).toBe(updateInput.bloodType);
    }
  );

  test(
    'PHARMA-62 | Should NOT be able to Update Profile as Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-62'],
    },
    async ({ api, noAuth }) => {
      const updateInput = updatePatientInput();
      const updatePatientNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_PATIENT_QUERY,
        variables: { patient: updateInput },
        headers: noAuth,
      });

      // Main Assertion
      expect(updatePatientNoAuthRes.ok, 'Update Patient Profile without Auth should fail').toBe(
        false
      );

      const { message, code, classification } = getGQLError(updatePatientNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-63 | Should NOT be able to Update Profile as Patient with Invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-63'],
    },
    async ({ api, invalidAuth }) => {
      const updatePatientNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_PATIENT_QUERY,
        variables: { patient: updatePatientInput() },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        updatePatientNoAuthRes.ok,
        'Update Patient Profile with Invalid Auth should fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(updatePatientNoAuthRes.ok).toBe(false);
      expect(updatePatientNoAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updatePatientNoAuthRes.httpStatus);
    }
  );
});
