import { randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { safeGraphQL, getGQLError } from '../../../helpers/graphqlUtils.js';
import {
  REQUEST_SIGNUP_OTP_QUERY,
  VERIFY_SIGNUP_OTP_QUERY,
} from '../../patient/onboarding/patient.onboardingQueries.js';
import { waitForLatestOtpFromGrafana } from './otpGrafana.helper.js';

const DUPLICATE_REGISTERED_HINT = /has already registered/i;
const PHONE_ATTEMPT_LIMIT = 10;

function buildRandomPhoneCandidates(limit = PHONE_ATTEMPT_LIMIT) {
  const phoneNumbers = new Set();
  while (phoneNumbers.size < limit) {
    phoneNumbers.add(`+639${randomNum(9)}`);
  }
  return [...phoneNumbers];
}

async function requestSignupOTPWithFallback({ api, noAuth }) {
  const phoneCandidates = buildRandomPhoneCandidates(PHONE_ATTEMPT_LIMIT);
  let latestRequestRes = null;

  for (const phoneNumber of phoneCandidates) {
    latestRequestRes = await safeGraphQL(api, {
      query: REQUEST_SIGNUP_OTP_QUERY,
      variables: { phoneNumber },
      headers: noAuth,
    });

    if (latestRequestRes.ok) {
      const requestNode = latestRequestRes.body?.data?.patient?.requestSignupOTP;
      expect(requestNode, 'Missing data.patient.requestSignupOTP').toBeTruthy();
      expect.soft(requestNode.id, 'requestSignupOTP.id should be present').toBeTruthy();
      expect.soft(requestNode.phoneNumber).toBe(phoneNumber);

      return {
        patientId: requestNode.id,
        phoneNumber: requestNode.phoneNumber,
      };
    }

    const { code, message } = getGQLError(latestRequestRes);
    const errorText = `${message || ''} ${latestRequestRes.errorMessage || ''}`.trim();
    const isDuplicateAlreadyRegistered = code === '409' && DUPLICATE_REGISTERED_HINT.test(errorText);

    if (!isDuplicateAlreadyRegistered) {
      break;
    }
  }

  expect(latestRequestRes?.ok, latestRequestRes?.error || 'requestSignupOTP failed after fallback attempts').toBe(true);

  throw new Error('requestSignupOTP failed after fallback attempts');
}

test.describe('GraphQL: Patient SMS Verification Workflow', () => {
  test(
    'PHARMA-428 | Patient Registration - Should receive SMS verification',
    {
      tag: ['@sms-verification'],
    },
    async ({ api, noAuth }) => {
      const requestSignup = await requestSignupOTPWithFallback({ api, noAuth });
      const otpCode = await waitForLatestOtpFromGrafana({
        api,
        phoneNumber: requestSignup.phoneNumber,
      });

      expect(otpCode, 'OTP should be extracted from Grafana logs').toBeTruthy();
      expect.soft(otpCode).toMatch(/^\d{6}$/);

      const incorrectOtp = `${otpCode}${randomNum(4)}`;
      const verifyIncorrectOTPRes = await safeGraphQL(api, {
        query: VERIFY_SIGNUP_OTP_QUERY,
        variables: {
          otp: {
            phoneNumber: requestSignup.phoneNumber,
            otp: incorrectOtp,
          },
        },
        headers: noAuth,
      });

      expect(verifyIncorrectOTPRes.ok, 'verifySignupOTP should fail when incorrect OTP is used').toBe(false);

      const { message } = getGQLError(verifyIncorrectOTPRes);
      expect(message, 'Expected GraphQL error message for incorrect OTP').toBeTruthy();
      expect.soft(message.toLowerCase()).toBe('otp does not match');

      const verifySignupOTPRes = await safeGraphQL(api, {
        query: VERIFY_SIGNUP_OTP_QUERY,
        variables: {
          otp: {
            phoneNumber: requestSignup.phoneNumber,
            otp: otpCode,
          },
        },
        headers: noAuth,
      });

      expect(verifySignupOTPRes.ok, verifySignupOTPRes.error || 'verifySignupOTP should succeed').toBe(true);

      const verifyNode = verifySignupOTPRes.body?.data?.patient?.verifySignupOTP;
      expect(verifyNode, 'Missing data.patient.verifySignupOTP').toBeTruthy();
      expect.soft(verifyNode.username).toBeNull();
      expect.soft(verifyNode.id).toBe(requestSignup.patientId);
      expect.soft(verifyNode.phoneNumber).toBe(requestSignup.phoneNumber);
    }
  );
});
