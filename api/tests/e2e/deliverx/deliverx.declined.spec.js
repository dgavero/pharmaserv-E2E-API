import { test, expect } from '../../../globalConfig.api.js';
import { safeGraphQL, bearer, loginAndGetTokens, pharmacistLoginAndGetTokens } from '../../../helpers/testUtilsAPI.js';
import { buildDeliverXDeclinedOrderInput } from './deliverx.testData.js';
import { SUBMIT_DELIVERX_ORDER_QUERY, DECLINE_ORDER_QUERY } from './deliverx.workflowQueries.js';

test.describe('GraphQL E2E Workflow: DeliverX Order Declined', () => {
  test(
    'PHARMA-333 | Patient submits DeliverX order then pharmacist declines the same order',
    {
      tag: ['@api', '@workflow', '@deliverx', '@patient', '@pharmacist', '@positive', '@pharma-333'],
    },
    async ({ api }) => {
      // Login as patient.
      const { accessToken: patientAccessToken, raw: patientLoginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(patientLoginRes.ok, patientLoginRes.error || 'Patient login failed').toBe(true);

      // Submit DeliverX order as patient.
      const submitOrderRes = await safeGraphQL(api, {
        query: SUBMIT_DELIVERX_ORDER_QUERY,
        variables: { order: buildDeliverXDeclinedOrderInput() },
        headers: bearer(patientAccessToken),
      });
      expect(submitOrderRes.ok, submitOrderRes.error || 'Patient submit order failed').toBe(true);

      const bookedOrder = submitOrderRes.body?.data?.patient?.order?.book;
      expect(bookedOrder, 'Missing patient.order.book').toBeTruthy();
      expect.soft(bookedOrder.status).toBe('NEW_ORDER');

      // Store order id for pharmacist action.
      const orderId = bookedOrder?.id;
      expect(orderId, 'Missing booked order id').toBeTruthy();

      // Login as pharmacist.
      const { accessToken: pharmacistAccessToken, raw: pharmacistLoginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(pharmacistLoginRes.ok, pharmacistLoginRes.error || 'Pharmacist login failed').toBe(true);

      // Decline the same order as pharmacist.
      const declineOrderRes = await safeGraphQL(api, {
        query: DECLINE_ORDER_QUERY,
        variables: {
          orderId,
          reason: 'Declined via workflow test PHARMA-333',
        },
        headers: bearer(pharmacistAccessToken),
      });
      expect(declineOrderRes.ok, declineOrderRes.error || 'Pharmacist decline order failed').toBe(true);

      const declinedOrder = declineOrderRes.body?.data?.pharmacy?.order?.decline;
      expect(declinedOrder, 'Missing pharmacy.order.decline').toBeTruthy();
      expect(declinedOrder?.id).toBe(orderId);
    }
  );
});
