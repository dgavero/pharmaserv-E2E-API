import { test } from '../../../globalConfig.api.js';
import { buildPabiliBaseOrderInput } from './pabili.testData.js';
import { loginPatient, submitOrderAsPatient } from '../shared/steps/patient.steps.js';
import { loginPharmacist, declineOrderAsPharmacist } from '../shared/steps/pharmacist.steps.js';

test.describe('GraphQL E2E Workflow: Pabili Order Declined', () => {
  test(
    'PHARMA-342 | Patient submits Pabili order then PSE pharmacist declines the same order',
    {
      tag: ['@api', '@workflow', '@pabili', '@patient', '@pharmacist', '@positive', '@pharma-342'],
    },
    async ({ api }) => {
      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });

      // Patient: Submit Order.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildPabiliBaseOrderInput(),
      });

      // PSE Pharmacist: Login.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'pse01' });

      // PSE Pharmacist: Decline Order.
      await declineOrderAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        reason: 'Order is declined via API automated test (PABILI)',
      });
    }
  );
});
