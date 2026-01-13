import { test, expect } from '../../../globalConfig.api.js';
import { RESET_PASSWORD_QUERY } from './pharmacist.authenticationQueries.js';
import {
  safeGraphQL,
  bearer,
  loginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Password Reset', () => {
  test(
    'PHARMA-194 | Should be able to Request Password Reset',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-194'],
    },
    async ({ api, noAuth }) => {
      const requestResetPasswordRes = await safeGraphQL(api, {
        query: RESET_PASSWORD_QUERY,
        variables: {
          phoneNumber: process.env.PHARMACIST_PHONENUMBER,
        },
        headers: noAuth,
      });

      expect(requestResetPasswordRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-195 | Should NOT be able to Request Password Reset for unused number',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-195'],
    },
    async ({ api, noAuth }) => {
      const requestResetPasswordRes = await safeGraphQL(api, {
        query: RESET_PASSWORD_QUERY,
        variables: {
          phoneNumber: `+639992229999`,
        },
        headers: noAuth,
      });

      expect(requestResetPasswordRes.ok).toBe(false);
    }
  );
});
