import { test, expect } from '../../../globalConfig.api.js';
import { loginAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { adminLoginAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';

const GET_DEPENDENT_QUERY = /* GraphQL */ `
  query {
    patient {
      dependents {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

test.describe('GraphQL: Patient Get Dependent', () => {
  test(
    'PHARMA-71 | Should be able to Get Dependents',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-71'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getDependentRes = await safeGraphQL(api, {
        query: GET_DEPENDENT_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getDependentRes.ok, getDependentRes.error || 'Get Dependents request failed').toBe(true);

      const getDependentsNode = getDependentRes.body.data.patient.dependents;
      expect.soft(getDependentsNode).toBeTruthy();
      expect.soft(Array.isArray(getDependentsNode)).toBe(true);
      expect.soft(getDependentsNode.length).toBeGreaterThan(0);

      // Checks the first dependent in the list and verifys its fields
      const firstDependent = getDependentsNode[0];
      expect.soft(firstDependent).toBeTruthy();

      expect.soft(typeof firstDependent.id).toBe('string');
      expect.soft(typeof firstDependent.firstName).toBe('string');
      expect.soft(typeof firstDependent.lastName).toBe('string');
      expect.soft(typeof firstDependent.email).toBe('string');
    }
  );
});
