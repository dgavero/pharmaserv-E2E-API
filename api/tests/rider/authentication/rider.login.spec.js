import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { riderLoginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

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
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);
    }
  );
});
