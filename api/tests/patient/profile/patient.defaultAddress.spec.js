import { test, expect } from '../../../globalConfig.api.js';
import {
  GET_ADDRESS_QUERY,
  SET_DEFAULT_ADDRESS_QUERY,
  GET_DEFAULT_ADDRESS_QUERY,
} from './patient.profileQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  loginAndGetTokens,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';

async function getFirstAddressId(api, accessToken) {
  const getAddressRes = await safeGraphQL(api, {
    query: GET_ADDRESS_QUERY,
    variables: { patientId: process.env.PATIENT_USER_USERNAME_ID },
    headers: bearer(accessToken),
  });
  expect(getAddressRes.ok, getAddressRes.error || 'Get Address request failed').toBe(true);

  const addressesNode = getAddressRes.body?.data?.patient?.addresses;
  expect(Array.isArray(addressesNode), 'Missing addresses array').toBe(true);
  expect(addressesNode.length, 'No addresses found for patient').toBeGreaterThan(0);

  return addressesNode[0].id;
}

test.describe('GraphQL: Patient Default Address', () => {
  test(
    'PHARMA-288 | Should be able to set default address as patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-288'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const addressId = await getFirstAddressId(api, accessToken);
      const setDefaultAddressRes = await safeGraphQL(api, {
        query: SET_DEFAULT_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID, addressId },
        headers: bearer(accessToken),
      });
      expect(setDefaultAddressRes.ok, setDefaultAddressRes.error || 'Set default address failed').toBe(
        true
      );

      const node = setDefaultAddressRes.body?.data?.patient?.address?.setDefault;
      expect(node, 'Missing patient.address.setDefault').not.toBeNull();
    }
  );

  test(
    'PHARMA-289 | Should NOT be able to set default address with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-289'],
    },
    async ({ api, noAuth }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const addressId = await getFirstAddressId(api, accessToken);
      const setDefaultAddressNoAuthRes = await safeGraphQL(api, {
        query: SET_DEFAULT_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID, addressId },
        headers: noAuth,
      });
      expect(setDefaultAddressNoAuthRes.ok).toBe(false);

      if (!setDefaultAddressNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(setDefaultAddressNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(setDefaultAddressNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-290 | Should NOT be able to set default address with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-290'],
    },
    async ({ api, invalidAuth }) => {
      const setDefaultAddressInvalidAuthRes = await safeGraphQL(api, {
        query: SET_DEFAULT_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID, addressId: 1 },
        headers: invalidAuth,
      });
      expect(setDefaultAddressInvalidAuthRes.ok).toBe(false);

      if (!setDefaultAddressInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(setDefaultAddressInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(setDefaultAddressInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-291 | Should be able to get default address as patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-291'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getDefaultAddressRes = await safeGraphQL(api, {
        query: GET_DEFAULT_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID },
        headers: bearer(accessToken),
      });
      expect(getDefaultAddressRes.ok, getDefaultAddressRes.error || 'Get default address failed').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-292 | Should NOT be able to get default address with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-292'],
    },
    async ({ api, noAuth }) => {
      const getDefaultAddressNoAuthRes = await safeGraphQL(api, {
        query: GET_DEFAULT_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID },
        headers: noAuth,
      });
      expect(getDefaultAddressNoAuthRes.ok).toBe(false);

      if (!getDefaultAddressNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getDefaultAddressNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getDefaultAddressNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-293 | Should NOT be able to get default address with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-293'],
    },
    async ({ api, invalidAuth }) => {
      const getDefaultAddressInvalidAuthRes = await safeGraphQL(api, {
        query: GET_DEFAULT_ADDRESS_QUERY,
        variables: { patientId: process.env.PATIENT_USER_USERNAME_ID },
        headers: invalidAuth,
      });
      expect(getDefaultAddressInvalidAuthRes.ok).toBe(false);

      if (!getDefaultAddressInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getDefaultAddressInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getDefaultAddressInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );
});
