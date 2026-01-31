import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { REMOVE_ADDRESS_QUERY, CREATE_ADDRESS_QUERY } from './patient.profileQueries.js';
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

function newAddressInput() {
  const patientId = process.env.PATIENT_USER_USERNAME_ID;
  const addressName = `addressName${randomAlphanumeric(4)}`;
  const address = `123 Test St, Test City, TC ${randomNum(3)}`;
  const city = `Test City`;
  const province = `Test Province`;
  const label = `Work`;
  const lat = 14.5995;
  const lng = 120.9842;
  return { patientId, addressName, address, city, province, label, lat, lng };
}

test.describe('GraphQL: Patient Remove Address', () => {
  test(
    'PHARMA-97 | Should be able to remove Address as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-97'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      // Create new address and store the addressId to be removed later
      const newAddress = newAddressInput();
      const createAddressRes = await safeGraphQL(api, {
        query: CREATE_ADDRESS_QUERY,
        variables: { address: newAddress },
        headers: bearer(accessToken),
      });
      expect(
        createAddressRes.ok,
        createAddressRes.error || 'Create Address request failed. Cannot proceed remove test.'
      ).toBe(true);

      // Get addressId and verify it is not NULL
      const addressIdInput = createAddressRes.body.data.patient.address.create.id;
      expect(addressIdInput).toBeTruthy();
      console.log('Address ID to be removed:', addressIdInput);

      // Remove the address using the addressId
      const removeAddressRes = await safeGraphQL(api, {
        query: REMOVE_ADDRESS_QUERY,
        variables: { addressId: addressIdInput },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(removeAddressRes.ok, removeAddressRes.error || 'Remove Address request failed').toBe(true);

      const node = removeAddressRes.body.data.patient.address.remove;
      expect.soft(node).toBeTruthy();
      expect.soft(node).toContain('removed successfully');
    }
  );

  test(
    'PHARMA-98 | Should NOT be able to remove address of another patient',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-98'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const removeAddressRes = await safeGraphQL(api, {
        query: REMOVE_ADDRESS_QUERY,
        variables: { addressId: 20 }, // addressId belongs to another patient
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        removeAddressRes.ok,
        removeAddressRes.error || 'Remove Address of another patient is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(removeAddressRes);
      expect.soft(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-99 | Should NOT be able to remove address with No Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-99'],
    },
    async ({ api, noAuth }) => {
      const removeAddressResNoAuth = await safeGraphQL(api, {
        query: REMOVE_ADDRESS_QUERY,
        variables: { addressId: 2 }, // any addressId
        headers: noAuth,
      });

      // Main Assertion
      expect(
        removeAddressResNoAuth.ok,
        removeAddressResNoAuth.error || 'Remove Address with No Auth is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(removeAddressResNoAuth);
      expect.soft(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-100 | Should NOT be able to remove address with invalid Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-100'],
    },
    async ({ api, invalidAuth }) => {
      const removeAddressResInvalidAuth = await safeGraphQL(api, {
        query: REMOVE_ADDRESS_QUERY,
        variables: { addressId: 2 }, // any addressId
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        removeAddressResInvalidAuth.ok,
        removeAddressResInvalidAuth.error || 'Remove Address with Invalid Auth is expected to fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(removeAddressResInvalidAuth.ok).toBe(false);
      expect(removeAddressResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(removeAddressResInvalidAuth.httpStatus);
    }
  );
});
