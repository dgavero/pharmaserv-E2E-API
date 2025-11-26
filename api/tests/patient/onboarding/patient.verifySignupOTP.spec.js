import { randomAlphanumeric, randomNum } from '../../../helpers/globalTestUtils.js';
import { test, expect } from '../../globalConfig.api.js';
import { VERIFY_OTP_QUERY } from '../patient.queries.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../helpers/testUtilsAPI.js';

function builderName() {
  const firstName = `builderName${randomAlphanumeric(4)}`;
  return firstName;
}

test.describe('GraphQL: Patient Verify Sign Up OTP', () => {
  test(
    'PHARMA-88 | Should be able to verify sign up OTP',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-88'],
    },
    async ({ api, noAuth }) => {
      // Direct Access to Test phone number and OTP
      const verifySignupOTPRes = await safeGraphQL(api, {
        query: VERIFY_OTP_QUERY,
        variables: {
          otp: {
            phoneNumber: '+639171234567',
            code: '123456',
          },
        },
        headers: noAuth,
      });

      // Main Assertion
      expect(verifySignupOTPRes.ok, verifySignupOTPRes.error || 'Verify signup OTP failed').toBe(
        true
      );

      // WIP -> Waiting for dev to provide test number and OTP
    }
  );
});
