import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { GET_ADDRESS_QUERY, UPDATE_ADDRESS_QUERY } from './patient.profileQueries.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { loginAndGetTokens } from '../../../helpers/auth.js';

function updateAddressInput() {
  const addressName = `addressName${randomAlphanumeric(4)}`;
  const address = `123 Test St, Test City, TC ${randomNum(3)}`;
  const city = `Test City`;
  const province = `Test Province`;
  const label = `Work`;
  const landmark = `Near here`;
  const deliveryInstructions = `Delivery in front of car`;
  const lat = 14.5995;
  const lng = 120.9842;
  return {
    addressName,
    address,
    city,
    province,
    label,
    landmark,
    deliveryInstructions,
    lat,
    lng,
  };
}

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

test.describe('GraphQL: Patient Update Address', () => {
  test(
    'PHARMA-178 | Should be able to update Address as a Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-178'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      // Update Address
      const updateAddress = updateAddressInput();
      const patientAddressId = await getFirstAddressId(api, accessToken);

      const updateAddressRes = await safeGraphQL(api, {
        query: UPDATE_ADDRESS_QUERY,
        variables: {
          addressId: patientAddressId,
          address: updateAddress,
        },
        headers: bearer(accessToken),
      });

      expect(updateAddressRes.ok, updateAddressRes.error || 'Update Address request failed').toBe(true);

      const node = updateAddressRes.body?.data?.patient?.address?.update;
      expect(node, 'Missing patient.address.update').toBeTruthy();
      expect.soft(node.id).toBe(String(patientAddressId));
      expect.soft(node.addressName).toBe(updateAddress.addressName);
      expect.soft(node.address).toBe(updateAddress.address);
      expect.soft(node.lat).toBe(updateAddress.lat);
      expect.soft(node.lng).toBe(updateAddress.lng);
    }
  );
});
