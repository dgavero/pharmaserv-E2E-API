import { loginAsRiderAndGetTokens } from '../../../helpers/auth.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';

function builderName() {
  const firstName = `builderName${randomAlphanumeric(4)}`;
  return firstName;
}

test.describe('GraphQL: Rider Authentication', () => {
  test(
    'PHARMA-116 | Should be able to login as Rider',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-116', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);
    }
  );
});
