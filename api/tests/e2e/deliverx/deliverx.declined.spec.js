import { test, expect } from '../../../globalConfig.api.js';
import { buildDeliverXBaseOrderInput } from './deliverx.testData.js';
import { loginPatient, submitOrderAsPatient } from '../shared/steps/patient.steps.js';
import { declineOrderAsPharmacist, loginPharmacist } from '../shared/steps/pharmacist.steps.js';

test.describe('GraphQL E2E Workflow: DeliverX Order Declined', () => {
  test(
    'PHARMA-333 | Patient submits DeliverX order then pharmacist declines the same order',
    {
      tag: ['@api', '@workflow', '@deliverx', '@patient', '@pharmacist', '@positive', '@pharma-333'],
    },
    async ({ api }) => {
      // Login as patient and submit DeliverX order.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXBaseOrderInput(),
      });

      const bookedOrder = submitOrderNode;
      expect.soft(bookedOrder.status).toBe('NEW_ORDER');

      // Login as pharmacist and decline the same order.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'reg01' });
      await declineOrderAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        reason: 'Declined via workflow test PHARMA-333',
      });
    }
  );
});
