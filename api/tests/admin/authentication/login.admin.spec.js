import { test, expect } from '../../../globalConfig.api.js';
import { loginAsAdminAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, getGQLError } from '../../../helpers/graphqlUtils.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';

// Test-level builder (ok to add fallbacks here if you want local dev defaults)
function buildAdminCreds() {
  return getAdminCredentials('default');
}

const ADMIN_LOGIN_MUTATION = /* GraphQL */ `
  mutation ($username: String!, $password: String!) {
    administrator {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

test.describe('GraphQL: Admin Login', () => {
  test(
    'PHARMA-30 | Admin Login And Return Tokens',
    {
      tag: ['@api', '@admin', '@positive', '@login', '@pharma-30', '@smoke'],
    },
    async ({ api }) => {
      const creds = buildAdminCreds();
      const { accessToken, refreshToken, raw } = await loginAsAdminAndGetTokens(api, creds);

      expect(raw.ok, raw.error || `Admin login failed (HTTP ${raw.httpStatus})`).toBe(true);
      expect(typeof accessToken).toBe('string');
      expect(accessToken.length).toBeGreaterThan(10);
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(10);
    }
  );

  test(
    'PHARMA-449 | Admin login response should match token contract shape',
    {
      tag: ['@api', '@admin', '@positive', '@login', '@pharma-449'],
    },
    async ({ api }) => {
      const creds = buildAdminCreds();
      const adminLoginRes = await safeGraphQL(api, {
        query: ADMIN_LOGIN_MUTATION,
        variables: creds,
      });

      expect(adminLoginRes.httpStatus).toBe(200);
      expect(adminLoginRes.httpOk).toBe(true);
      expect(adminLoginRes.ok, adminLoginRes.error || `Admin login failed (HTTP ${adminLoginRes.httpStatus})`).toBe(
        true
      );

      const loginNode = adminLoginRes.body?.data?.administrator?.auth?.login;
      expect(loginNode, 'Missing data.administrator.auth.login').toBeTruthy();

      expect.soft(typeof loginNode.accessToken).toBe('string');
      expect.soft(typeof loginNode.refreshToken).toBe('string');
      expect.soft(loginNode.accessToken.length).toBeGreaterThan(10);
      expect.soft(loginNode.refreshToken.length).toBeGreaterThan(10);
      expect.soft(Object.keys(loginNode).sort()).toEqual(['accessToken', 'refreshToken']);
    }
  );

  test(
    'PHARMA-450 | Admin login should fail with invalid password',
    {
      tag: ['@api', '@admin', '@negative', '@login', '@pharma-450'],
    },
    async ({ api }) => {
      const creds = buildAdminCreds();
      const invalidPasswordRes = await safeGraphQL(api, {
        query: ADMIN_LOGIN_MUTATION,
        variables: {
          username: creds.username,
          password: `${creds.password}-invalid`,
        },
      });

      expect(invalidPasswordRes.ok).toBe(false);
      if (invalidPasswordRes.httpOk) {
        const { message, code, classification } = getGQLError(invalidPasswordRes);
        expect(message, 'Expected GraphQL auth failure message').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL auth error code/classification').toBeTruthy();
      } else {
        expect.soft(invalidPasswordRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );

  test(
    'PHARMA-451 | Admin login should fail when credentials are empty',
    {
      tag: ['@api', '@admin', '@negative', '@login', '@pharma-451'],
    },
    async ({ api }) => {
      const emptyCredentialsRes = await safeGraphQL(api, {
        query: ADMIN_LOGIN_MUTATION,
        variables: {
          username: '',
          password: '',
        },
      });

      expect(emptyCredentialsRes.ok).toBe(false);
      if (emptyCredentialsRes.httpOk) {
        const { message, code, classification } = getGQLError(emptyCredentialsRes);
        expect(message, 'Expected GraphQL validation/auth failure message').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL error code/classification').toBeTruthy();
      } else {
        expect.soft(emptyCredentialsRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );
});
