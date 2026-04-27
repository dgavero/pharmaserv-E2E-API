import { test, expect } from '../../../globalConfig.api.js';
import { RESET_PASSWORD_QUERY } from './pharmacist.authenticationQueries.js';
import { safeGraphQL } from '../../../helpers/graphqlUtils.js';

function getRegularPharmacistPhoneNumber() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  const phoneNumbersByEnv = {
    DEV: '+639178280093',
    QA: '+639178887213',
    PROD: '+639000000001',
  };

  const phoneNumber = phoneNumbersByEnv[testEnv];
  if (!phoneNumber) {
    throw new Error(`Unsupported TEST_ENV="${testEnv}" for pharmacist password reset phone number`);
  }

  return phoneNumber;
}

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
          phoneNumber: getRegularPharmacistPhoneNumber(),
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

  test(
    'PHARMA-531 | Request password reset should satisfy response contract shape',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-531'],
    },
    async ({ api, noAuth }) => {
      const requestResetPasswordRes = await safeGraphQL(api, {
        query: RESET_PASSWORD_QUERY,
        variables: {
          phoneNumber: getRegularPharmacistPhoneNumber(),
        },
        headers: noAuth,
      });

      expect(requestResetPasswordRes.httpStatus).toBe(200);
      expect(requestResetPasswordRes.httpOk).toBe(true);
      expect(requestResetPasswordRes.ok, requestResetPasswordRes.error || 'Request password reset failed').toBe(true);

      const node = requestResetPasswordRes.body?.data?.pharmacist?.requestPasswordReset;
      expect(typeof node, 'Expected data.pharmacist.requestPasswordReset to be string').toBe('string');
      expect.soft(node?.length > 0).toBe(true);
      expect.soft(node?.toLowerCase()).toContain('password reset');
      expect.soft(node?.toLowerCase()).toContain('granted');
    }
  );

  test(
    'PHARMA-584 | Should NOT request password reset when required phoneNumber variable is missing',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-584'],
    },
    async ({ api, noAuth }) => {
      const requestResetPasswordMissingVariableRes = await safeGraphQL(api, {
        query: RESET_PASSWORD_QUERY,
        variables: {},
        headers: noAuth,
      });

      expect(requestResetPasswordMissingVariableRes.ok, 'Expected GraphQL variable validation failure').toBe(false);
      if (requestResetPasswordMissingVariableRes.httpOk) {
        const errorMessage = String(
          requestResetPasswordMissingVariableRes.body?.errors?.[0]?.message ||
            requestResetPasswordMissingVariableRes.error ||
            ''
        );
        expect(errorMessage, 'Expected GraphQL validation message for missing phoneNumber').toBeTruthy();
      } else {
        expect.soft(requestResetPasswordMissingVariableRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );
});
