import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';

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
});
