import {
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { FIND_PATIENTS_QUERY } from './admin.patientViewQueries.js';

const EXPECTED_PATIENT = {
  firstName: 'Dave',
  lastName: 'QA',
};

test.describe('GraphQL: Admin Find Patients', () => {
  test(
    'PHARMA-392 | Should find patients with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-392'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const findPatientsRes = await safeGraphQL(api, {
        query: FIND_PATIENTS_QUERY,
        variables: { query: EXPECTED_PATIENT.firstName },
        headers: bearer(accessToken),
      });

      expect(findPatientsRes.ok, findPatientsRes.error || 'Find patients endpoint failed').toBe(true);

      const node = findPatientsRes.body?.data?.administrator?.patient?.searchedPatients;
      expect(Array.isArray(node), 'Find patients should return an array').toBe(true);
      expect(node.length, 'Find patients should return at least one patient').toBeGreaterThan(0);
      expect(
        node.some(
          (patientNode) =>
            patientNode?.firstName === EXPECTED_PATIENT.firstName &&
            patientNode?.lastName === EXPECTED_PATIENT.lastName
        ),
        'Expected patient was not found in searched patients'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-393 | Should NOT find patients with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-393'],
    },
    async ({ api, noAuth }) => {
      const findPatientsNoAuthRes = await safeGraphQL(api, {
        query: FIND_PATIENTS_QUERY,
        variables: { query: EXPECTED_PATIENT.firstName },
        headers: noAuth,
      });

      expect(findPatientsNoAuthRes.ok, findPatientsNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!findPatientsNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(findPatientsNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(findPatientsNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-394 | Should NOT find patients with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-394'],
    },
    async ({ api, invalidAuth }) => {
      const findPatientsInvalidAuthRes = await safeGraphQL(api, {
        query: FIND_PATIENTS_QUERY,
        variables: { query: EXPECTED_PATIENT.firstName },
        headers: invalidAuth,
      });

      expect(findPatientsInvalidAuthRes.ok).toBe(false);
      expect(findPatientsInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(findPatientsInvalidAuthRes.httpStatus);
    }
  );
});
