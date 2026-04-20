import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { safeGraphQL, getGQLError } from '../../../helpers/graphqlUtils.js';
import {
  REQUEST_SIGNUP_OTP_QUERY,
  VERIFY_SIGNUP_OTP_QUERY,
  REGISTER_PATIENT_MUTATION,
} from '../../patient/onboarding/patient.onboardingQueries.js';

const DUPLICATE_REGISTERED_HINT = /has already registered/i;
const PHONE_ATTEMPT_LIMIT = 5;

// Placeholder only. OTP retrieval/wiring is intentionally not implemented yet.
const SIGNUP_OTP_PLACEHOLDER = '000000';

function buildDeterministicPhoneCandidates() {
  const presetNumbers = ['+639998884444', '+639997775555', '+639996666666', '+639995557777', '+639994448888'];

  const startIndex = Number(randomNum(1)) % presetNumbers.length;
  return [...presetNumbers.slice(startIndex), ...presetNumbers.slice(0, startIndex)];
}

function buildRegisterPatientPayload(phoneNumber) {
  const lastNameSuffix = randomAlphanumeric(6);
  const emailSuffix = randomAlphanumeric(6);
  const passwordSuffix = randomAlphanumeric(6);

  return {
    firstName: 'SMS',
    lastName: `Check-${lastNameSuffix}`,
    email: `sms-check-${emailSuffix}@gmail.com`,
    phoneNumber,
    locationCode: 'PGH',
    secCode: 'PGH-001',
    username: phoneNumber,
    password: `Password-${passwordSuffix}`,
  };
}

async function requestSignupOTPWithFallback({ api, noAuth }) {
  const phoneCandidates = buildDeterministicPhoneCandidates().slice(0, PHONE_ATTEMPT_LIMIT);
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
    'PHARMA-428 | Should request OTP, verify OTP, then register patient (OTP wiring placeholder)',
    {
      tag: ['@api', '@patient', '@sms-verification', '@onboarding'],
    },
    async ({ api, noAuth }) => {
      const requestSignup = await requestSignupOTPWithFallback({ api, noAuth });

      const verifySignupOTPRes = await safeGraphQL(api, {
        query: VERIFY_SIGNUP_OTP_QUERY,
        variables: {
          otp: {
            phoneNumber: requestSignup.phoneNumber,
            code: SIGNUP_OTP_PLACEHOLDER,
          },
        },
        headers: noAuth,
      });

      expect(verifySignupOTPRes.ok, verifySignupOTPRes.error || 'Verify signup OTP failed').toBe(true);

      const verifyNode = verifySignupOTPRes.body?.data?.patient?.verifySignupOTP;
      expect(verifyNode, 'Missing data.patient.verifySignupOTP').toBeTruthy();
      expect.soft(verifyNode.id).toBe(requestSignup.patientId);
      expect.soft(verifyNode.phoneNumber).toBe(requestSignup.phoneNumber);

      const patient = buildRegisterPatientPayload(requestSignup.phoneNumber);
      const registerPatientRes = await safeGraphQL(api, {
        query: REGISTER_PATIENT_MUTATION,
        variables: {
          patientId: requestSignup.patientId,
          patient,
        },
        headers: noAuth,
      });

      expect(registerPatientRes.ok, registerPatientRes.error || 'Register patient failed').toBe(true);

      const registerNode = registerPatientRes.body?.data?.patient?.register;
      expect(registerNode, 'Missing data.patient.register').toBeTruthy();
      expect.soft(typeof registerNode.id).toBe('string');
      expect.soft(typeof registerNode.uuid).toBe('string');
      expect.soft(registerNode.firstName).toBe(patient.firstName);
      expect.soft(registerNode.lastName).toBe(patient.lastName);
      expect.soft(registerNode.username).toBe(patient.username);
    }
  );
});
