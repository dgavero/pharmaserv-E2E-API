// tests/api/login.spec.js

import { test, expect } from '../../globalConfig.api.js';
import { safeGraphQL, getGQLError } from '../../helpers/testUtilsAPI.js';

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
  return {
    username: process.env.LOGIN_USERNAME || 'daveg123.patient',
    password: process.env.LOGIN_PASSWORD || 'Test1234!',
  };
}

// Fixed invalid creds from your sample
function buildInvalidCreds() {
  return {
    username: 'daveg123.patientNOT',
    password: 'Test1234!',
  };
}

test.describe('GraphQL: Patient Login', () => {
  test('Should Login And Return Tokens @api @patient @positive', async ({ api }) => {
    const creds = buildValidCreds();

    const loginUser = await safeGraphQL(api, {
      query: LOGIN_MUTATION,
      variables: creds,
    });

    await test.step('GraphQL should succeed', async () => {
      expect(loginUser.ok, loginUser.error || 'GraphQL call failed').toBe(true);
    });

    await test.step('Validate tokens (strings)', async () => {
      const tokens = loginUser.body?.data?.patient?.auth?.login;
      expect(tokens, 'Missing data.patient.auth.login').toBeTruthy();

      expect.soft(typeof tokens.accessToken).toBe('string');
      expect.soft(typeof tokens.refreshToken).toBe('string');
    });
  });

  test('Should Reject Invalid Credentials @api @patient @negative', async ({ api }) => {
    const creds = buildInvalidCreds();

    const loginAttempt = await safeGraphQL(api, {
      query: LOGIN_MUTATION,
      variables: creds,
    });

    await test.step('Login should fail', async () => {
      expect(loginAttempt.ok, 'API accepted invalid credentials (expected rejection)').toBe(false);
    });

    await test.step('Assert error details', async () => {
      const { message, code, classification, path } = getGQLError(loginAttempt);

      // Fuzzy message: allow any invalid/unauthorized phrasing
      expect(message.toLowerCase()).toMatch(/(invalid|incorrect|unauthorized)/);

      // Soft checks for code/classification
      expect.soft(code).toBe('401');
      expect.soft(classification).toBe('UNAUTHORIZED');

      // Optional (soft): path usually "patient.auth.login"
      expect.soft(path).toBe('patient.auth.login');

      // Safety: no tokens should be present on failure
      const node = loginAttempt.body?.data?.patient?.auth?.login;
      expect.soft(node?.accessToken ?? null).toBeFalsy();
      expect.soft(node?.refreshToken ?? null).toBeFalsy();
    });
  });
});
