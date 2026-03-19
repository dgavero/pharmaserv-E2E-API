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
});
