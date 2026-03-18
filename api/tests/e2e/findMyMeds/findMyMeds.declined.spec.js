import { test } from '../../../globalConfig.api.js';
import { buildFindMyMedsBaseOrderInput } from './findMyMeds.testData.js';
import { loginPatient, submitOrderAsPatient } from '../shared/steps/patient.steps.js';
import { loginPharmacist, declineOrderAsPharmacist } from '../shared/steps/pharmacist.steps.js';

test.describe('GraphQL E2E Workflow: FindMyMeds Order Declined', () => {
  test(
    'PHARMA-339 | Patient submits FindMyMeds order then PSE pharmacist declines the same order',
    {
      tag: ['@api', '@workflow', '@findmymeds', '@patient', '@pharmacist', '@positive', '@pharma-339'],
    },
    async ({ api }) => {
      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });

      // Patient: Submit Order.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildFindMyMedsBaseOrderInput(),
      });

      // PSE Pharmacist: Login.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'pse01' });

      // PSE Pharmacist: Decline Order.
      await declineOrderAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        reason: 'Order is declined via API automated test (FIND MY MEDS)',
      });
    }
  );
});
