import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { loginAndGetTokens } from '../../../helpers/testUtilsAPI';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

const ADD_DEPENDENT_QUERY = /* GraphQL */ `
  mutation ($patient: PatientRequest!) {
    patient {
      addDependent(patient: $patient) {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

function newDependentInput() {
  const firstName = `Dev`;
  const lastName = `TheG-${randomAlphanumeric(5)}`;
  const email = `devtheg+${randomAlphanumeric(5)}@example.com`;
  return { firstName, lastName, email };
}

test.describe('GraphQL: Patient Add Dependent', () => {
  test(
    'PHARMA-64 | Should be able to Add Dependent to Patient Profile',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-64'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.LOGIN_USERNAME,
        password: process.env.LOGIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const dependentInput = newDependentInput();
      const addDependentRes = await safeGraphQL(api, {
        query: ADD_DEPENDENT_QUERY,
        variables: { patient: dependentInput },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(addDependentRes.ok, addDependentRes.error || 'Add Dependent request failed').toBe(
        true
      );

      const addDependentNode = addDependentRes.body.data.patient.addDependent;
      expect.soft(addDependentNode.firstName).toBe(dependentInput.firstName);
      expect.soft(addDependentNode.lastName).toBe(dependentInput.lastName);
      expect.soft(addDependentNode.email).toBe(dependentInput.email);
      expect.soft(typeof addDependentNode.id).toBe('string');
    }
  );

  test(
    'PHARMA-65 | Should NOT be able to Add Dependent to Patient Profile with missing Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-65'],
    },
    async ({ api, noAuth }) => {
      const dependentInput = newDependentInput();
      const addDependentNoAuthRes = await safeGraphQL(api, {
        query: ADD_DEPENDENT_QUERY,
        variables: { patient: dependentInput },
        headers: noAuth,
      });

      // Main Assertion
      expect(addDependentNoAuthRes.ok, 'Expecting to fail Add Dependent with No Auth').toBe(false);

      const { message, code, classification } = getGQLError(addDependentNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-66 | Should NOT be able to Add Dependent to Patient Profile with incorrect Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-66'],
    },
    async ({ api, invalidAuth }) => {
      const addDependentInvalidAuthRes = await safeGraphQL(api, {
        query: ADD_DEPENDENT_QUERY,
        variables: { patient: newDependentInput() },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        addDependentInvalidAuthRes.ok,
        'Expecting to fail Add Dependent with Invalid Auth'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(addDependentInvalidAuthRes.ok).toBe(false);
      expect(addDependentInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(addDependentInvalidAuthRes.httpStatus);
    }
  );
});
