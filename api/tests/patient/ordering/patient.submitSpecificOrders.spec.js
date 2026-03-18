import { loginAsPatientAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { SUBMIT_ORDER_QUERY } from './patient.orderingQueries.js';
import { buildPatientSpecificOrderInput } from './patient.testData.js';
import { loginPharmacist, declineOrderAsPharmacist } from '../../e2e/shared/steps/pharmacist.steps.js';

async function declineSubmittedOrder(api, orderId) {
  const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'reg01' });
  await declineOrderAsPharmacist(api, {
    pharmacistAccessToken,
    orderId,
    reason: 'Order is declined via API automated test (Specific Order)',
  });
}

test.describe('GraphQL: Submit Specific Orders', () => {
  test(
    'PHARMA-183 | Should be able to Submit Order with Requested Medicine',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-183'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderDetailsWithRequestedMedicine = buildPatientSpecificOrderInput();
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
      await declineSubmittedOrder(api, orderId);
    }
  );

  test(
    'PHARMA-184 |  Should NOT be able to submit order with NON-EXISTENT MedicineId',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-184'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      //Override medicine id to match test
      const orderDetailsWithNonExistentMedicineId = buildPatientSpecificOrderInput();
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
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      //Override quantity to match test
      const orderDetailsWithZeroQuantity = buildPatientSpecificOrderInput();
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
