import { randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { REQUEST_SIGNUP_OTP_QUERY } from './patient.onboardingQueries.js';
import { safeGraphQL, getGQLError } from '../../../helpers/graphqlUtils.js';
import { NOAUTH_CLASSIFICATIONS, NOAUTH_CODES } from '../../../helpers/auth.js';

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
        query: REQUEST_SIGNUP_OTP_QUERY,
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
        query: REQUEST_SIGNUP_OTP_QUERY,
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

  test(
    'PHARMA-497 | Request signup OTP should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-497'],
    },
    async ({ api, noAuth }) => {
      const phoneNumber = buildPhoneNumberInput();
      const requestSignupOTPRes = await safeGraphQL(api, {
        query: REQUEST_SIGNUP_OTP_QUERY,
        variables: { phoneNumber },
        headers: noAuth,
      });

      expect(requestSignupOTPRes.httpStatus).toBe(200);
      expect(requestSignupOTPRes.httpOk).toBe(true);
      expect(requestSignupOTPRes.ok, requestSignupOTPRes.error || 'Request signup OTP failed').toBe(true);

      const node = requestSignupOTPRes.body?.data?.patient?.requestSignupOTP;
      expect(node, 'Missing data.patient.requestSignupOTP').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.phoneNumber).toBe('string');
      expect.soft(node?.id?.length > 0).toBe(true);
      expect.soft(node?.phoneNumber).toBe(phoneNumber);
    }
  );

  test(
    'PHARMA-579 | Should NOT request signup OTP when required phoneNumber variable is missing',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-579'],
    },
    async ({ api, noAuth }) => {
      const requestSignupOTPMissingVariableRes = await safeGraphQL(api, {
        query: REQUEST_SIGNUP_OTP_QUERY,
        variables: {},
        headers: noAuth,
      });

      expect(requestSignupOTPMissingVariableRes.ok, 'Expected GraphQL variable validation failure').toBe(false);
      if (requestSignupOTPMissingVariableRes.httpOk) {
        const { message, code, classification } = getGQLError(requestSignupOTPMissingVariableRes);
        expect(message, 'Expected GraphQL validation message for missing phoneNumber').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL error code/classification').toBeTruthy();
      } else {
        expect.soft(requestSignupOTPMissingVariableRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );
});
