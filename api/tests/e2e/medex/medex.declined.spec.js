import { test, expect } from '../../../globalConfig.api.js';
import path from 'node:path';
import { getPatientAccount } from '../../../helpers/roleCredentials.js';
import {
  buildMedexOrderInput,
  getMedexTestEnv,
  MEDEX_RX_ATTACHMENT_IMAGE_PATH,
  MEDEX_RX_PRESCRIPTION_IMAGE_PATH,
} from './medex.testData.js';
import {
  getMedexOrderDetail,
  getMedexOrderHistoryEntry,
} from './medex.orderCheck.js';
import {
  getAttachmentUploadUrlAsPatient,
  getPrescriptionUploadUrlAsPatient,
  loginPatient,
  savePrescriptionAsPatient,
  submitOrderAsPatient,
  uploadImageToSignedUrl,
} from '../shared/steps/patient.steps.js';

const defaultPatientAccount = getPatientAccount('default');
const MEDEX_PRE_LOGIN_WAIT_MS = 30_000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.describe('GraphQL E2E Workflow: MedEx Declined Paths', () => {
  test(
    'PHARMA-596 | MEDEX Happy Path With RX but no Medicine',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@negative', '@pharma-596'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const attachmentImagePath = path.resolve(MEDEX_RX_ATTACHMENT_IMAGE_PATH);
      const prescriptionImagePath = path.resolve(MEDEX_RX_PRESCRIPTION_IMAGE_PATH);

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      // Patient: Get Attachment Upload URL.
      const { attachmentUploadUrl, attachmentBlobName } = await getAttachmentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload RX attachment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: attachmentUploadUrl,
        imagePath: attachmentImagePath,
      });
      // Patient: Get Prescription Upload URL.
      const { prescriptionUploadUrl, prescriptionBlobName } = await getPrescriptionUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Prescription.
      await uploadImageToSignedUrl(api, {
        uploadUrl: prescriptionUploadUrl,
        imagePath: prescriptionImagePath,
      });
      // Patient: Save Prescription.
      const { prescriptionId } = await savePrescriptionAsPatient(api, {
        patientAccessToken,
        patientId: defaultPatientAccount.patientId,
        photo: prescriptionBlobName,
      });
      // Patient: Submit Order with attachment and prescription but no medicine.
      const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildMedexOrderInput({
          prescriptionIds: [prescriptionId],
          prescriptionItems: [],
          attachmentBlobName,
        }),
      });
      expect(submitOrderNode?.trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

      await wait(MEDEX_PRE_LOGIN_WAIT_MS);

      const orderDetailNode = await getMedexOrderDetail(api, { patientAccessToken, orderId });
      const orderHistoryEntry = await getMedexOrderHistoryEntry(api, { patientAccessToken, orderId });

      expect(orderDetailNode?.status, 'Missing patient order status after attachment-only submit').toBe('CANCELLED');
      expect(orderHistoryEntry, 'Missing patient order history entry for attachment-only MedEx order').toBeTruthy();
      expect(orderHistoryEntry?.reasonForDeclining, 'Missing decline reason for cancelled attachment-only MedEx order').toBeTruthy();
      expect(String(orderHistoryEntry?.reasonForDeclining || '')).toMatch(/basket cannot be empty/i);
    }
  );
});
