import { test, expect } from '../../../globalConfig.api.js';
import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { GET_DEPENDENTS_QUERY } from './patient.profileQueries.js';

test.describe('GraphQL: Patient Get Dependent', () => {
  test(
    'PHARMA-71 | Should be able to Get Dependents',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-71'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getDependentRes = await safeGraphQL(api, {
        query: GET_DEPENDENTS_QUERY,
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

  test(
    'PHARMA-521 | Get dependents should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-521'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getDependentRes = await safeGraphQL(api, {
        query: GET_DEPENDENTS_QUERY,
        headers: bearer(accessToken),
      });

      expect(getDependentRes.httpStatus).toBe(200);
      expect(getDependentRes.httpOk).toBe(true);
      expect(getDependentRes.ok, getDependentRes.error || 'Get Dependents request failed').toBe(true);

      const node = getDependentRes.body?.data?.patient?.dependents;
      expect(Array.isArray(node), 'Expected patient.dependents to be an array').toBe(true);
      if (node.length > 0) {
        expect.soft(typeof node[0]?.id).toBe('string');
        expect.soft(typeof node[0]?.firstName).toBe('string');
        expect.soft(typeof node[0]?.lastName).toBe('string');
        expect.soft(typeof node[0]?.email).toBe('string');
      }
    }
  );
});
