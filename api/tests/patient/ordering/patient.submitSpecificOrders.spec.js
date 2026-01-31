import { test, expect } from '../../../globalConfig.api.js';
import { declineOrderAsPharmacist } from '../../../helpers/orderHelpers.js';
import { SUBMIT_ORDER_QUERY } from './patient.orderingQueries.js';
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

function orderDetailsInput() {
  return {
    deliveryType: 'DELIVER_X',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: process.env.PHARMACIST_BRANCHID_REG01,
    prescriptionItems: [
      {
        medicineId: 1,
        quantity: 2,
        source: 'SEARCH',
        specialInstructions: null,
      },
      {
        description: 'Brand X',
        quantity: 1,
        specialInstructions: null,
        source: 'SEARCH',
      },
    ],
    addressName: 'Home',
    address: 'Unit 243 Baranca Bldg, Mandaluyong Housing',
    lat: 14.582019317323562,
    lng: 121.01251092551259,
  };
}

test.describe('GraphQL: Submit Specific Orders', () => {
  test(
    'PHARMA-183 | Should be able to Submit Order with Requested Medicine',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-183'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderDetailsWithRequestedMedicine = orderDetailsInput();
      const submitOrderRes = await safeGraphQL(api, {
        query: SUBMIT_ORDER_QUERY,
        variables: { order: orderDetailsWithRequestedMedicine },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(submitOrderRes.ok).toBe(true);

      // Cleanup - decline order
      const node = submitOrderRes.body.data.patient.order.book;
      expect(node).toBeTruthy();

      const { id: orderId } = node;
      expect(orderId).toBeTruthy();
      console.log('Order id to decline: ' + orderId);
      await declineOrderAsPharmacist(api, orderId);
    }
  );

  test(
    'PHARMA-184 |  Should NOT be able to submit order with NON-EXISTENT MedicineId',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-184'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      //Override medicine id to match test
      const orderDetailsWithNonExistentMedicineId = orderDetailsInput();
      orderDetailsWithNonExistentMedicineId.prescriptionItems[0].medicineId = 9999;

      const submitOrderRes = await safeGraphQL(api, {
        query: SUBMIT_ORDER_QUERY,
        variables: { order: orderDetailsWithNonExistentMedicineId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(submitOrderRes.ok).toBe(false);

      const { message, classification } = getGQLError(submitOrderRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-185 | Should NOT be able to Submit Order with ZERO Quantity',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-185'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      //Override quantity to match test
      const orderDetailsWithZeroQuantity = orderDetailsInput();
      orderDetailsWithZeroQuantity.prescriptionItems[0].quantity = 0;

      const submitOrderRes = await safeGraphQL(api, {
        query: SUBMIT_ORDER_QUERY,
        variables: { order: orderDetailsWithZeroQuantity },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(submitOrderRes.ok).toBe(false);

      const { message, classification } = getGQLError(submitOrderRes);
      expect(message).toMatch(/must be 1 or greater/i);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
