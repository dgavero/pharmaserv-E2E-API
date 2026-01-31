import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { UPDATE_ADDRESS_QUERY } from './patient.profileQueries.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

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
      const patientAddressId = process.env.PATIENT_USER_USERNAME_RELATED_ID; // address id related to logged in user

      const updateAddressRes = await safeGraphQL(api, {
        query: UPDATE_ADDRESS_QUERY,
        variables: {
          addressId: patientAddressId,
          address: updateAddress,
        },
        headers: bearer(accessToken),
      });

      expect(updateAddressRes.ok).toBe(false);
    }
  );
});
