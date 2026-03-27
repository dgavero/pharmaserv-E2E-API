import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { PHARMACIST_LOGIN_QUERY } from './pharmacist.authenticationQueries.js';

test.describe('GraphQL: Pharmacist Login', () => {
  test(
    'PHARMA-141 | Should be able to Login as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-141', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);
    }
  );

  test(
    'PHARMA-142 | Should be able to Login as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-142'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('pse01'));
      expect(loginRes.ok, loginRes.error || 'PSE Pharmacist login failed').toBe(true);
    }
  );

  test(
    'PHARMA-413 | Should be able to Login as Pharmacy Admin',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-413'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('admin'));
      expect(loginRes.ok, loginRes.error || 'Pharmacy Admin login failed').toBe(true);
    }
  );

  test(
    'PHARMA-414 | Should be able to Login as Pharmacy Admin without auth headers',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-414'],
    },
    async ({ api, noAuth }) => {
      const loginRes = await safeGraphQL(api, {
        query: PHARMACIST_LOGIN_QUERY,
        variables: getPharmacistCredentials('admin'),
        headers: noAuth,
      });

      expect(loginRes.ok, loginRes.error || 'Pharmacy Admin login without auth headers failed').toBe(true);

      const node = loginRes.body?.data?.pharmacist?.auth?.login;
      expect(node, 'Missing data.pharmacist.auth.login').toBeTruthy();
      expect.soft(typeof node.accessToken).toBe('string');
      expect.soft(typeof node.refreshToken).toBe('string');
    }
  );

  test(
    'PHARMA-415 | Should NOT be able to Login as Pharmacy Admin with invalid auth headers',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-415'],
    },
    async ({ api, invalidAuth }) => {
      const loginRes = await safeGraphQL(api, {
        query: PHARMACIST_LOGIN_QUERY,
        variables: getPharmacistCredentials('admin'),
        headers: invalidAuth,
      });

      expect(loginRes.ok, 'Pharmacy Admin login with invalid auth headers should fail').toBe(false);
      expect(loginRes.httpOk).toBe(false);
      expect(loginRes.httpStatus).toBe(401);
    }
  );
});
