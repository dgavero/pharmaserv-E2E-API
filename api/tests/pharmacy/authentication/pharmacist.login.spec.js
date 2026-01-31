import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
  pharmacistLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Pharmacist Login', () => {
  test(
    'PHARMA-141 | Should be able to Login as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-141'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);
    }
  );

  test(
    'PHARMA-142 | Should be able to Login as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-142'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
      });
      expect(loginRes.ok, loginRes.error || 'PSE Pharmacist login failed').toBe(true);
    }
  );
});
