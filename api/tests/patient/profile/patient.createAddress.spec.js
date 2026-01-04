import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { CREATE_ADDRESS_QUERY } from './patient.profileQueries.js';
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
  const patientId = process.env.USER_USERNAME_PATIENT_ID;
  const addressName = `addressName${randomAlphanumeric(4)}`;
  const address = `123 Test St, Test City, TC ${randomNum(3)}`;
  const city = `Test City`;
  const province = `Test Province`;
  const label = `Work`;
  const lat = 14.5995;
  const lng = 120.9842;
  return { patientId, addressName, address, city, province, label, lat, lng };
}

test.describe('GraphQL: Patient Create Address', () => {
  test(
    'PHARMA-89 | Should be able to create Address as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-89'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const newAddress = newAddressInput();
      console.log('New Address Input:', newAddress);
      const createAddressRes = await safeGraphQL(api, {
        query: CREATE_ADDRESS_QUERY,
        variables: { address: newAddress },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(createAddressRes.ok, createAddressRes.error || 'Create Address request failed').toBe(
        true
      );

      const node = createAddressRes.body.data.patient.address.create;
      expect.soft(node.addressName).toBe(newAddress.addressName);
      expect.soft(node.address).toBe(newAddress.address);
      expect.soft(node.lat).toBe(newAddress.lat);
    }
  );

  test(
    'PHARMA-90 | Should NOT be able to create Address for another Patient',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-90'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const newAddress = newAddressInput();
      newAddress.patientId = 9; // Uses another patient ID
      console.log('New Address Input:', newAddress);
      const createAddressRes = await safeGraphQL(api, {
        query: CREATE_ADDRESS_QUERY,
        variables: { address: newAddress },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        createAddressRes.ok,
        createAddressRes.error || 'Create Address for another Patient is expected to fail'
      ).toBe(false);

      const { message, code, classification } = getGQLError(createAddressRes);
      expect.soft(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-91 | Should NOT be able to create address with no Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-91'],
    },
    async ({ api, noAuth }) => {
      const newAddressResNoAuth = await safeGraphQL(api, {
        query: CREATE_ADDRESS_QUERY,
        variables: { address: newAddressInput() },
        headers: noAuth,
      });

      expect(
        newAddressResNoAuth.ok,
        newAddressResNoAuth.error || 'Create Address with no auth request should fail'
      ).toBe(false);

      const { message, code, classification } = getGQLError(newAddressResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-92 | Should NOT be able to create address with invalid Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-92'],
    },
    async ({ api, invalidAuth }) => {
      const createAddressResInvalidAuth = await safeGraphQL(api, {
        query: CREATE_ADDRESS_QUERY,
        variables: { address: newAddressInput() },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        createAddressResInvalidAuth.ok,
        createAddressResInvalidAuth.error || 'Create Address with invalid auth request should fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(createAddressResInvalidAuth.ok).toBe(false);
      expect(createAddressResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createAddressResInvalidAuth.httpStatus);
    }
  );
});
