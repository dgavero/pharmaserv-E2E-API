import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
  loginAndGetTokens,
  NOAUTH_MESSAGES,
} from '../../../helpers/testUtilsAPI.js';

const UPDATE_DEPENDENT_QUERY = /* GraphQL */ `
  mutation ($dependentId: ID!, $patient: PatientRequest!) {
    patient {
      updateDependent(dependentId: $dependentId, patient: $patient) {
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

const notDependentId = 999999; // assuming this ID does not belong to any dependent of the patient
const dependentId = process.env.USER_USERNAME_RELATED_ID; // hardcoded and linked to used patient
function updateDependentInput() {
  const height = randomNum(3);
  const weight = randomNum(3);
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
  return { height, weight, bloodType };
}

test.describe('GraphQL: Patient Update Dependent', () => {
  test(
    'PHARMA-67 | Should be able to Update Dependent in Patient Profile',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-67'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const updateDependentData = updateDependentInput();
      const updateDependentRes = await safeGraphQL(api, {
        query: UPDATE_DEPENDENT_QUERY,
        variables: { dependentId, patient: updateDependentData },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        updateDependentRes.ok,
        updateDependentRes.error || 'Update Dependent request failed'
      ).toBe(true);

      const updateDependentNode = updateDependentRes.body.data.patient.updateDependent;
      expect.soft(updateDependentNode.height).toBe(updateDependentData.height);
      expect.soft(updateDependentNode.weight).toBe(updateDependentData.weight);
      expect.soft(updateDependentNode.bloodType).toBe(updateDependentData.bloodType);
    }
  );

  test(
    'PHARMA-68 | Should NOT be able to Update Dependent in Patient Profile with missing Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-68'],
    },
    async ({ api, noAuth }) => {
      const updateDependentData = updateDependentInput();
      const updateDependentNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_DEPENDENT_QUERY,
        variables: { dependentId, patient: updateDependentData },
        headers: noAuth,
      });

      // Main Assertion
      expect(
        updateDependentNoAuthRes.ok,
        updateDependentNoAuthRes.error || 'Update Dependent no Auth request should have failed'
      ).toBe(false);

      const { message, classification, code } = getGQLError(updateDependentNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-69 | Should NOT be able to Update Dependent in Patient Profile with incorrect Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-69'],
    },
    async ({ api, invalidAuth }) => {
      const updateDependentData = updateDependentInput();
      const updateDependentInvalidAuthRes = await safeGraphQL(api, {
        query: UPDATE_DEPENDENT_QUERY,
        variables: { dependentId, patient: updateDependentData },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        updateDependentInvalidAuthRes.ok,
        updateDependentInvalidAuthRes.error ||
          'Update Dependent with invalid Auth request should have failed'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(updateDependentInvalidAuthRes.ok).toBe(false);
      expect(updateDependentInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updateDependentInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-70 | Should NOT be able to Update Dependent that is not part of Patients Dependents',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-70'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const updateDependentData = updateDependentInput();
      const updateDependentNotFoundRes = await safeGraphQL(api, {
        query: UPDATE_DEPENDENT_QUERY,
        variables: { dependentId: notDependentId, patient: updateDependentData },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        updateDependentNotFoundRes.ok,
        updateDependentNotFoundRes.error ||
          'Updating Dependent that is not part of the Patients Profile should have failed'
      ).toBe(false);

      const { message, code, classification } = getGQLError(updateDependentNotFoundRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
