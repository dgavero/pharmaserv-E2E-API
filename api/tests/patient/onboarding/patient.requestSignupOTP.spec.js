import { randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { REQ_OTP_QUERY } from '../authentication/patient.authenticationQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
} from '../../../helpers/testUtilsAPI.js';

function buildPhoneNumberInput() {
  const phoneNumber = `+639${randomNum(9)}`;
  return phoneNumber;
}

test.describe('GraphQL: Patient Request Signup OTP', () => {
  test(
    'PHARMA-86 | Should be able to request signup OTP and return ID',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-86'],
    },
    async ({ api, noAuth }) => {
      const phoneNumber = buildPhoneNumberInput();
      const requestSignupOTPRes = await safeGraphQL(api, {
        query: REQ_OTP_QUERY,
        variables: { phoneNumber: phoneNumber },
        headers: noAuth,
      });

      // Verify id is generated and phone number is correct
      expect(requestSignupOTPRes.ok, 'Request signup OTP failed').toBe(true);

      // Verify id and phone number are string
      const node = requestSignupOTPRes.body.data.patient.requestSignupOTP;
      expect.soft(typeof node.id).toBe('string');
      expect.soft(typeof node.phoneNumber).toBe('string');
    }
  );

  test(
    'PHARMA-87 | Should NOT be able to request signup OTP and return ID with invalid phone number',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-87'],
    },
    async ({ api, noAuth }) => {
      const phoneNumber = '639123'; // invalid phone number
      const requestSignupOTPResNoAuth = await safeGraphQL(api, {
        query: REQ_OTP_QUERY,
        variables: { phoneNumber: phoneNumber },
        headers: noAuth,
      });

      expect(
        requestSignupOTPResNoAuth.ok,
        'Request signup OTP with invalid phone number should fail'
      ).toBe(false);

      const { message, code, classification } = getGQLError(requestSignupOTPResNoAuth);

      expect.soft(message).toMatch(/should be in the format of/);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
