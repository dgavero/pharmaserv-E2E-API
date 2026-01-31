import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { GET_ADDRESS_QUERY } from './patient.profileQueries.js';
import {
  safeGraphQL,
  bearer,
  loginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Patient Get Address', () => {
  test(
    'PHARMA-93 | Should be able to get Address as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-93'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const patientId = process.env.PATIENT_USER_USERNAME_ID;
      const getAddressRes = await safeGraphQL(api, {
        query: GET_ADDRESS_QUERY,
        variables: { patientId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getAddressRes.ok, getAddressRes.error || 'Get Address request failed').toBe(true);

      const node = getAddressRes.body.data.patient.addresses;
      expect.soft(Array.isArray(node)).toBe(true);
      expect.soft(node.length).toBeGreaterThan(0);

      // Check first address if it has reasonable data
      const firstAddress = node[0];
      expect.soft(firstAddress).toBeTruthy();
      expect.soft(typeof firstAddress.id).toBe('string');
      expect.soft(typeof firstAddress.addressName).toBe('string');
      expect.soft(typeof firstAddress.address).toBe('string');
      expect.soft(typeof firstAddress.lat).toBe('number');
      expect.soft(typeof firstAddress.lng).toBe('number');
    }
  );

  test(
    'PHARMA-94 | Should NOT be able to get Address of another Patient',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-94'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const patientId = 9; // Another Patient ID not related to logged in patient
      const getAddressRes = await safeGraphQL(api, {
        query: GET_ADDRESS_QUERY,
        variables: { patientId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getAddressRes.ok, getAddressRes.error || 'Get Address request is expected to failed').toBe(false);
    }
  );

  test(
    'PHARMA-95 | Should NOT be able to get address with No Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-95'],
    },
    async ({ api, noAuth }) => {
      const getAddressResNoAuth = await safeGraphQL(api, {
        query: GET_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID },
        headers: noAuth,
      });

      // Main Assertion
      expect(getAddressResNoAuth.ok, getAddressResNoAuth.error || 'Get Address request is expected to fail').toBe(
        false
      );

      const { message, classification, code } = getGQLError(getAddressResNoAuth);
      expect.soft(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-96 | Should NOT be able to get address with invalid Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-96'],
    },
    async ({ api, invalidAuth }) => {
      const getAddressResInvalidAuth = await safeGraphQL(api, {
        query: GET_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        getAddressResInvalidAuth.ok,
        getAddressResInvalidAuth.error || 'Get Address request is expected to fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(getAddressResInvalidAuth.ok).toBe(false);
      expect(getAddressResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getAddressResInvalidAuth.httpStatus);
    }
  );
});
