import { test, expect } from '../../../globalConfig.api.js';
import { safeGraphQL, getGQLError } from '../../../helpers/graphqlUtils.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';

const LOGIN_MUTATION = `
  mutation ($username: String!, $password: String!) {
    patient {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

// Valid creds (env-backed with local fallbacks)
function buildValidCreds() {
  return getPatientCredentials('default');
}

// Fixed invalid creds from your sample
function buildInvalidCreds() {
  return {
    username: 'daveg123.patientNOT',
    password: 'Test1234!',
  };
}

test.describe('GraphQL: Patient Login', () => {
  test(
    'PHARMA-1 | Patient Should Login And Return Tokens',
    {
      tag: ['@api', '@patient', '@positive', '@login', '@pharma-1', '@smoke'],
    },
    async ({ api }) => {
      const creds = buildValidCreds();

      const loginRes = await safeGraphQL(api, {
        query: LOGIN_MUTATION,
        variables: creds,
      });

      await test.step('GraphQL should succeed', async () => {
        expect(loginRes.ok, loginRes.error || 'GraphQL call failed').toBe(true);
      });

      await test.step('Validate tokens (strings)', async () => {
        const tokens = loginRes.body?.data?.patient?.auth?.login;
        expect(tokens, 'Missing data.patient.auth.login').toBeTruthy();

        expect.soft(typeof tokens.accessToken).toBe('string');
        expect.soft(typeof tokens.refreshToken).toBe('string');
      });
    }
  );

  test(
    'PHARMA-2 | Patient Login Should Reject Invalid Credentials',
    {
      tag: ['@api', '@patient', '@positive', '@login', '@pharma-2'],
    },
    async ({ api }) => {
      const creds = buildInvalidCreds();

      const invalidLoginRes = await safeGraphQL(api, {
        query: LOGIN_MUTATION,
        variables: creds,
      });

      await test.step('Login should fail', async () => {
        expect(invalidLoginRes.ok, 'API accepted invalid credentials (expected rejection)').toBe(false);
      });

      await test.step('Assert error details', async () => {
        const { message, code, classification, path } = getGQLError(invalidLoginRes);

        // Fuzzy message: allow any invalid/unauthorized phrasing
        expect(message.toLowerCase()).toMatch(/(invalid|incorrect|unauthorized)/);

        // Soft checks for code/classification
        expect.soft(code).toBe('401');
        expect.soft(classification).toBe('UNAUTHORIZED');

        // Safety: no tokens should be present on failure
        const node = invalidLoginRes.body?.data?.patient?.auth?.login;
        expect.soft(node?.accessToken ?? null).toBeFalsy();
        expect.soft(node?.refreshToken ?? null).toBeFalsy();
      });
    }
  );
});
